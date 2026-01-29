"""Dummy ROSBridge publisher for attendance (IKH6352).

Publishes face-recognition style messages to ROSBridge WebSocket so the
SmartClassroom frontend can mark attendance.

Requires:
  pip install websocket-client

Environment:
  ROSBRIDGE_URL (default: ws://127.0.0.1:9090)
  ROS_FACE_TOPIC (default: /smartclassroom/face_recognition/result)

Message format sent:
  {"nim": "064102500001", "name": "...", "status": "hadir|sakit|alpha",
   "confidence": 0.92, "timestamp": 1700000000000}
"""

from __future__ import annotations

import json
import os
import random
import time
from pathlib import Path
from urllib.parse import urlparse

try:
    import websocket
except ImportError:  # pragma: no cover
    raise SystemExit(
        "Missing dependency: websocket-client. Install with: pip install websocket-client"
    )

ROSBRIDGE_URL = os.getenv("ROSBRIDGE_URL", "ws://127.0.0.1:9090")
ROS_FACE_TOPIC = os.getenv("ROS_FACE_TOPIC", "/smartclassroom/face_recognition/result")
ROS_FACE_MSG_TYPE = os.getenv("ROS_FACE_MSG_TYPE", "std_msgs/msg/String")

COURSE_CODE = "IKH6352"
COURSE_NAME = "Arsitektur dan Organisasi Komputer"
ROOM = "AE702"
START_TIME = "07:30:00"
END_TIME = "10:00:00"
LECTURER_NAME = "Adrian Sjamsul Qamar"
LECTURER_ID = "928"

KNOWN_NAMES = {
    "064102500001": "NAUFAL FAHREZI MAULANA",
}


def load_student_nims() -> list[str]:
    """Load student NIMs for IKH6352 from sisTrisakti response file."""
    script_dir = Path(__file__).resolve().parent
    data_path = script_dir.parent / "sisTrisakti" / "response-datakelasIF.json"

    if not data_path.exists():
        return [
            "064102500001",
            "064102500002",
            "064102500003",
            "064102500004",
            "064102500005",
            "064102500006",
            "064102500007",
            "064102500008",
            "064102500009",
            "064102500010",
            "064102500011",
            "064102500012",
            "064102500013",
            "064102500014",
            "064102400044",
            "064002200044",
            "064102500034",
            "064102500035",
            "064102500036",
        ]

    with data_path.open("r", encoding="utf-8") as file:
        payload = json.load(file)

    for item in payload.values():
        kelas = item.get("kelas") or {}
        if (
            kelas.get("KodeMk") == COURSE_CODE
            and kelas.get("KodeRuang") == ROOM
            and kelas.get("mulai") == START_TIME
            and kelas.get("selesai") == END_TIME
        ):
            return [s.get("nim") for s in (item.get("Std") or []) if s.get("nim")]

    # Fallback if course not found
    return [
        "064102500001",
        "064102500002",
        "064102500003",
        "064102500004",
        "064102500005",
        "064102500006",
        "064102500007",
        "064102500008",
        "064102500009",
        "064102500010",
        "064102500011",
        "064102500012",
        "064102500013",
        "064102500014",
        "064102400044",
        "064002200044",
        "064102500034",
        "064102500035",
        "064102500036",
    ]


def allocate_statuses(total: int) -> list[str]:
    hadir = round(total * 0.45)
    sakit = round(total * 0.30)
    alpha = max(total - hadir - sakit, 0)

    statuses = ["hadir"] * hadir + ["sakit"] * sakit + ["alpha"] * alpha
    random.shuffle(statuses)
    return statuses


def rosbridge_connect(url: str) -> websocket.WebSocket:
    ws = websocket.create_connection(url, timeout=10)
    advertise = {
        "op": "advertise",
        "topic": ROS_FACE_TOPIC,
        "type": ROS_FACE_MSG_TYPE,
    }
    ws.send(json.dumps(advertise))
    return ws


def publish_message(ws: websocket.WebSocket, payload: dict) -> None:
    message = {
        "op": "publish",
        "topic": ROS_FACE_TOPIC,
        "msg": {"data": json.dumps(payload)},
    }
    ws.send(json.dumps(message))


def main() -> None:
    random.seed(42)

    students = load_student_nims()
    statuses = allocate_statuses(len(students))

    parsed = urlparse(ROSBRIDGE_URL)
    if parsed.scheme not in {"ws", "wss"}:
        raise SystemExit(f"Invalid ROSBRIDGE_URL: {ROSBRIDGE_URL}")

    print("Publishing dummy attendance for:")
    print(f"  {COURSE_CODE} - {COURSE_NAME}")
    print(f"  Room: {ROOM}")
    print(f"  Lecturer: {LECTURER_NAME} ({LECTURER_ID})")
    print(f"  Students: {len(students)}")

    ws = rosbridge_connect(ROSBRIDGE_URL)

    try:
        for nim, status in zip(students, statuses):
            payload = {
                "nim": nim,
                "name": KNOWN_NAMES.get(nim),
                "status": status,
                "confidence": round(random.uniform(0.85, 0.99), 3) if status == "hadir" else 0.0,
                "timestamp": int(time.time() * 1000),
            }
            publish_message(ws, payload)
            print(f"Sent {nim} -> {status}")
            time.sleep(0.2)
    finally:
        ws.close()


if __name__ == "__main__":
    main()
