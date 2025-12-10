"""GUI helper to simulate student responses via HTTP endpoints.

This tool helps lecturers seed temporary participants and inject
responses for the current session question without real devices.
It talks to the Django runtime API using the lecturer's JWT token.
"""

from __future__ import annotations

import json
import threading
import tkinter as tk
from tkinter import messagebox, ttk

import requests


class ResponseSimulator:
    def __init__(self) -> None:
        self.root = tk.Tk()
        self.root.title("SmartClassroom Response Simulator")
        self.root.resizable(False, False)

        self.base_url_var = tk.StringVar(value="http://localhost:8000")
        self.token_var = tk.StringVar()
        self.session_id_var = tk.StringVar()
        self.seed_count_var = tk.StringVar(value="30")
        self.accuracy_var = tk.StringVar(value="70")
        self.session_question_var = tk.StringVar()
        self.seeded_participants: list[int] = []
        self.session_payload: dict | None = None

        self._build_form()

    # UI -----------------------------------------------------------------

    def _build_form(self) -> None:
        main = ttk.Frame(self.root, padding=12)
        main.grid(row=0, column=0)

        ttk.Label(main, text="API Base URL").grid(row=0, column=0, sticky="w")
        ttk.Entry(main, width=40, textvariable=self.base_url_var).grid(row=0, column=1, sticky="w")

        ttk.Label(main, text="JWT Access Token").grid(row=1, column=0, sticky="w")
        ttk.Entry(main, width=40, textvariable=self.token_var, show="*").grid(row=1, column=1, sticky="w")

        ttk.Label(main, text="Session ID").grid(row=2, column=0, sticky="w")
        ttk.Entry(main, width=10, textvariable=self.session_id_var).grid(row=2, column=1, sticky="w")

        ttk.Button(main, text="Load Session", command=self._async_load_session).grid(row=2, column=2, padx=5)

        ttk.Label(main, text="Current Session Info:").grid(row=3, column=0, sticky="w", pady=(10, 0))
        self.session_info = tk.Text(main, width=60, height=4, state="disabled")
        self.session_info.grid(row=4, column=0, columnspan=3, pady=4)

        ttk.Separator(main).grid(row=5, column=0, columnspan=3, sticky="ew", pady=8)

        ttk.Label(main, text="Participants to Seed").grid(row=6, column=0, sticky="w")
        ttk.Entry(main, width=10, textvariable=self.seed_count_var).grid(row=6, column=1, sticky="w")
        ttk.Button(main, text="Seed Participants", command=self._async_seed_participants).grid(row=6, column=2, padx=5)

        ttk.Label(main, text="Session Question ID (optional)").grid(row=7, column=0, sticky="w", pady=(8, 0))
        ttk.Entry(main, width=15, textvariable=self.session_question_var).grid(row=7, column=1, sticky="w", pady=(8, 0))

        ttk.Label(main, text="Accuracy % (0-100)").grid(row=8, column=0, sticky="w")
        ttk.Entry(main, width=10, textvariable=self.accuracy_var).grid(row=8, column=1, sticky="w")
        ttk.Button(main, text="Send Responses", command=self._async_simulate).grid(row=8, column=2, padx=5)

        ttk.Label(main, text="Participants seeded in this session:").grid(row=9, column=0, columnspan=3, sticky="w", pady=(12, 0))
        self.participants_box = tk.Text(main, width=60, height=6, state="disabled")
        self.participants_box.grid(row=10, column=0, columnspan=3, pady=4)

        ttk.Label(main, text="Activity Log:").grid(row=11, column=0, columnspan=3, sticky="w", pady=(10, 0))
        self.log_box = tk.Text(main, width=60, height=8, state="disabled")
        self.log_box.grid(row=12, column=0, columnspan=3, pady=4)

    # Helpers -------------------------------------------------------------

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        token = self.token_var.get().strip()
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return headers

    def _api(self, path: str) -> str:
        base = self.base_url_var.get().rstrip("/")
        return f"{base}{path}"

    def _append_text(self, widget: tk.Text, text: str) -> None:
        widget.configure(state="normal")
        widget.insert("end", text + "\n")
        widget.configure(state="disabled")
        widget.see("end")

    def log(self, message: str) -> None:
        self._append_text(self.log_box, message)

    def _update_session_box(self, payload: dict) -> None:
        text = json.dumps(
            {
                "code": payload.get("code"),
                "status": payload.get("status"),
                "current_question": payload.get("current_question"),
                "active_question_title": payload.get("current_question_detail", {}).get("question_text"),
            },
            indent=2,
        )
        self.session_info.configure(state="normal")
        self.session_info.delete("1.0", "end")
        self.session_info.insert("end", text)
        self.session_info.configure(state="disabled")

    def _async(self, func):
        threading.Thread(target=func, daemon=True).start()

    # Network -------------------------------------------------------------

    def _async_load_session(self):
        self._async(self.load_session)

    def load_session(self) -> None:
        session_id = self.session_id_var.get().strip()
        if not session_id:
            messagebox.showerror("Missing data", "Please provide a session ID")
            return
        url = self._api(f"/api/quiz/runtime/sessions/{session_id}/")
        try:
            resp = requests.get(url, headers=self._headers(), timeout=10)
            resp.raise_for_status()
        except requests.RequestException as exc:
            messagebox.showerror("Request failed", str(exc))
            return
        data = resp.json()
        self.session_payload = data
        self._update_session_box(data)
        self.log(f"Loaded session {session_id} (status={data.get('status')})")

    def _async_seed_participants(self):
        self._async(self.seed_participants)

    def seed_participants(self) -> None:
        session_id = self.session_id_var.get().strip()
        try:
            count = int(self.seed_count_var.get() or "0")
        except ValueError:
            messagebox.showerror("Invalid input", "Participant count must be a number")
            return
        if not session_id or count <= 0:
            messagebox.showerror("Missing data", "Provide session ID and participant count")
            return
        url = self._api(f"/api/quiz/runtime/sessions/{session_id}/seed-participants/")
        payload = {"count": count}
        try:
            resp = requests.post(url, headers=self._headers(), json=payload, timeout=15)
            resp.raise_for_status()
        except requests.RequestException as exc:
            messagebox.showerror("Request failed", str(exc))
            return
        participants = resp.json()
        ids = [item["participant_id"] for item in participants]
        self.seeded_participants.extend(ids)
        self._append_text(
            self.participants_box,
            "\n".join(f"ID {item['participant_id']} -> {item['user_email']}" for item in participants),
        )
        self.log(f"Seeded {len(participants)} participants")

    def _async_simulate(self):
        self._async(self.simulate_responses)

    def simulate_responses(self) -> None:
        session_id = self.session_id_var.get().strip()
        if not session_id:
            messagebox.showerror("Missing data", "Provide session ID")
            return
        try:
            ratio_input = float(self.accuracy_var.get() or "0")
        except ValueError:
            messagebox.showerror("Invalid input", "Accuracy must be numeric")
            return
        ratio = max(0.0, min(1.0, ratio_input / 100))
        session_question_id = self.session_question_var.get().strip()
        if not session_question_id:
            if not self.session_payload:
                self.load_session()
            current = (self.session_payload or {}).get("current_question")
            if not current:
                messagebox.showerror("No question", "Session has no active question; open one first")
                return
            session_question_id = str(current)
        ids = self.seeded_participants or None
        url = self._api(f"/api/quiz/runtime/sessions/{session_id}/simulate-responses/")
        try:
            question_id_int = int(session_question_id)
        except ValueError:
            messagebox.showerror("Invalid input", "Session question ID must be numeric")
            return
        payload = {
            "session_question_id": question_id_int,
            "correct_ratio": ratio,
        }
        if ids:
            payload["participant_ids"] = ids
        try:
            resp = requests.post(url, headers=self._headers(), json=payload, timeout=30)
            resp.raise_for_status()
        except requests.RequestException as exc:
            messagebox.showerror("Request failed", str(exc))
            return
        processed = resp.json().get("processed")
        self.log(f"Submitted simulated responses for {processed} participants (accuracy={ratio*100:.1f}%)")

    # Public --------------------------------------------------------------

    def run(self) -> None:
        self.root.mainloop()


if __name__ == "__main__":
    ResponseSimulator().run()
