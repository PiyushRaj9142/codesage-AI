"""
Integration tests for authentication, password hashing, and JWT tokens.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import verify_password, hash_password


def test_password_hashing():
    pwd = "SecurePassword123!"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


@pytest.mark.asyncio
async def test_auth_registration_and_login_flow():
    from app.db.session import init_db
    await init_db()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health check
        resp = await client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"

        # 2. Register user
        reg_payload = {
            "name": "Alice Engineer",
            "email": "alice@codesage.dev",
            "password": "StrongPassword123!"
        }
        reg_resp = await client.post("/api/auth/register", json=reg_payload)
        assert reg_resp.status_code in {200, 400}  # 200 on first run, 400 if user exists

        # 3. Login
        login_resp = await client.post("/api/auth/login", json={
            "email": "alice@codesage.dev",
            "password": "StrongPassword123!"
        })
        assert login_resp.status_code == 200
        data = login_resp.json()
        assert "access_token" in data
        assert data["user"]["email"] == "alice@codesage.dev"

        token = data["access_token"]

        # 4. Access protected /me route
        me_resp = await client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert me_resp.status_code == 200
        assert me_resp.json()["name"] == "Alice Engineer"

        # 5. Access workspaces
        ws_resp = await client.get(
            "/api/workspaces",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert ws_resp.status_code == 200
        workspaces = ws_resp.json()
        assert len(workspaces) >= 1
