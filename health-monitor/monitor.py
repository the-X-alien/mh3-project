import psutil
import time
import json
import argparse
from datetime import datetime
from pathlib import Path

LOG_DIR = Path.home() / ".health-monitor-logs"
LOG_DIR.mkdir(exist_ok=True)

LEVELS = {"critical": 90, "warning": 75, "info": 50}

def get_snapshot():
    cpu = psutil.cpu_percent(interval=1)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    net = psutil.net_io_counters()
    return {
        "timestamp": datetime.now().isoformat(),
        "cpu": {"percent": cpu},
        "memory": {
            "total": mem.total,
            "available": mem.available,
            "percent": mem.percent,
        },
        "disk": {
            "total": disk.total,
            "used": disk.used,
            "free": disk.free,
            "percent": disk.percent,
        },
        "network": {
            "bytes_sent": net.bytes_sent,
            "bytes_recv": net.bytes_recv,
            "packets_sent": net.packets_sent,
            "packets_recv": net.packets_recv,
        },
    }

def assess(snap):
    issues = []
    for label, threshold in LEVELS.items():
        if snap["cpu"]["percent"] >= threshold:
            issues.append({"level": label, "metric": "cpu", "value": snap["cpu"]["percent"]})
        if snap["memory"]["percent"] >= threshold:
            issues.append({"level": label, "metric": "memory", "value": snap["memory"]["percent"]})
        if snap["disk"]["percent"] >= threshold:
            issues.append({"level": label, "metric": "disk", "value": snap["disk"]["percent"]})
    return issues

def log_snapshot(snap, issues):
    date = snap["timestamp"][:10]
    log_file = LOG_DIR / f"{date}.jsonl"
    entry = {**snap, "issues": issues}
    with open(log_file, "a") as f:
        f.write(json.dumps(entry) + "\n")

def print_report(snap, issues):
    t = snap["timestamp"]
    print(f"[{t}] System Health Report")
    print(f"  CPU:    {snap['cpu']['percent']:.1f}%")
    print(f"  Memory: {snap['memory']['percent']:.1f}%  ({_fmt(snap['memory']['available'])} avail / {_fmt(snap['memory']['total'])})")
    print(f"  Disk:   {snap['disk']['percent']:.1f}%  ({_fmt(snap['disk']['free'])} free / {_fmt(snap['disk']['total'])})")
    if issues:
        print(f"  Issues ({len(issues)}):")
        for i in issues:
            print(f"    [{i['level'].upper()}] {i['metric']} at {i['value']:.1f}%")
    else:
        print("  Status: OK")
    print()

def _fmt(b):
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if b < 1024:
            return f"{b:.1f} {unit}"
        b /= 1024
    return f"{b:.1f} PB"

def main():
    parser = argparse.ArgumentParser(description="System Health Monitor")
    parser.add_argument("--interval", type=int, default=10, help="Poll interval (seconds)")
    parser.add_argument("--once", action="store_true", help="Run once and exit")
    parser.add_argument("--quiet", action="store_true", help="Suppress stdout output")
    args = parser.parse_args()

    try:
        while True:
            snap = get_snapshot()
            issues = assess(snap)
            log_snapshot(snap, issues)
            if not args.quiet:
                print_report(snap, issues)
            if args.once:
                break
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\nMonitor stopped.")

if __name__ == "__main__":
    main()
