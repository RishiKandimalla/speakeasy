import json
import os

from google import genai
from google.genai import types


def _gemini_client() -> genai.Client:
    return genai.Client(api_key=os.environ["GEMINI_API_KEY"])


def generate_feedback(transcript: dict, metrics: dict) -> dict:
    client = _gemini_client()

    # Build a detailed sentence-level summary for the worst-performing sentences
    sentences = metrics.get("sentences", [])
    high_filler_sentences = sorted(
        [s for s in sentences if s.get("filler_count", 0) > 0],
        key=lambda s: s["filler_count"],
        reverse=True,
    )[:3]
    high_filler_examples = "\n".join(
        f'  - "{s["text"]}" (fillers: {s["filler_count"]}, at {s["start"]}s)'
        for s in high_filler_sentences
    ) or "  None"

    grammar_issues = [
        issue
        for s in sentences
        for issue in s.get("grammar_issues", [])
    ]
    grammar_examples = "\n".join(
        f'  - "{issue["issue"]}" → "{issue["suggestion"]}"'
        for issue in grammar_issues[:3]
    ) or "  None"

    repeated = metrics.get("repeated_phrases", [])[:5]
    repeated_str = ", ".join(f'"{p["phrase"]}" (x{p["count"]})' for p in repeated) or "None"

    accel = metrics.get("acceleration", {})

    prompt = (
        "You are an expert speech coach analyzing a recorded speech. "
        "You have detailed metrics and the full transcript. "
        "Your job is to give the speaker genuinely useful, specific feedback grounded in the data.\n\n"
        f"TRANSCRIPT:\n{transcript.get('text', '')}\n\n"
        "METRICS:\n"
        f"- Duration: {metrics.get('duration')}s\n"
        f"- Words per minute: {metrics.get('wpm')} (ideal range: 120–160 WPM)\n"
        f"- Filler words per minute: {metrics.get('filler_rate')} (ideal: under 2/min)\n"
        f"- Filler word breakdown: {metrics.get('filler_words')}\n"
        f"- Sentences with most fillers:\n{high_filler_examples}\n"
        f"- Pause count: {metrics.get('pause_count')}, avg: {metrics.get('avg_pause')}s, longest: {metrics.get('longest_pause')}s\n"
        f"- Vocabulary richness score: {metrics.get('vocabulary_richness')} (0=repetitive, 1=highly varied)\n"
        f"- Avg word length: {metrics.get('avg_word_length')} characters\n"
        f"- Repeated phrases: {repeated_str}\n"
        f"- Pace trend: {accel.get('trend')} (first half {accel.get('first_half_wpm')} WPM → second half {accel.get('second_half_wpm')} WPM)\n"
        f"- Grammar score: {metrics.get('grammar_score', 100)}/100\n"
        f"- Grammar issues found:\n{grammar_examples}\n\n"
        "INSTRUCTIONS:\n"
        "Return JSON with four fields: summary, strengths, improvements, tips.\n\n"
        "summary: 1-2 sentences max. Honest overall picture referencing 1-2 specific numbers.\n\n"
        "strengths: exactly 3 items. Each is one concise bullet (max 20 words) that names what they did well "
        "and cites the actual metric. No vague praise — if you can't point to a number, don't include it. "
        "Example: 'Filler rate 1.2/min — well under the 2/min threshold, speech stays clean and easy to follow.'\n\n"
        "improvements: exactly 3 items. Each is one concise bullet (max 25 words) that names the problem, "
        "its effect on the listener, and exactly what to change. Cite metrics or example sentences. "
        "Example: '\"you know\" used 9 times — signals uncertainty; replace with a silent beat instead.'\n\n"
        "tips: exactly 3 items. Each is one concise bullet (max 25 words) describing a specific in-the-moment "
        "vocal technique to fix an issue found in this session. "
        "No generic advice (no journaling, no daily practice, no mirror work). "
        "Focus on breath control, pacing, transitions, sentence endings, word choice, or vocal mechanics."
    )
    str_array = types.Schema(type=types.Type.ARRAY, items=types.Schema(type=types.Type.STRING))
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "summary": types.Schema(type=types.Type.STRING),
                    "strengths": str_array,
                    "improvements": str_array,
                    "tips": str_array,
                },
                required=["summary", "strengths", "improvements", "tips"],
            ),
        ),
    )
    return json.loads(response.text)
