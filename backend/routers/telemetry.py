import fastf1
import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException

router = APIRouter()

DOWNSAMPLE_STEP = 10  # Keep every Nth telemetry point to reduce payload size


def _downsample(df: pd.DataFrame, step: int = DOWNSAMPLE_STEP) -> pd.DataFrame:
    return df.iloc[::step].reset_index(drop=True)


def _telemetry_to_dict(tel: pd.DataFrame) -> list:
    cols = ["Distance", "Speed", "Throttle", "Brake", "nGear", "DRS", "RPM"]
    available = [c for c in cols if c in tel.columns]
    subset = _downsample(tel[available])
    result = []
    for _, row in subset.iterrows():
        entry = {}
        for c in available:
            val = row[c]
            if pd.isna(val):
                entry[c] = None
            elif isinstance(val, (np.integer,)):
                entry[c] = int(val)
            elif isinstance(val, (np.floating,)):
                entry[c] = round(float(val), 3)
            else:
                entry[c] = val
        result.append(entry)
    return result


@router.get("/{year}/{round}/{driver}/{lap}")
def lap_telemetry(year: int, round: int, driver: str, lap: int):
    """Full telemetry for a specific lap."""
    try:
        session = fastf1.get_session(year, round, "R")
        session.load(laps=True, telemetry=True, weather=False, messages=False)
        driver_laps = session.laps.pick_driver(driver.upper())
        if driver_laps.empty:
            raise HTTPException(status_code=404, detail=f"Driver {driver} not found")
        lap_row = driver_laps[driver_laps["LapNumber"] == lap]
        if lap_row.empty:
            raise HTTPException(status_code=404, detail=f"Lap {lap} not found for {driver}")
        tel = lap_row.iloc[0].get_telemetry()
        return {
            "year": year,
            "round": round,
            "driver": driver.upper(),
            "lap": lap,
            "telemetry": _telemetry_to_dict(tel),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{year}/{round}/{driver}/fastest")
def fastest_lap_telemetry(year: int, round: int, driver: str):
    """Telemetry for the driver's fastest lap."""
    try:
        session = fastf1.get_session(year, round, "R")
        session.load(laps=True, telemetry=True, weather=False, messages=False)
        driver_laps = session.laps.pick_driver(driver.upper())
        if driver_laps.empty:
            raise HTTPException(status_code=404, detail=f"Driver {driver} not found")
        fastest = driver_laps.pick_fastest()
        tel = fastest.get_telemetry()
        lap_num = int(fastest["LapNumber"])
        lap_time = fastest["LapTime"].total_seconds() if pd.notna(fastest["LapTime"]) else None
        return {
            "year": year,
            "round": round,
            "driver": driver.upper(),
            "lap": lap_num,
            "lap_time_s": lap_time,
            "telemetry": _telemetry_to_dict(tel),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
