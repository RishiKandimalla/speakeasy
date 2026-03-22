import logging
import os

import time
from hume import HumeClient
from hume.expression_measurement.batch.types import Models, Prosody
from hume.expression_measurement.batch.types.inference_base_request import InferenceBaseRequest

log = logging.getLogger(__name__)

# Emotions that indicate energetic, engaging delivery
_ENERGY_POSITIVE = {"Excitement", "Interest", "Joy", "Triumph"}
_ENERGY_NEGATIVE = {"Boredom", "Tiredness", "Sadness", "Distress"}

# Emotions that indicate confident delivery
_CONFIDENCE_POSITIVE = {"Determination", "Pride", "Triumph", "Satisfaction", "Contentment"}
_CONFIDENCE_NEGATIVE = {"Doubt", "Anxiety", "Fear", "Embarrassment", "Shame", "Awkwardness"}


def _avg_emotions(segments: list[dict]) -> dict[str, float]:
    """Average raw emotion scores across a list of Hume prediction segments."""
    accum: dict[str, list[float]] = {}
    for seg in segments:
        for e in seg.get("emotions", []):
            accum.setdefault(e["name"], []).append(e["score"])
    return {name: sum(vals) / len(vals) for name, vals in accum.items()}


def _score_emotions(emotion_map: dict[str, float]) -> dict[str, float]:
    """
    Extract confidence and energy scores (0–1) from a raw Hume emotion map.

    Confidence comes directly from Hume's "Confidence" emotion dimension.
    Energy uses the formula: (positive_avg - negative_avg + 1) / 2
    which maps the [-1, 1] difference range into [0, 1], with 0.5 as neutral.
    """
    def _avg(names: set[str]) -> float:
        vals = [emotion_map[n] for n in names if n in emotion_map]
        return sum(vals) / len(vals) if vals else 0.5

    confidence = round(max(0.0, min(1.0, (_avg(_CONFIDENCE_POSITIVE) - _avg(_CONFIDENCE_NEGATIVE) + 1) / 2)), 3)
    energy = round(max(0.0, min(1.0, (_avg(_ENERGY_POSITIVE) - _avg(_ENERGY_NEGATIVE) + 1) / 2)), 3)
    return {"confidence": confidence, "energy": energy}


def analyze_tone(audio_path: str, sentences: list[dict]) -> dict:
    """
    Submit audio to Hume AI's Speech Prosody model and map emotion scores onto sentences.

    For each sentence (which has 'start' and 'end' timestamps), finds all Hume utterance
    segments that overlap the sentence's time window, averages their emotion scores, and
    computes derived confidence and energy scores.

    Args:
        audio_path: Path to a local audio file (WAV, MP3, etc.)
        sentences: List of sentence dicts with 'start' and 'end' float fields (in seconds)

    Returns:
        {
            "sentences_tone": [{"confidence": float, "energy": float} | None, ...],
            "overall": {"confidence": float, "energy": float},
        }

        sentences_tone is parallel to the input sentences list. An entry is None if no
        Hume segment overlaps that sentence's time window.
    """
    client = HumeClient(api_key=os.environ["HUME_API_KEY"])
    batch = client.expression_measurement.batch

    with open(audio_path, "rb") as f:
        job_id_str = batch.start_inference_job_from_local_file(
            file=[f],
            json=InferenceBaseRequest(models=Models(prosody=Prosody(granularity="utterance"))),
        )
    log.info(f"Hume tone job submitted: {job_id_str}")

    while True:
        details = batch.get_job_details(id=job_id_str)
        status = details.state.status if details.state else None
        if status in ("COMPLETED", "FAILED"):
            break
        time.sleep(2)
    log.info(f"Hume tone job complete: {job_id_str} status={status}")

    predictions = list(batch.get_job_predictions(id=job_id_str))
    try:
        file_result = predictions[0].results.predictions[0]
        grouped = file_result.models.prosody.grouped_predictions
        raw_segments = grouped[0].predictions if grouped else []
    except (IndexError, AttributeError, TypeError):
        log.warning("Hume returned no prosody segments — defaulting to empty tone")
        raw_segments = []

    parsed = [
        {
            "start": seg.time.begin if seg.time else 0.0,
            "end": seg.time.end if seg.time else 0.0,
            "emotions": [{"name": e.name, "score": e.score} for e in (seg.emotions or [])],
        }
        for seg in raw_segments
    ]

    # Per-sentence tone: find Hume segments that overlap each sentence's time window
    sentences_tone = []
    for sentence in sentences:
        overlapping = [
            seg for seg in parsed
            if seg["start"] < sentence["end"] and seg["end"] > sentence["start"]
        ]
        if overlapping:
            sentences_tone.append(_score_emotions(_avg_emotions(overlapping)))
        else:
            sentences_tone.append(None)

    overall = _score_emotions(_avg_emotions(parsed))

    return {"sentences_tone": sentences_tone, "overall": overall}
