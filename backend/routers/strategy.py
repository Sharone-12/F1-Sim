import fastf1
import pandas as pd
from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/{year}/{round}")
def tyre_strategies(year: int, round: int):
    """All drivers' tyre strategies (stints, compounds, lap ranges)."""
    try:
        session = fastf1.get_session(year, round, "R")
        session.load(laps=True, telemetry=False, weather=False, messages=False)
        laps = session.laps[["Driver", "LapNumber", "Compound", "TyreLife", "Stint", "FreshTyre"]].copy()

        strategies = {}
        for driver, group in laps.groupby("Driver"):
            stints = []
            for stint_num, stint_group in group.groupby("Stint"):
                stint_group = stint_group.sort_values("LapNumber")
                compound = stint_group["Compound"].iloc[0]
                first_lap = int(stint_group["LapNumber"].iloc[0])
                last_lap = int(stint_group["LapNumber"].iloc[-1])
                tyre_age_start = int(stint_group["TyreLife"].iloc[0])
                fresh = bool(stint_group["FreshTyre"].iloc[0]) if pd.notna(stint_group["FreshTyre"].iloc[0]) else None
                stints.append({
                    "stint": int(stint_num),
                    "compound": compound,
                    "first_lap": first_lap,
                    "last_lap": last_lap,
                    "lap_count": last_lap - first_lap + 1,
                    "tyre_age_start": tyre_age_start,
                    "fresh": fresh,
                })
            strategies[driver] = stints

        return {"year": year, "round": round, "strategies": strategies}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{year}/{round}/pitstops")
def pit_stops(year: int, round: int):
    """Pit stop data for all drivers."""
    try:
        session = fastf1.get_session(year, round, "R")
        session.load(laps=True, telemetry=False, weather=False, messages=False)
        laps = session.laps.copy()

        pit_laps = laps[laps["PitInTime"].notna()][["Driver", "LapNumber", "PitInTime", "PitOutTime"]].copy()
        pit_laps["PitDuration_s"] = (pit_laps["PitOutTime"] - pit_laps["PitInTime"]).apply(
            lambda x: x.total_seconds() if pd.notna(x) else None
        )

        stops = []
        for _, row in pit_laps.iterrows():
            stops.append({
                "driver": row["Driver"],
                "lap": int(row["LapNumber"]),
                "duration_s": round(row["PitDuration_s"], 3) if row["PitDuration_s"] is not None else None,
            })

        stops.sort(key=lambda x: x["lap"])
        return {"year": year, "round": round, "pit_stops": stops}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
