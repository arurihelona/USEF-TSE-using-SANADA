# Focused Verification Report: Interferer-Reference Scaling Bug

**Verdict:** **CONFIRMED BUG** (Scoped to mixture slot indices `s_idx >= 1`, representing **80.0% / 12,000 of 15,000** curriculum training pairs)  
**Date:** November 26, 2026  
**Status:** Read-Only Verification Complete (Production Stage C checkpoint & inference pipeline untouched; zero training started)  
**Verified Baseline Checkpoint:** `best_stage_c_sanada.pt` (SHA-256: `C184FE04C7C1FEC9C5B1FA00D405365AEEEABFA253EE9B926874E6D000F2A7D6`, Epoch 3, `val_loss = 0.1902`, `val_sisnri_db = +12.56 dB`)

---

## 1. Executive Summary

Independent code tracing, mixture reconstruction across 1,500 validation pairs and representative training items, and deterministic PyTorch unit tests **confirm the interferer-reference scaling bug** flagged in [TRAINING_DIFFICULTY_AUDIT.md](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/TRAINING_DIFFICULTY_AUDIT.md), while refining two key technical details:

1. **Exact Mechanism & Scope (Refinement vs. Initial Audit):**
   - Mixtures in `Org_Mix_{2,4,9}_Sounds` were created by keeping **slot `0`** at `0 dB` ($\alpha_0 = 1.0$) and overlaying **slots `1..N-1`** at `-3.0 dB` ($\alpha_j = 10^{-3/20} \approx 0.707946$).
   - `dataset.py` loads unscaled `target_wav` ($\text{gain} = 1.0$) and computes `interferer_chunk = mix_chunk - target_chunk`.
   - For **slot `0` (20.0% of curriculum)**, subtraction cancels the target cleanly (apart from minor PCM-16 saturation clipping in 4/9-speaker mixtures).
   - For **slots `1..N-1` (80.0% of curriculum: 50% of 2-spk, 75% of 4-spk, 88.9% of 9-spk)**, `interferer_chunk` contains a spurious **$-0.2921 \cdot \mathbf{s}_{\text{target}}$** term.
2. **Confirmed Penalty & Adversarial Gradient on Target Output:**
   - At exact clean target output ($\hat{y} = \mathbf{s}_{\text{target}}$), the buggy `interferer_leakage_loss` penalizes perfect extraction with up to **`0.7139`** raw cosine-squared leakage (`mean = 0.1450` in 2-spk, `0.0639` in 4-spk, `0.0260` in 9-spk), compared to **`~0.0001–0.0002`** under a corrected reference.
   - Its negative gradient $-\nabla_{\hat{y}}\mathcal{L}_{\text{leak}}$ at clean target aligns at **$\cos \ge +0.9994$** with $+\mathbf{I}_{\text{true}}$, meaning `interferer_leakage_loss` achieves its zero minimum only when $\hat{y}$ **leaks** $+0.2921\,\mathbf{I}_{\text{true}}$ (`SI-SDR` drops from $+102\text{ dB}$ to $+10.69\text{ dB}$).
3. **Measured Effect Size in Stage C (`gamma_leakage = 0.1`):**
   - On actual Stage C forward/backward checks (`val[1]` across 2/4/9-speaker mixtures), the buggy leakage gradient norm (`0.0001–0.0046`) is small (`0.01%–0.06%`) compared to `SI-SDR + 0.5 * MR-STFT` (`1.89–12.42`), yet measurably **opposes SI-SDR improvement** ($\cos(-\mathbf{g}_{\text{sdr}}, -\mathbf{g}_{\text{leak}}) = -0.3128$ in 2-spk and $-0.2525$ in 4-spk) and **masks real 9-speaker leakage** (`leak_buggy = 0.000155` vs. `leak_true = 0.020604` — a 133x under-report).

---

## 2. Complete Training Pipeline & Code Trace

Verified training scripts in [src/](file:///D:/3rd_yr_PS/Acoustic_PS/SANADA_final_Project/src/) match `SANADA_TSE_Project.zip` bit-for-bit (`dataset.py` SHA-256 prefix `70b33faaa9fe850f`, `losses.py` `c217b09804bd1ae3`, `train.py` `9a0f1b4d61a30ecd`, `model.py` `3226ec582810890a`).

| Stage | File & Lines | Exact Behavior | Scaling / Contamination Impact |
| :--- | :--- | :--- | :--- |
| **Offline Mixture Generation** | [MIX_GENERATOR.ipynb](file:///D:/3rd_yr_PS/Acoustic_PS/SANADA/Code/MIX_GENERATOR.ipynb) (L47–51) | `mixed_audio = AudioSegment.from_file(chosen_clips[0])`; loop `overlay(next_clip - 3.0)` | Slot `0` gain $= 1.0000$; slots `1..N-1` gain $= 10^{-3/20} \approx 0.707946$, plus int16 clipping on peaks. |
| **WAV Loading & Indexing** | [dataset.py](file:///D:/3rd_yr_PS/Acoustic_PS/SANADA_final_Project/src/dataset.py#L18-L31), [L201-L221](file:///D:/3rd_yr_PS/Acoustic_PS/SANADA_final_Project/src/dataset.py#L201-L221) | `int16 / 32768.0`; stores `target_rel = source_files[s_idx]` and `interferer_rels` (`s_idx` other paths) | No RMS/gain normalization. `interferer_rels` is stored in `__init__` and **never loaded** in `__getitem__`. |
| **Target Enrollment Reference** | [dataset.py](file:///D:/3rd_yr_PS/Acoustic_PS/SANADA_final_Project/src/dataset.py#L236-L256) | Samples 2 same-speaker clips from same split, resamples 16k$\to$8k, applies `apply_energy_vad(-30 dB)`, concatenates to `24,000` samples (`3.0s`) | Pure target speaker speech; model forward normalizes `aux / aux.std()` ([model.py](file:///D:/3rd_yr_PS/Acoustic_PS/SANADA_final_Project/src/model.py#L36)). |
| **Mixture & Target Chunking** | [dataset.py](file:///D:/3rd_yr_PS/Acoustic_PS/SANADA_final_Project/src/dataset.py#L258-L277) | Resamples 16k$\to$8k (`sinc_interp_hann`), extracts aligned `32,000`-sample (`4.0s`) slices | In `mix_chunk`: slot `0` has $1.0\,\mathbf{s}_0$, slots `k >= 1` have $0.7079\,\mathbf{s}_k$. `target_chunk` is unscaled ($1.0\,\mathbf{s}_k$). |
| **Interferer Construction (BUG)** | [dataset.py](file:///D:/3rd_yr_PS/Acoustic_PS/SANADA_final_Project/src/dataset.py#L280) | `interferer_chunk = mix_chunk - target_chunk` | Leaves $(0.707946 - 1.0)\,\mathbf{s}_k = \mathbf{-0.292054\,\mathbf{s}_k}$ inside `interferer_chunk` for all `s_idx >= 1`. |
| **Forward Pass Scaling** | [model.py](file:///D:/3rd_yr_PS/Acoustic_PS/SANADA_final_Project/src/model.py#L32-L57) | Normalizes `mix / mix.std()`; multiplies `est_source * mix.std()` | Model output scale follows `mix.std()`, while `MR-STFT` pulls `est` amplitude toward unscaled `1.0 * target`. |
| **Composite Loss Computation** | [train.py](file:///D:/3rd_yr_PS/Acoustic_PS/SANADA_final_Project/src/train.py#L37-L51), [losses.py](file:///D:/3rd_yr_PS/Acoustic_PS/SANADA_final_Project/src/losses.py#L168-L263) | Stage A/B/C weights: $\alpha_{\text{SDR}}=1.0$ (`zero_mean=False`), $\beta_{\text{STFT}}=0.5$, $\gamma_{\text{leak}}=0.1$ | `sisdr` & `leakage` are scale- & sign-invariant (`dot^2` / `s_target^2`); `mr_stft` is scale-sensitive (`stft=0.6355` if `est = 0.7079*s`). |

---

## 3. Empirical Mixture Reconstruction & Target-Leakage Measurements

### 3.1 Representative Training Samples (`SANADATSEDataset`, `split="train"`, 8 kHz)

Comparing unmodified `ds[idx]["interferer"]` (`mix_chunk - target_chunk`) against true scaled source interference $\mathbf{I}_{\text{true}} = \sum_{j \ne k} \alpha_j \mathbf{s}_j$ and gain-corrected subtraction $\mathbf{I}_{\text{sub}} = \text{mix\_chunk} - \alpha_k \text{target\_chunk}$ ($\alpha_0 = 1.0$, $\alpha_{k \ge 1} = 10^{-3/20}$):

| Split / Pair | `s_idx` | Mix Target Gain ($\alpha_k$) | Buggy `target` Coeff in `interferer` | Spurious Target Energy Share | Rel. $L_2$ Error (Buggy $\to$ Sub-Fixed) | Oracle `leakage_loss` (Buggy $\to$ True Src / Sub-Fixed) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **2-Spk `train[0]`** | 0 | `+1.0000` | `+0.0000` | `0.00%` | `0.0001` $\to$ `0.0001` | `0.00007` $\to$ `0.00007` |
| **2-Spk `train[1]`** | 1 | `+0.7079` | **`-0.2921`** | **`58.57%`** | `1.1853` $\to$ **`0.0004`** | **`0.58312`** $\to$ `0.00001` |
| **2-Spk `train[3]`** | 1 | `+0.7079` | **`-0.2921`** | **`56.21%`** | `1.1463` $\to$ **`0.0003`** | **`0.57226`** $\to$ `0.00011` |
| **4-Spk `train[0]`** | 0 | `+0.9989` | `-0.0011` | `0.00%` | `0.0228` $\to$ `0.0228` | `0.00042` $\to$ `0.00035` |
| **4-Spk `train[2]`** | 2 | `+0.7066` | **`-0.2934`** | **`4.36%`** | `0.2142` $\to$ **`0.0108`** | **`0.05021`** $\to$ `0.00025` |
| **9-Spk `train[0]`** | 0 | `+0.9869` | `-0.0131` | `0.00%` | `0.0364` $\to$ `0.0364` | `0.00038` $\to$ `0.00050` |
| **9-Spk `train[1]`** | 1 | `+0.7024` | **`-0.2976`** | **`9.29%`** | `0.3214` $\to$ **`0.0485`** | **`0.09206`** $\to$ `0.00000` |
| **9-Spk `train[7]`** | 7 | `+0.7021` | **`-0.2979`** | **`7.83%`** | `0.2931` $\to$ **`0.0425`** | **`0.07948`** $\to$ `0.00001` |

*Note: Remaining ~3.5–4.8% $L_2$ difference in 9-speaker `sub-fixed` is minor PCM-16 saturation clipping inside `mix_wav` itself, not target leakage.*

### 3.2 Full Validation Split Aggregation (All 300 Mixtures / 1,500 Pairs, `split="val"`)

| Dataset (`val`) | Measured Slot 0 Gain | Measured Slot $\ge 1$ Gain | Spurious Target Energy % (`s_idx >= 1`): Mean / Med / P90 / Max | Oracle `leakage` Buggy (Mean / P90 / Max) | Oracle `leakage` Sub-Fixed (Mean) | Rel. $L_2$ Error (`Buggy` $\to$ `Sub-Fixed`) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Org_Mix_2_Sounds** (200) | `1.0000` | `0.70795` | **14.55%** / 8.41% / 49.11% / **71.06%** | **0.14498** / 0.47930 / **0.71391** | **`0.00009`** | `0.3946` $\to$ **`0.0003`** |
| **Org_Mix_4_Sounds** (400) | `0.9997` | `0.70783` | **6.38%** / 2.97% / 16.81% / **47.77%** | **0.06392** / 0.16877 / **0.46485** | **`0.00016`** | `0.2248` $\to$ **`0.0033`** |
| **Org_Mix_9_Sounds** (900) | `0.9879` | `0.70209` | **2.57%** / 0.36% / 8.85% / **22.34%** | **0.02595** / 0.09234 / **0.21314** | **`0.00018`** | `0.1348` $\to$ **`0.0460`** |

---

## 4. Deterministic Unit Tests & Stage C Gradient Check

### 4.1 Deterministic Unit Test (`2/2` Assertions Passed)
A reproducible script comparing `CompositeTSELoss` under `mix - target` vs. `mix - alpha_k * target` passed all assertions on synthetic orthogonal waveforms (`220 Hz` + `330 Hz`) and real `val[1]` mixtures:
- **Contamination Sweep ($\hat{y} = \mathbf{s}_{\text{target}} + \lambda \mathbf{I}_{\text{true}}$ on orthogonal 2-spk test):**
  - At clean oracle ($\lambda = 0$, $\text{SI-SDR} = +102.04\text{ dB}$): `Leak_BUGGY = 0.078592` (`Total_BUGGY = -102.0333`) vs. `Leak_FIXED = 0.000000` (`Total_FIXED = -102.0412`).
  - At corrupted $\lambda = +0.2921$ ($\text{SI-SDR}$ degraded to **$+10.69\text{ dB}$**): `Leak_BUGGY` drops to **`0.000000`** (`Leak_FIXED = 0.078615`), confirming that the buggy leakage term reaches zero **only when 29.2% interferer leakage is added**.
- **Adversarial Gradient at Clean Oracle ($\hat{y} = \mathbf{s}_{\text{target}}$):**
  - Synthetic 2-spk: $\cos(-\nabla_{\hat{y}}\mathcal{L}_{\text{leak}}, \mathbf{I}_{\text{true}}) = +1.0000$ (`||grad_leak|| = 0.004255` vs. `0.000000` fixed).
  - Real validation `val[1]`: `Org_Mix_2_Sounds` `Leak` $0.14912 \to 0.00062$ (`cos = +0.9997`); `Org_Mix_4_Sounds` $0.17528 \to 0.00007$ (`cos = +1.0000`); `Org_Mix_9_Sounds` $0.02685 \to 0.00060$ (`cos = +0.9994`).

### 4.2 Real Stage C Forward+Backward Check (`best_stage_c_sanada.pt`, No Weight Updates)

| Validation Pair (`slot = 1`) | Output SI-SDR | `Leak_BUGGY` vs `Leak_SUBFIX` | $\|\mathbf{g}_{\text{leak,bug}}\|$ vs $\|\mathbf{g}_{\text{main}}\|$ | Sign / Direction Finding |
| :--- | :---: | :---: | :---: | :--- |
| **2-Spk `val[1]`** | $+16.35\text{ dB}$ | `0.11968` vs `0.00402` (30x) | `0.00464` vs `7.9379` (`0.06%`) | `cos(-g_sdr, -g_leak_bug) = -0.3128` (opposes SI-SDR descent) |
| **4-Spk `val[1]`** | $+17.57\text{ dB}$ | `0.15333` vs `0.00118` (130x) | `0.00246` vs `12.4160` (`0.02%`) | `cos(-g_sdr, -g_leak_bug) = -0.2525` (opposes SI-SDR descent) |
| **9-Spk `val[1]`** | $+6.38\text{ dB}$ | **`0.00015`** vs **`0.01966`** | `0.00010` vs `1.8920` (`0.01%`) | Interferer leak cancelled $-0.2921\,\mathbf{s}_T$, blinding regularizer (true leak = `0.02060`) |

---

## 5. Split Separation & Baseline Checkpoint Confirmation

1. **Train / Val / Test Separation Verified (Zero File or Audio Overlap):**
   - MD5 content hashing of every WAV file in `SANADA` confirms **0 cross-split identical files** (`train&val = 0`, `train&test = 0`, `val&test = 0`):
     - `Multichannel4SpeakersTrim`: `train=4,000`, `val=2,000`, `test=2,000` unique MD5s.
     - `Multichannel9SpeakersTrim`: `train=9,000`, `val=4,500`, `test=4,500` unique MD5s.
     - `Org_Mix_{2,4,9}_Sounds`: each split (`1,000 train`, `100 val`, `100 test`) uses strictly disjoint `source_files` from its own split directory, and `_get_reference_paths` samples enrollment clips strictly within that same split. *(Architectural note: SANADA uses closed-speaker splits—the same 2, 4, or 9 speaker identities appear across splits with disjoint utterance recordings.)*
2. **Stage C Baseline Checkpoint Confirmed:**
   - Production `backend/checkpoints/best_stage_c_sanada.pt` matches `SANADA_USEF_Experiments/stage_C_curriculum/best_sanada_usef.pt` byte-for-byte:
     - **Size:** `188,042,989` bytes | **Params:** `15,641,885`
     - **SHA-256:** `C184FE04C7C1FEC9C5B1FA00D405365AEEEABFA253EE9B926874E6D000F2A7D6`
     - **Metadata:** `epoch = 3`, `val_loss = 0.190160`, `val_sisnri_db = +12.5572 dB`

---

## 6. Smallest Fix & Controlled Experiment Proposal

### 6.1 Smallest Code Correction (`src/dataset.py` Only, Zero Extra I/O)
Keep `target_chunk` untouched (preserving exact Stage C `SI-SDR` / `MR-STFT` targets) and record each speaker's known mixture gain per item in `SANADATSEDataset.__init__` (L214–221):
```python
"target_mix_gain": 1.0 if s_idx == 0 else (10.0 ** (-3.0 / 20.0)),
```
Update line 280 in `SANADATSEDataset.__getitem__`:
```python
interferer_chunk = mix_chunk - item.get("target_mix_gain", 1.0) * target_chunk
```
*Result:* Zero added disk reads, eliminates all `-0.2921 * target` leakage across slots `1..N-1`, and aligns `interferer_chunk` with $\mathbf{I}_{\text{true}}$ (`L2` error $0.395 \to 0.0003$ in 2-spk, $0.225 \to 0.0033$ in 4-spk).

### 6.2 Controlled Experiment Design (Stage C vs. Corrected-Loss)
To isolate the effect of the interferer-reference fix without conflating schedule or silence-loss changes:

1. **Common Starting Point:** Initialize from the exact verified Stage C baseline (`best_stage_c_sanada.pt`, `C184FE04...`), keeping `--mix-type curriculum`, `--num-enroll-samples 2`, `--use-vad`, `--lr 2e-5`, `--batch-size 4 --accum-steps 2`, `--loss-type composite --stft-loss-weight 0.5`, deterministic `seed=42`, for `2`–`3` controlled epochs (separate `--save-dir` per arm; production checkpoint never overwritten):
   - **Arm 1 — Control Continuation (`exp_ctrl_buggy_g01`):** Current `dataset.py` + `gamma_leakage = 0.1` (controls for extra epochs alone, since Stage C stopped at Epoch 3 of 5).
   - **Arm 2 — Minimal Reference Fix (`exp_fixed_ref_g01`):** Corrected `interferer_chunk` + `gamma_leakage = 0.1` (isolates exact causal impact of fixing `dataset.py:280`).
   - **Arm 3 — Sensitivity Check (`exp_fixed_ref_g10`):** Corrected `interferer_chunk` + elevated `gamma_leakage = 1.0` (tests whether giving the now-clean leakage regularizer a non-trivial gradient share reduces competing-speaker bleed).
2. **Held-Out Evaluation Protocol:** Evaluate all checkpoints under identical 16 kHz VAD inference (`src/evaluate.py --use-vad`) on the existing held-out test sets (`Org_Mix_2_Sounds/test` = 200 targets, `Org_Mix_4_Sounds/test` = 400 targets, `Org_Mix_9_Sounds/test` = 900 targets), comparing against Stage C's current benchmark (`+13.97 dB`, `+14.35 dB`, `+9.99 dB` SI-SNRi) plus target-vs-interferer leakage and pause-silence suppression.
