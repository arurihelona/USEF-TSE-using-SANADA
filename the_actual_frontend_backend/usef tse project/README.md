# USEF-TSE: Target Speaker Extraction Web Application
## SANADA Fine-Tuned — Stage C Production Release

A full-stack web application for demonstrating **Universal Speaker Embedding Free Target Speaker Extraction (USEF-TSE)** using a USEF-TFGridNet model fine-tuned on the SANADA dataset.

Users upload a multi-speaker audio mixture and a short reference recording of the target speaker, extract the target speaker's voice, listen to the result, and download the extracted audio.

**Based on the research paper:**
USEF-TSE: Universal Speaker Embedding Free Target Speaker Extraction by Z. Bang et al.
[arXiv:2409.02615](https://arxiv.org/abs/2409.02615)

---

## 🧠 Model: USEF-TFGridNet (Stage C, SANADA Fine-Tuned)

The pretrained USEF-TFGridNet was fine-tuned on the **SANADA dataset** using a 3-stage curriculum:

| Stage | Mix Type | Epochs | Best Val SI-SNRi |
|---|---|---|---|
| Stage A | 2-speaker | 10 | 17.49 dB |
| Stage B | 4-speaker | 5 | 14.15 dB |
| **Stage C** | **2+4+9-speaker** | **3** | **12.56 dB** |

**Production checkpoint:** `best_stage_c_sanada.pt`
- SHA-256: `C184FE04C7C1FEC9C5B1FA00D405365AEEEABFA253EE9B926874E6D000F2A7D6`
- Epoch: 3 | Val SI-SNRi: 12.56 dB | Parameters: 15,641,885

**Full evaluation (1,500 test extractions, 0 failures):**
- Mean SI-SNRi: **11.68 dB** (vs baseline 1.71 dB, improvement: **+9.97 dB**)
- 2-speaker: 13.97 dB | 4-speaker: 14.35 dB | 9-speaker: 9.99 dB

See [`docs/STAGE_C_CHECKPOINT.md`](docs/STAGE_C_CHECKPOINT.md),
[`docs/TRAINING_STAGES.md`](docs/TRAINING_STAGES.md), and
[`docs/EVALUATION_RESULTS.md`](docs/EVALUATION_RESULTS.md) for full details.

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- PyTorch 2.0+
- Node.js 18+ and npm

### 1. Install Python dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Verify checkpoint is present

```
backend/checkpoints/best_stage_c_sanada.pt   ← Stage C production model (~179 MB)
backend/checkpoints/usef_tfgridnet_wsj02mix.pth.tar  ← Baseline pretrained (preserved)
```

### 3. Run an application

**Main research/demo interface (port 5173):**
```bash
python run_app.py
```

**Desktop user interface (port 5174):**
```bash
python run_app_user.py
```

**Mobile PWA interface (port 5175, LAN accessible):**
```bash
python run_app_user_mobile.py
```

Each launcher starts the backend and frontend together.
Press **Ctrl+C** to stop both.

---

## 🖥️ Application Interfaces

### 1. Main Research/Demo — `frontend/` (port 5173)

- Full feature set: audio upload, demo samples, model status panel, extraction process visualisation, waveform display
- Shows `InsideExtractionProcess` diagram with timing breakdown
- Includes `AboutResearchSection` with USEF-TSE paper details

### 2. Desktop User — `frontend-user/` (port 5174)

- Clean, focused interface for end users
- Mixture upload + reference upload → extraction → playback + download
- No technical metadata panels

### 3. Mobile PWA — `frontend-user-mobile/` (port 5175)

- Fully responsive mobile-first layout
- LAN accessible from phones on the same Wi-Fi network
- Installable as a Progressive Web App (PWA) via Chrome → "Add to Home screen"

---

## ⚙️ Backend Configuration

The backend (`backend/app.py` + `backend/inference.py`) is a FastAPI server on port 8000.

### Checkpoint priority order

1. `USEF_CHECKPOINT` environment variable (explicit override)
2. `backend/checkpoints/best_stage_c_sanada.pt` ← **default (Stage C, production)**
3. `backend/checkpoints/usef_tfgridnet_wsj02mix.pth.tar` ← fallback (pretrained baseline)

To use the pretrained baseline for comparison (PowerShell):
```powershell
$env:USEF_CHECKPOINT = "checkpoints\usef_tfgridnet_wsj02mix.pth.tar"
python app.py
```

See `backend/.env.example` for more details.

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Fast health check; returns `model_status` |
| GET | `/api/status` | Full model status and name |
| GET | `/api/samples` | Lists bundled demo sample files |
| GET | `/api/samples/{filename}` | Serves a demo sample WAV |
| POST | `/api/extract` | Runs extraction; accepts `mixed_audio` + `reference_audio` |
| GET | `/api/audio/{filename}` | Retrieves extracted output WAV |

Interactive docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 📁 Directory Structure

```
Acoustic_PS_FINAL/
├── the_actual_frontend_backend/
│   └── usef tse project/           ← Main application root
│       ├── backend/
│       │   ├── app.py              ← FastAPI server
│       │   ├── inference.py        ← USEFExtractor engine
│       │   ├── checkpoints/
│       │   │   ├── best_stage_c_sanada.pt          ← Stage C (production)
│       │   │   └── usef_tfgridnet_wsj02mix.pth.tar ← Baseline (preserved)
│       │   ├── samples/            ← Demo audio files
│       │   └── temp/               ← Extracted output files (auto-cleaned)
│       ├── frontend/               ← Research/demo UI (port 5173)
│       ├── frontend-user/          ← Desktop user UI (port 5174)
│       ├── frontend-user-mobile/   ← Mobile PWA (port 5175)
│       ├── original-USEF-TSE/      ← Original model architecture (unmodified)
│       ├── docs/
│       │   ├── STAGE_C_CHECKPOINT.md   ← Checkpoint provenance & verification
│       │   ├── TRAINING_STAGES.md      ← Stage A/B/C training details
│       │   └── EVALUATION_RESULTS.md   ← Full 1,500-sample evaluation
│       ├── run_app.py              ← Launcher: backend + frontend
│       ├── run_app_user.py         ← Launcher: backend + frontend-user
│       └── run_app_user_mobile.py  ← Launcher: backend + frontend-user-mobile
├── SANADA_USEF_Experiments/        ← Stage A/B/C checkpoints & training logs
├── SANADA_Full_Evaluation_Results/ ← Full evaluation data & pilot audio
├── USEF-TSE/                       ← Training notebook & project zip
├── experiments/                    ← Training log copies (stage A/B/C)
└── outputs/
    ├── evaluation_results/         ← 1,500-sample evaluation CSVs & JSONs
    └── presentation_figures/       ← Evaluation graphs
```

---

## 🔊 Audio Pipeline

All audio is processed at **8,000 Hz** (the model's training sample rate):

1. User uploads audio (any sample rate)
2. Backend converts to mono and resamples to 8 kHz
3. USEF-TFGridNet extracts the target speaker in the 8 kHz domain
4. Output is saved as a 16-bit PCM WAV at 8 kHz

Upsampling back to higher rates is intentionally avoided — it would only interpolate silence above 4 kHz without adding real spectral content.

---

## 📊 Evaluation Results Summary

| Condition | Samples | Baseline SI-SNRi | Stage C SI-SNRi | Gain |
|---|---|---|---|---|
| 2-speaker | 200 | 2.17 dB | **13.97 dB** | **+11.80 dB** |
| 4-speaker | 400 | 3.55 dB | **14.35 dB** | **+10.80 dB** |
| 9-speaker | 900 | 0.79 dB | **9.99 dB** | **+9.20 dB** |
| **Overall** | **1,500** | **1.71 dB** | **11.68 dB** | **+9.97 dB** |

Full results: `outputs/evaluation_results/full_evaluation_results.csv`

---

## 📚 Documentation

| Document | Description |
|---|---|
| [`docs/STAGE_C_CHECKPOINT.md`](docs/STAGE_C_CHECKPOINT.md) | Checkpoint SHA-256, epoch, metrics, key format, load verification |
| [`docs/TRAINING_STAGES.md`](docs/TRAINING_STAGES.md) | Stage A/B/C epochs, learning rates, per-epoch metrics |
| [`docs/EVALUATION_RESULTS.md`](docs/EVALUATION_RESULTS.md) | Evaluation methodology, 1,500-sample statistics, provenance |
| [`docs/architecture.jpeg`](docs/architecture.jpeg) | USEF-TFGridNet model architecture diagram |

---

## 🔗 References

- **Paper:** [USEF-TSE: Universal Speaker Embedding Free Target Speaker Extraction](https://arxiv.org/abs/2409.02615)
- **Original code:** [ZBang/USEF-TSE](https://github.com/ZBang/USEF-TSE)
- **Pretrained weights:** [ZBang/USEF-TSE on Hugging Face](https://huggingface.co/ZBang/USEF-TSE)