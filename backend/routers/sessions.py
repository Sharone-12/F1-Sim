import fastf1
from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/{year}")
def list_sessions(year: int):
    """List all race weekends for a season."""
    try:
        schedule = fastf1.get_event_schedule(year, include_testing=False)
        events = []
        for _, row in schedule.iterrows():
            events.append({
                "round": int(row["RoundNumber"]),
                "name": row["EventName"],
                "location": row["Location"],
                "country": row["Country"],
                "date": str(row["EventDate"].date()) if hasattr(row["EventDate"], "date") else str(row["EventDate"]),
                "format": row["EventFormat"],
            })
        return {"year": year, "events": events}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{year}/{round}")
def get_event(year: int, round: int):
    """Get specific race weekend details."""
    try:
        event = fastf1.get_event(year, round)
        sessions = []
        for i in range(1, 6):
            key = f"Session{i}"
            name_key = f"Session{i}Name"
            date_key = f"Session{i}Date"
            if key in event and event[name_key]:
                sessions.append({
                    "session": i,
                    "name": event[name_key],
                    "date": str(event[date_key].date()) if hasattr(event[date_key], "date") else str(event[date_key]),
                })
        return {
            "round": int(event["RoundNumber"]),
            "name": event["EventName"],
            "location": event["Location"],
            "country": event["Country"],
            "sessions": sessions,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{year}/{round}/{session_type}")
def load_session(year: int, round: int, session_type: str):
    """Load and return basic info about a session."""
    try:
        session = fastf1.get_session(year, round, session_type)
        session.load(laps=False, telemetry=False, weather=False, messages=False)
        results = []
        for _, row in session.results.iterrows():
            results.append({
                "position": int(row["Position"]) if not str(row["Position"]) == "nan" else None,
                "driver": row["Abbreviation"],
                "full_name": f"{row['FirstName']} {row['LastName']}",
                "team": row["TeamName"],
                "points": float(row["Points"]) if str(row["Points"]) != "nan" else 0,
                "status": row["Status"],
            })
        return {
            "year": year,
            "round": round,
            "session_type": session_type,
            "event": session.event["EventName"],
            "results": results,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
