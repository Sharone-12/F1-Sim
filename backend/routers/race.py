import fastf1
import pandas as pd
from fastapi import APIRouter, HTTPException

router = APIRouter()


def _load_race(year: int, round: int):
    session = fastf1.get_session(year, round, "R")
    session.load(laps=True, telemetry=False, weather=False, messages=False)
    return session


@router.get("/{year}/{round}/results")
def race_results(year: int, round: int):
    """Final race classification."""
    try:
        session = _load_race(year, round)
        results = []
        for _, row in session.results.iterrows():
            results.append({
                "position": int(row["Position"]) if str(row["Position"]) != "nan" else None,
                "driver": row["Abbreviation"],
                "full_name": f"{row['FirstName']} {row['LastName']}",
                "team": row["TeamName"],
                "team_color": f"#{row['TeamColor']}" if row["TeamColor"] else None,
                "points": float(row["Points"]) if str(row["Points"]) != "nan" else 0,
                "status": row["Status"],
                "grid_position": int(row["GridPosition"]) if str(row["GridPosition"]) != "nan" else None,
                "time": str(row["Time"]) if pd.notna(row["Time"]) else None,
            })
        return {
            "year": year,
            "round": round,
            "event": session.event["EventName"],
            "results": results,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{year}/{round}/laps")
def all_laps(year: int, round: int):
    """All lap times for all drivers."""
    try:
        session = _load_race(year, round)
        laps = session.laps[["Driver", "LapNumber", "LapTime", "Compound", "TyreLife", "Stint", "PitInTime", "PitOutTime"]].copy()
        laps["LapTime_s"] = laps["LapTime"].apply(lambda x: x.total_seconds() if pd.notna(x) else None)
        laps["PitIn"] = laps["PitInTime"].notna()
        laps["PitOut"] = laps["PitOutTime"].notna()
        result = laps[["Driver", "LapNumber", "LapTime_s", "Compound", "TyreLife", "Stint", "PitIn", "PitOut"]].to_dict(orient="records")
        return {"year": year, "round": round, "laps": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{year}/{round}/laps/{driver}")
def driver_laps(year: int, round: int, driver: str):
    """Lap times for a specific driver."""
    try:
        session = _load_race(year, round)
        laps = session.laps.pick_driver(driver.upper())
        if laps.empty:
            raise HTTPException(status_code=404, detail=f"Driver {driver} not found in session")
        laps = laps[["LapNumber", "LapTime", "Compound", "TyreLife", "Stint", "PitInTime", "PitOutTime"]].copy()
        laps["LapTime_s"] = laps["LapTime"].apply(lambda x: x.total_seconds() if pd.notna(x) else None)
        laps["PitIn"] = laps["PitInTime"].notna()
        laps["PitOut"] = laps["PitOutTime"].notna()
        result = laps[["LapNumber", "LapTime_s", "Compound", "TyreLife", "Stint", "PitIn", "PitOut"]].to_dict(orient="records")
        return {"year": year, "round": round, "driver": driver.upper(), "laps": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{year}/{round}/positions")
def position_changes(year: int, round: int):
    """Position changes over the race (per lap, per driver)."""
    try:
        session = _load_race(year, round)
        laps = session.laps[["Driver", "LapNumber", "Position"]].copy()
        laps["Position"] = laps["Position"].apply(lambda x: int(x) if pd.notna(x) else None)
        result = laps.dropna(subset=["Position"]).to_dict(orient="records")
        return {"year": year, "round": round, "positions": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
