import json
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "SkillBridge"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "skillbridge_super_secret_jwt_key_change_in_production_93847293847239"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    ALGORITHM: str = "HS256"

    # Database
    DATABASE_URL: str = "sqlite:///./skillbridge.db"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_database_url(cls, v: str) -> str:
        if isinstance(v, str) and v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v

    # CORS
    BACKEND_CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="after")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            clean = v.strip()
            if not clean:
                return []
            if clean.startswith("["):
                try:
                    parsed = json.loads(clean)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed if str(item).strip()]
                except Exception:
                    pass
            return [origin.strip() for origin in clean.replace(";", ",").split(",") if origin.strip()]
        elif isinstance(v, list):
            return [str(origin).strip() for origin in v if str(origin).strip()]
        return []

    # Cookie security settings
    COOKIE_SAMESITE: str = "lax"
    COOKIE_SECURE: bool = False

    @field_validator("COOKIE_SECURE", mode="after")
    @classmethod
    def enforce_secure_for_samesite_none(cls, v: bool, info) -> bool:
        # SameSite=None strictly requires Secure=True in all modern browsers
        samesite = info.data.get("COOKIE_SAMESITE", "lax")
        if str(samesite).lower() == "none":
            return True
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
