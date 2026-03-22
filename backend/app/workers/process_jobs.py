import logging
import math
import os
import shutil
import subprocess
import tempfile
from dotenv import load_dotenv

load_dotenv()

import assemblyai as aai
from app.db import queries
from app.services import storage_service
from app.services.analysis_service import analyze
from app.services.captions_service import burn_captions
from app.services.feedback_service import generate_feedback
from app.services.tone_service import analyze_tone

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


def compute_scores(metrics: dict, tone: dict | None = None) -> dict:
    wpm = metrics.get("wpm", 0)
    filler_rate = metrics.get("filler_rate", 0)
    grammar_score = metrics.get("grammar_score", 100)
    vocabulary_richness = metrics.get("vocabulary_richness", 0)
    repeated_phrases = metrics.get("repeated_phrases", [])

    # --- Delivery ---
    # Pace: 100 if WPM in [120, 160], linear decay outside
    if 120 <= wpm <= 160:
        pace = 100.0
    elif wpm < 120:
        pace = max(0.0, 100 - (120 - wpm) * 1.5)
    else:
        pace = max(0.0, 100 - (wpm - 160) * 1.5)

    # Consistency: WPM std dev across sentences (min 3 words each)
    sentence_wpms = [s["wpm"] for s in metrics.get("sentences", []) if s.get("word_count", 0) >= 3]
    if len(sentence_wpms) >= 2:
        mean_wpm = sum(sentence_wpms) / len(sentence_wpms)
        variance = sum((x - mean_wpm) ** 2 for x in sentence_wpms) / len(sentence_wpms)
        std_dev = math.sqrt(variance)
        consistency = max(0.0, min(100.0, 100 - std_dev * 0.8))
    else:
        consistency = 100.0

    overall_tone = (tone or {}).get("overall", {})
    confidence = overall_tone.get("confidence")
    energy = overall_tone.get("energy")

    if confidence is not None and energy is not None:
        delivery = round(pace * 0.30 + consistency * 0.30 + confidence * 100 * 0.25 + energy * 100 * 0.15)
    else:
        delivery = round(pace * 0.50 + consistency * 0.50)

    # --- Clarity ---
    # Fluency: 3 point penalty per filler/min above 2/min threshold
    fluency = max(0.0, min(100.0, 100 - max(0, filler_rate - 2) * 3))
    # Repeated phrases: 5 point penalty each, capped at 30
    repetition_score = 100 - min(30, len(repeated_phrases) * 5)
    clarity = round(fluency * 0.50 + grammar_score * 0.35 + repetition_score * 0.15)

    # --- Vocabulary ---
    richness_score = vocabulary_richness * 100
    vocab_repetition_score = max(0, 100 - len(repeated_phrases) * 8)
    vocabulary = round(richness_score * 0.70 + vocab_repetition_score * 0.30)

    # --- Overall ---
    overall = round(delivery * 0.40 + clarity * 0.40 + vocabulary * 0.20)

    return {
        "overall": overall,
        "delivery": delivery,
        "clarity": clarity,
        "vocabulary": vocabulary,
    }


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

        queries.update_job_stage(job_id, "generating_feedback", 70)
        feedback = generate_feedback(transcript, metrics)
        log.info(f"Feedback generated: {list(feedback.keys())}")

        queries.update_job_stage(job_id, "analyzing_tone", 73)
        tone = analyze_tone(audio_path, metrics.get("sentences", []))
        log.info(f"Tone analyzed: overall confidence={tone['overall']['confidence']}, energy={tone['overall']['energy']}")

        scores = compute_scores(metrics, tone)
        log.info(f"Scores: {scores}")

        # Strip internal-only fields before storing metrics
        stored_sentences = [
            {k: v for k, v in s.items() if k not in ("start_index", "end_index")}
            for s in metrics.get("sentences", [])
        ]
        stored_metrics = {
            k: v for k, v in metrics.items()
            if k not in ("filler_positions", "pauses")
        }
        stored_metrics["sentences"] = stored_sentences

        queries.upsert_job_analysis(job_id, {
            "transcript_text": transcript.get("text"),
            "transcript_json": transcript,
            "metrics": stored_metrics,
            "scores": scores,
            "feedback": feedback,
            "tone": tone,
        })

        queries.update_job_stage(job_id, "burning_captions", 80)
        captioned_video_path = os.path.join(tmp_dir, "captioned.mp4")
        burn_captions(local_video_path, captioned_video_path, transcript, metrics.get("filler_positions", []))
        log.info(f"Burned captions to {captioned_video_path}")

        queries.update_job_stage(job_id, "uploading_outputs", 90)
        output_bucket = "outputs"

        video_output_path = f"{job_id}/video.mp4"
        storage_service.upload_file(output_bucket, video_output_path, captioned_video_path)
        log.info(f"Uploaded captioned video to {output_bucket}/{video_output_path}")

        audio_output_path = f"{job_id}/audio.wav"
        storage_service.upload_file(output_bucket, audio_output_path, audio_path)
        log.info(f"Uploaded audio to {output_bucket}/{audio_output_path}")

        queries.upsert_job_outputs(job_id, {
            "edited_video_bucket": output_bucket,
            "edited_video_path": video_output_path,
            "audio_bucket": output_bucket,
            "audio_path": audio_output_path,
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
