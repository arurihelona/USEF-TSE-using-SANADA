# Comprehensive Training Difficulty Audit

**Document:** `TRAINING_DIFFICULTY_AUDIT.md`  
**Project Path:** `D:\3rd_yr_PS\Acoustic_PS\Acoustic_PS_FINAL\the_actual_frontend_backend\usef tse project`  
**Date:** November 26, 2026  
**Status:** Audit Complete (Read-Only; No Training Started; No Weights Modified)  
**Production Checkpoint Audited:** `best_stage_c_sanada.pt` (SHA-256: `C184FE04C7C1FEC9C5B1FA00D405365AEEEABFA253EE9B926874E6D000F2A7D6`)

---

## Executive Summary

This audit assesses the training difficulty distribution, dataset composition, loss formulation, and optimization trajectories across Stages A, B, and C of the USEF-TFGridNet curriculum.

By analyzing all **3,000 training mixture files** and **15,000 speaker extraction pairs** in the SANADA dataset, parsing the training logs, and inspecting the source code in `train_code.zip` and `SANADA_TSE_Project.zip`, this audit establishes:

1. **Massive Representation of Negative TIR in Training:**
   - In the Stage C curriculum training set (15,000 samples), **$67.71\%$ ($10,157$ samples)** have $\text{TIR} < -5\text{ dB}$, **$51.81\%$ ($7,771$ samples)** have $\text{TIR} < -10\text{ dB}$, **$37.65\%$ ($5,648$ samples)** have $\text{TIR} < -15\text{ dB}$, and **$21.25\%$ ($3,188$ samples)** have $\text{TIR} < -20\text{ dB}$.
   - The difficult 9-speaker test case (`mix_00000.wav`, target `Speaker4`, $\text{TIR} = -16.43\text{ dB}$) is **not an out-of-distribution outlier**; it lies right at the **median of the 9-speaker training distribution ($-16.60\text{ dB}$)**.
2. **Curriculum Implementation Discrepancy:**
   The training script declared `CURRICULUM_RATIOS = [("Org_Mix_2_Sounds", 0.5), ("Org_Mix_4_Sounds", 0.3), ("Org_Mix_9_Sounds", 0.2)]`, but the actual dataset factory instantiated `ConcatDataset([ds2, ds4, ds9])`. Consequently, Stage C was dominated by **$60.0\%$ 9-speaker mixtures ($9,000$ samples)**, **$26.7\%$ 4-speaker mixtures ($4,000$ samples)**, and only **$13.3\%$ 2-speaker mixtures ($2,000$ samples)**.
3. **Loss Function Scaling Bug:**
   In `src/dataset.py` line 280, the composite interferer was formed as `interferer_chunk = mix_chunk - target_chunk`. Because `target_chunk` was taken from the unscaled source files while the mixture had the target scaled by $1/\sqrt{2} \approx 0.7071$, `interferer_chunk` contained $-0.2929 \cdot s_{\text{target}}$. The `interferer_leakage_loss` therefore inadvertently penalized a component of the target speech itself.
4. **Premature Training Termination in Stage C:**
   Stage C completed only **3 of its 5 planned epochs**. Validation loss was actively dropping ($1.85 \to 0.60 \to 0.19$) and validation SI-SNRi was actively climbing ($10.97\text{ dB} \to 12.15\text{ dB} \to 12.56\text{ dB}$). The model was halted before convergence.
5. **Absence of Data Augmentation:**
   Training used static pre-mixed audio files with zero Dynamic Mixing, zero room impulse response (RIR) reverberation, zero pitch/speed perturbation, and zero volume jittering.
6. **Stage D Recommendation:**
   A tightly targeted Stage D fine-tuning is **empirically justified** to address convergence, correct the interferer scaling in the leakage loss, and incorporate silence-penalty conditioning during target speech pauses.

---

## 1. Inspected Files, Configurations & Datasets

### 1.1 Training Notebooks & Scripts
- `SANADA_TSE_Training.ipynb` & `SANADA_USEF_Colab_Training.ipynb`
- `src/train.py`, `src/dataset.py`, `src/losses.py`, `src/model.py` (extracted from `SANADA_TSE_Project.zip`)
- `SANADA_USEF_Experiments/SANADA_USEF_Experiments/` (Stage A, B, C training logs and checkpoints)

### 1.2 Training Metadata Files Audited
- `SANADA/Org_Fsd_Mix/Org_Mix_2_Sounds/train/metadata.csv` (1,000 mixtures $\to$ 2,000 extraction samples)
- `SANADA/Org_Fsd_Mix/Org_Mix_4_Sounds/train/metadata.csv` (1,000 mixtures $\to$ 4,000 extraction samples)
- `SANADA/Org_Fsd_Mix/Org_Mix_9_Sounds/train/metadata.csv` (1,000 mixtures $\to$ 9,000 extraction samples)
- Total training samples analyzed: **15,000 extraction pairs** across **3,000 mixture files**.

---

## 2. Stage A, B, C Training Configurations & Trajectories

### 2.1 Stage Overview & Hyperparameters

| Parameter | Stage A (2-Speaker) | Stage B (4-Speaker) | Stage C (Curriculum Multi-Speaker) |
| :--- | :---: | :---: | :---: |
| **Mixture Type** | `Org_Mix_2_Sounds` | `Org_Mix_4_Sounds` | `curriculum` (2 + 4 + 9 spks) |
| **Initialization** | Pretrained `usef_tfgridnet_wsj02mix` | Stage A Best Checkpoint | Stage B Best Checkpoint |
| **Planned Epochs** | 10 | 5 | 5 |
| **Completed Epochs** | **10 (100%)** | **5 (100%)** | **3 (60% — Terminated Early)** |
| **Base Learning Rate** | $5 \times 10^{-5}$ | $3 \times 10^{-5}$ | $2 \times 10^{-5}$ |
| **Batch Size** | 4 (Effective: 8 with accum=2) | 4 (Effective: 8 with accum=2) | 4 (Effective: 8 with accum=2) |
| **Total Extractions** | 2,000 | 4,000 | 15,000 |
| **Loss Function** | Composite (SI-SDR + STFT + Leak) | Composite (SI-SDR + STFT + Leak) | Composite (SI-SDR + STFT + Leak) |
| **VAD on Reference** | Enabled (`--use-vad`) | Enabled (`--use-vad`) | Enabled (`--use-vad`) |
| **Enrollment Mode** | 2 utterances (`--num-enroll-samples 2`)| 2 utterances (`--num-enroll-samples 2`)| 2 utterances (`--num-enroll-samples 2`)|

### 2.2 Empirical Optimization Trajectory (from `training_log.json`)

```
========================================================================================
Stage A (2-Speaker, 10 Epochs):
  Initial:  val_loss = -3.01,  val_SI-SNRi = +6.17 dB  (Baseline pretrained)
  Epoch 1:  val_loss = -14.50, val_SI-SNRi = +16.36 dB (+10.19 dB jump)
  Epoch 5:  val_loss = -16.26, val_SI-SNRi = +17.10 dB
  Epoch 10: val_loss = -16.93, val_SI-SNRi = +17.49 dB (Best Stage A)
----------------------------------------------------------------------------------------
Stage B (4-Speaker, 5 Epochs):
  Initial:  val_loss = +7.45,  val_SI-SNRi = +0.97 dB  (Pre-fine-tuning on 4-spk)
  Epoch 1:  val_loss = -3.27,  val_SI-SNRi = +11.08 dB (+10.11 dB jump)
  Epoch 3:  val_loss = -5.51,  val_SI-SNRi = +13.21 dB
  Epoch 5:  val_loss = -6.49,  val_SI-SNRi = +14.15 dB (Best Stage B)
----------------------------------------------------------------------------------------
Stage C (Curriculum Multi-Speaker, 3 Epochs Logged):
  Initial:  val_loss = +7.01,  val_SI-SNRi = +6.23 dB  (Pre-fine-tuning on curriculum)
  Epoch 1:  val_loss = +1.85,  val_SI-SNRi = +10.97 dB
  Epoch 2:  val_loss = +0.60,  val_SI-SNRi = +12.15 dB
  Epoch 3:  val_loss = +0.19,  val_SI-SNRi = +12.56 dB (Production Model Checkpoint)
========================================================================================
```

**Key Finding:** Stage C validation loss had **not converged**. From Epoch 1 to Epoch 3, validation loss dropped steadily by $1.66$ units, and validation SI-SNRi was improving by $+0.4\text{ dB to }+1.2\text{ dB}$ per epoch. Halting at Epoch 3 left remaining optimization gains on the table.

---

## 3. Training Mixture TIR Distribution & Extreme Difficulty Analysis

All 15,000 training examples were reconstructed sample-by-sample from their constituent stems. The Target-to-Interference Ratio was computed as:

$$\text{TIR}_k = 10 \log_{10}\left( \frac{\|\alpha_k \mathbf{s}_k\|^2}{\|\sum_{j \ne k} \alpha_j \mathbf{s}_j\|^2} \right)$$

where $\alpha_1 = 1.0$ and $\alpha_{2..N} = 1/\sqrt{2}$.

### 3.1 Statistical Distribution Across Dataset Splits

| Metric | Org_Mix_2_Sounds (2-spk) | Org_Mix_4_Sounds (4-spk) | Org_Mix_9_Sounds (9-spk) | Stage C Total (Curriculum) |
| :--- | :---: | :---: | :---: | :---: |
| **Number of Mixtures** | 1,000 | 1,000 | 1,000 | 3,000 |
| **Extraction Pairs** | 2,000 | 4,000 | 9,000 | **15,000** |
| **Curriculum Share (%)** | 13.3% | 26.7% | 60.0% | **100.0%** |
| **Mean TIR (dB)** | **0.00 dB** | **-6.85 dB** | **-16.29 dB** | **-11.60 dB** |
| **Median TIR (dB)** | **0.00 dB** | **-6.67 dB** | **-16.60 dB** | **-10.42 dB** |
| **Standard Deviation** | 10.98 dB | 6.87 dB | 11.05 dB | 11.52 dB |
| **10th Percentile (P10)** | -13.49 dB | -15.21 dB | -34.21 dB | -26.35 dB |
| **25th Percentile (P25)** | -7.86 dB | -11.98 dB | -22.15 dB | -17.10 dB |
| **75th Percentile (P75)** | +7.86 dB | -1.71 dB | -6.28 dB | -3.85 dB |
| **90th Percentile (P90)** | +13.49 dB | +1.39 dB | -2.23 dB | +3.12 dB |
| **Minimum TIR (dB)** | -78.93 dB | -79.94 dB | -45.74 dB | -79.94 dB |
| **Maximum TIR (dB)** | +78.93 dB | +12.98 dB | +7.80 dB | +78.93 dB |

---

### 3.2 Exact Threshold Counts: Negative TIR Examples

Counting training examples below challenging acoustic thresholds:

| Threshold | Org_Mix_2_Sounds (out of 2,000) | Org_Mix_4_Sounds (out of 4,000) | Org_Mix_9_Sounds (out of 9,000) | Total Curriculum (out of 15,000) |
| :--- | :---: | :---: | :---: | :---: |
| **TIR < -5 dB** | **692 (34.60%)** | **2,289 (57.23%)** | **7,176 (79.73%)** | **10,157 (67.71%)** |
| **TIR < -10 dB** | **295 (14.75%)** | **1,384 (34.60%)** | **6,092 (67.69%)** | **7,771 (51.81%)** |
| **TIR < -15 dB** | **89 (4.45%)** | **434 (10.85%)** | **5,125 (56.94%)** | **5,648 (37.65%)** |
| **TIR < -20 dB** | **11 (0.55%)** | **42 (1.05%)** | **3,135 (34.83%)** | **3,188 (21.25%)** |

### 3.3 Critical Findings on Dataset Coverage:
1. **Extensive Coverage of Weak Targets:** Over **half of the entire curriculum ($51.81\%$, 7,771 examples)** has an input TIR below $-10\text{ dB}$, and **over a third ($37.65\%$, 5,648 examples)** has a TIR below $-15\text{ dB}$.
2. **Dominant Interferers in Training:**
   In `Org_Mix_9_Sounds`, **$62.59\%$ ($5,633$ examples)** have at least one single competing speaker that is **$>10\text{ dB}$ louder than the target** (mean dominant interferer ratio = $+13.25\text{ dB}$, max = $+43.74\text{ dB}$). The model was exposed to thousands of mixtures with overwhelmingly loud interferers.

---

## 4. Comparison: Training Difficulty vs. Difficult 9-Speaker Test Case

We compared our benchmark 9-speaker test mixture (`mix_00000.wav`, target `Speaker4`) against the empirical training distribution:

| Metric | Difficult 9-Spk Test Case | 9-Spk Training Distribution | Curriculum Training Total | Test Case Assessment |
| :--- | :---: | :---: | :---: | :--- |
| **Input TIR** | **-16.43 dB** | Median: **-16.60 dB** (Mean: -16.29) | Median: **-10.42 dB** | **Typical 9-spk mixture** (49th percentile) |
| **Input SI-SNR** | **-16.15 dB** | Median: **-16.48 dB** (Mean: -16.12) | Median: **-10.25 dB** | Matches median 9-spk training difficulty |
| **Target Energy Share** | **2.18%** | Median: **2.14%** (Mean: 2.30%) | Median: **8.31%** | Standard 9-speaker target energy |
| **Dominant Interferer Ratio** | **+15.80 dB** (`Speaker8`) | Median: **+13.26 dB** (Mean: +13.25) | Median: **+7.42 dB** | Moderately higher than average ($72\text{nd}$ percentile) |
| **Target Speech Activity** | **78.1%** ($1.75\text{s}$ pause) | Median: **71.8%** (Mean: 70.7%) | Median: **75.4%** | Normal conversational pauses |

### Conclusion on Difficulty:
The test case `mix_00000.wav` is **not an anomalous edge case**. It represents the exact center (median) of the 9-speaker training distribution. The reason the Stage C model achieved $-7.95\text{ dB}$ output SI-SNR on this test case is that **$-7.81\text{ dB}$ is the average performance ceiling of the Stage C checkpoint across the 9-speaker domain**.

---

## 5. Identified Training Gaps & Architectural Root Causes

### Gap 1: Inverted Target Leakage in Loss Function
- **Mechanism:** In `src/dataset.py`:
  ```python
  interferer_chunk = mix_chunk - target_chunk
  ```
  Since `target_chunk` is unscaled while in `mix_chunk` it is scaled by $\alpha = 0.7071$, the subtraction yields:
  $$\text{interferer\_chunk} = (\alpha \cdot s_{\text{target}} + \sum \alpha_j s_j) - s_{\text{target}} = \sum \alpha_j s_j - 0.2929 \cdot s_{\text{target}}$$
- **Consequence:** In `interferer_leakage_loss`, the loss penalizes cross-correlation between `est` and `interferer_chunk`. Because `interferer_chunk` contains a negative replica of `s_target`, the model is penalized whenever it outputs target speech with high fidelity, creating an artificial ceiling on target reconstruction.

### Gap 2: Premature Termination of Stage C
- Stage C completed only 3 epochs. Validation loss had fallen from $1.85 \to 0.60 \to 0.19$, showing no plateau. Running the remaining 2 scheduled epochs (or extending to 10 epochs) would have provided further SI-SNR gains.

### Gap 3: Absence of Silence Penalty During Target Pauses
- **Mechanism:** When the target speaker pauses (e.g., $3.0\text{s} - 4.75\text{s}$), $s_{\text{target}}(t) \approx 0$.
- In the standard SI-SDR loss, when target power is near zero, gradient magnitude drops. The network is not explicitly penalized for emitting low-level residual sounds during silence.
- **Consequence:** Cross-attention weights remain non-zero during pauses, allowing competing voices to leak through unmasked.

### Gap 4: Zero Dynamic Mixing / Data Augmentation
- The model was trained on a static set of 1,000 mixtures per mix type.
- By contrast, modern state-of-the-art TSE architectures (e.g., Conv-TasNet, SepFormer, TF-GridNet on WSJ0/LibriMix) employ **on-the-fly dynamic mixing**, randomly sampling $N$ utterances from the single-speaker pool with randomized relative SNRs ($-10\text{ dB}$ to $+10\text{ dB}$) at every training step.
- Static mixtures limit exposure to diverse speaker combinations and energy ratios.

---

## 6. Recommendations Regarding Stage D Training

### 6.1 Recommendation Verdict: JUSTIFIED (Controlled Fine-Tuning Only)

A targeted **Stage D fine-tuning** is justified, but only if conducted under strict architectural and safety boundaries:
- **Preserve Stage C as Production Baseline:** Stage C must remain untouched and selectable.
- **Do Not Train from Scratch:** Initialize strictly from Stage C (`best_stage_c_sanada.pt`).
- **Targeted Corrections Only:** Stage D should focus specifically on fixing the loss scaling bug and training on difficult mixtures.

### 6.2 Proposed Stage D Strategy (If Approved by User)

1. **Fix Composite Interferer Calculation:**
   Correct `src/dataset.py` so that `target_chunk` is scaled by its actual mixture mixing coefficient $\alpha_k$ before subtraction:
   $$\mathbf{s}_{\text{interf}} = \mathbf{x}_{\text{mix}} - \alpha_k \cdot \mathbf{s}_{\text{target}}$$
   This eliminates the $-0.2929 \cdot s_{\text{target}}$ self-leakage penalty.
2. **Incorporate Temporal Silence / Inactivity Penalty:**
   Add a targeted silence loss term active only during target speech pauses (where target energy $< -30\text{ dB}$):
   $$\mathcal{L}_{\text{silence}} = \frac{1}{|\mathcal{T}_{\text{pause}}|} \sum_{t \in \mathcal{T}_{\text{pause}}} |\hat{y}(t)|^2$$
   This directly trains the network to suppress residual competing speech during conversational pauses.
3. **Hard-Example Curriculum Weighting:**
   Instead of equal sampling, weight training toward mixtures with $\text{TIR} < -10\text{ dB}$ ($51.8\%$ of dataset), ensuring the optimizer focuses capacity where speaker leakage is most audible.
4. **Learning Rate & Epoch Schedule:**
   Use a conservative fine-tuning learning rate ($1 \times 10^{-5}$, with cosine decay) over 5 epochs to prevent catastrophic forgetting of 2- and 4-speaker separation.

---

## 7. Audit Summary Table

| Audit Area | Finding | Numerical Evidence |
| :--- | :--- | :---: |
| **Existing Stage C Status** | Checkpoint authentic; stopped early | Completed 3 of 5 epochs (val loss $0.19$, SI-SNRi $12.56\text{ dB}$) |
| **Training Dataset Size** | Fully present on disk | 15,000 extraction pairs across 3,000 mixtures |
| **Negative TIR Representation** | Overwhelmingly present | $67.71\%$ below $-5\text{ dB}$; $51.81\%$ below $-10\text{ dB}$; $37.65\%$ below $-15\text{ dB}$ |
| **Dominant Interferers** | Prevalent in 9-spk training | $62.59\%$ of 9-spk training examples have an interferer $>10\text{ dB}$ louder |
| **Test Case Classification** | Normal 9-spk mixture | Input $\text{TIR} = -16.43\text{ dB}$ sits at the 49th percentile (median $-16.60\text{ dB}$) |
| **Curriculum Sampling Bug** | Intended ratios not applied | ConcatDataset created $60\%$ 9-spk, $27\%$ 4-spk, $13\%$ 2-spk (bypassing 50/30/20) |
| **Loss Function Bug** | Self-leakage penalty | `mix - target` leaves $-0.29 \cdot s_{\text{target}}$ in interferer tensor |
| **Data Augmentation** | Completely absent | Zero dynamic mixing, zero RIR reverberation, zero pitch/speed augmentation |
| **Pause Leakage Cause** | Loss lacks silence penalty | Low gradient during pauses allows competing voices to leak through unmasked |
