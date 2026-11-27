# USEF-TSE Deployment Fix Report

**Project Root:** `D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef tse project`  
**Constraint Compliance:** `task-1640` was not stopped, restarted, or modified; no checkpoints, evaluation outputs, model architectures, `frontend`, or `frontend-user-mobile` were altered; no `docker build`, model inference, live server startup, or deployment was executed.

---

## 1. Exact Changed Files & Issues Fixed

1. [Dockerfile](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/Dockerfile)
   - **Issue Fixed (Critical Blocker #1):** Added `COPY original-USEF-TSE/models/ /app/original-USEF-TSE/models/` (lines 25–26) so [backend/inference.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/inference.py#L15-L22) can import `Tar_Model` (`models.model_USEF_TFGridNet`) and `TF_gridnet_attentionblock` (`models.local.TFgridnet`) along with their local dependencies (`PositionalEncoding.py`, `get_layer_from_string.py`) without copying training/eval scripts, datasets, or checkpoints from `original-USEF-TSE/`.
   - **Issue Fixed (Single-Worker Enforcement):** Updated `CMD` (line 37) to pass `--workers 1` explicitly, matching the process-local active-download tracking in `backend/app.py`.

2. [.dockerignore](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/.dockerignore)
   - **Issue Fixed (Build Context & Secret/Backup Hygiene):**
     - Excluded `.env` and all `.env.*` variants (`**/.env`, `**/.env.*`), plus defensive key/cert/credential patterns (`**/*.pem`, `**/*.key`, `**/*.crt`, `**/*.p12`, `**/*credentials*`, `**/*secret*`).
     - Excluded root backup/git/scratch/doc directories (`.git`, `.git_nested_backup`, `original_usef_tse_git_backup`, `nested_repo_history.bundle`, `frontend_neon_brutalist_backup`, `frontend_src_neon_brutalist_backup`, `frontend_src_original_backup`, `.vscode`, `docs`, `scratch`, `run_app*.py`).
     - Excluded unused frontend variants (`frontend/`, `frontend-user-mobile/`).
     - Excluded unused `original-USEF-TSE/` subdirectories and scripts (`chkpt`, `config`, `dataset`, `trainer`, `utils`, `*.py`, `*.sh`) while preserving `original-USEF-TSE/models/`.
     - Excluded `backend/temp/*` (negated `!backend/temp/.gitkeep` after `backend/temp/*` so `.gitkeep` is preserved while `backend/temp/` remains traversable), `backend/**/*.orig`, `backend/inference.py.original_backup`, `backend/create_samples.py`, `backend/checkpoints/usef_tfgridnet_wsj02mix.pth.tar` (188 MB unused fallback checkpoint), `backend/samples/eval_ab_tests`, `backend/samples/final_release_extracted_sample.wav`, and `backend/samples/verified_extracted_output.wav`.
     - Preserved `backend/checkpoints/best_stage_c_sanada.pt`, `backend/samples/mixed_speaker.wav`, and `backend/samples/speaker_a_ref.wav`.

3. [backend/app.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/app.py)
   - **Issue Fixed (Single-Process Temp Cleanup TOCTOU Race):**
     - Synchronized `cleanup_expired_temp_files()` (lines 57–79) and `get_audio()` (lines 181–200) under `_active_audio_lock` so the file-existence check, active-download reference increment, active-count check, TTL check, and `path.unlink()` are atomic within a single process.
     - Kept `BackgroundTask(_release_active_audio, filename)` on `FileResponse` plus `except Exception` rollback so download references are reliably released after streaming completes or fails.
   - **Issue Fixed (Explicit Single-Worker Configuration):** Configured `uvicorn.run(app, host=HOST, port=PORT, workers=1)` (line 322) and documented that single-worker mode is required because `_active_audio_counts` is process-local (not multi-worker safe).
   - **Preserved:** All existing API routes (`/health`, `/api/health`, `/api/status`, `/api/samples`, `/api/samples/{filename}`, `/api/audio/{filename}`, `/api/extract`), Stage C checkpoint selection, static serving of `frontend-user/dist`, and `.m4a` HTTP `400` rejection.

4. [backend/.env.example](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/.env.example)
   - **Issue Fixed (Documentation):** Documented the `--workers 1` requirement next to `TEMP_FILE_TTL_SECONDS` (lines 19–20).

---

## 2. Lightweight Static Verification Results

All checks below ran without starting a server, building a Docker image, or loading the PyTorch model:

- **Python Syntax Compilation (`py_compile`):**  
  `backend/app.py`, `backend/inference.py`, `original-USEF-TSE/models/model_USEF_TFGridNet.py`, `original-USEF-TSE/models/local/TFgridnet.py`, `original-USEF-TSE/models/local/PositionalEncoding.py`, `original-USEF-TSE/models/local/get_layer_from_string.py` -> **PASSED** (`exit code 0`, 6 files).
- **Dockerfile Path & Build Context Consistency:**  
  Verified all 12 required source files (`frontend-user/package.json`, `frontend-user/package-lock.json`, `backend/requirements.txt`, `backend/app.py`, `backend/inference.py`, `backend/checkpoints/best_stage_c_sanada.pt`, `backend/samples/mixed_speaker.wav`, `backend/samples/speaker_a_ref.wav`, and the 4 `original-USEF-TSE/models/` Python modules) exist on disk and are not excluded by `.dockerignore`. -> **PASSED**.
- **Stage C Checkpoint SHA-256 Recheck:**  
  [best_stage_c_sanada.pt](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/checkpoints/best_stage_c_sanada.pt):  
  `C184FE04C7C1FEC9C5B1FA00D405365AEEEABFA253EE9B926874E6D000F2A7D6` -> **PASSED (unchanged)**.

---

## 3. Remaining Runtime Tests (**NOT VERIFIED** Until Tested)

Docker image build and live runtime behavior remain **NOT VERIFIED** until `task-1640` completes and the following tests are executed:
1. `docker build -t usef-tse:local .` (verifies `npm ci`, `npm run build`, `pip install`, and `.dockerignore` filtering).
2. Container startup (`docker run --rm -p 8000:8000 -e PORT=8000 usef-tse:local`) and `GET /api/health` confirming `Tar_Model` imports and `best_stage_c_sanada.pt` load cleanly inside the container.
3. Static serving & SPA fallback (`GET /`, `GET /assets/*`, `GET /api/nonexistent` returning HTTP `404`).
4. `.m4a` HTTP `400` rejection and `.wav`/`.mp3`/`.flac`/`.ogg` codec decoding inside `python:3.11-slim` + `libsndfile1`.
5. Concurrent `GET /api/audio/{filename}` streaming alongside `cleanup_expired_temp_files()`.
