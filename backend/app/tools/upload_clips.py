from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

from app.db.client import get_client

load_dotenv()

BUCKET_NAME = "clips"
REPO_ROOT = Path(__file__).resolve().parents[3]
DRONE_ROOT = REPO_ROOT / "video_clips" / "drone_clips"
MINECRAFT_ROOT = REPO_ROOT / "video_clips" / "minecraft_clips"


@dataclass
class UploadResult:
    discovered: int = 0
    uploaded: int = 0
    indexed: int = 0
    failed: int = 0


def _validate_env() -> None:
    missing = [
        key
        for key in ("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")
        if not os.environ.get(key)
    ]
    if missing:
        raise RuntimeError(
            "Missing required environment variables: " + ", ".join(missing)
        )


def _ensure_bucket_exists() -> None:
    db = get_client()
    try:
        buckets = db.storage.list_buckets()
    except Exception:
        # If bucket listing fails due permissions/SDK differences, continue.
        # Upload step will raise an explicit error if bucket is unavailable.
        return

    ids = {getattr(bucket, "id", None) for bucket in buckets}
    if BUCKET_NAME not in ids:
        db.storage.create_bucket(BUCKET_NAME, options={"public": False})


def _source_roots() -> list[tuple[str, Path]]:
    return [
        ("drone", DRONE_ROOT),
        ("minecraft", MINECRAFT_ROOT),
    ]


def _discover_mp4s(root: Path) -> list[Path]:
    return sorted(p for p in root.rglob("*.mp4") if p.is_file())


def _storage_path(category: str, clip_path: Path) -> str:
    return f"{category}/{clip_path.name}"


def _upload_file(storage_path: str, clip_path: Path) -> None:
    db = get_client()
    with clip_path.open("rb") as f:
        db.storage.from_(BUCKET_NAME).upload(
            storage_path,
            f.read(),
            file_options={"content-type": "video/mp4", "upsert": "true"},
        )


def _upsert_clip_row(category: str, storage_path: str, file_size: int) -> None:
    db = get_client()
    db.table("clips").upsert(
        {
            "bucket": BUCKET_NAME,
            "path": storage_path,
            "category": category,
            "file_size": file_size,
            "duration_s": None,
        },
        on_conflict="path",
    ).execute()


def run() -> int:
    _validate_env()
    _ensure_bucket_exists()

    result = UploadResult()
    print(f"Repo root: {REPO_ROOT}")
    print(f"Drone source: {DRONE_ROOT}")
    print(f"Minecraft source: {MINECRAFT_ROOT}")

    for category, root in _source_roots():
        if not root.exists():
            print(f"[WARN] Source folder not found: {root}")
            continue

        clips = _discover_mp4s(root)
        print(f"[INFO] {category}: discovered {len(clips)} clip(s)")
        result.discovered += len(clips)

        for clip_path in clips:
            storage_path = _storage_path(category, clip_path)
            try:
                _upload_file(storage_path, clip_path)
                result.uploaded += 1
                _upsert_clip_row(
                    category=category,
                    storage_path=storage_path,
                    file_size=clip_path.stat().st_size,
                )
                result.indexed += 1
                print(f"[OK] {clip_path} -> {BUCKET_NAME}/{storage_path}")
            except Exception as exc:
                result.failed += 1
                print(f"[ERROR] {clip_path} failed: {exc}")

    print("\nUpload summary")
    print(f"  discovered: {result.discovered}")
    print(f"  uploaded:   {result.uploaded}")
    print(f"  indexed:    {result.indexed}")
    print(f"  failed:     {result.failed}")

    return 1 if result.failed else 0


if __name__ == "__main__":
    raise SystemExit(run())
