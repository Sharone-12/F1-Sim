import fastf1
import numpy as np
from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/{year}")
def list_drivers(year: int):
    """All drivers and teams for a season."""
    try:
        # Use round 1 to get the driver list
        session = fastf1.get_session(year, 1, "R")
        session.load(laps=False, telemetry=False, weather=False, messages=False)
        drivers = []
        for _, row in session.results.iterrows():
            drivers.append({
                "driver": row["Abbreviation"],
                "full_name": f"{row['FirstName']} {row['LastName']}",
                "number": str(row["DriverNumber"]),
                "team": row["TeamName"],
                "team_color": f"#{row['TeamColor']}" if row["TeamColor"] else None,
            })
        return {"year": year, "drivers": drivers}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{year}/{driver}/stats")
def driver_stats(year: int, driver: str):
    """Season stats for a driver."""
    try:
        schedule = fastf1.get_event_schedule(year, include_testing=False)
        rounds = schedule["RoundNumber"].tolist()

        wins = 0
        podiums = 0
        points_finishes = 0
        fastest_laps = 0
        dnfs = 0
        lap_times = []

        for round_num in rounds[:5]:  # limit to first 5 rounds to avoid long load times
            try:
                session = fastf1.get_session(year, int(round_num), "R")
                session.load(laps=True, telemetry=False, weather=False, messages=False)
                if session.results is not None and len(session.results) > 0:
                    row = session.results[session.results["Abbreviation"] == driver.upper()]
                    if not row.empty:
                        pos = row.iloc[0]["Position"]
                        if str(pos) != "nan":
                            pos = int(pos)
                            if pos == 1:
                                wins += 1
                            if pos <= 3:
                                podiums += 1
                            if pos <= 10:
                                points_finishes += 1
                        status = row.iloc[0]["Status"]
                        if status and status not in ("Finished", "+1 Lap", "+2 Laps"):
                            dnfs += 1

                driver_laps = session.laps.pick_driver(driver.upper())
                if not driver_laps.empty:
                    times = driver_laps["LapTime"].dropna()
                    lap_times.extend([t.total_seconds() for t in times])
            except Exception:
                continue

        avg_lap = float(np.mean(lap_times)) if lap_times else None
        best_lap = float(np.min(lap_times)) if lap_times else None

        return {
            "driver": driver.upper(),
            "year": year,
            "wins": wins,
            "podiums": podiums,
            "points_finishes": points_finishes,
            "dnfs": dnfs,
            "avg_lap_time_s": avg_lap,
            "best_lap_time_s": best_lap,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
