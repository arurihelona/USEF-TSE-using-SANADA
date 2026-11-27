import os
import shutil
import threading
import time
import uuid
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.background import BackgroundTask
from inference import USEFExtractor

app = FastAPI(
    title="USEF-TSE API",
    description="Universal Speaker Embedding Free Target Speaker Extraction Backend",
    version="1.0.0",
)

# Enable CORS (configure CORS_ORIGINS as comma-separated origins in production)
_raw_cors = os.getenv("CORS_ORIGINS", "*").strip()
CORS_ORIGINS = [o.strip() for o in _raw_cors.split(",") if o.strip()] if _raw_cors else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=(CORS_ORIGINS != ["*"]),
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
TEMP_DIR = BASE_DIR / "temp"
SAMPLES_DIR = BASE_DIR / "samples"
TEMP_DIR.mkdir(parents=True, exist_ok=True)
SAMPLES_DIR.mkdir(parents=True, exist_ok=True)

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
TEMP_FILE_TTL_SECONDS = max(60, int(os.getenv("TEMP_FILE_TTL_SECONDS", "1800")))

_default_dist = BASE_DIR.parent / "frontend-user" / "dist"
FRONTEND_DIST_DIR = Path(os.getenv("FRONTEND_DIST_DIR", str(_default_dist))).resolve()

_active_audio_lock = threading.Lock()
_active_audio_counts: dict[str, int] = {}


def _release_active_audio(filename: str) -> None:
    with _active_audio_lock:
        count = _active_audio_counts.get(filename, 0)
        if count <= 1:
            _active_audio_counts.pop(filename, None)
        else:
            _active_audio_counts[filename] = count - 1


def cleanup_expired_temp_files() -> int:
    """
    Remove expired temporary audio files without deleting files currently being served.
    Synchronized with get_audio() via _active_audio_lock (single-process safe).
    """
    now = time.time()
    removed = 0
    for pattern in ("extracted_speaker_*.wav", "upload_mix_*", "upload_ref_*"):
        for path in TEMP_DIR.glob(pattern):
            with _active_audio_lock:
                if _active_audio_counts.get(path.name, 0) > 0:
                    continue
                try:
                    if not path.is_file():
                        continue
                    age = now - path.stat().st_mtime
                    if age >= TEMP_FILE_TTL_SECONDS:
                        path.unlink()
                        removed += 1
                except FileNotFoundError:
                    pass
                except Exception as exc:
                    print(f"[CLEANUP] Failed to remove {path.name}: {exc}")
    return removed


# Initialize the inference engine in background thread so server starts listening immediately
extractor = USEFExtractor(async_init=True)


@app.on_event("startup")
async def on_startup():
    removed = cleanup_expired_temp_files()
    print("[STARTUP] Backend started")
    print(f"[STARTUP] Configured bind: http://{HOST}:{PORT}")
    if removed:
        print(f"[STARTUP] Cleaned up {removed} expired temporary audio file(s)")
    if (FRONTEND_DIST_DIR / "index.html").is_file():
        print(f"[STARTUP] Serving static frontend from {FRONTEND_DIST_DIR}")
    else:
        print("[STARTUP] No production frontend build found; running API-only mode")


@app.get("/health")
@app.get("/api/health")
def health_check():
    """Fast health check endpoint for system uptime monitoring."""
    return {
        "status": "ok",
        "service": "USEF-TSE Backend",
        "model_status": extractor.model_status,
        "detail": extractor.status_detail,
        "device": str(extractor.device),
        "init_duration": extractor.init_duration,
    }


@app.get("/api/status")
def get_status():
    """Returns model and system readiness status."""
    return {
        "status": extractor.model_status,
        "detail": extractor.status_detail,
        "device": str(extractor.device),
        "model_name": extractor.model_name,
        "sample_rate": extractor.TARGET_SR,
        "init_duration": extractor.init_duration,
    }


@app.get("/api/samples")
def list_samples():
    """Returns list of bundled sample files for demonstration."""
    # Find mixture file
    mixture_file = None
    ref_file = None
    if (SAMPLES_DIR / "mixed_speaker.wav").exists():
        mixture_file = "mixed_speaker.wav"
    elif (SAMPLES_DIR / "mixed_speakers.wav").exists():
        mixture_file = "mixed_speakers.wav"
    else:
        for f in SAMPLES_DIR.glob("*.wav"):
            if "mix" in f.name.lower():
                mixture_file = f.name
                break

    if (SAMPLES_DIR / "speaker_a_ref.wav").exists():
        ref_file = "speaker_a_ref.wav"
    else:
        for f in SAMPLES_DIR.glob("*.wav"):
            if "ref" in f.name.lower():
                ref_file = f.name
                break

    mixture_file = mixture_file or "mixed_speaker.wav"
    ref_file = ref_file or "speaker_a_ref.wav"

    return {
        "mixed": {
            "name": mixture_file,
            "title": "Mixture Recording (Multiple Speakers)",
            "url": f"/api/samples/{mixture_file}",
            "type": "mixture",
        },
        "reference": {
            "name": ref_file,
            "title": "Target Speaker Reference",
            "url": f"/api/samples/{ref_file}",
            "type": "reference",
        },
    }


@app.get("/api/samples/{filename}")
def get_sample_audio(filename: str):
    """Serves a demo sample audio file."""
    if Path(filename).name != filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    file_path = SAMPLES_DIR / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Sample audio file not found")
    return FileResponse(file_path, media_type="audio/wav", filename=filename)


@app.get("/api/audio/{filename}")
def get_audio(filename: str):
    """Serves extracted or uploaded audio files while protecting active transfers from cleanup."""
    if Path(filename).name != filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    file_path = TEMP_DIR / filename
    with _active_audio_lock:
        if not file_path.exists() or not file_path.is_file():
            raise HTTPException(status_code=404, detail="Audio file not found or expired")
        _active_audio_counts[filename] = _active_audio_counts.get(filename, 0) + 1
    try:
        return FileResponse(
            file_path,
            media_type="audio/wav",
            filename=filename,
            background=BackgroundTask(_release_active_audio, filename),
        )
    except Exception:
        _release_active_audio(filename)
        raise


@app.post("/api/extract")
async def extract_target_speaker(
    mixed_audio: UploadFile = File(...),
    reference_audio: UploadFile = File(...),
):
    """
    Receives mixed audio and target speaker reference audio,
    executes USEF-TSE model inference, and returns extracted speaker audio.
    """
    if extractor.model_status != "ready":
        raise HTTPException(
            status_code=503,
            detail=f"USEF-TSE model is not available: {extractor.status_detail}",
        )

    # Basic format / extension validation
    allowed_extensions = {".wav", ".mp3", ".flac", ".ogg"}
    mix_ext = Path(mixed_audio.filename or "").suffix.lower()
    ref_ext = Path(reference_audio.filename or "").suffix.lower()

    if mix_ext == ".m4a" or ref_ext == ".m4a":
        raise HTTPException(
            status_code=400,
            detail="M4A format is not supported because the server audio decoder cannot decode M4A/AAC. Please upload WAV, MP3, FLAC, or OGG.",
        )

    if mix_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format for mixed audio: '{mix_ext}'. Please upload WAV, MP3, FLAC, or OGG.",
        )
    if ref_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format for reference audio: '{ref_ext}'. Please upload WAV, MP3, FLAC, or OGG.",
        )

    # Save uploaded files into temp directory with UUID
    session_id = uuid.uuid4().hex[:10]
    mix_temp_path = TEMP_DIR / f"upload_mix_{session_id}{mix_ext}"
    ref_temp_path = TEMP_DIR / f"upload_ref_{session_id}{ref_ext}"
    out_filename = f"extracted_speaker_{session_id}.wav"
    output_path = TEMP_DIR / out_filename

    try:
        with open(mix_temp_path, "wb") as f_mix:
            shutil.copyfileobj(mixed_audio.file, f_mix)

        with open(ref_temp_path, "wb") as f_ref:
            shutil.copyfileobj(reference_audio.file, f_ref)

        # Ensure files are non-empty
        if mix_temp_path.stat().st_size == 0:
            raise HTTPException(status_code=400, detail="Uploaded mixed audio file is empty.")
        if ref_temp_path.stat().st_size == 0:
            raise HTTPException(status_code=400, detail="Uploaded reference audio file is empty.")

        # Run extraction
        result = extractor.extract(
            mix_path=str(mix_temp_path),
            aux_path=str(ref_temp_path),
            output_path=str(output_path),
        )

        return {
            "success": True,
            "output_filename": out_filename,
            "output_url": f"/api/audio/{out_filename}",
            "download_url": f"/api/audio/{out_filename}",
            "mix_duration": result["mix_duration"],
            "ref_duration": result["aux_duration"],
            "extracted_duration": result["extracted_duration"],
            "processing_time": result["processing_time"],
            "inference_time": result.get("inference_time", result["processing_time"]),
            "preprocess_time": result.get("preprocess_time", 0.0),
            "save_time": result.get("save_time", 0.0),
            "model_name": result["model_name"],
            "device": result["device"],
            "sample_rate": result["sample_rate"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")
    finally:
        # Cleanup uploaded raw temp files and any expired extracted outputs
        try:
            if mix_temp_path.exists():
                mix_temp_path.unlink()
            if ref_temp_path.exists():
                ref_temp_path.unlink()
        except Exception:
            pass
        cleanup_expired_temp_files()


if (FRONTEND_DIST_DIR / "index.html").is_file():
    _assets_dir = FRONTEND_DIST_DIR / "assets"
    if _assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="frontend-assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        """Serve built frontend-user static files and SPA fallback without shadowing /api routes."""
        if full_path.startswith("api/") or full_path == "api":
            raise HTTPException(status_code=404, detail="API endpoint not found")
        candidate = (FRONTEND_DIST_DIR / full_path).resolve()
        if (
            full_path
            and candidate.is_relative_to(FRONTEND_DIST_DIR)
            and candidate.is_file()
        ):
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST_DIR / "index.html")


if __name__ == "__main__":
    import uvicorn
    # Single worker (workers=1) is required because active-download tracking is process-local.
    uvicorn.run(app, host=HOST, port=PORT, workers=1)
