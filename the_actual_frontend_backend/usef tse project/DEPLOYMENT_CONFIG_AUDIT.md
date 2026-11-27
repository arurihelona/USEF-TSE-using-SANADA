# USEF-TSE Deployment Configuration Audit

**Project Root:** `D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef tse project`  
**Audit Method:** Read-only static inspection and checkpoint SHA-256 verification. No application files, checkpoints, or evaluation outputs were modified; no model inference, backend server startup, or Docker build was executed; `task-1640` was untouched.

---

## Summary Table

| # | Audit Area | Static Inspection | Runtime Verification | Key Finding |
|---|---|---|---|---|
| 1 | Checkpoint availability & SHA-256 | **PASS** | **NOT VERIFIED** (in Docker) | `best_stage_c_sanada.pt` resolves to expected path; SHA-256 verified unchanged. |
| 2 | Dockerfile, deps, build paths, ports, startup | **FAIL** | **NOT VERIFIED** | **Blocker:** `Dockerfile` does not copy `original-USEF-TSE/`, breaking `backend/inference.py` imports. |
| 3 | Frontend–backend API route & upload alignment | **PASS** | **NOT VERIFIED** | All `frontend-user` routes (`status`, `samples`, `extract`, `audio`) and `.m4a` rejection match `backend/app.py`. |
| 4 | Static serving & SPA fallback (`/api/*` safety) | **PASS** | **NOT VERIFIED** | Registered after API routes; `/api/*` explicitly returns 404 instead of `index.html`. |
| 5 | Temp cleanup & active-download race safety | **FAIL** (multi-worker) / **PASS** (single-worker*) | **NOT VERIFIED** | In-process `_active_audio_counts` is unsafe with `--workers > 1`; minor single-process TOCTOU window. |
| 6 | `.dockerignore` hygiene & secrets/large-file exclusion | **FAIL** | N/A | Misses `**/.env.*`, `backend/samples/eval_ab_tests/`, `*.orig`/backup files, and large root backup dirs. |
| 7 | Documented commands, env vars & runtime assumptions | **PASS** (docs/code match) | **NOT VERIFIED** | Commands and env vars match code; container build, codecs, and live HTTP routing require runtime tests. |

---

## Detailed Audit Findings

### 1. Checkpoint Availability & SHA-256 (`PASS` — Static Inspection + Hash Check)
- **Expected Path in Inference:** [backend/inference.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/inference.py#L15) defines `ROOT_DIR = Path(__file__).resolve().parent.parent`, and `_resolve_checkpoint_path()` ([backend/inference.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/inference.py#L228-L239)) resolves `ROOT_DIR / "backend" / "checkpoints" / "best_stage_c_sanada.pt"` when `USEF_CHECKPOINT` is unset.
- **Docker Path Alignment:** [Dockerfile](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/Dockerfile#L15-L25) sets `WORKDIR /app/backend` and runs `COPY backend/ ./`, placing the checkpoint at `/app/backend/checkpoints/best_stage_c_sanada.pt` (matching `ROOT_DIR = /app`). [.dockerignore](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/.dockerignore) does not exclude `backend/checkpoints/` or `*.pt`.
- **SHA-256 Verification:** On-disk `Get-FileHash -Algorithm SHA256` of [best_stage_c_sanada.pt](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/checkpoints/best_stage_c_sanada.pt) (`188,042,989` bytes) returned:
  `C184FE04C7C1FEC9C5B1FA00D405365AEEEABFA253EE9B926874E6D000F2A7D6`  
  Matches the documented production hash in [backend/inference.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/inference.py#L155).

---

### 2. Dockerfile, Dependencies, Build Paths, Ports & Startup (`FAIL` — Static Inspection)
- **BLOCKER (`FAIL`):** [backend/inference.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/inference.py#L16-L26) requires `ORIGINAL_REPO_DIR = ROOT_DIR / "original-USEF-TSE"` on `sys.path` to import `models.model_USEF_TFGridNet.Tar_Model` and `models.local.TFgridnet.TF_gridnet_attentionblock`. However, [Dockerfile](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/Dockerfile#L25-L26) only copies `backend/` and `/app/frontend-user/dist` — **`original-USEF-TSE/` is never copied into `/app/original-USEF-TSE/`**. Inside the container, `USEF_IMPORTS_AVAILABLE` will be `False` and model initialization will fail.
- **Internal Consistency (`PASS` on ports/paths):**
  - `frontend-builder` ([Dockerfile](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/Dockerfile#L1-L11)) builds `frontend-user` into `/app/frontend-user/dist` with `ARG VITE_API_URL=""`.
  - `runtime` ([Dockerfile](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/Dockerfile#L14-L35)) installs `libsndfile1` and [backend/requirements.txt](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/requirements.txt), copies `dist` to `/app/frontend-user/dist`, sets `HOST=0.0.0.0`, `PORT=8000`, `FRONTEND_DIST_DIR=/app/frontend-user/dist`, exposes `8000`, and starts `uvicorn app:app --host ${HOST:-0.0.0.0} --port ${PORT:-8000}`.
- **Runtime Dependency Support (`NOT VERIFIED`):** Whether `libsndfile1` in `python:3.11-slim` decodes `.mp3`, `.flac`, and `.ogg` without extra OS codecs cannot be verified without building and running the image.

---

### 3. Frontend–Backend API Path & Validation Alignment (`PASS` — Static Inspection)
- **API URL Helper:** [frontend-user/src/config/api.js](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/frontend-user/src/config/api.js#L1-L14) strips trailing slashes from `import.meta.env.VITE_API_URL` and preserves relative `/api/...` paths when unset.
- **Endpoint Matching:**
  - `GET /api/status` — [App.jsx](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/frontend-user/src/App.jsx#L32) ↔ [backend/app.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/app.py#L120).
  - `GET /api/samples` & `GET /api/samples/{filename}` — [App.jsx](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/frontend-user/src/App.jsx#L131-L154) ↔ [backend/app.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/app.py#L133-L184).
  - `POST /api/extract` (`mixed_audio`, `reference_audio`) — [App.jsx](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/frontend-user/src/App.jsx#L191-L199) ↔ [backend/app.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/app.py#L208-L212).
  - `GET /api/audio/{filename}` (`output_url`, `download_url`) — [App.jsx](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/frontend-user/src/App.jsx#L207-L211) ↔ [backend/app.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/app.py#L187-L205).
  - `/health` & `/api/health` ([backend/app.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/app.py#L106-L107)) are platform/probe endpoints and do not conflict with frontend routes.
- **Format Validation:** [AudioUploadCard.jsx](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/frontend-user/src/components/AudioUploadCard.jsx#L23-L40) and [backend/app.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/app.py#L224-L243) both allow `.wav`, `.mp3`, `.flac`, `.ogg` and explicitly reject `.m4a` with user-facing messages.

---

### 4. Static Frontend Serving & SPA Fallback (`PASS` — Static Inspection / `NOT VERIFIED` — Runtime)
- [backend/app.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/app.py#L304-L321) registers `/assets` (`StaticFiles`) and `@app.get("/{full_path:path}")` **after** all `/health` and `/api/*` routes (`L106–L301`).
- `serve_frontend` explicitly guards `if full_path.startswith("api/") or full_path == "api": raise HTTPException(status_code=404, ...)` ([backend/app.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/app.py#L312-L313)) and uses `candidate.is_relative_to(FRONTEND_DIST_DIR) and candidate.is_file()` ([L315-L319](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/app.py#L315-L319)) before falling back to `index.html`.
- `/api/*` routes cannot be shadowed by the SPA fallback. Live HTTP route resolution is **NOT VERIFIED** without starting Uvicorn.

---

### 5. Temporary-File Cleanup & Active-Download Race Conditions (`FAIL` for Multi-Worker / `PASS*` for Single-Worker)
- **Active-Transfer Tracking ([backend/app.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/app.py#L44-L86), [L187-L205](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/app.py#L187-L205)):**
  - Uses an in-process `threading.Lock()` and `dict[str, int]` (`_active_audio_counts`), acquired in `get_audio()` and released via Starlette `BackgroundTask(_release_active_audio, filename)`.
- **Findings:**
  1. **Multi-worker process unsafe (`FAIL` if `--workers > 1`):** Because `_active_audio_counts` lives in process memory, running Uvicorn/Gunicorn with multiple worker processes allows Worker A to unlink an expired file while Worker B is actively streaming it. (Note: Default startup uses 1 worker, which is safe across threads, though deploying with `--workers > 1` would trigger this.)
  2. **Minor single-process TOCTOU window (`L75` vs `L80`):** `cleanup_expired_temp_files()` checks `_is_audio_active(path.name)` and then calls `path.unlink()` outside `_active_audio_lock`. For a file already older than `TEMP_FILE_TTL_SECONDS` (default 1800s), a concurrent `get_audio()` arriving between `L75` and `L80` could race with `unlink()`.

---

### 6. `.dockerignore` Security & Build-Context Hygiene (`FAIL` — Static Inspection)
- Inspected [.dockerignore](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/.dockerignore#L1-L12) against the actual workspace file tree:
  1. **`.env.*` variants exposed:** `**/.env` (`L5`) does not exclude `.env.local`, `.env.production`, or `.env.development` if created later.
  2. **Evaluation outputs & sample backups enter image:** `COPY backend/ ./` copies `backend/samples/eval_ab_tests/`, `backend/samples/*.orig`, `backend/samples/final_release_extracted_sample.wav`, `backend/samples/verified_extracted_output.wav`, and backup scripts (`backend/app.py.orig`, `backend/inference.py.orig`, `backend/inference.py.original_backup`).
  3. **Unused 188 MB baseline checkpoint enters image:** `backend/checkpoints/usef_tfgridnet_wsj02mix.pth.tar` (`188,051,307` bytes) is copied alongside `best_stage_c_sanada.pt`.
  4. **Large root backup/git directories sent in Docker build context:** `.git_nested_backup/`, `original_usef_tse_git_backup/`, `frontend_neon_brutalist_backup/`, `frontend_src_neon_brutalist_backup/`, `frontend_src_original_backup/`, `scratch/`, `.vscode/`, `docs/`, and `nested_repo_history.bundle` are not listed in `.dockerignore`.
  5. **No defensive credential patterns:** Missing `*.pem`, `*.key`, `credentials*`, `secrets*` (no secret files were observed in the directory listing, and no secret values were printed).

---

### 7. Documented Commands, Env Vars & Unverified Runtime Assumptions (`PASS` — Docs Match / `NOT VERIFIED` — Runtime)
- **Commands & Env Vars ([DEPLOYMENT_PREPARATION_REPORT.md](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/DEPLOYMENT_PREPARATION_REPORT.md#L70-L93), [backend/.env.example](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/.env.example), [frontend-user/.env.example](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/frontend-user/.env.example)):**
  - Native command (`python app.py` with `HOST=0.0.0.0`, `PORT=8000`) and Docker command (`uvicorn app:app --host ${HOST:-0.0.0.0} --port ${PORT:-8000}`) match [backend/app.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/app.py#L37-L38) and [Dockerfile](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/Dockerfile#L35).
- **Unverified Runtime Assumptions (require post-`task-1640` runtime test):**
  1. Docker image build and container startup (currently blocked by missing `original-USEF-TSE/` in `Dockerfile`).
  2. `libsndfile1` codec support for `.mp3`/`.ogg`/`.flac` inside `python:3.11-slim`.
  3. Live FastAPI static serving (`GET /`, `/assets/*`, `/api/nonexistent` returning 404) and `CORS_ORIGINS` behavior.
  4. Live `.m4a` HTTP `400` response and concurrent download/cleanup behavior.

---

## Blockers & Recommended Fixes

1. **[CRITICAL BLOCKER] Copy `original-USEF-TSE/` in `Dockerfile`:**
   - Add `COPY original-USEF-TSE/ /app/original-USEF-TSE/` in [Dockerfile](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/Dockerfile) before `CMD` so `backend/inference.py` can import `Tar_Model` and `TF_gridnet_attentionblock`.
2. **[HIGH] Harden `.dockerignore`:**
   - Replace `**/.env` with `**/.env*` and `!**/.env.example`; exclude `backend/samples/eval_ab_tests/`, `backend/**/*.orig`, `backend/inference.py.original_backup`, `backend/checkpoints/usef_tfgridnet_wsj02mix.pth.tar` (if only Stage C is needed), and root backup/git directories (`.git_nested_backup/`, `original_usef_tse_git_backup/`, `frontend*_backup/`, `scratch/`, `.vscode/`, `nested_repo_history.bundle`), plus `*.pem` / `*.key`.
3. **[MEDIUM] Document single-worker constraint or use file-level/shared locking for temp cleanup:**
   - Either explicitly enforce `--workers 1` in deployment docs/Dockerfile (since PyTorch CPU inference already uses intra-op threads and `_active_audio_counts` is per-process), or guard `cleanup_expired_temp_files()` / `get_audio()` with cross-process file locks / longer TTLs and hold `_active_audio_lock` across the active-check + `unlink()` in single-worker mode.
4. **[DEFERRED] Post-`task-1640` Runtime Verification:**
   - Once `task-1640` completes, run `docker build`, test `GET /`, `GET /api/health`, `GET /api/nonexistent`, `.m4a` HTTP `400`, and `.mp3`/`.wav` extraction inside the container.
