from __future__ import annotations

import audioop
import math
import os
import subprocess
import wave
from dataclasses import dataclass
from typing import Any

import numpy as np


@dataclass(frozen=True)
class VoiceVadResult:
    segments: list[tuple[int, int]]
    threshold: float
    ratio: float


@dataclass(frozen=True)
class VoiceMetrics:
    duration_ms: int
    voice_active_ms: int
    voice_ratio: float
    vad_threshold: float
    rms_in: float


DEFAULT_SR = 16000


def energy_rms(x: np.ndarray) -> float:
    x = np.asarray(x, dtype=np.float32)
    return float(np.sqrt(np.mean(x * x) + 1e-12))


def _highpass_alpha(sr: int, hz: float) -> float:
    if hz <= 0:
        return 0.0
    rc = 1.0 / (2.0 * math.pi * hz)
    dt = 1.0 / float(sr)
    return float(rc / (rc + dt))


def highpass_1pole(x: np.ndarray, sr: int, hz: float) -> np.ndarray:
    if hz <= 0:
        return x.astype(np.float32)
    alpha = _highpass_alpha(sr, hz)
    x = x.astype(np.float32)
    y = np.zeros_like(x, dtype=np.float32)
    prev_y = 0.0
    prev_x = float(x[0]) if len(x) else 0.0
    for i in range(len(x)):
        xi = float(x[i])
        prev_y = alpha * (prev_y + xi - prev_x)
        y[i] = prev_y
        prev_x = xi
    return y


def normalize_rms(x: np.ndarray, target: float) -> tuple[np.ndarray, float, float]:
    r = energy_rms(x)
    if r < 1e-9:
        return x.astype(np.float32), float(r), 1.0
    g = float(target / r)
    return (x.astype(np.float32) * g).astype(np.float32), float(r), float(g)


def preprocess_light_for_vad(x: np.ndarray, sr: int) -> tuple[np.ndarray, dict[str, Any]]:
    meta: dict[str, Any] = {}
    xin = x.astype(np.float32)
    meta["rms_in"] = energy_rms(xin)

    y = xin
    highpass_hz = float(os.getenv("VOICE_HIGHPASS_HZ", "80"))
    if highpass_hz > 0:
        meta["highpass_hz"] = highpass_hz
        meta["highpass_alpha"] = _highpass_alpha(sr, highpass_hz)
        y = highpass_1pole(y, sr, highpass_hz)

    meta["rms_after_hp"] = energy_rms(y)
    rms_target_light = float(os.getenv("VOICE_RMS_TARGET_LIGHT", "0.04"))
    y_norm, rms_before_norm, gain = normalize_rms(y, rms_target_light)
    meta["norm_target"] = rms_target_light
    meta["rms_before_norm"] = float(rms_before_norm)
    meta["norm_gain"] = float(gain)
    meta["rms_out"] = energy_rms(y_norm)
    return y_norm, meta


def preprocess_for_ecapa(x: np.ndarray, sr: int) -> tuple[np.ndarray, dict[str, Any]]:
    meta: dict[str, Any] = {}
    y = x.astype(np.float32)
    meta["rms_in"] = energy_rms(y)
    highpass_hz = float(os.getenv("VOICE_HIGHPASS_HZ", "80"))
    if highpass_hz > 0:
        meta["highpass_hz"] = highpass_hz
        meta["highpass_alpha"] = _highpass_alpha(sr, highpass_hz)
        y = highpass_1pole(y, sr, highpass_hz)
    meta["rms_after_hp"] = energy_rms(y)
    y, rms_before_norm, gain = normalize_rms(y, float(os.getenv("VOICE_RMS_TARGET_ECAPA", "0.06")))
    meta["rms_before_norm"] = float(rms_before_norm)
    meta["norm_gain"] = float(gain)
    meta["rms_out"] = energy_rms(y)
    return y, meta


def _frame_energy(x: np.ndarray, frame: int, hop: int) -> np.ndarray:
    n = len(x)
    if n < frame:
        return np.array([], dtype=np.float32)
    m = 1 + (n - frame) // hop
    out = np.zeros((m,), dtype=np.float32)
    for i in range(m):
        a = i * hop
        b = a + frame
        w = x[a:b]
        out[i] = float(np.mean(w * w))
    return out


def vad_adaptive_energy(x: np.ndarray, sr: int) -> VoiceVadResult:
    vad_frame_ms = int(os.getenv("VOICE_VAD_FRAME_MS", "30"))
    vad_noise_probe_sec = float(os.getenv("VOICE_VAD_NOISE_PROBE_SEC", "0.6"))
    vad_energy_mult = float(os.getenv("VOICE_VAD_ENERGY_MULT", "2.5"))
    vad_energy_floor = float(os.getenv("VOICE_VAD_ENERGY_FLOOR", "1e-6"))
    vad_pad_ms = int(os.getenv("VOICE_VAD_PAD_MS", "250"))
    vad_merge_gap_ms = int(os.getenv("VOICE_VAD_MERGE_GAP_MS", "300"))
    vad_min_speech_ms = int(os.getenv("VOICE_VAD_MIN_SPEECH_MS", "350"))

    frame = int(vad_frame_ms * sr / 1000.0)
    hop = frame
    if frame < 16:
        frame = 16

    e = _frame_energy(x, frame, hop)
    if e.size == 0:
        return VoiceVadResult(segments=[], threshold=0.0, ratio=0.0)

    # Noise estimation:
    # Using only the first N seconds is fragile if the user starts speaking immediately.
    # We combine the initial probe median with a low-percentile estimate across the full clip.
    probe = int(vad_noise_probe_sec * sr)
    probe_frames = max(1, probe // hop)
    e_probe = e[: min(len(e), probe_frames)]
    noise_probe_median = float(np.median(e_probe)) if len(e_probe) else 0.0

    noise_percentile = float(os.getenv("VOICE_VAD_NOISE_PERCENTILE", "20"))
    noise_percentile = max(1.0, min(40.0, noise_percentile))
    noise_global = float(np.percentile(e, noise_percentile))

    noise_e = min(noise_probe_median, noise_global)
    thr = max(vad_energy_floor, noise_e * vad_energy_mult)

    speech_mask = (e >= thr).astype(np.int32)

    pad = int(vad_pad_ms / 1000.0 * sr)
    merge_gap = int(vad_merge_gap_ms / 1000.0 * sr)
    min_len = int(vad_min_speech_ms / 1000.0 * sr)

    segs: list[tuple[int, int]] = []
    in_s = False
    s0 = 0
    for i, v in enumerate(speech_mask):
        if v and not in_s:
            in_s = True
            s0 = i * hop
        if in_s and (v == 0):
            in_s = False
            s1 = i * hop
            segs.append((s0, s1))
    if in_s:
        segs.append((s0, len(x)))

    segs2: list[tuple[int, int]] = []
    for a, b in segs:
        a2 = max(0, a - pad)
        b2 = min(len(x), b + pad)
        if b2 - a2 >= min_len:
            segs2.append((a2, b2))

    merged: list[list[int]] = []
    for a, b in segs2:
        if not merged:
            merged.append([a, b])
        else:
            pa, pb = merged[-1]
            if a - pb <= merge_gap:
                merged[-1][1] = max(pb, b)
            else:
                merged.append([a, b])

    merged_t = [(int(a), int(b)) for a, b in merged]
    ratio = float(np.mean(speech_mask)) if speech_mask.size else 0.0
    return VoiceVadResult(segments=merged_t, threshold=float(thr), ratio=float(ratio))


def decode_audio_to_mono_16k(file_path: str) -> tuple[np.ndarray, int]:
    """Decode audio file into mono float32 @ 16k.

    Preferred: ffmpeg -> raw PCM16 s16le mono 16k to stdout.
    Fallback: if WAV PCM16 -> python wave + optional audioop resample.
    """

    ffmpeg_path = os.getenv("FFMPEG_PATH", "ffmpeg")
    try:
        cmd = [
            ffmpeg_path,
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            file_path,
            "-f",
            "s16le",
            "-ac",
            "1",
            "-ar",
            str(DEFAULT_SR),
            "-",
        ]
        p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if p.returncode == 0 and p.stdout:
            pcm16 = p.stdout
            wav_i16 = np.frombuffer(pcm16, dtype=np.int16)
            x = (wav_i16.astype(np.float32) / 32768.0).clip(-1.0, 1.0)
            return x, DEFAULT_SR
    except Exception:
        # fall through
        pass

    # Fallback: WAV PCM16
    with wave.open(file_path, "rb") as wf:
        nch = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        sr = wf.getframerate()
        nframes = wf.getnframes()
        raw = wf.readframes(nframes)

    if sampwidth != 2:
        raise ValueError("Unsupported WAV sample width (need PCM16)")

    if nch == 2:
        raw = audioop.tomono(raw, 2, 0.5, 0.5)
    elif nch != 1:
        raise ValueError("Unsupported WAV channels")

    if sr != DEFAULT_SR:
        raw, _ = audioop.ratecv(raw, 2, 1, sr, DEFAULT_SR, None)
        sr = DEFAULT_SR

    wav_i16 = np.frombuffer(raw, dtype=np.int16)
    x = (wav_i16.astype(np.float32) / 32768.0).clip(-1.0, 1.0)
    return x, sr


def analyze_voice_sample(file_path: str) -> tuple[VoiceMetrics, VoiceVadResult]:
    x, sr = decode_audio_to_mono_16k(file_path)
    duration_ms = int(round((len(x) / float(sr)) * 1000.0))
    rms_in = energy_rms(x)

    x_vad, _ = preprocess_light_for_vad(x, sr)
    vad = vad_adaptive_energy(x_vad, sr)
    voice_active_ms = int(round(sum((b - a) for (a, b) in vad.segments) / float(sr) * 1000.0))
    voice_ratio = float(voice_active_ms / duration_ms) if duration_ms > 0 else 0.0

    metrics = VoiceMetrics(
        duration_ms=duration_ms,
        voice_active_ms=voice_active_ms,
        voice_ratio=float(voice_ratio),
        vad_threshold=float(vad.threshold),
        rms_in=float(rms_in),
    )
    return metrics, vad


_ECAPA_MODEL = None


def _get_best_device() -> str:
    try:
        import torch  # type: ignore

        return "cuda" if torch.cuda.is_available() else "cpu"
    except Exception:
        return "cpu"


def get_ecapa_model():
    global _ECAPA_MODEL
    if _ECAPA_MODEL is not None:
        return _ECAPA_MODEL

    try:
        from speechbrain.inference.speaker import EncoderClassifier  # type: ignore
    except Exception as e:
        raise RuntimeError("SpeechBrain not installed") from e

    device = _get_best_device()
    savedir = os.path.join(os.getenv("VOICE_MODEL_DIR", "pretrained_models"), "ecapa_voxceleb")
    os.makedirs(savedir, exist_ok=True)
    model = EncoderClassifier.from_hparams(
        source="speechbrain/spkrec-ecapa-voxceleb",
        savedir=savedir,
        run_opts={"device": device},
    )
    model.eval()
    _ECAPA_MODEL = model
    return model


def _embed_windows(ecapa, x: np.ndarray, sr: int) -> list[np.ndarray]:
    win_min_sec = float(os.getenv("VOICE_ECAPA_WIN_MIN_SEC", "0.50"))
    win_max_sec = float(os.getenv("VOICE_ECAPA_WIN_MAX_SEC", "3.0"))
    win_hop_sec = float(os.getenv("VOICE_ECAPA_WIN_HOP_SEC", "0.4"))
    embed_short_fallback_sec = float(os.getenv("VOICE_ECAPA_SHORT_FALLBACK_SEC", "0.40"))

    L = int(len(x))
    win_min = int(win_min_sec * sr)
    win_max = int(win_max_sec * sr)
    hop = max(1, int(win_hop_sec * sr))
    fallback_min = int(embed_short_fallback_sec * sr)

    wins: list[tuple[int, int]] = []
    if L < win_min:
        if L >= fallback_min:
            wins = [(0, L)]
        else:
            return []
    else:
        a = 0
        while a < L:
            b = min(L, a + win_max)
            if b - a >= win_min:
                wins.append((a, b))
            if b == L:
                break
            a += hop

    if not wins:
        return []

    try:
        import torch  # type: ignore
    except Exception as e:
        raise RuntimeError("Torch not installed") from e

    device = _get_best_device()
    out: list[np.ndarray] = []
    with torch.no_grad():
        for a, b in wins:
            seg = x[a:b]
            seg_pp, _ = preprocess_for_ecapa(seg, sr)
            wav = torch.from_numpy(seg_pp).float().unsqueeze(0)
            if device == "cuda":
                wav = wav.cuda()
            emb = ecapa.encode_batch(wav).squeeze().detach().cpu().numpy().astype(np.float32)
            emb = emb / (np.linalg.norm(emb) + 1e-12)
            out.append(emb)
    return out


def compute_enrollment_embedding(file_path: str) -> tuple[list[float], dict[str, Any]]:
    """Return (embedding_list, debug_meta).

    Raises if model isn't available.
    """

    x, sr = decode_audio_to_mono_16k(file_path)
    x_vad, _ = preprocess_light_for_vad(x, sr)
    vad = vad_adaptive_energy(x_vad, sr)

    ecapa = get_ecapa_model()
    embs: list[np.ndarray] = []
    for a, b in vad.segments:
        seg_raw = x[a:b]
        embs.extend(_embed_windows(ecapa, seg_raw, sr))

    if not embs:
        return [], {"reason": "no_embeddings"}

    e = np.mean(np.stack(embs, axis=0), axis=0).astype(np.float32)
    e = e / (np.linalg.norm(e) + 1e-12)
    return e.tolist(), {"embedding_count": int(len(embs))}
