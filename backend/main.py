import os
import fastf1
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import sessions, drivers, race, telemetry, strategy, simulate

# Enable FastF1 cache
CACHE_DIR = os.path.join(os.path.dirname(__file__), "cache")
os.makedirs(CACHE_DIR, exist_ok=True)
fastf1.Cache.enable_cache(CACHE_DIR)

app = FastAPI(title="F1 Race Simulator API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])
app.include_router(drivers.router, prefix="/api/drivers", tags=["drivers"])
app.include_router(race.router, prefix="/api/race", tags=["race"])
app.include_router(telemetry.router, prefix="/api/telemetry", tags=["telemetry"])
app.include_router(strategy.router, prefix="/api/strategy", tags=["strategy"])
app.include_router(simulate.router, prefix="/api/simulate", tags=["simulate"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
