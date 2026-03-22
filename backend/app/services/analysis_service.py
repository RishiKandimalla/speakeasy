import json
import math
import os
from collections import Counter

from google import genai
from google.genai import types
from wordfreq import zipf_frequency

PAUSE_THRESHOLD = 0.5  # seconds

STOP_WORDS = {
    "a", "an", "the", "and", "or", "but", "so", "yet", "nor", "for",
    "is", "are", "was", "were", "be", "been", "being", "am",
    "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
    "my", "your", "his", "its", "our", "their", "this", "that", "these", "those",
    "to", "of", "in", "on", "at", "by", "up", "as", "if", "do", "did", "does",
    "have", "has", "had", "will", "would", "could", "should", "may", "might",
    "not", "no", "nor", "than", "then", "when", "with", "from", "into", "about",
    "just", "more", "also", "what", "which", "who", "how", "all", "each", "some",
    "can", "get", "got", "go", "went", "come", "came", "know", "think", "say",
    "said", "make", "made", "take", "took", "see", "seen", "want", "need",
}


def _clean_word(w: str) -> str:
    return w.lower().strip(".,!?;:\"'()-")


def _vocab_richness(unique_content_words: set[str]) -> float:
    """Mean rarity score (0–1) across unique content words using Zipf frequency."""
    if not unique_content_words:
        return 0.0
    scores = [1 - zipf_frequency(w, "en") / 7 for w in unique_content_words]
    return round(sum(scores) / len(scores), 3)


def _gemini_client() -> genai.Client:
    return genai.Client(api_key=os.environ["GEMINI_API_KEY"])


def detect_fillers(words: list[dict]) -> dict[str, int]:
    """Use Gemini to identify which words are filler words in context."""
    client = _gemini_client()
    numbered = "\n".join(f"{i}: {w['word']}" for i, w in enumerate(words))
    prompt = (
        "You are analyzing a speech transcript for filler words.\n"
        "A filler word is one used as a hesitation or verbal habit with no semantic meaning in context "
        "(e.g. 'um', 'uh', 'like' when not comparing, 'so' when not a connector, 'you know', 'basically', etc.).\n\n"
        f"Word list (index: word):\n{numbered}\n\n"
        "Return a JSON array of objects with 'word' (lowercased, no punctuation) and 'count'. "
        "Example: [{\"word\": \"um\", \"count\": 2}, {\"word\": \"like\", \"count\": 1}]. If none, return []."
    )
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=types.Schema(
                type=types.Type.ARRAY,
                items=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "word": types.Schema(type=types.Type.STRING),
                        "count": types.Schema(type=types.Type.INTEGER),
                    },
                    required=["word", "count"],
                ),
            ),
        ),
    )
    items = json.loads(response.text)
    return {item["word"]: item["count"] for item in items}


def analyze_grammar(sentences: list[dict]) -> dict:
    client = _gemini_client()
    numbered = "\n".join(f"{i}: {s['text']}" for i, s in enumerate(sentences))
    prompt = (
        "You are analyzing spoken speech for grammar errors. "
        "Spoken speech naturally has incomplete sentences and informal constructions — ignore those. "
        "Only flag genuine grammatical errors (wrong tense, subject-verb disagreement, incorrect pronoun, etc.).\n\n"
        f"Sentences (index: text):\n{numbered}\n\n"
        "Return JSON with:\n"
        "- score: overall grammar score 0-100 (100 = no errors)\n"
        "- issues: only sentences with actual errors, each with sentence_index, a short issue description, "
        "and a corrected suggestion. Return empty list if none."
    )
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "score": types.Schema(type=types.Type.INTEGER),
                    "issues": types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(
                            type=types.Type.OBJECT,
                            properties={
                                "sentence_index": types.Schema(type=types.Type.INTEGER),
                                "issue": types.Schema(type=types.Type.STRING),
                                "suggestion": types.Schema(type=types.Type.STRING),
                            },
                            required=["sentence_index", "issue", "suggestion"],
                        ),
                    ),
                },
                required=["score", "issues"],
            ),
        ),
    )
    return json.loads(response.text)


def analyze(transcript: dict) -> dict:
    words = transcript.get("words", [])
    if not words:
        return {}

    duration = words[-1]["end"] - words[0]["start"]
    duration_min = duration / 60 if duration > 0 else 1

    word_count = len(words)
    wpm = round(word_count / duration_min, 1)

    # Filler words via Gemini
    filler_counts = detect_fillers(words)
    filler_count = sum(filler_counts.values())
    filler_rate = round(filler_count / duration_min, 2)
    filler_set = set(filler_counts.keys())

    # Pauses
    pauses = []
    for i in range(1, len(words)):
        gap = words[i]["start"] - words[i - 1]["end"]
        if gap >= PAUSE_THRESHOLD:
            pauses.append(round(gap, 2))
    pause_count = len(pauses)
    longest_pause = round(max(pauses), 2) if pauses else 0
    avg_pause = round(sum(pauses) / len(pauses), 2) if pauses else 0

    # Filler positions (index into words array)
    filler_positions = [
        {"word": w["word"], "index": i, "start": w["start"], "end": w["end"]}
        for i, w in enumerate(words)
        if _clean_word(w["word"]) in filler_set
    ]
    filler_index_set = {fp["index"] for fp in filler_positions}

    # Sentence breakdown with per-sentence metrics
    sentences = []
    current: list[dict] = []
    current_start_idx = 0
    for idx, w in enumerate(words):
        current.append(w)
        if w["word"].endswith((".", "?", "!")) or idx == len(words) - 1:
            start = current[0]["start"]
            end = current[-1]["end"]
            text = " ".join(x["word"] for x in current)
            seg_dur = (end - start) / 60 if (end - start) > 0 else 1
            cleaned = [_clean_word(x["word"]) for x in current]
            content = {w for w in cleaned if w and w not in STOP_WORDS}
            sentence_filler_count = sum(
                1 for i in range(current_start_idx, idx + 1) if i in filler_index_set
            )
            sentences.append({
                "text": text,
                "start": round(start, 2),
                "end": round(end, 2),
                "word_count": len(current),
                "wpm": round(len(current) / seg_dur, 1),
                "start_index": current_start_idx,
                "end_index": idx,
                "filler_count": sentence_filler_count,
                "vocabulary_richness": _vocab_richness(content),
            })
            current = []
            current_start_idx = idx + 1

    # Attach grammar issues to each sentence
    grammar = analyze_grammar(sentences)
    issues_by_sentence: dict[int, list] = {}
    for issue in grammar.get("issues", []):
        idx = issue["sentence_index"]
        issues_by_sentence.setdefault(idx, []).append(
            {"issue": issue["issue"], "suggestion": issue["suggestion"]}
        )
    for i, s in enumerate(sentences):
        s["grammar_issues"] = issues_by_sentence.get(i, [])

    # Global vocabulary richness (unique content words, each counted once)
    all_cleaned = [_clean_word(w["word"]) for w in words]
    all_content = {w for w in all_cleaned if w and w not in STOP_WORDS}
    vocabulary_richness = _vocab_richness(all_content)

    # Average word length (unique content words)
    avg_word_length = round(sum(len(w) for w in all_content) / len(all_content), 2) if all_content else 0

    # Repeated phrases (3–5 word n-grams appearing 2+ times)
    repeated_phrases = []
    for n in (3, 4, 5):
        ngrams = [
            " ".join(_clean_word(words[i + j]["word"]) for j in range(n))
            for i in range(len(words) - n + 1)
        ]
        for phrase, count in Counter(ngrams).items():
            if count >= 2:
                repeated_phrases.append({"phrase": phrase, "count": count, "n": n})
    repeated_phrases.sort(key=lambda x: (-x["count"], -x["n"]))

    # Acceleration: first half vs second half sentence WPMs
    qualified = [s for s in sentences if s["word_count"] >= 3]
    if len(qualified) >= 2:
        mid = len(qualified) // 2
        first_wpm = round(sum(s["wpm"] for s in qualified[:mid]) / mid, 1)
        second_wpm = round(sum(s["wpm"] for s in qualified[mid:]) / (len(qualified) - mid), 1)
        delta = round(second_wpm - first_wpm, 1)
        trend = "accelerating" if delta > 10 else "decelerating" if delta < -10 else "steady"
        acceleration = {"first_half_wpm": first_wpm, "second_half_wpm": second_wpm, "delta": delta, "trend": trend}
    else:
        acceleration = {"first_half_wpm": wpm, "second_half_wpm": wpm, "delta": 0.0, "trend": "steady"}

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
        "vocabulary_richness": vocabulary_richness,
        "avg_word_length": avg_word_length,
        "repeated_phrases": repeated_phrases,
        "acceleration": acceleration,
        "grammar_score": grammar.get("score", 100),
        "sentences": sentences,
    }
