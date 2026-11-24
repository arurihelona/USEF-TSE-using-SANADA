# SANADA Acoustic_PS — Final Project

**Root:** `D:\3rd_yr_PS\Acoustic_PS\Acoustic_PS_FINAL\`

This is the complete, organized final project for the SANADA Target Speaker Extraction system,
integrating the USEF-TFGridNet model fine-tuned on the SANADA dataset through a 3-stage curriculum.

---

## Directory Layout

```
Acoustic_PS_FINAL/
│
├── the_actual_frontend_backend/
│   └── usef tse project/           ← MAIN APPLICATION (start here)
│       ├── backend/                ← FastAPI server + model inference
│       ├── frontend/               ← Research/demo UI  (port 5173)
│       ├── frontend-user/          ← Desktop user UI   (port 5174)
│       ├── frontend-user-mobile/   ← Mobile PWA        (port 5175)
│       ├── original-USEF-TSE/      ← Original unmodified model source
│       ├── docs/                   ← Checkpoint, training, and evaluation docs
│       ├── run_app.py              ← Launcher: backend + frontend
│       ├── run_app_user.py         ← Launcher: backend + frontend-user
│       ├── run_app_user_mobile.py  ← Launcher: backend + frontend-user-mobile
│       └── README.md               ← Full application documentation
│
├── SANADA_USEF_Experiments/        ← ORIGINAL Google Drive download
│   └── SANADA_USEF_Experiments/
│       ├── stage_A_2spk/           ← Stage A checkpoint + training_log.json
│       ├── stage_B_4spk/           ← Stage B checkpoint + training_log.json
│       └── stage_C_curriculum/
│           ├── best_sanada_usef.pt ← AUTHORITATIVE Stage C checkpoint (epoch 3)
│           └── training_log.json   ← Confirms: 3 epochs, val SI-SNRi=12.56 dB
│
├── SANADA_Full_Evaluation_Results/ ← ORIGINAL Google Drive evaluation download
│   ├── full_evaluation_results.csv ← 1,500 samples, 0 failures
│   ├── full_evaluation_results.json
│   ├── category_summary.csv
│   ├── evaluation_manifest.json
│   ├── pilot_15_results.json
│   ├── pilot_15_results.csv
│   ├── results.jsonl
│   └── independent_verification/   ← Test audio used for verification
│
├── USEF-TSE/                       ← Training notebooks and project zip
│   └── Training Notebooks/
│       └── USEF_TFGridNet_Training.ipynb
│
├── experiments/                    ← Copies of training logs (stage A/B/C)
│   ├── stage_A_2spk/training_log.json
│   ├── stage_B_4spk/training_log.json
│   └── stage_C_curriculum/training_log.json
│
└── outputs/
    ├── evaluation_results/         ← Copies of evaluation CSVs/JSONs
    │   ├── full_evaluation_results.csv
    │   ├── full_evaluation_results.json
    │   ├── category_summary.csv
    │   ├── results.jsonl
    │   ├── evaluation_manifest.json
    │   ├── pilot_15_results.json
    │   └── pilot_15_results.csv
    └── presentation_figures/       ← Evaluation graphs (PNG)
        ├── graph_1_sisnri_comparison.png
        ├── graph_2_stageC_gain.png
        └── graph_3_improvement_rate.png
```

---

## Quick Start

> See `the_actual_frontend_backend/usef tse project/README.md` for full details.

```powershell
cd "the_actual_frontend_backend\usef tse project"

# Research/demo interface
python run_app.py              # → http://localhost:5173

# Desktop user interface
python run_app_user.py         # → http://localhost:5174

# Mobile PWA (also accessible from phone on same Wi-Fi)
python run_app_user_mobile.py  # → http://localhost:5175
```

---

## Production Checkpoint

| Property | Value |
|---|---|
| **File** | `backend/checkpoints/best_stage_c_sanada.pt` |
| **SHA-256** | `C184FE04C7C1FEC9C5B1FA00D405365AEEEABFA253EE9B926874E6D000F2A7D6` |
| **Epoch** | 3 (Stage C final epoch) |
| **Val SI-SNRi** | 12.56 dB |
| **Source** | `SANADA_USEF_Experiments/.../stage_C_curriculum/best_sanada_usef.pt` |

---

## Evaluation Summary

| Condition | Samples | Stage C SI-SNRi | vs Baseline |
|---|---|---|---|
| 2-speaker | 200 | 13.97 dB | +11.80 dB |
| 4-speaker | 400 | 14.35 dB | +10.80 dB |
| 9-speaker | 900 | 9.99 dB | +9.20 dB |
| **Overall** | **1,500** | **11.68 dB** | **+9.97 dB** |

---

## Key Documents

| Document | Location |
|---|---|
| Application README | `the_actual_frontend_backend/usef tse project/README.md` |
| Checkpoint provenance | `...docs/STAGE_C_CHECKPOINT.md` |
| Training stages A/B/C | `...docs/TRAINING_STAGES.md` |
| Evaluation results | `...docs/EVALUATION_RESULTS.md` |
| Integration report | `INTEGRATION_REPORT.md` (this directory) |

---

## Preservation Notes

- **Do not delete** `SANADA_USEF_Experiments/` — it is the original source-of-truth for all checkpoints.
- **Do not delete** `SANADA_Full_Evaluation_Results/` — it is the original evaluation download.
- The epoch-5 checkpoint (`experiments/fine_tuned/best_sanada_usef.pt`) has unknown provenance
  and is kept as a historical artifact only. It is **not** used in production.
- Original backup files (`inference.py.orig`, `app.py.orig`) are preserved in `backend/`.
