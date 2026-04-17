import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routes import auth, templates, users, email, logs, admins, webhooks

app = FastAPI(title="DesignHive Admin API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,      prefix="/api/auth",      tags=["Auth"])
app.include_router(templates.router, prefix="/api/templates", tags=["Templates"])
app.include_router(users.router,     prefix="/api/users",     tags=["Users"])
app.include_router(email.router,     prefix="/api/email",     tags=["Email"])
app.include_router(logs.router,      prefix="/api/logs",      tags=["Logs"])
app.include_router(admins.router,    prefix="/api/admins",    tags=["Admins"])
app.include_router(webhooks.router,  prefix="/api/webhooks",  tags=["Webhooks"])


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Serve frontend static files — must be last
_frontend = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.isdir(_frontend):
    app.mount("/", StaticFiles(directory=_frontend, html=True), name="static")
