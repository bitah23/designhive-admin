from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Explicitly load .env from project root (one level up from backend/)
load_dotenv(Path(__file__).parent.parent / ".env")


class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str

    JWT_SECRET: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440  # 24 hours

    GMAIL_CREDENTIALS_JSON: str = ""
    GMAIL_TOKEN_JSON: str = ""
    GMAIL_SENDER_NAME: str = "DesignHive"

    CORS_ORIGINS: str = "http://localhost:5173"

    ADMIN_EMAIL: str = "admin@designhive.com"
    ADMIN_PASSWORD: str = "admin123"

    class Config:
        env_file = "../.env"
        extra = "ignore"


settings = Settings()
