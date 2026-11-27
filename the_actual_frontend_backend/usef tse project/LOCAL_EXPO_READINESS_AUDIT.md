# Local Science Expo Readiness Audit

**Project Root:** `D:\3rd_yr_PS\Acoustic_PS\Acoustic_PS_FINAL\the_actual_frontend_backend\usef tse project`  
**Audit Mode:** Read-only inspection only. No files, checkpoints, or evaluation outputs were edited, moved, or deleted; no Docker images were built; no live backend/inference was executed while `task-1640` (`1716/4500`) remains active.

---

## 1. Check Status Summary

| Category | Check | Status | Notes |
|---|---|---|---|
| **Windows Environment** | Python, Node, RAM, CPU, Disk | **PASS** | Python `3.14.2`, Node `v24.13.0`, i7-10850H (6C/12T), `31.72 GB` RAM (`13.21 GB` free), `178.28 GB` free on `D:` (`29.68 GB` on `C:`). |
| **Windows Environment** | GPU & CUDA Acceleration | **FAIL** (CPU-only PyTorch) | Hardware has `NVIDIA Quadro T1000` (4 GB VRAM), but `torch 2.13.0+cpu` is installed (`torch.cuda.is_available() == False`). |
| **Backend** | Python Dependencies (`requirements.txt`) | **PASS** | All 9 packages import cleanly (`fastapi`, `uvicorn`, `python-multipart`, `torch`, `torchaudio`, `soundfile`, `scipy`, `numpy`, `PyYAML`). |
| **Backend** | Stage C Checkpoint & SHA-256 | **PASS** | [best_stage_c_sanada.pt](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/checkpoints/best_stage_c_sanada.pt) verified unchanged: `C184FE04C7C1FEC9C5B1FA00D405365AEEEABFA253EE9B926874E6D000F2A7D6`. |
| **Backend** | Live Local Model Inference | **NOT VERIFIED** | Not tested during this read-only audit due to active `task-1640`. |
| **Frontend** | Expo Frontend (`frontend-user`) Deps & Build | **PASS** | `frontend-user/node_modules` and `frontend-user/dist/index.html` exist. |
| **Frontend** | API Proxy & Local Backend Config | **PASS** | [vite.config.js](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/frontend-user/vite.config.js) proxies `/api` -> `http://127.0.0.1:8000`; [api.js](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/frontend-user/src/config/api.js) uses relative `/api/...` paths. |
| **Expo Usability** | Demo Sample Audio Files | **PASS** | [mixed_speaker.wav](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/samples/mixed_speaker.wav) (`256,044` B) and [speaker_a_ref.wav](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/samples/speaker_a_ref.wav) (`256,044` B) present. |
| **Expo Usability** | Live Upload -> Extract -> Playback -> Download | **NOT VERIFIED** | Code wiring is intact on static inspection, but live extraction after recent `app.py` / `frontend-user` edits has not been runtime-tested. |

---

## 2. Exact Commands to Launch Locally

### Option A: Single-Command Dev Launcher (Recommended for Local Expo)
Launches both `backend/app.py` (port `8000`) and `frontend-user` Vite dev server (port `5174`):
```powershell
cd "D:\3rd_yr_PS\Acoustic_PS\Acoustic_PS_FINAL\the_actual_frontend_backend\usef tse project"
python run_app_user.py
```
Open: `http://localhost:5174`

### Option B: Separate Backend + Built Frontend (`frontend-user/dist` on Port `8000`)
```powershell
cd "D:\3rd_yr_PS\Acoustic_PS\Acoustic_PS_FINAL\the_actual_frontend_backend\usef tse project\backend"
python app.py
```
Open: `http://127.0.0.1:8000` (serves both the built `frontend-user` UI and `/api/*`).

*(If you ever want to run the Vite dev server manually alongside Option B: `cd "D:\3rd_yr_PS\Acoustic_PS\Acoustic_PS_FINAL\the_actual_frontend_backend\usef tse project\frontend-user"; npm run dev` -> `http://localhost:5174`.)*

---

## 3. Environment & Dependency Details

- **OS / CPU:** Windows, `Intel(R) Core(TM) i7-10850H CPU @ 2.70GHz` (6 cores / 12 logical processors)
- **RAM:** `31.72 GB` total (`13.21 GB` free while `task-1640` is running)
- **GPU:** `NVIDIA Quadro T1000` (`4 GB` VRAM) + `Intel(R) UHD Graphics` (`1 GB` VRAM)
- **PyTorch Build:** `torch 2.13.0+cpu`, `torchaudio 2.11.0+cpu` (`torch.cuda.is_available(): False`, `torch.version.cuda: None`)
- **Disk Space:** `D:` has `178.28 GB` free; `C:` has `29.68 GB` free
- **Python / Node:** `Python 3.14.2`, Node `v24.13.0`, npm `11.6.2`
- **Missing Dependencies:** **None** for CPU-based local execution (`fastapi 0.135.3`, `uvicorn 0.44.0`, `python-multipart 0.0.24`, `soundfile 0.14.0`, `scipy 1.17.1`, `numpy 2.4.3`, `PyYAML 6.0.3` are all installed).

---

## 4. Hardware Limitations & Live Demo Blockers

1. **Active CPU Evaluation (`task-1640`) Contention:** `task-1640` is still running on CPU (`1716/4500` records). Do not run the live expo demo until it completes.
2. **Post-Edit Live Extraction Not Yet Verified (`NOT VERIFIED`):** Live end-to-end extraction, playback, and download against the updated [backend/app.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/app.py) and [frontend-user](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/frontend-user/src/App.jsx) have not been tested yet.
3. **CPU-Only Inference Latency (~55–60s per 8s clip):** Because `torch` is CPU-only, live extraction will take ~1 minute for an 8-second mixture (and longer for longer clips), which can stall a live booth demo if visitors upload long files.
4. **`.m4a` Phone Recordings Unsupported:** Smartphone voice memos are commonly `.m4a`, which `soundfile` cannot decode; the UI and backend reject `.m4a` with a clear message asking for `.wav`, `.mp3`, `.flac`, or `.ogg`.

---

## 5. Recommended Next Steps (Priority Order)

1. **Wait for `task-1640` to complete** before running any live backend or inference test.
2. **Run a live end-to-end smoke test** via `python run_app_user.py`: click **"Load Demo Sample"**, run **Extract Speaker**, and verify audio playback and `.wav` download in the browser.
3. **Prepare fast expo demo clips:** Keep custom test clips short (5–8 seconds, `.wav` or `.mp3`) so CPU extraction finishes within ~1 minute, and avoid `.m4a` files.
4. *(Optional, for faster expo inference)* **Test CUDA PyTorch in a separate venv** if you want to utilize the `NVIDIA Quadro T1000` (note: `Python 3.14.2` may have limited prebuilt CUDA wheel availability, so verify compatibility before changing environments).
