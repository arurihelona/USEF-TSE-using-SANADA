# Local Science Expo Environment Report

**Project Root:** `D:\3rd_yr_PS\Acoustic_PS\Acoustic_PS_FINAL\the_actual_frontend_backend\usef tse project`  
**Inspection Mode:** Strictly read-only. No packages were installed/uninstalled, no Python/PyTorch versions were changed, no source files or checkpoints were modified, and no inference or evaluation was started while `task-1640` remains active.

---

## 1. Verified Environment Facts

### A. Python Environment & Virtual Environment Status
- **Backend Python Interpreter:** `C:\Python314\python.exe` (`Python 3.14.2`)
- **Virtual Environment:** **None** (`sys.prefix == sys.base_prefix == C:\Python314`, `in_venv: False`). Neither the project root nor `backend/` contains a `venv`, `.venv`, or `conda` environment.
- **Other Detected Interpreters (`py -0p`):**
  - `3.14`: `C:\Python314\python.exe` (active default)
  - `Astral/CPython 3.14.4`: `C:\Users\admin\AppData\Roaming\uv\python\cpython-3.14.4-windows-x86_64-none\python.exe`
  - No Python 3.10, 3.11, or 3.12 interpreter is currently installed.

### B. Installed Dependencies (`C:\Python314`)
All packages listed in [backend/requirements.txt](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/requirements.txt) are installed globally:
- `fastapi 0.135.3`, `uvicorn 0.44.0`, `starlette 1.0.0`, `pydantic 2.12.5`, `python-multipart 0.0.24`
- `torch 2.13.0` (`2.13.0+cpu`), `torchaudio 2.11.0` (`2.11.0+cpu`)
- `soundfile 0.14.0`, `scipy 1.17.1`, `numpy 2.4.3`, `PyYAML 6.0.3`
- **CUDA Status in Current PyTorch:** `torch.cuda.is_available() = False`, `torch.version.cuda = None` (CPU-only build).

### C. Hardware & GPU (`nvidia-smi`)
- **System:** Dell Precision 5550, Windows, `Intel(R) Core(TM) i7-10850H CPU @ 2.70GHz` (6 cores / 12 logical), `31.72 GB` RAM
- **GPU:** `Quadro T1000`, Driver `581.32`, `4096 MiB` total VRAM (`3938 MiB` free)

### D. Frontend Build & Stage C Checkpoint
- **Expo Frontend (`frontend-user`):** `npx vite build --outDir <scratch> --emptyOutDir` **PASSED** (`exit code 0`, `1952` modules transformed in `1.72s`).
- **Stage C Checkpoint:** [best_stage_c_sanada.pt](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/checkpoints/best_stage_c_sanada.pt)
  - **Verified SHA-256:** `C184FE04C7C1FEC9C5B1FA00D405365AEEEABFA253EE9B926874E6D000F2A7D6` (unchanged).

### E. Current CPU Backend Capability
- All backend dependencies are present, `backend/app.py` and `backend/inference.py` pass `py_compile`, and `task-1640` is actively executing CPU inference on this machine.
- **Note:** Live runtime extraction via the updated [backend/app.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/app.py) is **NOT VERIFIED** until `task-1640` finishes and a live smoke test is run.

---

## 2. Analysis & Risks (Distinguished from Verified Facts)

### Python 3.14 Compatibility Risks
- **Shared Global State:** Because the backend runs in global `C:\Python314` without a project `.venv`, installing or upgrading packages for other projects could break backend dependencies.
- **Wheel Availability on Python 3.14:** Python 3.14 is bleeding-edge; CUDA-enabled PyTorch wheels and C-extension audio packages may not have prebuilt Windows wheels for 3.14 across all versions.
- **Audio Decoder Limits:** `soundfile 0.14.0` (`libsndfile`) cannot decode `.m4a` (already handled via explicit UI + backend HTTP `400` rejection).

### Feasibility of a Separate CUDA Environment for Quadro T1000
- **Feasible in Principle:** The `NVIDIA Quadro T1000` (Turing, `4096 MiB` VRAM, driver `581.32`) supports modern CUDA PyTorch, and [backend/inference.py](file:///D:/3rd_yr_PS/Acoustic_PS/Acoustic_PS_FINAL/the_actual_frontend_backend/usef%20tse%20project/backend/inference.py#L187) already selects `cuda` automatically when `torch.cuda.is_available()` is `True`.
- **Requirements & Constraints:**
  - Would require provisioning an isolated virtual environment (e.g., Python `3.11` or `3.12` via `uv`, which is already present on the machine) without touching `C:\Python314`.
  - **4 GB VRAM Limit:** `3938 MiB` free VRAM can OOM on long audio mixtures or large TFGridNet time-frequency attention matrices unless clip durations are kept short (e.g., 5–15 seconds).

---

## 3. Recommendations for the Safest Expo Configuration

1. **Safest Baseline (Zero Risk of Breaking Environment): CPU Mode on Existing `C:\Python314`**
   - Wait for `task-1640` to finish, then run a live smoke test using `python run_app_user.py`.
   - Use **5–8 second** `.wav` or `.mp3` clips (including the bundled `mixed_speaker.wav` and `speaker_a_ref.wav`).
   - Pros: Zero package changes, zero CUDA OOM risk, already has all dependencies installed.
   - Trade-off: ~55–60s inference time per 8s clip on CPU.

2. **Optional Speed Upgrade (Only After `task-1640` Completes & Pre-Tested Before Expo):**
   - Create a **separate, isolated** `.venv-cuda` (Python 3.11/3.12 + CUDA PyTorch) while leaving `C:\Python314` untouched as an instant fallback.
   - Test both the 8s demo sample and any custom expo clips to verify they fit within `3938 MiB` VRAM without OOM before the expo begins.
