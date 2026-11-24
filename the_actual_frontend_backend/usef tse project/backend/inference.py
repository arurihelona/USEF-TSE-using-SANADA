import os
import sys
import threading
import time
from collections import OrderedDict
from pathlib import Path
import numpy as np
import soundfile as sf
import torch
import torch.nn as nn
from scipy import signal

# Add original-USEF-TSE to sys.path to access model architectures without modifying original code
ROOT_DIR = Path(__file__).resolve().parent.parent
ORIGINAL_REPO_DIR = ROOT_DIR / "original-USEF-TSE"
if str(ORIGINAL_REPO_DIR) not in sys.path:
    sys.path.insert(0, str(ORIGINAL_REPO_DIR))

try:
    from models.model_USEF_TFGridNet import Tar_Model
    from models.local.TFgridnet import TF_gridnet_attentionblock
    USEF_IMPORTS_AVAILABLE = True
except ImportError as e:
    USEF_IMPORTS_AVAILABLE = False
    IMPORT_ERROR = str(e)


class CleanSTFT(nn.Module):
    """Clean STFT module compliant with PyTorch 2.x standard STFT."""
    def __init__(self, n_fft=128, hop_length=64, win_length=128):
        super().__init__()
        self.n_fft = n_fft
        self.hop_length = hop_length
        self.win_length = win_length

    def forward(self, y):
        # y: [B, C, T] or [B, T]
        num_dims = y.dim()
        batch_size = y.shape[0]
        num_samples = y.shape[-1]
        if num_dims == 3:
            y = y.reshape(-1, num_samples)

        window = torch.hann_window(self.win_length, device=y.device)
        complex_stft = torch.stft(
            y,
            self.n_fft,
            self.hop_length,
            self.win_length,
            window=window,
            return_complex=True,
        )
        _, num_freqs, num_frames = complex_stft.shape
        if num_dims == 3:
            complex_stft = complex_stft.reshape(batch_size, -1, num_freqs, num_frames)

        mag = torch.abs(complex_stft)
        phase = torch.angle(complex_stft)
        real = complex_stft.real
        imag = complex_stft.imag
        return mag, phase, real, imag, complex_stft


class CleaniSTFT(nn.Module):
    """Clean inverse STFT module compliant with PyTorch 2.x."""
    def __init__(self, n_fft=128, hop_length=64, win_length=128, length=None):
        super().__init__()
        self.n_fft = n_fft
        self.hop_length = hop_length
        self.win_length = win_length
        self.length = length

    def forward(self, features, input_type="real_imag"):
        if input_type == "real_imag":
            real, imag = features
            c = torch.complex(real, imag)
        elif input_type == "complex":
            c = features
        elif input_type == "mag_phase":
            mag, phase = features
            c = torch.complex(mag * torch.cos(phase), mag * torch.sin(phase))
        else:
            raise NotImplementedError(f"Unsupported input_type: {input_type}")

        window = torch.hann_window(self.win_length, device=c.device)
        return torch.istft(
            c,
            self.n_fft,
            self.hop_length,
            self.win_length,
            window=window,
            length=self.length,
        )


class USEFExtractor:
    """
    Universal Speaker Embedding Free Target Speaker Extraction Engine.

    =============================================================================
    CHECKPOINT CONFIGURATION:
    - Production checkpoint: best_stage_c_sanada.pt
        USEF-TFGridNet fine-tuned on the SANADA dataset using a 3-stage curriculum
        (Stage A: 2-speaker, Stage B: 4-speaker, Stage C: 2+4+9-speaker).
        Stage C completed 3 epochs. This is the verified production model.
        Source SHA-256: C184FE04C7C1FEC9C5B1FA00D405365AEEEABFA253EE9B926874E6D000F2A7D6
    - Baseline checkpoint: usef_tfgridnet_wsj02mix.pth.tar
        Original pretrained USEF-TFGridNet from ZBang/USEF-TSE (Hugging Face).
        Trained on WSJ0-2mix. Preserved as a reference baseline only.
    - Override: set the USEF_CHECKPOINT environment variable to use a custom path.

    Priority order:
        1. USEF_CHECKPOINT env var (if set)
        2. best_stage_c_sanada.pt  (Stage C fine-tuned — production)
        3. usef_tfgridnet_wsj02mix.pth.tar  (pretrained — fallback)

    =============================================================================
    AUDIO SAMPLE RATE PIPELINE:
    - Training Checkpoint: USEF-TFGridNet weights were trained on 8,000 Hz (8 kHz)
      audio with 128-point STFT analysis.
    - Preprocessing:
        1. Original audio (which may be 16kHz, 44.1kHz, 48kHz, etc.) is detected
           via soundfile.read().
        2. If original sample rate != 8000 Hz, scipy.signal.resample converts the
           signal to TARGET_SR (8000 Hz) before computing the STFT.
    - Inference:
        Neural network forward pass operates in the 8 kHz time-frequency domain.
    - Output:
        The extracted speech waveform is written to disk as a 16-bit PCM WAV at
        8,000 Hz.
    =============================================================================
    """

    TARGET_SR = 8000  # Model operates at 8kHz

    def __init__(self, checkpoint_path: str = None, async_init: bool = False):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.checkpoint_path = checkpoint_path or self._resolve_checkpoint_path()
        self.model = None
        self.model_name = "USEF-TFGridNet"
        self.model_status = "uninitialized"
        self.status_detail = "Waiting to initialize..."
        self._init_lock = threading.Lock()
        self._init_start_time = None
        self.init_duration = None

        if async_init:
            self._thread = threading.Thread(target=self._initialize_model, daemon=True)
            self._thread.start()
        else:
            self._initialize_model()

    @staticmethod
    def _resolve_checkpoint_path() -> str:
        """
        Resolves the checkpoint path using this priority order:
          1. USEF_CHECKPOINT environment variable (explicit override)
          2. best_stage_c_sanada.pt  — verified Stage C fine-tuned checkpoint
                                       (epoch 3, val SI-SNRi = 12.56 dB, SANADA dataset)
          3. usef_tfgridnet_wsj02mix.pth.tar — original pretrained checkpoint (baseline)

        Stage C is the production checkpoint. The pretrained checkpoint is kept as
        a preserved baseline fallback only.
        """
        checkpoints_dir = ROOT_DIR / "backend" / "checkpoints"

        env_path = os.environ.get("USEF_CHECKPOINT", "").strip()
        if env_path:
            print(f"[MODEL] Checkpoint path from USEF_CHECKPOINT env: {env_path}")
            return env_path

        # Priority 1: Stage C fine-tuned checkpoint (production)
        stage_c = checkpoints_dir / "best_stage_c_sanada.pt"
        if stage_c.exists():
            print(f"[MODEL] Using Stage C fine-tuned checkpoint: {stage_c}")
            return str(stage_c)

        # Priority 2: Original pretrained checkpoint (baseline fallback)
        pretrained = checkpoints_dir / "usef_tfgridnet_wsj02mix.pth.tar"
        if pretrained.exists():
            print(f"[MODEL] Stage C checkpoint not found. Falling back to pretrained: {pretrained}")
            return str(pretrained)

        # Neither exists — return Stage C path so the missing-file error is descriptive
        print(f"[MODEL] [WARNING] No checkpoint found in {checkpoints_dir}")
        return str(stage_c)

    @staticmethod
    def _prepare_state_dict(raw_sd: OrderedDict) -> "tuple[OrderedDict, str]":
        """
        Auto-detects the checkpoint key format and returns a cleaned state dict
        plus a human-readable description of what was detected.

        Stage C checkpoint keys (clean, no prefix):
            att.attn_conv_Q.weight, conv.0.weight, dual_mdl.0.*, deconv.weight ...

        Pretrained checkpoint keys (DDP-wrapped, need stripping):
            module.att.attn_conv_Q.weight, module.conv.0.weight ...
        """
        first_key = next(iter(raw_sd))
        if first_key.startswith("module."):
            # Pretrained WSJ0-2mix checkpoint — strip 'module.' DDP wrapper and
            # apply the convolution key rename used in the original loader
            sd = OrderedDict()
            for k, v in raw_sd.items():
                name = k.replace("module.", "").replace("convolution_", "convolution_module.")
                sd[name] = v
            fmt = "pretrained-DDP (module. prefix stripped)"
        else:
            # Stage C fine-tuned checkpoint — keys already clean, use as-is
            sd = OrderedDict(raw_sd)
            fmt = "fine-tuned-clean (no prefix transformation needed)"
        return sd, fmt

    def start_background_init(self):
        """Spawns background initialization thread if not already started or ready."""
        with self._init_lock:
            if self.model_status in ("loading", "ready"):
                return
            self._thread = threading.Thread(target=self._initialize_model, daemon=True)
            self._thread.start()

    def _initialize_model(self):
        with self._init_lock:
            if self.model_status == "ready":
                return

            self._init_start_time = time.perf_counter()
            self.model_status = "loading"
            self.status_detail = "Loading TFGridNet layers and PyTorch checkpoint..."
            print(f"[MODEL] Loading checkpoint from: {self.checkpoint_path}")
            print(f"[MODEL] Device: {str(self.device).upper()}")

            if not USEF_IMPORTS_AVAILABLE:
                self.model_status = "error"
                self.status_detail = f"Failed to import USEF-TSE architecture: {IMPORT_ERROR}"
                print(f"[MODEL] [ERROR] {self.status_detail}")
                return

            if not os.path.exists(self.checkpoint_path):
                self.model_status = "checkpoint_missing"
                ckpt_name = os.path.basename(self.checkpoint_path)
                self.status_detail = (
                    f"Checkpoint file not found at {self.checkpoint_path}. "
                    f"Expected '{ckpt_name}' in backend/checkpoints/."
                )
                print(f"[MODEL] [ERROR] {self.status_detail}")
                return

            try:
                stft = CleanSTFT(n_fft=128, hop_length=64, win_length=128)
                istft = CleaniSTFT(n_fft=128, hop_length=64, win_length=128)
                att = TF_gridnet_attentionblock(
                    emb_dim=128,
                    n_freqs=65,
                    n_head=4,
                    approx_qk_dim=512,
                    activation="prelu",
                )
                self.model = Tar_Model(
                    stft=stft,
                    istft=istft,
                    real_att=att,
                    n_freqs=65,
                    hidden_channels=256,
                    n_head=4,
                    emb_dim=128,
                    emb_ks=1,
                    emb_hs=1,
                    num_layers=6,
                )

                # Load checkpoint
                t_ckpt_start = time.perf_counter()
                raw_ckpt = torch.load(self.checkpoint_path, map_location="cpu", weights_only=False)
                t_ckpt_end = time.perf_counter()
                print(f"[MODEL] Checkpoint file loaded in {t_ckpt_end - t_ckpt_start:.2f} seconds")

                # Set human-readable model name
                ckpt_filename = os.path.basename(self.checkpoint_path)
                ckpt_epoch    = raw_ckpt.get("epoch", "?")
                ckpt_sisnri   = raw_ckpt.get("val_sisnri_db", None)
                if ckpt_filename == "best_stage_c_sanada.pt":
                    sisnri_str = f", val SI-SNRi={ckpt_sisnri:.2f} dB" if ckpt_sisnri is not None else ""
                    self.model_name = (
                        f"USEF-TFGridNet (Stage C, SANADA fine-tuned, "
                        f"epoch {ckpt_epoch}{sisnri_str})"
                    )
                elif ckpt_filename == "usef_tfgridnet_wsj02mix.pth.tar":
                    self.model_name = "USEF-TFGridNet (pretrained, WSJ0-2mix baseline)"
                else:
                    self.model_name = f"USEF-TFGridNet ({ckpt_filename})"

                print(f"[MODEL] Checkpoint: {self.model_name}")
                print(f"[MODEL] Epoch in checkpoint: {ckpt_epoch}")

                # Auto-detect key format and prepare state dict
                sd, fmt = self._prepare_state_dict(raw_ckpt["model_state_dict"])
                print(f"[MODEL] Key format detected: {fmt}")

                # Strict load — will raise if architecture has drifted from checkpoint
                missing, unexpected = self.model.load_state_dict(sd, strict=True)
                print(f"[MODEL] Strict load: missing={len(missing)}, unexpected={len(unexpected)}")
                if missing or unexpected:
                    raise RuntimeError(
                        f"State dict mismatch after strict load. "
                        f"Missing: {missing[:5]}, Unexpected: {unexpected[:5]}"
                    )

                self.model.to(self.device)
                self.model.eval()

                total_params = sum(p.numel() for p in self.model.parameters())
                self.init_duration = round(time.perf_counter() - self._init_start_time, 2)
                self.model_status = "ready"
                self.status_detail = (
                    f"{self.model_name} loaded on {self.device} "
                    f"({total_params:,} parameters)."
                )
                print(f"[MODEL] Initialization completed in {self.init_duration:.2f} seconds")
                print(f"[MODEL] Ready ({total_params:,} parameters on {str(self.device).upper()})")
            except Exception as e:
                self.model_status = "error"
                self.status_detail = f"Error loading checkpoint: {str(e)}"
                print(f"[MODEL] [ERROR] {self.status_detail}")

    def load_and_preprocess_audio(self, file_path: str) -> dict:
        """
        Loads audio file, measures durations, records original sample rate,
        converts to mono, and resamples to TARGET_SR (8000 Hz).
        """
        t0 = time.perf_counter()
        data, original_sr = sf.read(file_path, dtype="float32")
        t_read = time.perf_counter() - t0

        # Mono conversion
        if data.ndim > 1:
            data = np.mean(data, axis=1)

        duration = len(data) / original_sr

        # Resample to 8kHz if needed
        t_resample_start = time.perf_counter()
        if original_sr != self.TARGET_SR:
            num_target_samples = int(round(len(data) * self.TARGET_SR / original_sr))
            data = signal.resample(data, num_target_samples)
        t_resample = time.perf_counter() - t_resample_start

        # Avoid zero variance
        if np.std(data) < 1e-7:
            data = data + 1e-6 * np.random.randn(*data.shape).astype(np.float32)

        return {
            "data": data.astype(np.float32),
            "duration": duration,
            "original_sr": original_sr,
            "preprocessed_sr": self.TARGET_SR,
            "load_duration": round(t_read, 3),
            "resample_duration": round(t_resample, 3),
        }

    def extract(self, mix_path: str, aux_path: str, output_path: str) -> dict:
        """
        Runs USEF-TSE target speaker extraction given mixture and reference audio.
        Reuses the preloaded in-memory model (does NOT reload weights).
        """
        if self.model_status != "ready" or self.model is None:
            raise RuntimeError(f"USEF-TSE model is not ready: {self.status_detail}")

        print("\n" + "=" * 50)
        print("[EXTRACTION] Request received")
        total_start_time = time.perf_counter()

        # 1. Preprocess mixture audio
        t_mix_start = time.perf_counter()
        mix_info = self.load_and_preprocess_audio(mix_path)
        t_mix_duration = time.perf_counter() - t_mix_start

        # 2. Preprocess reference audio
        t_ref_start = time.perf_counter()
        ref_info = self.load_and_preprocess_audio(aux_path)
        t_ref_duration = time.perf_counter() - t_ref_start

        total_preprocess_time = round(t_mix_duration + t_ref_duration, 3)

        print(f"[AUDIO] Mixture original sample rate: {mix_info['original_sr']} Hz")
        print(f"[AUDIO] Reference original sample rate: {ref_info['original_sr']} Hz")
        print(f"[AUDIO] Model inference sample rate: {self.TARGET_SR} Hz")
        print(f"[PREPROCESS] Duration: {total_preprocess_time:.2f} seconds")

        mix_audio = mix_info["data"]
        aux_audio = ref_info["data"]

        # Convert to torch tensor [1, T]
        mix_tensor = torch.from_numpy(mix_audio).unsqueeze(0).to(self.device)
        aux_tensor = torch.from_numpy(aux_audio).unsqueeze(0).to(self.device)

        # 3. Model Inference (reusing loaded model)
        t_inf_start = time.perf_counter()
        with torch.no_grad():
            est_source = self.model(mix_tensor, aux_tensor)
            est_np = est_source.squeeze().cpu().numpy()
        inference_time = round(time.perf_counter() - t_inf_start, 2)
        print(f"[INFERENCE] Duration: {inference_time:.2f} seconds")

        # Handle size matching and normalization
        min_len = min(len(est_np), len(mix_audio))
        est_np = est_np[:min_len]

        # Prevent clipping while preserving dynamics
        peak = np.max(np.abs(est_np))
        if peak > 0.99:
            est_np = est_np / (peak + 1e-5) * 0.95

        # 4. Save output WAV file at TARGET_SR (8000 Hz)
        t_save_start = time.perf_counter()
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        sf.write(output_path, est_np, self.TARGET_SR, subtype="PCM_16")
        save_time = round(time.perf_counter() - t_save_start, 3)

        print(f"[AUDIO] Extracted output sample rate: {self.TARGET_SR} Hz")
        print(f"[SAVE] Duration: {save_time:.2f} seconds")

        total_elapsed_time = round(time.perf_counter() - total_start_time, 2)
        extracted_duration = round(len(est_np) / self.TARGET_SR, 2)
        print(f"[EXTRACTION] Total duration: {total_elapsed_time:.2f} seconds")
        print("=" * 50 + "\n")

        return {
            "output_path": output_path,
            "output_filename": os.path.basename(output_path),
            "mix_duration": round(mix_info["duration"], 2),
            "aux_duration": round(ref_info["duration"], 2),
            "extracted_duration": extracted_duration,
            "processing_time": total_elapsed_time,
            "inference_time": inference_time,
            "preprocess_time": total_preprocess_time,
            "save_time": save_time,
            "sample_rate": self.TARGET_SR,
            "model_name": self.model_name,
            "device": str(self.device),
        }
