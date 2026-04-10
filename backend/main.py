from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import auth, email, templates, logs

app = FastAPI(
    title="DesignHive Email Automation API",
    version="1.0.0",
    description="Backend API for DesignHive email automation dashboard",
)

# CORS — allow the Vite dev server and any configured origins
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(email.router, prefix="/api/email", tags=["Email"])
app.include_router(templates.router, prefix="/api/templates", tags=["Templates"])
app.include_router(logs.router, prefix="/api/logs", tags=["Logs"])


@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "DesignHive Email Automation"}
