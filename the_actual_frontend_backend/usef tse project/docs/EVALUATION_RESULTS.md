# Evaluation Results — USEF-TFGridNet Stage C on SANADA Dataset

## Overview

This document records the complete evaluation of the **USEF-TFGridNet Stage C fine-tuned model**
on the SANADA (System for Automatic Noise and Acoustic Disturbance Attenuation) test set.

The evaluation was conducted using the verified Stage C checkpoint:
- **Checkpoint:** `best_stage_c_sanada.pt`
- **SHA-256:** `C184FE04C7C1FEC9C5B1FA00D405365AEEEABFA253EE9B926874E6D000F2A7D6`
- **Epoch:** 3 (final Stage C epoch)
- **Val SI-SNRi at checkpoint time:** 12.56 dB

---

## Evaluation Scale

| Statistic | Value |
|---|---|
| Total test extractions | **1,500** |
| Failures | **0** |
| Success rate | **100%** |
| Mixture types | 2-speaker, 4-speaker, 9-speaker |

---

## Metrics Explained

### SI-SNR (Scale-Invariant Signal-to-Noise Ratio)
Measures how well the extracted speech matches the clean target, in decibels.
Higher is better. Computed as:

$$\text{SI-SNR} = 10 \log_{10} \frac{\|\alpha \mathbf{s}\|^2}{\|\hat{\mathbf{s}} - \alpha \mathbf{s}\|^2}$$

where $\alpha = \frac{\hat{\mathbf{s}}^T \mathbf{s}}{\|\mathbf{s}\|^2}$ is the optimal scaling factor.

### SI-SNRi (SI-SNR Improvement)
The improvement in SI-SNR relative to the unprocessed mixture:

$$\text{SI-SNRi} = \text{SI-SNR}_\text{output} - \text{SI-SNR}_\text{input}$$

A positive value means the model improved the signal quality vs. doing nothing.

### Baseline
The original pretrained USEF-TFGridNet from ZBang/USEF-TSE, trained on WSJ0-2mix only. Used as the comparison reference to quantify the benefit of SANADA fine-tuning.

---

## Full Evaluation Results (1,500 Samples)

### Aggregate Statistics

| Metric | Baseline | Stage C | Improvement |
|---|---|---|---|
| **Mean SI-SNRi** | 1.71 dB | **11.68 dB** | **+9.97 dB** |
| **Median SI-SNRi** | 0.85 dB | **11.65 dB** | **+10.80 dB** |
| **Std SI-SNRi** | — | 4.98 dB | — |
| **Min SI-SNRi** | — | -28.54 dB | — |
| **Max SI-SNRi** | — | +35.34 dB | — |

### Results by Mixture Type

| Mix Type | Samples | Input SI-SNR | Baseline SI-SNRi | Stage C SI-SNRi | Gain |
|---|---|---|---|---|---|
| 2-speaker | 200 | 0.00 dB | 2.17 dB | **13.97 dB** | **+11.80 dB** |
| 4-speaker | 400 | -6.64 dB | 3.55 dB | **14.35 dB** | **+10.80 dB** |
| 9-speaker | 900 | -15.78 dB | 0.79 dB | **9.99 dB** | **+9.20 dB** |

> [!NOTE]
> The 9-speaker condition is the most challenging: mixtures have 9 simultaneous speakers, resulting
> in very low input SI-SNR (-15.78 dB). Despite this, Stage C achieves ~10 dB improvement on average.

---

## Evaluation Methodology

1. **Test set construction:** For each mixture type (2-, 4-, 9-speaker), 100 test mixtures were drawn from the SANADA dataset test split. Each mixture was evaluated against each of its constituent speakers (using their training-split enrollment utterance as the reference). This yields 200 (2-spk) + 400 (4-spk) + 900 (9-spk) = **1,500 total evaluations**.

2. **Preprocessing:** All audio was loaded at the original sample rate (16 kHz) and resampled to 8 kHz for model inference (consistent with training).

3. **Inference:** Each (mixture, reference) pair was passed through the USEF-TFGridNet Stage C model to produce an extracted speech estimate.

4. **Scoring:** SI-SNR was computed between the extracted estimate and the clean target (at 8 kHz). SI-SNRi was computed by subtracting the input SI-SNR (mixture vs. target before extraction).

5. **Comparison:** The same procedure was applied with the original pretrained baseline checkpoint to establish the SI-SNRi baseline for comparison.

---

## Artifact Files

| File | Description |
|---|---|
| `full_evaluation_results.csv` | Complete 1,500-row CSV with per-sample metrics |
| `full_evaluation_results.json` | Same data as JSON array |
| `results.jsonl` | Same data as JSONL (one JSON per line) |
| `evaluation_manifest.json` | Mapping of sample IDs to dataset file paths |
| `category_summary.csv` | Per-category aggregate statistics |
| `pilot_15_results.json` | 15-sample pilot run (preliminary verification) |
| `graph_1_sisnri_comparison.png` | SI-SNRi comparison chart |
| `graph_2_stageC_gain.png` | Stage C gain per category |
| `graph_3_improvement_rate.png` | Improvement rate distribution |

Graphs are located in `../presentation_figures/`.

---

## Provenance Note

The evaluation files do not embed a checkpoint hash (the evaluation was run externally on a cluster).
Provenance is established by:
1. The evaluation column is named `stageC_sisnri_db` (not `finetuned_sisnri_db`)
2. The pilot JSON is named `pilot_15_results` using `stageC_*` column names
3. The evaluation folder is stored alongside the Stage C checkpoint in `Acoustic_PS_FINAL/`
4. The Stage C training log confirms epoch 3 as the final epoch with val SI-SNRi = 12.56 dB

The workspace also contains a separate 10-sample evaluation (`comparison_baseline_vs_finetuned.json`
in `SANADA_final_Project/outputs/evaluation_results/`) that was run against a **different checkpoint**
(epoch-5, unverified provenance). Those results are preserved but are **not** the authoritative evaluation.
