# Final Project Integration Report: Acoustic_PS

**Project Root:** `D:\3rd_yr_PS\Acoustic_PS\Acoustic_PS_FINAL`  
**Date of Completion:** November 24, 2026  
**System Status:** Fully Integrated, Tested, and Verified  

---

## 1. Executive Summary

This report documents the inspection, organization, integration, and verification of the final **Acoustic_PS** project. All application components, machine learning models, frontends, training artifacts, and evaluation records are consolidated and verified within:

$$\text{Project Root: } \mathbf{D:\backslash 3rd\_yr\_PS\backslash Acoustic\_PS\backslash Acoustic\_PS\_FINAL}$$

The project integrates the fine-tuned **USEF-TFGridNet** (Universal Speaker Embedding Free Target Speaker Extraction) model trained on the SANADA multi-speaker dataset. All three user interfaces (Developer/Research, Desktop End-User, and Mobile PWA) have been verified to interface with the FastAPI backend and execute speaker extraction.

---

## 2. Checkpoint Verification & Provenance

### Authoritative Production Model: Stage C (Epoch 3)
A strict cryptographic and metadata inspection was conducted to resolve checkpoint identity across the project:

- **Checkpoint File:** `the_actual_frontend_backend/usef tse project/backend/checkpoints/best_stage_c_sanada.pt`
- **File Size:** 188,042,989 bytes (~179.3 MB)
- **SHA-256 Hash:** `C184FE04C7C1FEC9C5B1FA00D405365AEEEABFA253EE9B926874E6D000F2A7D6`
- **Training Epoch:** 3 (Final Stage C epoch)
- **Validation Metric:** Validation SI-SNRi = **12.56 dB**
- **State Dict Keys:** 290 keys (clean, matching PyTorch `Tar_Model` directly with zero prefix transformation needed)
- **Parameters:** 15,641,885 parameters (exact match to USEF-TFGridNet architecture)

```
[MODEL] Checkpoint: USEF-TFGridNet (Stage C, SANADA fine-tuned, epoch 3, val SI-SNRi=12.56 dB)
[MODEL] Epoch in checkpoint: 3
[MODEL] Key format detected: fine-tuned-clean (no prefix transformation needed)
[MODEL] Strict load: missing=0, unexpected=0
[MODEL] Initialization completed in 0.39-0.53 seconds
[MODEL] Ready (15,641,885 parameters on CPU)
```

### Historical Baseline Checkpoint (Preserved)
- **File:** `backend/checkpoints/usef_tfgridnet_wsj02mix.pth.tar`
- **SHA-256:** `FFA4D5B0F33A9B4CE66D2967F5DDE64EBD80529FEBC65913D9C9673DF8DDE27F`
- **Description:** Original baseline pretrained on WSJ0-2mix. Preserved for baseline comparisons.

### Unverified Historical Checkpoint (Preserved, Not Used)
- **File:** `SANADA_USEF_Experiments/.../experiments/fine_tuned/best_sanada_usef.pt`
- **SHA-256:** `BE0105C42B3FD4C1F6F5A3199B6E96FF27E4B3141F0A6B2AE88CD8694084F9F2`
- **Metadata:** Epoch 5, Val SI-SNRi = 16.33 dB.
- **Provenance Limitation:** Training logs for Stage C only document 3 completed epochs. Because no training log confirms an epoch 5 run for Stage C, this file is retained solely as an unverified historical artifact and is **excluded from production**.

---

## 3. Curriculum Training Stages

The SANADA fine-tuning followed a three-stage curriculum warm-starting from the pretrained WSJ0-2mix weights:

| Stage | Mixture Type | Completed Epochs | Best Val SI-SNRi | Log Verification File |
|---|---|---|---|---|
| **Stage A** | 2-speaker | 10 epochs | 17.49 dB | `experiments/stage_A_2spk/training_log.json` |
| **Stage B** | 4-speaker | 5 epochs | 14.15 dB | `experiments/stage_B_4spk/training_log.json` |
| **Stage C** | 2-, 4-, 9-speaker curriculum | **3 epochs** | **12.56 dB** | `experiments/stage_C_curriculum/training_log.json` |

*Note: As verified from original logs, Stage C completed exactly 3 epochs.*

---

## 4. Evaluation Results (1,500 Full Extractions)

The full evaluation suite contains **1,500 successful test extractions with zero reported failures** (100% success rate).

### Aggregate Performance vs. Pretrained Baseline

| Condition | Number of Test Samples | Input Mixture SI-SNR | Pretrained Baseline SI-SNRi | Fine-Tuned Stage C SI-SNRi | Net Improvement Gain |
|---|---|---|---|---|---|
| **2-Speaker Mixtures** | 200 | 0.00 dB | 2.17 dB | **13.97 dB** | **+11.80 dB** |
| **4-Speaker Mixtures** | 400 | -6.64 dB | 3.55 dB | **14.35 dB** | **+10.80 dB** |
| **9-Speaker Mixtures** | 900 | -15.78 dB | 0.79 dB | **9.99 dB** | **+9.20 dB** |
| **Overall Dataset** | **1,500** | **-11.23 dB** | **1.71 dB** | **11.68 dB** | **+9.97 dB** |

### Preserved Evaluation Artifacts:
- `outputs/evaluation_results/full_evaluation_results.csv` (1,500 detailed rows)
- `outputs/evaluation_results/full_evaluation_results.json`
- `outputs/evaluation_results/category_summary.csv`
- `outputs/evaluation_results/results.jsonl`
- `outputs/presentation_figures/graph_1_sisnri_comparison.png`
- `outputs/presentation_figures/graph_2_stageC_gain.png`
- `outputs/presentation_figures/graph_3_improvement_rate.png`

---

## 5. Architectural & Backend Implementation Details

### Relative Path Self-Containment
In `the_actual_frontend_backend/usef tse project/backend/inference.py`:
- `ROOT_DIR = Path(__file__).resolve().parent.parent` resolves dynamically to the local application folder.
- Checkpoint loading priority:
  1. `USEF_CHECKPOINT` environment variable override (if defined)
  2. `checkpoints/best_stage_c_sanada.pt` (verified default production model)
  3. `checkpoints/usef_tfgridnet_wsj02mix.pth.tar` (fallback baseline)
- Key handling (`_prepare_state_dict`): Automatically distinguishes between clean keys and `module.`-prefixed DDP checkpoints without altering model weights.
- Audio pipeline: Resamples all incoming audio inputs to 8,000 Hz for model inference, preserving phase alignment, and outputs standard 16-bit PCM WAV at 8 kHz.

---

## 6. Frontend Verification Results

All three frontends were tested from `Acoustic_PS_FINAL`:

| Frontend | Target Audience | Port | Status | Proxy Functionality | End-to-End Extraction Test |
|---|---|---|---|---|---|
| **Developer / Research** (`frontend/`) | ML Engineers & Researchers | `5173` | **VERIFIED** | Vite proxy to `http://127.0.0.1:8000` | Pass (UI + waveform + metadata) |
| **Desktop End-User** (`frontend-user/`) | General Users | `5174` | **VERIFIED** | Vite proxy to `http://127.0.0.1:8000` | Pass (Extraction + audio playback) |
| **Mobile PWA** (`frontend-user-mobile/`) | Mobile / Tablet LAN | `5175` | **VERIFIED** | Vite proxy to `http://127.0.0.1:8000` | Pass (Touch responsive, LAN accessible) |

### End-to-End Test Log Summary
```
[1] Backend Startup & Model Load:
    Health check: HTTP 200, status='ok', model_status='ready'
    Model: USEF-TFGridNet (Stage C, SANADA fine-tuned, epoch 3, val SI-SNRi=12.56 dB)
    Total parameters: 15,641,885

[2] Frontend-User Proxy Verification (Port 5174):
    HTTP GET http://localhost:5174/api/health -> 200 OK
    HTTP GET http://localhost:5174/api/status -> 200 OK

[3] Target Speaker Extraction via Proxy:
    POST http://localhost:5174/api/extract
    Inputs: mixed_speaker.wav (8.0s), speaker_a_ref.wav (8.0s)
    Processing time: 19.62s on CPU
    Output: extracted_speaker_c35f21cd1a.wav (8.0s, 8 kHz)
    Status: 200 OK

[4] Audio Retrieval:
    GET http://localhost:5174/api/audio/extracted_speaker_c35f21cd1a.wav
    Downloaded: 128,044 bytes (Valid WAV format, audible separated speech)
```

---

## 7. How to Launch the Application

From `D:\3rd_yr_PS\Acoustic_PS\Acoustic_PS_FINAL\the_actual_frontend_backend\usef tse project`:

### Option A: Launch Main Research Interface (Port 5173)
```powershell
python run_app.py
```

### Option B: Launch Desktop User Interface (Port 5174)
```powershell
python run_app_user.py
```

### Option C: Launch Mobile Interface (Port 5175, LAN Accessible)
```powershell
python run_app_user_mobile.py
```

Each launcher automatically starts the FastAPI backend, validates model readiness, and launches the designated Vite frontend. Pressing `Ctrl+C` cleanly shuts down both processes.
