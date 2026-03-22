import logging
from datetime import date, timedelta
from app.db import queries

log = logging.getLogger(__name__)


def update_stats_for_job(user_id: str, metrics: dict, scores: dict, tone: dict) -> None:
    """
    Called when a job completes. Only updates stats if this is the user's
    first completed job of the calendar day (UTC).
    """
    jobs_today = queries.count_completed_jobs_today(user_id)
    if jobs_today > 1:
        # A job already completed today — this one doesn't count toward stats
        log.info(f"Stats not updated for {user_id}: already has a session today")
        return

    today = date.today()
    existing = queries.get_user_stats(user_id) or {}

    # ── Streak ────────────────────────────────────────────────────────────────
    last_active = existing.get("last_active_date")
    if last_active:
        last_active = date.fromisoformat(str(last_active))
        if last_active == today:
            streak_days = existing.get("streak_days", 1)
        elif last_active == today - timedelta(days=1):
            streak_days = existing.get("streak_days", 0) + 1
        else:
            streak_days = 1  # streak broken
    else:
        streak_days = 1

    total_sessions = existing.get("total_sessions", 0) + 1

    # ── Weekly history ────────────────────────────────────────────────────────
    overall_tone = (tone or {}).get("overall", {})
    today_entry = {
        "date": today.isoformat(),
        "scores": scores,
        "wpm": metrics.get("wpm"),
        "filler_rate": metrics.get("filler_rate"),
        "confidence": overall_tone.get("confidence"),
        "energy": overall_tone.get("energy"),
    }

    history: list[dict] = existing.get("weekly_history") or []
    # Replace today's entry if it exists, otherwise prepend
    history = [e for e in history if e.get("date") != today.isoformat()]
    history = [today_entry] + history
    history = history[:7]  # keep last 7 days only

    queries.upsert_user_stats(user_id, {
        "streak_days": streak_days,
        "last_active_date": today.isoformat(),
        "total_sessions": total_sessions,
        "weekly_history": history,
    })
    log.info(f"Stats updated for {user_id}: streak={streak_days}, sessions={total_sessions}")


def get_stats(user_id: str) -> dict:
    stats = queries.get_user_stats(user_id) or {}
    today = date.today()
    last_active = stats.get("last_active_date")
    made_video_today = (
        date.fromisoformat(str(last_active)) == today if last_active else False
    )

    history: list[dict] = stats.get("weekly_history") or []

    # Weekly averages across available history entries
    def _avg(key: str) -> float | None:
        vals = [e[key] for e in history if e.get(key) is not None]
        return round(sum(vals) / len(vals), 2) if vals else None

    weekly_averages = {
        "overall_score": _avg_nested(history, "scores", "overall"),
        "delivery_score": _avg_nested(history, "scores", "delivery"),
        "clarity_score": _avg_nested(history, "scores", "clarity"),
        "vocabulary_score": _avg_nested(history, "scores", "vocabulary"),
        "wpm": _avg("wpm"),
        "filler_rate": _avg("filler_rate"),
        "confidence": _avg("confidence"),
        "energy": _avg("energy"),
    }

    return {
        "streak_days": stats.get("streak_days", 0),
        "total_sessions": stats.get("total_sessions", 0),
        "made_video_today": made_video_today,
        "weekly_averages": weekly_averages,
        "weekly_history": history,
    }


def _avg_nested(history: list[dict], outer: str, inner: str) -> float | None:
    vals = [e[outer][inner] for e in history if e.get(outer) and e[outer].get(inner) is not None]
    return round(sum(vals) / len(vals), 2) if vals else None
