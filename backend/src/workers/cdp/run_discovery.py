import sys
import json
import subprocess
import os


def run(seed_ips, username, password):
    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"
    # Pass credentials via env to avoid args exposure
    env["CDP_USERNAME"] = username
    env["CDP_PASSWORD"] = password

    # We call the worker script with python and pass seeds via stdin as JSON
    script_path = os.path.join(os.path.dirname(__file__), "worker_entry.py")
    proc = subprocess.run([sys.executable, script_path], input=json.dumps({
        "seedIps": seed_ips,
        "username": username,
        "password": password,
    }).encode("utf-8"), stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env, timeout=300)

    out = proc.stdout.decode("utf-8").strip()
    err = proc.stderr.decode("utf-8").strip()
    if proc.returncode != 0:
        raise RuntimeError(f"Worker failed (code {proc.returncode}): {err or out}")
    if not out:
        raise RuntimeError(f"Worker produced no output. Stderr: {err}")
    return json.loads(out)


if __name__ == "__main__":
    payload = json.loads(sys.stdin.read())
    result = run(payload.get("seedIps", []), payload.get("username", ""), payload.get("password", ""))
    print(json.dumps(result))


