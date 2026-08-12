import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routes import auth, templates, users, email, logs, admins, webhooks, agents, assets, unsubscribe


def _configure_logging() -> None:
    fmt = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler = logging.StreamHandler()
    handler.setFormatter(fmt)

    for name in ("agents", "services", "routes"):
        lgr = logging.getLogger(name)
        lgr.setLevel(logging.INFO)
        if not lgr.handlers:
            lgr.addHandler(handler)
        lgr.propagate = False

    for name in ("httpx", "apscheduler"):
        logging.getLogger(name).setLevel(logging.WARNING)

    logging.root.setLevel(logging.WARNING)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _configure_logging()

    from agents.scheduler import start as sched_start, stop as sched_stop
    from agents.drip import start as drip_start, stop as drip_stop
    from agents.reengagement import start as reeng_start, stop as reeng_stop
    from agents.failure_recovery import start as recovery_start, stop as recovery_stop
    sched_start()
    drip_start()
    reeng_start()
    recovery_start()
    yield
    recovery_stop()
    reeng_stop()
    drip_stop()
    sched_stop()


app = FastAPI(title="DesignHive Admin API", lifespan=lifespan)

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
app.include_router(agents.router,    prefix="/api/agents",    tags=["Agents"])
app.include_router(assets.router,    prefix="/api/assets",    tags=["Assets"])
app.include_router(unsubscribe.router, prefix="/api",          tags=["Unsubscribe"])


@app.get("/api/health")
def health():
    return {"status": "ok"}


class RevalidatingStaticFiles(StaticFiles):
    """
    Static files that a browser always revalidates before reusing.

    `StaticFiles` sends `last-modified` and `etag` but no `Cache-Control`. With
    no explicit directive a browser falls back to *heuristic* freshness —
    roughly 10% of the file's age — and serves the cached copy without asking.
    On a long-lived deployment that means a released CSS or JS change can go
    unseen for days, producing the worst kind of bug: new HTML running against
    old scripts and styles.

    The app has no build step and therefore no content-hashed filenames, so the
    fix is to make the browser check. `no-cache` still allows the cached copy to
    be reused — it just requires an `ETag` revalidation first, which answers 304
    with no body when nothing changed.

    Images keep a real max-age: they are large, they change rarely, and a new
    version ships under a new filename.
    """

    ALWAYS_REVALIDATE = (".html", ".css", ".js", ".json", ".map")

    def file_response(self, full_path, stat_result, scope, status_code=200):
        response = super().file_response(full_path, stat_result, scope, status_code)
        if str(full_path).lower().endswith(self.ALWAYS_REVALIDATE):
            response.headers["Cache-Control"] = "no-cache"
        else:
            response.headers["Cache-Control"] = "public, max-age=86400"
        return response


# Serve frontend static files — must be last
_frontend = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.isdir(_frontend):
    app.mount("/", RevalidatingStaticFiles(directory=_frontend, html=True), name="static")
