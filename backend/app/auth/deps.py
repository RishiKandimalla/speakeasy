import os
from functools import lru_cache

import jwt
from jwt import PyJWKClient
from fastapi import Header, HTTPException
from dotenv import load_dotenv

load_dotenv()


@lru_cache(maxsize=1)
def _get_jwk_client() -> PyJWKClient:
    supabase_url = os.environ["SUPABASE_URL"].rstrip("/")
    jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
    return PyJWKClient(jwks_url, cache_keys=True)


def get_current_user_id(authorization: str = Header(...)) -> str:
    """FastAPI dependency that extracts and verifies the user_id from a Supabase JWT."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization[len("Bearer "):]
    try:
        signing_key = _get_jwk_client().get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256", "HS256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {type(e).__name__}: {e}")

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing subject")

    return user_id
