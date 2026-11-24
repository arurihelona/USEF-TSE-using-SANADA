"""
USEF-TSE Simplified User Application Launcher
Launches the FastAPI backend and the new simplified user-facing frontend (frontend-user).

Usage:
    python run_app_user.py
"""

import atexit
import json
import os
import signal
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_USER_DIR = ROOT_DIR / "frontend-user"
DEFAULT_FRONTEND_PORT = 5174
BACKEND_PORT = 8000

procs_to_cleanup = []


def cleanup():
    """Terminate child processes started by this runner."""
    for proc in procs_to_cleanup:
        if proc and proc.poll() is None:
            try:
                proc.terminate()
            except Exception:
                pass


atexit.register(cleanup)


def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    """Check if a local TCP port is already open and accepting connections."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.6)
            return s.connect_ex((host, port)) == 0
    except Exception:
        return False


def check_backend_health(host: str = "127.0.0.1", port: int = BACKEND_PORT, timeout: float = 1.0) -> tuple[bool, dict]:
    """Queries /api/health to verify that the active process is indeed a responsive USEF-TSE backend."""
    url = f"http://{host}:{port}/api/health"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "USEF-TSE-Launcher"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode())
                return True, data
    except Exception:
        pass
    return False, {}


def find_available_port(start_port: int, max_attempts: int = 10, host: str = "127.0.0.1") -> int:
    """Find the next available port starting from start_port."""
    for port in range(start_port, start_port + max_attempts):
        if not is_port_in_use(port, host):
            return port
    return start_port


def cleanup_stale_temp_files():
    """Safely cleans up old extracted audio files in backend/temp older than 2 hours."""
    temp_dir = BACKEND_DIR / "temp"
    if not temp_dir.is_dir():
        return
    cutoff = time.time() - (2 * 3600)  # 2 hours old
    for f in temp_dir.glob("extracted_speaker_*.wav"):
        try:
            if f.stat().st_mtime < cutoff:
                f.unlink()
        except Exception:
            pass


def main():
    print("=" * 60)
    print("  USEF-TSE: Target Speaker Extraction (User Application)")
    print("=" * 60)

    # Validate directories
    if not BACKEND_DIR.is_dir():
        print(f"[ERROR] Backend directory not found at: {BACKEND_DIR}")
        sys.exit(1)
    if not FRONTEND_USER_DIR.is_dir():
        print(f"[ERROR] frontend-user directory not found at: {FRONTEND_USER_DIR}")
        sys.exit(1)

    # Safe housekeeping of old temporary output files
    cleanup_stale_temp_files()

    backend_proc = None
    # 1. Check if backend is already running and verify true API health
    is_healthy, health_info = check_backend_health()
    if is_healthy:
        model_st = health_info.get("model_status", "unknown")
        print(f"[INFO] Backend is already running and healthy on http://127.0.0.1:{BACKEND_PORT} (model: {model_st}).")
    else:
        if is_port_in_use(BACKEND_PORT):
            print(f"[WARNING] Port {BACKEND_PORT} is in use but did not pass health check. Attempting to start backend...")
        print(f"Starting backend on http://127.0.0.1:{BACKEND_PORT} ...")
        try:
            backend_proc = subprocess.Popen(
                [sys.executable, "app.py"],
                cwd=str(BACKEND_DIR),
            )
            procs_to_cleanup.append(backend_proc)
        except Exception as e:
            print(f"[ERROR] Failed to start backend server: {e}")
            sys.exit(1)

        # Actively poll until backend responds to health check before launching frontend
        print("Waiting for backend API server to bind port 8000 and become ready...")
        start_wait = time.time()
        backend_ready = False
        while time.time() - start_wait < 30:
            if backend_proc.poll() is not None:
                print(f"[ERROR] Backend exited prematurely with code {backend_proc.returncode}.")
                cleanup()
                sys.exit(1)
            is_healthy, health_info = check_backend_health(timeout=0.8)
            if is_healthy:
                backend_ready = True
                elapsed = round(time.time() - start_wait, 1)
                print(f"[STARTUP] Backend is healthy and ready on http://127.0.0.1:{BACKEND_PORT} (verified in {elapsed}s).")
                break
            time.sleep(0.5)

        if not backend_ready:
            print(f"[ERROR] Backend failed to respond to health checks on port {BACKEND_PORT} within 30 seconds.")
            cleanup()
            sys.exit(1)

    # 2. Determine frontend port and start frontend-user
    frontend_port = find_available_port(DEFAULT_FRONTEND_PORT)
    print(f"Starting user frontend on http://localhost:{frontend_port} ...")

    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    cmd_args = [npm_cmd, "run", "dev"]
    if frontend_port != DEFAULT_FRONTEND_PORT:
        cmd_args.extend(["--", "--port", str(frontend_port)])

    try:
        frontend_proc = subprocess.Popen(
            cmd_args,
            cwd=str(FRONTEND_USER_DIR),
        )
        procs_to_cleanup.append(frontend_proc)
    except Exception as e:
        print(f"[ERROR] Failed to start frontend-user: {e}")
        cleanup()
        sys.exit(1)

    # Verify frontend didn't crash immediately
    time.sleep(1.5)
    if frontend_proc.poll() is not None:
        print(f"[ERROR] Frontend exited prematurely with code {frontend_proc.returncode}.")
        cleanup()
        sys.exit(1)

    print("\n" + "-" * 60)
    print("✓ Services are up and running!")
    print(f"  • User Frontend: http://localhost:{frontend_port}")
    print(f"  • Backend API:   http://127.0.0.1:{BACKEND_PORT}")
    print("-" * 60)
    print("Press Ctrl+C to terminate both servers.\n")

    def handle_sigint(signum, frame):
        print("\nShutting down user application...")
        cleanup()
        print("Done.")
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_sigint)

    try:
        while True:
            if backend_proc and backend_proc.poll() is not None:
                print(f"\n[WARNING] Backend process stopped unexpectedly (exit code {backend_proc.returncode}).")
                break
            if backend_proc is None and not is_port_in_use(BACKEND_PORT):
                print(f"\n[WARNING] Reused backend process on port {BACKEND_PORT} has terminated.")
                break
            if frontend_proc and frontend_proc.poll() is not None:
                print(f"\n[WARNING] Frontend process stopped unexpectedly (exit code {frontend_proc.returncode}).")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        handle_sigint(None, None)
    finally:
        cleanup()


if __name__ == "__main__":
    main()
