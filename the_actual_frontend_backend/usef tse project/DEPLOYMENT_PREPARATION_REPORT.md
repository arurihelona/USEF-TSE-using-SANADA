# USEF-TSE Deployment Preparation Report

**Project Root:** `D:\3rd_yr_PS\Acoustic_PS\Acoustic_PS_FINAL\the_actual_frontend_backend\usef tse project`  
**Selected Deployment Frontend:** `frontend-user` (`frontend` and `frontend-user-mobile` were left untouched)  
**Constraint Compliance:** The active three-model CPU evaluation (`task-1640`) was not stopped, restarted, or modified; no model inference or resource-intensive load tests were executed; no files were published, pushed, or deployed.

---

## 1. Changed and Added Files

### Modified Files
- [frontend-user/src/App.jsx](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/frontend-user/src/App.jsx)
  - Routed `/api/status`, `/api/samples`, sample file fetches, `/api/extract`, `output_url`, and `download_url` through `apiUrl(...)` so `VITE_API_URL` is respected in split-origin deployments while preserving relative `/api/...` paths for local Vite dev proxy and same-origin static serving.
  - Fixed the `samplesData.speaker_a?.name` fallback copy-paste bug in `handleLoadSample`.
- [frontend-user/src/components/AudioUploadCard.jsx](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/frontend-user/src/components/AudioUploadCard.jsx)
  - Removed `.m4a` from `allowedExtensions`, the file-input `accept` attribute, and the supported-formats hint.
  - Added an explicit user-facing error message when a `.m4a` file is dropped or selected: `"M4A is not supported by the server audio decoder. Please convert to WAV, MP3, FLAC, or OGG."`
- [backend/app.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/app.py)
  - Added environment-driven `HOST` (default `0.0.0.0`), `PORT` (default `8000`), `CORS_ORIGINS` (default `*`), `TEMP_FILE_TTL_SECONDS` (default `1800`, min `60`), and `FRONTEND_DIST_DIR` (default `../frontend-user/dist`).
  - Removed `.m4a` from `allowed_extensions` and added explicit HTTP `400` rejection for `.m4a` uploads with a clear user-facing message.
  - Added safe TTL-based cleanup (`cleanup_expired_temp_files()`) for `extracted_speaker_*.wav` and stale `upload_*` files, paired with a thread-safe active-transfer reference counter (`_acquire_active_audio` / `_release_active_audio` via Starlette `BackgroundTask` in `GET /api/audio/{filename}`) so files currently being streamed are never deleted, plus filename traversal validation.
  - Added conditional static serving of `frontend-user/dist` (`/assets` + SPA fallback `GET /{full_path:path}` that does not shadow `/api/*` or `/health`).
- [backend/.env.example](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/.env.example)
  - Documented `HOST`, `PORT`, `CORS_ORIGINS`, `TEMP_FILE_TTL_SECONDS`, and `FRONTEND_DIST_DIR` alongside `USEF_CHECKPOINT`.

### Added Files
- [frontend-user/src/config/api.js](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/frontend-user/src/config/api.js) — `API_BASE_URL` and `apiUrl(path)` helper reading `import.meta.env.VITE_API_URL`.
- [frontend-user/.env.example](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/frontend-user/.env.example) — Documents `VITE_API_URL`.
- [Dockerfile](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/Dockerfile) — Multi-stage build (Node 20 `frontend-user` build + Python 3.11 FastAPI runtime with `libsndfile1`).
- [.dockerignore](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/.dockerignore) — Excludes `node_modules`, `dist`, `frontend/`, `frontend-user-mobile/`, `backend/temp/*`, `.env`, and logs from Docker context.

---

## 2. Checkpoint Preservation

- **Production Checkpoint:** [backend/checkpoints/best_stage_c_sanada.pt](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/checkpoints/best_stage_c_sanada.pt)
- **Verified SHA-256 (unchanged):**  
  `C184FE04C7C1FEC9C5B1FA00D405365AEEEABFA253EE9B926874E6D000F2A7D6`

---

## 3. Lightweight Verification Results

All checks below were non-destructive and ran without loading the PyTorch model or running inference:

- **Python Syntax Check:** `python -m py_compile backend/app.py backend/inference.py` -> **PASSED** (`exit code 0`).
- **Frontend Production Build:** `npm run build` (`vite build`) in `frontend-user` -> **PASSED** (`exit code 0`, `1952` modules transformed in `1.61s`):
  - `dist/index.html` (`2.75 kB` | gzip `0.99 kB`)
  - `dist/assets/index-D1PqHMd-.css` (`46.52 kB` | gzip `8.72 kB`)
  - `dist/assets/index-DqZpB6ft.js` (`276.53 kB` | gzip `83.26 kB`)

---

## 4. Deployment Configuration Instructions

### Option A: Single-Service Deployment (Recommended — Same-Origin FastAPI + Static `frontend-user/dist`)
1. Build `frontend-user` with `VITE_API_URL` unset (or empty) so requests use relative `/api/*` paths.
2. Start the backend (`uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}` or `python app.py`), which automatically detects `frontend-user/dist/index.html` and serves both the SPA and `/api/*`.
3. Optionally set `CORS_ORIGINS`, `TEMP_FILE_TTL_SECONDS`, and `USEF_CHECKPOINT` in the hosting environment (note: `.env` files are not auto-loaded).

### Option B: Split Frontend / Backend Deployment
1. Deploy `backend/` as an API service (`HOST=0.0.0.0`, `PORT` from platform, `CORS_ORIGINS=https://<your-frontend-domain>`).
2. Build `frontend-user` with `VITE_API_URL=https://<your-backend-domain>` and host `frontend-user/dist` on any static host/CDN.

### Local Development Workflow (Preserved)
Running `python run_app_user.py` continues to launch `backend/app.py` on port `8000` and Vite dev server on port `5174` with `/api` proxied to `http://127.0.0.1:8000`.

---

## 5. Exact Commands to Run the Production Application Locally

### Native Local Production Run (PowerShell)
`frontend-user/dist` is already built. To run the production server locally after `task-1640` finishes:
```powershell
cd "D:\3rd_yr_PS\Acoustic_PS\Acoustic_PS_FINAL\the_actual_frontend_backend\usef tse project\backend"
$env:HOST = "0.0.0.0"
$env:PORT = "8000"
python app.py
```
Then open `http://127.0.0.1:8000` in a browser (serves both `frontend-user` and `/api/*`).

To rebuild `frontend-user` before starting:
```powershell
cd "D:\3rd_yr_PS\Acoustic_PS\Acoustic_PS_FINAL\the_actual_frontend_backend\usef tse project\frontend-user"
npm run build
```

### Containerized Local Run (Docker)
```powershell
cd "D:\3rd_yr_PS\Acoustic_PS\Acoustic_PS_FINAL\the_actual_frontend_backend\usef tse project"
docker build -t usef-tse:local .
docker run --rm -p 8000:8000 -e PORT=8000 usef-tse:local
```

---

## 6. Remaining Blockers / Deferred Items

1. **Deferred End-to-End & Load Verification:** Runtime extraction, `.m4a` HTTP 400 test against the live app, and static-serving route checks were deferred until `task-1640` completes to avoid CPU contention.
2. **CPU Inference Latency (~56.7s per 8s clip):** On CPU-only hosts, synchronous `/api/extract` requests may hit 30s–60s reverse-proxy timeouts; production deployments should use a GPU instance, raise gateway timeouts (e.g., `>= 180s`), or add an async job queue for long audio.
3. **Large Checkpoint Size in Container Builds:** `backend/checkpoints/best_stage_c_sanada.pt` is included when building from `backend/` unless excluded and mounted at runtime via `USEF_CHECKPOINT`; verify target registry/platform image size limits before pushing.
