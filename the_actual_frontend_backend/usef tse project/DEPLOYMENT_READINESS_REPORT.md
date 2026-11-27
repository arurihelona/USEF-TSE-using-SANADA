# USEF-TSE Deployment Readiness Audit Report

**Target Project:** `D:\3rd_yr_PS\Acoustic_PS\Acoustic_PS_FINAL\the_actual_frontend_backend\usef tse project`  
**Audit Mode:** Read-only inspection + non-destructive local verification (`FastAPI TestClient`, `Vite` production builds to scratch, `oxlint`, `soundfile` codec check). No project source files, checkpoints, or running evaluations were modified, and no deployment was performed.

---

## Executive Verdict

- **Local Development Status:** **READY** — The FastAPI backend, Stage C checkpoint (`best_stage_c_sanada.pt`), and all three React/Vite frontends (`frontend`, `frontend-user`, `frontend-user-mobile`) build and run end-to-end locally.
- **Production / Cloud Deployment Status:** **NOT READY (BLOCKED BY SPECIFIC GAPS)** — The application currently relies on Vite's development server proxy (`/api` -> `http://127.0.0.1:8000`), binds Uvicorn exclusively to `127.0.0.1:8000`, lacks containerization/reverse-proxy/static-serving configuration, accepts `.m4a` uploads that fail decoding in `soundfile`, and does not clean up generated output `.wav` files in `backend/temp/`.

---

## 1. Frontend Framework, Entry Points, and Current Functionality

The project contains **three separate React 19 + Vite 8 + Tailwind CSS v4** frontend applications, each with its own dev port and launcher:

| Variant | Package & Entry Point | Dev Port | Vite Config & Proxy | Launcher |
|---|---|---:|---|---|
| **Research / Full UI** (`frontend`) | [frontend/package.json](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/frontend/package.json), [frontend/src/App.jsx](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/frontend/src/App.jsx) | `5173` | [frontend/vite.config.js](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/frontend/vite.config.js) (`/api` -> `http://127.0.0.1:8000`) | [run_app.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/run_app.py) |
| **Simplified User UI** (`frontend-user`) | [frontend-user/package.json](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/frontend-user/package.json), [frontend-user/src/App.jsx](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/frontend-user/src/App.jsx) | `5174` | [frontend-user/vite.config.js](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/frontend-user/vite.config.js) (`/api` -> `http://127.0.0.1:8000`) | [run_app_user.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/run_app_user.py) |
| **Mobile User UI** (`frontend-user-mobile`) | [frontend-user-mobile/package.json](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/frontend-user-mobile/package.json), [frontend-user-mobile/src/App.jsx](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/frontend-user-mobile/src/App.jsx) | `5175` (`host: true`) | [frontend-user-mobile/vite.config.js](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/frontend-user-mobile/vite.config.js) (`/api` -> `http://127.0.0.1:8000`) | [run_app_user_mobile.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/run_app_user_mobile.py) |

### Stack & Functionality
- **Dependencies (all three):** `react` `^19.3.1`, `react-dom` `^19.3.1`, `lucide-react` `^1.62.0`, `vite` `^8.3.5`, `@tailwindcss/vite` `^4.3.3`, `@vitejs/plugin-react` `^6.1.2`.
- **Linting:** Only `frontend` defines `"lint": "oxlint"` (`oxlint` `^1.89.0`); `frontend-user` and `frontend-user-mobile` have no `lint` script.
- **Core UI Workflow:** Checks backend status (`GET /api/status`), loads built-in sample metadata (`GET /api/samples`), accepts mixed audio and speaker-reference audio (via file upload, sample load, or recording depending on variant), submits `POST /api/extract`, and renders waveform playback and `.wav` download via [OutputSection.jsx](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/frontend/src/components/OutputSection.jsx).

---

## 2. Backend Framework, API Endpoints, and Inference Pipeline

- **Framework:** FastAPI + Uvicorn ([backend/app.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/app.py)), with permissive CORS (`allow_origins=["*"]`, `allow_methods=["*"]`, `allow_headers=["*"]`).
- **Startup Initialization:** Instantiates `USEFExtractor(async_init=True)` ([backend/inference.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/inference.py)) so the server accepts requests immediately while loading the checkpoint on a background thread.
- **Endpoints ([backend/app.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/app.py)):**
  - `GET /health` and `GET /api/health` — Returns service status, `model_status` (`loading` / `ready` / `error`), `device`, and `init_duration`.
  - `GET /api/status` — Returns model readiness, `model_name`, `device`, `sample_rate` (reports `extractor.TARGET_SR = 8000`), and `init_duration`.
  - `GET /api/samples` — Lists built-in demo audio (`mixed_speaker.wav`, `speaker_a_ref.wav`) and URLs.
  - `GET /api/samples/{filename}` — Serves sample `.wav` files.
  - `GET /api/audio/{filename}` — Serves extracted `.wav` files from `backend/temp/`.
  - `POST /api/extract` — Accepts multipart `mix_file` + `ref_file` (or `mix_sample` + `ref_sample`), saves temporary uploads to `backend/temp/`, runs extraction, writes `extracted_speaker_<id>.wav` (`16000 Hz`, `PCM_16`), and returns JSON metadata + `output_url` / `download_url`.
- **Inference Pipeline ([backend/inference.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/inference.py)):**
  - Loads audio via `soundfile.read(..., dtype="float32")`.
  - Resamples inputs to `TARGET_SR = 8000` Hz using `torchaudio.transforms.Resample(..., resampling_method="sinc_interp_hann")`.
  - Applies energy-based VAD (`apply_energy_vad`) to reference audio.
  - Runs `USEF-TFGridNet` forward pass on CPU (or CUDA if available).
  - Resamples output to `OUTPUT_SR = 16000` Hz and writes 16-bit PCM WAV via `soundfile.write(..., 16000, subtype="PCM_16")`.

---

## 3. Connected Model Checkpoint

- **Resolution Logic:** `_resolve_checkpoint_path()` in [backend/inference.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/inference.py) checks the `USEF_CHECKPOINT` environment variable first, and otherwise defaults to:
  `D:\3rd_yr_PS\Acoustic_PS\Acoustic_PS_FINAL\the_actual_frontend_backend\usef tse project\backend\checkpoints\best_stage_c_sanada.pt`
- **Verified SHA-256 of `best_stage_c_sanada.pt`:**  
  `C184FE04C7C1FEC9C5B1FA00D405365AEEEABFA253EE9B926874E6D000F2A7D6`

---

## 4. Verification That `best_stage_c_sanada.pt` Loads Correctly

Verified via read-only `FastAPI TestClient` run:
- `[MODEL] Checkpoint: USEF-TFGridNet (Stage C, SANADA fine-tuned, epoch 3, val SI-SNRi=12.56 dB)`
- `[MODEL] Key format detected: fine-tuned-clean (no prefix transformation needed)`
- `[MODEL] Strict load: missing=0, unexpected=0`
- `[MODEL] Initialization completed in 0.84 seconds` (`15,641,885 parameters on CPU`)

---

## 5. Audio Upload, Speaker-Reference Input, and Extracted-Audio Playback/Download

Verified end-to-end through `FastAPI TestClient` using the built-in samples (`mixed_speaker.wav`, `speaker_a_ref.wav`):
- `GET /api/health` -> `200 OK` (`model_status: 'ready'`, `device: 'cpu'`, `init_duration: 0.84`)
- `GET /api/status` -> `200 OK` (`status: 'ready'`, `sample_rate: 8000`, `init_duration: 0.84`)
- `GET /api/samples` -> `200 OK` (`mixed_speaker.wav`, `speaker_a_ref.wav`)
- `POST /api/extract` -> `200 OK`:
  - `output_filename`: `extracted_speaker_2cde9a0e0f.wav`
  - `output_url` / `download_url`: `/api/audio/extracted_speaker_2cde9a0e0f.wav`
  - `mix_duration`: `8.0`s, `ref_duration`: `8.0`s, `extracted_duration`: `8.0`s
  - `processing_time`: `56.71`s (`inference_time`: `56.64`s, `preprocess_time`: `0.064`s, `save_time`: `0.005`s) on CPU
  - `sample_rate`: `16000`
- `GET /api/audio/extracted_speaker_2cde9a0e0f.wav` -> `200 OK` (`256044` bytes, `content-type: audio/wav`)
- **Output WAV verification:** `sr=16000`, `samples=128000` (8.0s), `rms=0.07643`, `peak=0.66965`. (Temporary test output was removed after verification.)

---

## 6. Frontend–Backend Communication

- **Local Dev:** Works via Vite's `server.proxy` (`/api` -> `http://127.0.0.1:8000`) configured in all three `vite.config.js` files.
- **Production Gap:** All three frontends hardcode relative `/api/...` paths in `src/App.jsx` (`/api/status`, `/api/samples`, `/api/extract`, `result.output_url`, `result.download_url`) with **no `VITE_API_URL` environment variable support**. Furthermore, [backend/app.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/app.py) does **not** mount `StaticFiles` for any built `dist/` bundle. Without an external reverse proxy (e.g., Nginx/Caddy) routing `/api` to FastAPI and `/` to the static frontend, a production frontend build cannot reach the backend.

---

## 7. Environment Variables, Dependencies, and Deployment Configuration

- **Backend Dependencies:** [backend/requirements.txt](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/requirements.txt) lists `fastapi>=0.100.0`, `uvicorn>=0.23.0`, `python-multipart>=0.0.6`, `torch>=2.0.0`, `torchaudio>=2.0.0`, `soundfile>=0.12.1`, `scipy>=1.10.0`, `numpy>=1.24.0`, `PyYAML>=6.0`.
- **Environment Variables:** Only [backend/.env.example](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/.env.example) exists (documenting `USEF_CHECKPOINT`). There is no `.env` file, and `app.py` does **not** auto-load `.env` (`python-dotenv` is not used).
- **Deployment Configs:** No `Dockerfile`, `docker-compose.yml`, `Procfile`, `nginx.conf`, `render.yaml`, or systemd/process manager config exists in the repository.

---

## 8. Safe Build & Lint Test Results

All three Vite production builds were executed cleanly into a temporary scratch directory (leaving the repository untouched):
- `frontend`: `vite build` succeeded in `1.40s` (`1954` modules; `index.html` 2.86 kB, JS 312.96 kB, CSS 59.51 kB).
- `frontend-user`: `vite build` succeeded in `1.93s` (`1951` modules; `index.html` 2.75 kB, JS 276.22 kB, CSS 46.52 kB).
- `frontend-user-mobile`: `vite build` succeeded in `1.89s` (`1949` modules; `index.html` 2.82 kB, JS 268.51 kB, CSS 33.97 kB).
- `frontend` (`npm run lint` / `oxlint`): **0 errors, 10 warnings** across 22 files in 61 ms (unused imports/catch variables, `only-export-components`, `Date` purity, `set-state-in-effect`).

---

## 9. Missing Components & Defects Preventing Production Deployment

1. **No Production Serving / API Base URL Configuration:** Frontends rely exclusively on Vite dev proxy for `/api/*` and have no `VITE_API_URL` fallback; FastAPI does not serve built `dist/` static assets, and no reverse-proxy config (`nginx.conf`, etc.) is present.
2. **Localhost-Only Uvicorn Binding:** [backend/app.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/app.py#L219) hardcodes `uvicorn.run(app, host="127.0.0.1", port=8000)` instead of binding `0.0.0.0` / reading `PORT`.
3. **`.m4a` Upload Format Mismatch:** [backend/app.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/app.py#L145) accepts `.m4a` in `allowed_extensions` (`{".wav", ".mp3", ".flac", ".ogg", ".m4a"}`), but `soundfile` in this environment reports **`M4A supported: False`** (`MP3 supported: True`), causing `.m4a` uploads to fail at `sf.read(...)` in [backend/inference.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/inference.py#L397).
4. **Unbounded `backend/temp/` Disk Growth:** [backend/app.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/app.py#L207-L215) cleans up `upload_mix_*` and `upload_ref_*` in `finally`, but never deletes generated `extracted_speaker_*.wav` files.
5. **Minor Frontend Sample-Load Bug:** In [frontend/src/App.jsx](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/frontend/src/App.jsx#L124) (and identically in `frontend-user` and `frontend-user-mobile` at line 144), a copy-paste condition reads `else if (samplesData.speaker_a?.name) refFilename = samplesData.reference.name;`, which would throw if `speaker_a` existed without `reference`.
6. **Sample Rate Metadata Mismatch:** `/api/status` ([backend/app.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/app.py#L63)) reports `sample_rate: 8000` (model internal `TARGET_SR`), whereas `/api/extract` returns `sample_rate: 16000` (`OUTPUT_SR`).
7. **CPU Inference Latency & Single-Process Concurrency:** An 8.0s mixture takes ~56.7s on CPU; in production without GPU or async job queuing / request timeouts, concurrent requests or long audio files risk HTTP gateway timeouts (e.g., 30s–60s reverse-proxy limits).
8. **Missing Containerization & Environment Loading:** No `Dockerfile`, `docker-compose.yml`, or `.env` auto-loading is configured.
