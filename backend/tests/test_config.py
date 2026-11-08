import os
from app.core.config import Settings

def test_cors_origins_comma_separated_parsing():
    """Verify that comma-separated environment strings (standard on Render) parse cleanly into a List[str]."""
    test_val = "https://frontend-dhruv-codes-001.vercel.app, https://frontend-tau-eight-68.vercel.app, http://localhost:3000"
    s = Settings(BACKEND_CORS_ORIGINS=test_val)
    assert isinstance(s.BACKEND_CORS_ORIGINS, list)
    assert len(s.BACKEND_CORS_ORIGINS) == 3
    assert "https://frontend-dhruv-codes-001.vercel.app" in s.BACKEND_CORS_ORIGINS
    assert "https://frontend-tau-eight-68.vercel.app" in s.BACKEND_CORS_ORIGINS
    assert "http://localhost:3000" in s.BACKEND_CORS_ORIGINS

def test_cors_origins_json_array_parsing():
    """Verify JSON array strings parse correctly."""
    test_val = '["https://frontend-dhruv-codes-001.vercel.app", "http://localhost:3000"]'
    s = Settings(BACKEND_CORS_ORIGINS=test_val)
    assert isinstance(s.BACKEND_CORS_ORIGINS, list)
    assert len(s.BACKEND_CORS_ORIGINS) == 2
    assert "https://frontend-dhruv-codes-001.vercel.app" in s.BACKEND_CORS_ORIGINS
    assert "http://localhost:3000" in s.BACKEND_CORS_ORIGINS

def test_database_url_postgres_normalization():
    """Verify postgres:// is rewritten to postgresql:// for SQLAlchemy compatibility."""
    s = Settings(DATABASE_URL="postgres://user:pass@ep-cool.supabase.co:5432/postgres")
    assert s.DATABASE_URL.startswith("postgresql://")

def test_cookie_secure_enforced_for_samesite_none():
    """Verify SameSite=none automatically enforces Secure=True."""
    s = Settings(COOKIE_SAMESITE="none", COOKIE_SECURE=False)
    assert s.COOKIE_SECURE is True
