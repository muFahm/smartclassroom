from __future__ import annotations

import io
import os
import threading
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

try:
    import face_recognition
except Exception:
    face_recognition = None

from django.conf import settings
from ..models import FaceLabelMapping, CustomUser


@dataclass
class IdentifyResult:
    label: str
    distance: float


class FaceService:
    """Loads encodings.pickle into memory and exposes identify(image_bytes).

    It will look for encodings.pickle in these locations (first found):
      - settings.FACE_ENCODINGS_PATH (env override)
      - BASE_DIR.parent / 'encodings.pickle'
      - BASE_DIR.parent.parent / 'FACE_RECOGNITION' / 'encodings.pickle'

    The pickle is expected to be a dict with keys 'encodings' and 'names'.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._labels: List[str] = []
        self._embs: Optional[np.ndarray] = None
        self._loaded_path: Optional[str] = None
        self._available = False
        self.load_if_available()

    def _candidate_paths(self) -> List[str]:
        paths: List[str] = []
        env_path = os.getenv("FACE_ENCODINGS_PATH") or getattr(settings, "FACE_ENCODINGS_PATH", None)
        if env_path:
            paths.append(env_path)
        # possible default locations
        base = getattr(settings, "BASE_DIR", None)
        if base:
            try:
                p1 = os.path.join(str(base.parent), "encodings.pickle")
                paths.append(p1)
            except Exception:
                pass
            try:
                root = str(base.parent.parent)
                # common repo layouts
                paths.append(os.path.join(root, "FACE_RECOGNITION", "encodings.pickle"))
                paths.append(os.path.join(root, "FACE_RECOGNITION", "FACE_RECOGNITION", "encodings.pickle"))
            except Exception:
                pass
        return paths

    def load_if_available(self) -> bool:
        """Try loading encodings.pickle from candidate paths."""
        if face_recognition is None:
            return False
        for p in self._candidate_paths():
            if not p:
                continue
            if os.path.exists(p):
                try:
                    self.reload(p)
                    return True
                except Exception:
                    continue
        return False

    def reload(self, path: Optional[str] = None) -> None:
        with self._lock:
            if path is None:
                for p in self._candidate_paths():
                    if os.path.exists(p):
                        path = p
                        break
            if path is None or not os.path.exists(path):
                raise FileNotFoundError("encodings.pickle not found; set FACE_ENCODINGS_PATH or place encodings.pickle in expected location")

            import pickle

            with open(path, "rb") as f:
                data = pickle.load(f)

            encs = data.get("encodings")
            names = data.get("names")
            if not encs or not names or len(encs) != len(names):
                raise ValueError("encodings.pickle missing required keys or has inconsistent lengths")

            arr = np.stack([np.array(e, dtype=np.float32) for e in encs], axis=0)
            # normalize
            norms = np.linalg.norm(arr, axis=1, keepdims=True) + 1e-12
            arr = arr / norms

            self._labels = list(names)
            self._embs = arr
            self._loaded_path = path
            self._available = True

    def available(self) -> bool:
        return self._available and self._embs is not None

    def identify(self, image_bytes: bytes, tolerance: float = 0.45) -> List[IdentifyResult]:
        """Return list of IdentifyResult for each face found in the image, sorted by distance (low->high).

        If no faces or service unavailable, return empty list.
        """
        if face_recognition is None or not self.available():
            return []

        # decode image bytes to numpy array
        try:
            img = face_recognition.load_image_file(io.BytesIO(image_bytes))
        except Exception:
            return []

        locations = face_recognition.face_locations(img, model="hog")
        if not locations:
            return []

        encs = face_recognition.face_encodings(img, locations)
        out: List[IdentifyResult] = []
        for emb in encs:
            q = np.array(emb, dtype=np.float32)
            q = q / (np.linalg.norm(q) + 1e-12)
            # compute l2 distances
            dists = np.linalg.norm(self._embs - q[None, :], axis=1)
            idx = int(np.argmin(dists))
            best = float(dists[idx])
            label = self._labels[idx]
            if best <= tolerance:
                out.append(IdentifyResult(label=label, distance=best))
            else:
                out.append(IdentifyResult(label="UNKNOWN", distance=best))

        return out

    def map_label_to_user(self, label: str) -> Optional[CustomUser]:
        """Try to find a mapped CustomUser for label.

        - First check FaceLabelMapping model
        - Then try username == label
        - Then split label by '_' and try username == name or username == nim
        - Only return users with role == 'student'
        """
        if not label or label == "UNKNOWN":
            return None
        try:
            mapping = FaceLabelMapping.objects.filter(label=label).first()
            if mapping and mapping.user and mapping.user.role == "student":
                return mapping.user
        except Exception:
            pass

        # fallback heuristics
        try:
            user = CustomUser.objects.filter(username=label, role="student").first()
            if user:
                return user
        except Exception:
            pass

        parts = label.split("_")
        if len(parts) >= 2:
            name = parts[0]
            nim = parts[1]
            try:
                user = CustomUser.objects.filter(username=name, role="student").first()
                if user:
                    return user
                user = CustomUser.objects.filter(username__icontains=name, role="student").first()
                if user:
                    return user
                user = CustomUser.objects.filter(username__icontains=nim, role="student").first()
                if user:
                    return user
            except Exception:
                pass
        return None


# module-level singleton
_service: Optional[FaceService] = None


def get_face_service() -> FaceService:
    global _service
    if _service is None:
        _service = FaceService()
    return _service
