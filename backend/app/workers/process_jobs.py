import logging
import math
import os
import shutil
import subprocess
import tempfile
from dotenv import load_dotenv

load_dotenv()

import json
import assemblyai as aai
import google.generativeai as genai
from app.db import queries
from app.services import storage_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)


def extract_audio(video_path: str, audio_path: str) -> None:
    subprocess.run(
        ["ffmpeg", "-y", "-i", video_path, "-vn", "-ar", "16000", "-ac", "1", "-f", "wav", audio_path],
        capture_output=True,
        check=True,
    )


def transcribe(audio_path: str) -> dict:
    aai.settings.api_key = os.environ["ASSEMBLYAI_API_KEY"]
    config = aai.TranscriptionConfig(
        disfluencies=True,
        speech_models=["universal-2"],
        word_boost=[
            "um", "uh", "mm", "hmm", "mhm", "ugh", "er", "ah",
            "like", "you know", "I mean", "so", "basically", "literally",
            "actually", "right", "okay", "well", "kind of", "sort of",
            "anyway", "whatever", "seriously", "honestly", "clearly",
        ],
    )
    transcript = aai.Transcriber().transcribe(audio_path, config)
    if transcript.status == aai.TranscriptStatus.error:
        raise RuntimeError(f"AssemblyAI transcription failed: {transcript.error}")
    words = [
        {"word": w.text, "start": w.start / 1000, "end": w.end / 1000}
        for w in (transcript.words or [])
    ]
    return {"text": transcript.text, "words": words}


PAUSE_THRESHOLD = 0.5  # seconds


def detect_fillers(words: list[dict]) -> dict[str, int]:
    """Use Gemini to identify which words are filler words in context."""
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    model = genai.GenerativeModel(
        "gemini-2.0-flash",
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            response_schema={
                "type": "object",
                "additionalProperties": {"type": "integer"},
            },
        ),
    )

    numbered = "\n".join(f"{i}: {w['word']}" for i, w in enumerate(words))
    prompt = (
        "You are analyzing a speech transcript for filler words.\n"
        "A filler word is one used as a hesitation or verbal habit with no semantic meaning in context "
        "(e.g. 'um', 'uh', 'like' when not comparing, 'so' when not a connector, 'you know', 'basically', etc.).\n\n"
        f"Word list (index: word):\n{numbered}\n\n"
        "Return a JSON object mapping each filler word (lowercased, no punctuation) to its count. "
        "Example: {\"um\": 2, \"like\": 1}. If none, return {}."
    )

    response = model.generate_content(prompt)
    return json.loads(response.text)


def analyze(transcript: dict) -> dict:
    words = transcript.get("words", [])
    if not words:
        return {}

    duration = words[-1]["end"] - words[0]["start"]
    duration_min = duration / 60 if duration > 0 else 1

    # WPM and word count
    word_count = len(words)
    wpm = round(word_count / duration_min, 1)

    # Filler words via Gemini
    filler_counts = detect_fillers(words)
    filler_count = sum(filler_counts.values())
    filler_rate = round(filler_count / duration_min, 2)

    # Pauses
    pauses = []
    for i in range(1, len(words)):
        gap = words[i]["start"] - words[i - 1]["end"]
        if gap >= PAUSE_THRESHOLD:
            pauses.append(round(gap, 2))
    pause_count = len(pauses)
    longest_pause = round(max(pauses), 2) if pauses else 0
    avg_pause = round(sum(pauses) / len(pauses), 2) if pauses else 0

    # Sentence breakdown
    sentences = []
    current: list[dict] = []
    for w in words:
        current.append(w)
        if w["word"].endswith((".", "?", "!")):
            if current:
                start = current[0]["start"]
                end = current[-1]["end"]
                text = " ".join(x["word"] for x in current)
                seg_dur = (end - start) / 60 if (end - start) > 0 else 1
                sentences.append({
                    "text": text,
                    "start": round(start, 2),
                    "end": round(end, 2),
                    "word_count": len(current),
                    "wpm": round(len(current) / seg_dur, 1),
                })
                current = []
    # flush any remaining words as last sentence
    if current:
        start = current[0]["start"]
        end = current[-1]["end"]
        text = " ".join(x["word"] for x in current)
        seg_dur = (end - start) / 60 if (end - start) > 0 else 1
        sentences.append({
            "text": text,
            "start": round(start, 2),
            "end": round(end, 2),
            "word_count": len(current),
            "wpm": round(len(current) / seg_dur, 1),
        })

    # Filler positions for frontend highlighting
    filler_set = set(filler_counts.keys())
    filler_positions = [
        {"word": w["word"], "index": i, "start": w["start"], "end": w["end"]}
        for i, w in enumerate(words)
        if w["word"].lower().strip(".,!?") in filler_set
    ]

    return {
        "duration": round(duration, 2),
        "word_count": word_count,
        "wpm": wpm,
        "filler_count": filler_count,
        "filler_rate": filler_rate,
        "filler_words": filler_counts,
        "filler_positions": filler_positions,
        "pause_count": pause_count,
        "longest_pause": longest_pause,
        "avg_pause": avg_pause,
        "pauses": pauses,
        "sentences": sentences,
    }


def compute_scores(metrics: dict) -> dict:
    wpm = metrics.get("wpm", 0)
    filler_rate = metrics.get("filler_rate", 0)

    # Fluency: 100 minus 3 points per filler/min above threshold of 2/min
    fluency_penalty = max(0, filler_rate - 2) * 3
    fluency = round(max(0, min(100, 100 - fluency_penalty)))

    # Pace: 100 if WPM in [120, 160], linear decay outside
    if 120 <= wpm <= 160:
        pace = 100
    elif wpm < 120:
        pace = round(max(0, 100 - (120 - wpm) * 1.5))
    else:
        pace = round(max(0, 100 - (wpm - 160) * 1.5))

    # Consistency: based on WPM std dev across sentences (min 3 words each)
    sentence_wpms = [s["wpm"] for s in metrics.get("sentences", []) if s.get("word_count", 0) >= 3]
    if len(sentence_wpms) >= 2:
        mean_wpm = sum(sentence_wpms) / len(sentence_wpms)
        variance = sum((x - mean_wpm) ** 2 for x in sentence_wpms) / len(sentence_wpms)
        std_dev = math.sqrt(variance)
        consistency = round(max(0, min(100, 100 - std_dev * 0.8)))
    else:
        consistency = 100

    return {"fluency": fluency, "pace": pace, "consistency": consistency}


def generate_feedback(transcript: dict, metrics: dict) -> dict:
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    model = genai.GenerativeModel(
        "gemini-2.0-flash",
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            response_schema={
                "type": "object",
                "properties": {
                    "summary": {"type": "string"},
                    "strengths": {"type": "array", "items": {"type": "string"}},
                    "improvements": {"type": "array", "items": {"type": "string"}},
                    "tips": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["summary", "strengths", "improvements", "tips"],
            },
        ),
    )

    prompt = (
        "You are a professional speech coach. Analyze the following speech transcript and metrics, "
        "then return structured coaching feedback.\n\n"
        f"Transcript:\n{transcript.get('text', '')}\n\n"
        f"Metrics:\n"
        f"- WPM: {metrics.get('wpm')}\n"
        f"- Duration: {metrics.get('duration')}s\n"
        f"- Filler words per minute: {metrics.get('filler_rate')}\n"
        f"- Filler word breakdown: {metrics.get('filler_words')}\n"
        f"- Pause count: {metrics.get('pause_count')}\n"
        f"- Avg pause: {metrics.get('avg_pause')}s\n"
        f"- Longest pause: {metrics.get('longest_pause')}s\n\n"
        "Return JSON with:\n"
        "- summary: 2-3 sentence overall assessment\n"
        "- strengths: list of 2-3 specific things done well\n"
        "- improvements: list of 2-3 specific areas to improve\n"
        "- tips: list of 2-3 actionable practice exercises"
    )

    response = model.generate_content(prompt)
    return json.loads(response.text)


def process_job(job_id: str) -> None:
    tmp_dir = tempfile.mkdtemp(prefix=f"job_{job_id}_")
    try:
        queries.update_job_stage(job_id, "downloading", 10)
        job = queries.get_job(job_id)
        upload = queries.get_upload(job["upload_id"])
        if not upload:
            raise ValueError(f"Upload {job['upload_id']} not found")

        local_video_path = os.path.join(tmp_dir, "video" + os.path.splitext(upload["path"])[1])
        storage_service.download_video(upload["bucket"], upload["path"], local_video_path)
        log.info(f"Downloaded video to {local_video_path}")

        queries.update_job_stage(job_id, "extracting_audio", 20)
        audio_path = os.path.join(tmp_dir, "audio.wav")
        extract_audio(local_video_path, audio_path)
        log.info(f"Extracted audio to {audio_path}")

        queries.update_job_stage(job_id, "transcribing", 40)
        transcript = transcribe(audio_path)
        log.info(f"Transcribed: {transcript.get('text', '')[:80]}...")

        queries.update_job_stage(job_id, "analyzing", 60)
        metrics = analyze(transcript)
        log.info(f"Analyzed: wpm={metrics.get('wpm')}, fillers={metrics.get('filler_count')}, pauses={metrics.get('pause_count')}")

        scores = compute_scores(metrics)
        log.info(f"Scores: {scores}")

        queries.update_job_stage(job_id, "generating_feedback", 70)
        feedback = generate_feedback(transcript, metrics)
        log.info(f"Feedback generated: {list(feedback.keys())}")

        queries.upsert_job_analysis(job_id, {
            "transcript_text": transcript.get("text"),
            "transcript_json": transcript,
            "metrics": metrics,
            "scores": scores,
            "feedback": feedback,
        })

        queries.update_job_stage(job_id, "uploading_outputs", 80)
        output_bucket = "outputs"
        output_path = f"{job_id}/video{os.path.splitext(upload['path'])[1]}"
        storage_service.upload_file(output_bucket, output_path, local_video_path)
        log.info(f"Uploaded output to {output_bucket}/{output_path}")

        queries.upsert_job_outputs(job_id, {
            "edited_video_bucket": output_bucket,
            "edited_video_path": output_path,
        })

        queries.mark_job_completed(job_id)
        log.info(f"Job {job_id} completed")
    except Exception as e:
        log.error(f"Job {job_id} failed: {e}")
        queries.mark_job_failed(job_id, str(e))
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


if __name__ == "__main__":
    job_id = os.environ.get("JOB_ID")
    if not job_id:
        log.error("JOB_ID env var not set")
        exit(1)
    log.info(f"Processing job {job_id}")
    process_job(job_id)
