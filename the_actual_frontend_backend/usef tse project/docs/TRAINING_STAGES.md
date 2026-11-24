# Training Stages — USEF-TFGridNet Fine-tuning on SANADA

## Overview

The pretrained USEF-TFGridNet (trained on WSJ0-2mix, 2-speaker English) was fine-tuned on the
**SANADA dataset** using a 3-stage curriculum that progressively increases the number of speakers
in the training mixtures.

Each stage is a separate, independent training run that initialises from the best checkpoint of
the previous stage. All stages used the same USEF-TFGridNet architecture (15,641,885 parameters).

---

## Stage A — 2-Speaker Curriculum

| Field | Value |
|---|---|
| **Mix type** | 2-speaker |
| **Epochs** | 10 |
| **Learning rate** | 5×10⁻⁵ |
| **Best epoch** | 10 |
| **Best val SI-SNRi** | 17.49 dB |
| **Initial val SI-SNRi** | 6.17 dB |
| **Training time (avg/epoch)** | ~2,650 seconds (~44 min) |
| **Checkpoint** | `SANADA_USEF_Experiments/stage_A_2spk/best_sanada_usef.pt` |

### Epoch-by-epoch progression

| Epoch | Train Loss | Val SI-SNRi |
|---|---|---|
| 1 | -12.01 | 16.36 dB |
| 2 | -14.92 | 16.64 dB |
| 3 | -15.54 | 16.86 dB |
| 4 | -15.95 | 16.95 dB |
| 5 | -16.42 | 17.10 dB |
| 6 | -16.56 | 17.19 dB |
| 7 | -16.99 | 17.33 dB |
| 8 | -16.87 | 17.33 dB |
| 9 | -17.13 | 17.43 dB |
| **10** | -17.38 | **17.49 dB** ← best |

---

## Stage B — 4-Speaker Curriculum

| Field | Value |
|---|---|
| **Mix type** | 4-speaker |
| **Initialised from** | Stage A best checkpoint |
| **Epochs** | 5 |
| **Learning rate** | 3×10⁻⁵ |
| **Best epoch** | 5 |
| **Best val SI-SNRi** | 14.15 dB |
| **Initial val SI-SNRi** | 0.97 dB (before Stage B training) |
| **Training time (avg/epoch)** | ~5,400 seconds (~90 min) |
| **Checkpoint** | `SANADA_USEF_Experiments/stage_B_4spk/best_sanada_usef.pt` |

### Epoch-by-epoch progression

| Epoch | Train Loss | Val SI-SNRi |
|---|---|---|
| 1 | -1.59 | 11.08 dB |
| 2 | -4.77 | 11.78 dB |
| 3 | -5.90 | 13.21 dB |
| 4 | -6.66 | 13.87 dB |
| **5** | -7.12 | **14.15 dB** ← best |

---

## Stage C — Full Curriculum (2 + 4 + 9 speakers)

| Field | Value |
|---|---|
| **Mix type** | 2-, 4-, and 9-speaker (joint curriculum) |
| **Initialised from** | Stage B best checkpoint |
| **Epochs** | **3** |
| **Learning rate** | 2×10⁻⁵ |
| **Best epoch** | **3** |
| **Best val SI-SNRi** | **12.56 dB** |
| **Initial val SI-SNRi** | 6.23 dB (before Stage C training) |
| **Training time (avg/epoch)** | ~21,500 seconds (~6 hours) |
| **Checkpoint** | `best_stage_c_sanada.pt` ← **production checkpoint** |

### Epoch-by-epoch progression

| Epoch | Train Loss | Val SI-SNRi |
|---|---|---|
| 1 | 2.713 | 10.97 dB |
| 2 | 1.464 | 12.15 dB |
| **3** | 0.606 | **12.56 dB** ← best and final |

> [!NOTE]
> Stage C val loss is in the **positive** range (not negative) because it is computed on a
> combined 2+4+9 speaker mixture set where many samples are significantly harder than the
> 2-speaker WSJ0-2mix the model was originally optimised for. The SI-SNRi metric (shown here)
> is the meaningful performance indicator. 12.56 dB SI-SNRi means the model improves the
> signal quality by 12.56 dB on average compared to the unprocessed mixture, on the
> Stage C validation set.

---

## Checkpoint Provenance Summary

| Stage | File | Epoch | Val SI-SNRi | Used for |
|---|---|---|---|---|
| Pretrained (baseline) | `usef_tfgridnet_wsj02mix.pth.tar` | — | reference | Baseline comparison only |
| Stage A best | `stage_A_2spk/best_sanada_usef.pt` | 10 | 17.49 dB | Initialises Stage B |
| Stage B best | `stage_B_4spk/best_sanada_usef.pt` | 5 | 14.15 dB | Initialises Stage C |
| **Stage C best** | **`best_stage_c_sanada.pt`** | **3** | **12.56 dB** | ✅ **Production** |

The Stage C val SI-SNRi is lower than Stage A/B because it is measured on a **harder task**
(joint 2+4+9 speaker evaluation). On the held-out 1,500-sample SANADA test set, Stage C
achieves a **mean SI-SNRi of 11.68 dB** across all conditions, compared to the baseline's 1.71 dB.
