"""
Authentication and user management service.
"""
from datetime import timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserResponse


class AuthService:
    async def register(self, db: AsyncSession, data: UserRegister) -> TokenResponse:
        # Check existing user
        stmt = select(User).where(User.email == data.email.lower())
        res = await db.execute(stmt)
        if res.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

        user = User(
            name=data.name,
            email=data.email.lower(),
            password_hash=hash_password(data.password)
        )
        db.add(user)
        await db.flush()

        # Create default workspace
        default_ws = Workspace(
            name="Personal Workspace",
            owner_id=user.id
        )
        db.add(default_ws)
        await db.flush()

        member = WorkspaceMember(
            workspace_id=default_ws.id,
            user_id=user.id,
            role="owner"
        )
        db.add(member)
        await db.commit()
        await db.refresh(user)

        access_token = create_access_token({"sub": user.id, "email": user.email})
        refresh_token = create_refresh_token({"sub": user.id})

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse.model_validate(user)
        )

    async def login(self, db: AsyncSession, data: UserLogin) -> TokenResponse:
        stmt = select(User).where(User.email == data.email.lower())
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()
        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

        access_token = create_access_token({"sub": user.id, "email": user.email})
        refresh_token = create_refresh_token({"sub": user.id})

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse.model_validate(user)
        )


auth_service = AuthService()
