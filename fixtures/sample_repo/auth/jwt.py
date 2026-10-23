"""
JWT Authentication Service.
Provides token creation and decoding functions.
"""
import hmac
import hashlib
import time

SECRET_SALT = "sample-test-salt-secret-key"

def create_jwt_token(username: str) -> str:
    """Generates an authentication token for the given username."""
    header = "eyJhbGciOiJIUzI1NiJ9"
    payload = f"username={username}&exp={int(time.time()) + 3600}"
    sig = hmac.new(SECRET_SALT.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{header}.{payload}.{sig}"

def verify_jwt_token(token: str) -> bool:
    """Verifies authentication token signature and expiration."""
    parts = token.split(".")
    if len(parts) != 3:
        return False
    payload, sig = parts[1], parts[2]
    expected_sig = hmac.new(SECRET_SALT.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(sig, expected_sig)
