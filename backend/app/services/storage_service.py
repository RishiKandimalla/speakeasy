from app.db.client import get_client


def download_video(bucket: str, path: str, dest_path: str) -> None:
    data = get_client().storage.from_(bucket).download(path)
    with open(dest_path, "wb") as f:
        f.write(data)


def upload_file(bucket: str, path: str, local_path: str) -> None:
    with open(local_path, "rb") as f:
        get_client().storage.from_(bucket).upload(path, f.read())


def upload_from_bytes(bucket: str, path: str, data: bytes, content_type: str) -> None:
    get_client().storage.from_(bucket).upload(
        path, data, file_options={"content-type": content_type}
    )


def get_signed_url(bucket: str, path: str, expires_in: int = 3600) -> str:
    db = get_client()
    result = db.storage.from_(bucket).create_signed_url(path, expires_in)
    return result["signedURL"]
