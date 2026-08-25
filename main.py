import os
import shutil
import socket
import subprocess
import sys
import time
import webbrowser

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT, "backend")
FRONTEND_DIR = os.path.join(ROOT, "frontend")
BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:5173"


def port_open(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        try:
            s.connect((host, port))
            return True
        except OSError:
            return False


def wait_for(port: int, timeout: int = 90) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if port_open(port):
            return True
        time.sleep(1)
    return False


def resolve_python() -> str:
    venv_python = os.path.join(BACKEND_DIR, ".venv", "Scripts", "python.exe")
    if os.path.exists(venv_python):
        return venv_python
    return sys.executable


def ensure_backend_deps(python: str) -> None:
    check = subprocess.run(
        [python, "-c", "import uvicorn, fastapi"], capture_output=True
    )
    if check.returncode == 0:
        return
    reqs = os.path.join(BACKEND_DIR, "requirements.txt")
    print("[..] Backend dependencies missing - installing them now...")
    subprocess.run(
        [python, "-m", "pip", "install", "-r", reqs],
        cwd=BACKEND_DIR,
    )


def start_backend() -> subprocess.Popen:
    python = resolve_python()
    ensure_backend_deps(python)
    print(f"Starting backend: {python} -m uvicorn app.main:app --port 8000")
    return subprocess.Popen(
        [python, "-m", "uvicorn", "app.main:app", "--port", "8000"],
        cwd=BACKEND_DIR,
    )


def start_frontend() -> subprocess.Popen:
    npm = shutil.which("npm") or "npm.cmd"
    print(f"Starting frontend: npm run dev (in {FRONTEND_DIR})")
    return subprocess.Popen(f'"{npm}" run dev', cwd=FRONTEND_DIR, shell=True)


def main() -> None:
    print("=" * 56)
    print("  FoodRescue AI - One-Click Launcher")
    print("=" * 56)

    procs: list[subprocess.Popen] = []
    try:
        backend_running = port_open(8000)
        frontend_running = port_open(5173)

        if backend_running:
            print(f"[ok] Backend already running at {BACKEND_URL}")
        else:
            print("[..] Starting backend...")
            procs.append(start_backend())
            if wait_for(8000):
                print(f"[ok] Backend ready at {BACKEND_URL}")
            else:
                print("[!!] Backend failed to start within 90s (see errors above).")

        if frontend_running:
            print(f"[ok] Frontend already running at {FRONTEND_URL}")
        else:
            print("[..] Starting frontend...")
            procs.append(start_frontend())
            if wait_for(5173):
                print(f"[ok] Frontend ready at {FRONTEND_URL}")
            else:
                print("[!!] Frontend failed to start within 90s (see errors above).")

        if port_open(5173):
            print(f"[..] Opening browser at {FRONTEND_URL}")
            webbrowser.open(FRONTEND_URL)

        print("-" * 56)
        print("Press Ctrl+C to stop the servers and exit.")
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        for p in procs:
            if p.poll() is None:
                try:
                    subprocess.run(["taskkill", "/F", "/T", "/PID", str(p.pid)], capture_output=True)
                except Exception:
                    p.terminate()


if __name__ == "__main__":
    main()