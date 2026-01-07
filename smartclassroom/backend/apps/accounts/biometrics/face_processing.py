from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np


@dataclass(frozen=True)
class FaceQuality:
    blur_score: float


def decode_image_bytes(image_bytes: bytes) -> np.ndarray:
    data = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Invalid image")
    return img


def crop_center_square(img: np.ndarray) -> np.ndarray:
    h, w = img.shape[:2]
    side = min(h, w)
    y0 = (h - side) // 2
    x0 = (w - side) // 2
    return img[y0 : y0 + side, x0 : x0 + side]


def resize_to(img: np.ndarray, size: int = 256) -> np.ndarray:
    return cv2.resize(img, (size, size), interpolation=cv2.INTER_AREA)


def compute_blur_score(img: np.ndarray) -> float:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def process_face_image(image_bytes: bytes, output_size: int = 256) -> tuple[bytes, FaceQuality]:
    """MVP face processing: center-crop square + resize + blur score.

    Later we can replace crop_center_square with a real face detector + alignment.
    Returns JPEG bytes.
    """

    img = decode_image_bytes(image_bytes)
    img = crop_center_square(img)
    img = resize_to(img, output_size)

    quality = FaceQuality(blur_score=compute_blur_score(img))

    ok, buf = cv2.imencode(".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
    if not ok:
        raise ValueError("Failed to encode image")

    return bytes(buf), quality
