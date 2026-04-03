"""
Race simulation router.

POST /api/simulate
Body: { "circuit": "Bahrain", "year": 2024, "reference_year": 2024 }

Uses real FastF1 pace data as a basis for a Monte Carlo simulation.
If FastF1 data is unavailable (network error, first run, etc.) it falls back
to a fully synthetic simulation so the frontend always gets a result.
"""
import fastf1
import pandas as pd
import numpy as np
import random
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

# ─── Request / Response models ────────────────────────────────────────────────

class SimRequest(BaseModel):
    circuit: str                     # e.g. "Bahrain", "Monaco"
    year: int = 2024
    reference_year: Optional[int] = None   # year to pull FastF1 data from

# ─── Hardcoded fallback driver/team data (2025 grid) ─────────────────────────

FALLBACK_DRIVERS = [
    {"abbr": "VER", "name": "Max Verstappen",    "team": "Red Bull",       "color": "#3671C6", "skill": 97},
    {"abbr": "NOR", "name": "Lando Norris",      "team": "McLaren",        "color": "#FF8700", "skill": 93},
    {"abbr": "PIA", "name": "Oscar Piastri",     "team": "McLaren",        "color": "#FF8700", "skill": 92},
    {"abbr": "LEC", "name": "Charles Leclerc",   "team": "Ferrari",        "color": "#E8002D", "skill": 92},
    {"abbr": "HAM", "name": "Lewis Hamilton",    "team": "Ferrari",        "color": "#E8002D", "skill": 94},
    {"abbr": "RUS", "name": "George Russell",    "team": "Mercedes",       "color": "#27F4D2", "skill": 91},
    {"abbr": "ANT", "name": "Kimi Antonelli",    "team": "Mercedes",       "color": "#27F4D2", "skill": 83},
    {"abbr": "ALO", "name": "Fernando Alonso",   "team": "Aston Martin",   "color": "#229971", "skill": 89},
    {"abbr": "STR", "name": "Lance Stroll",      "team": "Aston Martin",   "color": "#229971", "skill": 80},
    {"abbr": "SAI", "name": "Carlos Sainz",      "team": "Williams",       "color": "#64C4FF", "skill": 90},
    {"abbr": "ALB", "name": "Alexander Albon",   "team": "Williams",       "color": "#64C4FF", "skill": 86},
    {"abbr": "GAS", "name": "Pierre Gasly",      "team": "Alpine",         "color": "#0093CC", "skill": 85},
    {"abbr": "DOO", "name": "Jack Doohan",       "team": "Alpine",         "color": "#0093CC", "skill": 76},
    {"abbr": "TSU", "name": "Yuki Tsunoda",      "team": "RB",             "color": "#6692FF", "skill": 84},
    {"abbr": "LAW", "name": "Liam Lawson",       "team": "RB",             "color": "#6692FF", "skill": 81},
    {"abbr": "MAG", "name": "Kevin Magnussen",   "team": "Haas",           "color": "#B6BABD", "skill": 79},
    {"abbr": "OCO", "name": "Esteban Ocon",      "team": "Haas",           "color": "#B6BABD", "skill": 83},
    {"abbr": "HUL", "name": "Nico Hulkenberg",   "team": "Kick Sauber",    "color": "#52E252", "skill": 82},
    {"abbr": "BEA", "name": "Oliver Bearman",    "team": "Kick Sauber",    "color": "#52E252", "skill": 78},
    {"abbr": "HAD", "name": "Isack Hadjar",      "team": "Red Bull",       "color": "#3671C6", "skill": 77},
]

CIRCUIT_LAPS = {
    "bahrain":     57, "saudi arabian": 50, "australian": 58, "japanese": 53,
    "chinese":     56, "miami":         57, "monaco":     78, "british":  52,
    "italian":     53, "abu dhabi":     58,
}

COMPOUND_DEG = {"SOFT": 1.4, "MEDIUM": 1.0, "HARD": 0.7, "S": 1.4, "M": 1.0, "H": 0.7}

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _circuit_laps(circuit_name: str) -> int:
    key = circuit_name.lower().replace(" grand prix", "").strip()
    for k, v in CIRCUIT_LAPS.items():
        if k in key or key in k:
            return v
    return 57


def _extract_pace_data(session) -> dict:
    """
    Returns { driver_abbr: { compound: [lap_time_s, ...] } }
    from a real FastF1 session.
    """
    laps = session.laps.copy()
    laps = laps[laps["LapTime"].notna()]
    laps["LapTime_s"] = laps["LapTime"].apply(lambda x: x.total_seconds())
    # Remove outlier laps (pit in/out laps, safety car laps, etc.)
    q_low  = laps["LapTime_s"].quantile(0.05)
    q_high = laps["LapTime_s"].quantile(0.95)
    laps = laps[(laps["LapTime_s"] >= q_low) & (laps["LapTime_s"] <= q_high)]

    pace = {}
    for driver, group in laps.groupby("Driver"):
        pace[driver] = {}
        for compound, cg in group.groupby("Compound"):
            times = cg["LapTime_s"].tolist()
            if times:
                pace[driver][compound] = times
    return pace


def _build_driver_base_pace(pace_data: dict, drivers: list) -> dict:
    """
    For each driver, pick their median race pace from the reference session.
    Returns { abbr: base_pace_seconds }
    """
    result = {}
    # Global median as fallback
    all_times = [t for d in pace_data.values() for times in d.values() for t in times]
    global_median = float(np.median(all_times)) if all_times else 90.0

    for d in drivers:
        abbr = d["abbr"]
        driver_times = [t for times in pace_data.get(abbr, {}).values() for t in times]
        if driver_times:
            result[abbr] = float(np.median(driver_times))
        else:
            # Scale by skill: faster skill = closer to global_median * 0.98
            skill_factor = 1.0 + (100 - d["skill"]) * 0.003
            result[abbr] = global_median * skill_factor
    return result


def _synthetic_base_pace(drivers: list) -> dict:
    """Fallback when FastF1 data is unavailable."""
    base = 90.0
    result = {}
    for d in drivers:
        skill_factor = 1.0 + (100 - d["skill"]) * 0.003
        result[d["abbr"]] = base * skill_factor
    return result

# ─── Core simulation ──────────────────────────────────────────────────────────

def _run_simulation(drivers: list, total_laps: int, base_pace: dict, circuit: str) -> dict:
    rng = random.Random()

    # Starting grid (weighted shuffle by skill + random)
    grid = sorted(drivers, key=lambda d: -(d["skill"] + rng.uniform(-8, 8)))

    # State
    positions   = list(grid)          # index = current position (0 = leader)
    tyres       = [rng.choice(["SOFT", "MEDIUM"]) for _ in grid]
    tyre_age    = [0] * len(grid)
    pit_stops   = {d["abbr"]: 0 for d in grid}
    cumulative  = [0.0] * len(grid)   # cumulative gap to leader (seconds)
    fastest_lap = {"driver": None, "team": None, "time": None, "time_s": 999}
    events      = []
    flag        = "green"

    laps_timeline = []

    for lap_num in range(1, total_laps + 1):
        lap_times = []

        # ── Flag events ──────────────────────────────────────────────────────
        roll = rng.random()
        if roll < 0.01 and 3 < lap_num < total_laps - 5:
            flag = "red"
            events.append({"lap": lap_num, "type": "red", "msg": "RED FLAG — Session Stopped"})
        elif roll < 0.04 and lap_num > 2:
            flag = "safety"
            events.append({"lap": lap_num, "type": "safety", "msg": f"Safety Car deployed — Lap {lap_num}"})
        elif roll < 0.08:
            flag = "yellow"
        else:
            flag = "green"

        # ── Per-driver lap simulation ─────────────────────────────────────────
        for i, driver in enumerate(positions):
            abbr     = driver["abbr"]
            compound = tyres[i]
            age      = tyre_age[i]
            deg      = COMPOUND_DEG.get(compound, 1.0)
            base     = base_pace.get(abbr, 90.0)

            # Tyre degradation curve
            deg_penalty = deg * age * 0.012
            # Fuel effect (heavier early = slower)
            fuel_penalty = (total_laps - lap_num) * 0.003
            # Random noise
            noise = rng.gauss(0, 0.25)
            # SC / flag slowdown
            flag_factor = 1.04 if flag in ("safety", "yellow") else 1.0

            lap_time = (base + deg_penalty + fuel_penalty + noise) * flag_factor

            # ── Pit stop logic ───────────────────────────────────────────────
            pit_in = False
            if compound == "SOFT" and age > 18 and rng.random() < 0.08:
                pit_in = True
            elif compound == "MEDIUM" and age > 28 and rng.random() < 0.06:
                pit_in = True
            elif compound == "HARD" and age > 40 and rng.random() < 0.03:
                pit_in = True

            if pit_in and lap_num < total_laps - 3:
                pit_stops[abbr] += 1
                new_compound = rng.choice(["MEDIUM", "HARD"]) if compound == "SOFT" else "HARD"
                tyres[i]    = new_compound
                tyre_age[i] = 0
                lap_time   += 22.0  # pit stop loss
                events.append({"lap": lap_num, "type": "pit", "msg": f"{abbr} pits for {new_compound.capitalize()} tyres"})
            else:
                tyre_age[i] += 1

            lap_times.append(lap_time)

            # ── Fastest lap tracker ──────────────────────────────────────────
            if lap_time < fastest_lap["time_s"] and not pit_in:
                mins = int(lap_time // 60)
                secs = lap_time % 60
                fastest_lap = {
                    "driver": abbr,
                    "team": driver["team"],
                    "time": f"{mins}:{secs:06.3f}",
                    "time_s": lap_time,
                }

        # ── Update cumulative gaps ────────────────────────────────────────────
        leader_time = lap_times[0]
        new_cumulative = [0.0]
        for i in range(1, len(positions)):
            delta = lap_times[i] - leader_time
            new_cumulative.append(cumulative[i] + delta)
        cumulative = new_cumulative

        # ── Overtake logic (green flag only) ─────────────────────────────────
        if flag == "green":
            for i in range(1, len(positions)):
                ahead   = positions[i - 1]
                behind  = positions[i]
                # Overtake probability scales with skill diff + gap
                skill_diff = behind["skill"] - ahead["skill"]
                gap = cumulative[i] - cumulative[i - 1] if i > 0 else 0
                overtake_prob = 0.025 * (1 + skill_diff / 40) / max(1, 1 + gap * 0.5)
                if rng.random() < overtake_prob:
                    # Swap
                    positions[i - 1], positions[i]    = positions[i], positions[i - 1]
                    tyres[i - 1],    tyres[i]          = tyres[i],    tyres[i - 1]
                    tyre_age[i - 1], tyre_age[i]       = tyre_age[i], tyre_age[i - 1]
                    cumulative[i - 1], cumulative[i]   = cumulative[i], cumulative[i - 1]
                    if i == 1:
                        events.append({
                            "lap": lap_num, "type": "overtake",
                            "msg": f"{positions[0]['abbr']} overtakes {positions[1]['abbr']} for the lead!",
                        })
                    elif i <= 3:
                        events.append({
                            "lap": lap_num, "type": "overtake",
                            "msg": f"{positions[i-1]['abbr']} passes {positions[i]['abbr']} for P{i}",
                        })

        # ── Build lap snapshot ────────────────────────────────────────────────
        lap_snapshot = {
            "lap": lap_num,
            "flag": flag,
            "positions": [
                {
                    "position": idx + 1,
                    "driver":   d["abbr"],
                    "team":     d["team"],
                    "team_color": d["color"],
                    "gap":      round(cumulative[idx], 3),
                    "tyre":     tyres[idx],
                    "tyre_age": tyre_age[idx],
                    "pits":     pit_stops[d["abbr"]],
                }
                for idx, d in enumerate(positions)
            ],
        }
        laps_timeline.append(lap_snapshot)

    # ── Final result ──────────────────────────────────────────────────────────
    final_positions = laps_timeline[-1]["positions"]

    return {
        "total_laps": total_laps,
        "circuit":    circuit,
        "final_classification": final_positions,
        "fastest_lap": {
            "driver": fastest_lap["driver"],
            "team":   fastest_lap["team"],
            "time":   fastest_lap["time"],
        },
        "events": events,
        "laps":   laps_timeline,
    }

# ─── Endpoint ─────────────────────────────────────────────────────────────────

@router.post("")
def simulate_race(req: SimRequest):
    """
    Run a race simulation.

    Tries to use real FastF1 reference data. Falls back to synthetic if
    data isn't cached or network is unavailable.
    """
    total_laps   = _circuit_laps(req.circuit)
    ref_year     = req.reference_year or req.year
    drivers      = list(FALLBACK_DRIVERS)

    # Try to get real pace data
    base_pace: dict = {}
    try:
        # Map circuit name to FastF1 event identifier
        schedule = fastf1.get_event_schedule(ref_year, include_testing=False)
        # Find matching event by name
        circuit_lower = req.circuit.lower()
        match = None
        for _, row in schedule.iterrows():
            if (circuit_lower in row["EventName"].lower() or
                    circuit_lower in row["Location"].lower() or
                    circuit_lower in row["Country"].lower()):
                match = int(row["RoundNumber"])
                total_laps = _circuit_laps(row["EventName"])
                break

        if match is not None:
            session = fastf1.get_session(ref_year, match, "R")
            session.load(laps=True, telemetry=False, weather=False, messages=False)
            pace_data = _extract_pace_data(session)

            # Update driver colors/teams from real data
            real_drivers_map = {}
            for _, row in session.results.iterrows():
                real_drivers_map[row["Abbreviation"]] = {
                    "abbr":  row["Abbreviation"],
                    "name":  f"{row['FirstName']} {row['LastName']}",
                    "team":  row["TeamName"],
                    "color": f"#{row['TeamColor']}" if row["TeamColor"] else "#888888",
                    "skill": next(
                        (d["skill"] for d in FALLBACK_DRIVERS if d["abbr"] == row["Abbreviation"]),
                        80,
                    ),
                }
            if real_drivers_map:
                drivers = list(real_drivers_map.values())

            base_pace = _build_driver_base_pace(pace_data, drivers)
    except Exception:
        # Silently fall back — FastF1 data not available (not cached, network, etc.)
        pass

    if not base_pace:
        base_pace = _synthetic_base_pace(drivers)

    result = _run_simulation(drivers, total_laps, base_pace, req.circuit)
    return result
