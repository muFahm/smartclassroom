"""Simple ROS-like bridge simulator for polling devices.

This script does not require ROS2. It mimics a fleet of devices that
listen for a question being opened and then respond back to the Django
API using the runtime endpoints we exposed.

Usage:
    set API_BASE=http://localhost:8000
    set API_TOKEN=<JWT access token of a student account>
    python simulate/ros_bridge.py --participant 5 --question 12 --option 44
"""

import argparse
import json
import os
import random
import time
import urllib.error
import urllib.request

API_BASE = os.getenv("API_BASE", "http://localhost:8000")
API_TOKEN = os.getenv("API_TOKEN", "")
RESPONSES_ENDPOINT = f"{API_BASE}/api/quiz/runtime/responses/"


def send_response(participant_id: int, session_question_id: int, option_id: int, source: str = "device"):
    payload = {
        "participant": participant_id,
        "session_question": session_question_id,
        "option": option_id,
        "source": source,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(RESPONSES_ENDPOINT, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    if API_TOKEN:
        req.add_header("Authorization", f"Bearer {API_TOKEN}")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode("utf-8")
            print("[SIM] Response accepted:", body)
    except urllib.error.HTTPError as exc:
        print("[SIM] HTTP error", exc.code, exc.read().decode("utf-8"))
    except urllib.error.URLError as exc:
        print("[SIM] Connection error", exc)


def auto_mode(participant_id: int, session_question_id: int, option_pool: list[int]):
    option_id = random.choice(option_pool)
    delay = random.uniform(0.5, 3)
    print(f"[SIM] Waiting {delay:.2f}s before answering with option {option_id}")
    time.sleep(delay)
    send_response(participant_id, session_question_id, option_id)


def main():
    parser = argparse.ArgumentParser(description="Polling device simulator")
    parser.add_argument("--participant", type=int, required=True, help="SessionParticipant ID")
    parser.add_argument("--question", type=int, required=True, help="SessionQuestion ID")
    parser.add_argument("--option", type=int, help="QuizOption ID to submit")
    parser.add_argument(
        "--option-pool",
        type=int,
        nargs="*",
        default=None,
        help="Pool of option IDs for auto mode (if --option omitted)",
    )
    args = parser.parse_args()

    if args.option:
        send_response(args.participant, args.question, args.option)
    elif args.option_pool:
        auto_mode(args.participant, args.question, args.option_pool)
    else:
        parser.error("Provide --option or --option-pool for simulation")


if __name__ == "__main__":
    main()