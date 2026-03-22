import os
from functools import lru_cache

import jwt
from fastapi import Header, HTTPException
from dotenv import load_dotenv

load_dotenv()

ALGORITHM = "HS256"


@lru_cache(maxsize=1)
def _get_jwt_secret() -> str:
    return os.environ["SUPABASE_JWT_SECRET"]


def get_current_user_id(authorization: str = Header(...)) -> str:
    """FastAPI dependency that extracts and verifies the user_id from a Supabase JWT."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization[len("Bearer "):]
    try:
        payload = jwt.decode(
            token,
            _get_jwt_secret(),
            algorithms=[ALGORITHM],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing subject")

    return user_id
