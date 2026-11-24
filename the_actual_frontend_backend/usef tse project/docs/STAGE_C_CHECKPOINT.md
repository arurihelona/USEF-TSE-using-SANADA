# Stage C Checkpoint — Provenance and Verification Record

## Checkpoint Identity

| Field | Value |
|---|---|
| **Filename** | `best_stage_c_sanada.pt` |
| **SHA-256** | `C184FE04C7C1FEC9C5B1FA00D405365AEEEABFA253EE9B926874E6D000F2A7D6` |
| **File size** | 188,042,989 bytes (~179.4 MB) |
| **Epoch** | 3 (final epoch of Stage C training) |
| **Val loss** | 0.1902 |
| **Val SI-SNRi** | 12.56 dB |
| **Training dataset** | SANADA (multi-speaker mixture corpus, 2-, 4-, and 9-speaker) |
| **Source** | Google Drive: `SANADA_USEF_Experiments/stage_C_curriculum/best_sanada_usef.pt` |
| **Location in project** | `backend/checkpoints/best_stage_c_sanada.pt` |

## Verification

The checkpoint was verified by:

1. **SHA-256 hash match** — the copy in `backend/checkpoints/` is byte-for-byte identical to the Google Drive source (hash confirmed both before and after copy).

2. **Strict state-dict load** — loaded into the USEF-TFGridNet model with `strict=True`:
   - Missing keys: 0
   - Unexpected keys: 0
   - Total parameters: 15,641,885

3. **Forward pass** — a 1-second dummy tensor at 8 kHz passed through the model produced a valid output tensor of the same shape with no numerical errors.

4. **End-to-end extraction** — a real 8-second 2-speaker mixture (from the SANADA independent verification set, originally recorded at 16 kHz, downsampled to 8 kHz) was processed through the full pipeline. Output WAV: 8 seconds, 8 kHz, peak amplitude 0.63 (non-silent).

## Model Architecture

| Parameter | Value |
|---|---|
| Architecture | USEF-TFGridNet (Tar_Model) |
| Input sample rate | 8,000 Hz |
| STFT: n_fft / hop / win | 128 / 64 / 128 samples |
| n_freqs | 65 (n_fft/2 + 1) |
| emb_dim | 128 |
| hidden_channels | 256 |
| n_head | 4 |
| num_layers | 6 |
| approx_qk_dim | 512 |
| State dict keys | 290 |

## Key Format

The Stage C checkpoint uses **clean keys** (no `module.` DDP prefix). This is different from the original pretrained checkpoint (`usef_tfgridnet_wsj02mix.pth.tar`), which uses `module.`-prefixed keys from distributed training. The backend `inference.py` auto-detects the key format and applies the correct transformation.

## Checkpoint Load Priority in Backend

```
1. USEF_CHECKPOINT env var (explicit override)
2. best_stage_c_sanada.pt  ← this file (production default)
3. usef_tfgridnet_wsj02mix.pth.tar  (pretrained baseline fallback)
```

## Related Checkpoints (Preserved, Not Used for Production)

| File | Location | Epoch | Val SI-SNRi | Status |
|---|---|---|---|---|
| `best_stage_c_sanada.pt` | `backend/checkpoints/` | 3 | 12.56 dB | ✅ **Production** |
| `usef_tfgridnet_wsj02mix.pth.tar` | `backend/checkpoints/` | — | baseline | Preserved baseline |
| `best_sanada_usef.pt` | `experiments/fine_tuned/` | 5 | 16.33 dB | ⚠️ Unknown provenance |
| `best_sanada_usef.pt` | `usef tse project/backend/checkpoints/` | 5 | 16.33 dB | ⚠️ Same as above |
| `latest_checkpoint.pt` | `experiments/fine_tuned/` | 5 | — | ⚠️ Unknown provenance |

> **Note on epoch-5 checkpoints:** The `best_sanada_usef.pt` files in `experiments/fine_tuned/` and the root `usef tse project/backend/checkpoints/` are identical (same SHA-256: `BE0105C4...`). They record epoch 5 and val SI-SNRi = 16.33 dB. No training log in the Google Drive download corresponds to this checkpoint — Stage A ran 10 epochs, Stage B ran 5 epochs, Stage C ran 3 epochs. This checkpoint's exact origin cannot be established from available records. It is preserved as a historical artifact but is NOT used for production inference.
