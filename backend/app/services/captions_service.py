import os
import subprocess

# ASS colors are &HAABBGGRR (alpha, blue, green, red)
_WHITE = "&H00FFFFFF"
_ORANGE = "&H00006BFF"  # #FF6B00 — filler highlight
_BLACK = "&H00000000"

_PAUSE_SPLIT = 0.3   # seconds gap → new caption chunk
_MAX_WORDS = 2       # max words per chunk — tight for TikTok feel
_MAX_DURATION = 1.5  # seconds max chunk duration


def _ass_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    cs = round((s % 1) * 100)
    return f"{h}:{m:02d}:{int(s):02d}.{cs:02d}"


def _chunk_words(words: list[dict]) -> list[list[dict]]:
    chunks, current = [], []
    for w in words:
        if current:
            gap = w["start"] - current[-1]["end"]
            duration = w["end"] - current[0]["start"]
            if gap >= _PAUSE_SPLIT or len(current) >= _MAX_WORDS or duration >= _MAX_DURATION:
                chunks.append(current)
                current = []
        current.append(w)
    if current:
        chunks.append(current)
    return chunks


def _build_ass(chunks: list[list[dict]], filler_starts: set[float]) -> str:
    header = (
        "[Script Info]\n"
        "ScriptType: v4.00+\n"
        "PlayResX: 1920\n"
        "PlayResY: 1080\n"
        "WrapStyle: 0\n"
        "\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
        "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, "
        "Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
        # BorderStyle 1 = outline + shadow (no box); Alignment 2 = bottom-center
        f"Style: Default,Arial,72,{_WHITE},{_WHITE},{_BLACK},{_BLACK},"
        "-1,0,0,0,100,100,1,0,1,3.5,2,2,80,80,80,1\n"
        "\n"
        "[Events]\n"
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
    )

    lines = [header]
    for chunk in chunks:
        start = _ass_time(chunk[0]["start"])
        end = _ass_time(chunk[-1]["end"])
        parts = []
        for w in chunk:
            color = _ORANGE if w["start"] in filler_starts else _WHITE
            parts.append(f"{{\\c{color}}}{w['word']}")
        text = " ".join(parts)
        lines.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{text}")

    return "\n".join(lines)


def burn_captions(
    video_path: str,
    output_path: str,
    transcript: dict,
    filler_positions: list[dict],
) -> None:
    """
    Burn word-by-word captions into the video. Filler words are highlighted in yellow.

    Args:
        video_path:       Path to the input video file.
        output_path:      Path to write the captioned output video.
        transcript:       Transcript dict with a "words" list of {word, start, end}.
        filler_positions: metrics["filler_positions"] from analyze().
    """
    words = transcript.get("words", [])
    if not words:
        subprocess.run(
            ["ffmpeg", "-y", "-i", video_path, "-c", "copy", output_path],
            capture_output=True,
            check=True,
        )
        return

    filler_starts: set[float] = {fp["start"] for fp in filler_positions}
    chunks = _chunk_words(words)
    ass_content = _build_ass(chunks, filler_starts)

    ass_path = output_path + ".ass"
    with open(ass_path, "w", encoding="utf-8") as f:
        f.write(ass_content)

    try:
        subprocess.run(
            [
                "ffmpeg", "-y", "-i", video_path,
                "-vf", f"ass={ass_path}",
                "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28",
                "-threads", "2",
                "-c:a", "copy",
                output_path,
            ],
            capture_output=True,
            check=True,
        )
    finally:
        os.remove(ass_path)
