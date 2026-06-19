# F1 Race Simulator

A browser-based Formula 1 **race-strategy simulator**. Set up your car in the garage — tyres, fuel, aero, driving style, pit strategy — then watch a deterministic, physics-flavoured race play out lap-by-lap against a grid of AI drivers on a live animated track map.

Outcomes are a direct consequence of your decisions: pick the wrong compound, mismanage fuel, or miss a pit window and you'll pay for it on track.

---

## Features

- **Garage setup** — choose tyre compound, fuel load, downforce / suspension / ride-height, driving style, ERS mode, and pit strategy.
- **Live track view** — an animated SVG of Spa-Francorchamps where each car completes one full clockwise circuit per lap, spaced by real time gaps, with sector colours and turn markers.
- **Lap-by-lap strategy engine** — transparent lap-time model combining tyres, fuel, aero, weather, ERS, DRS/dirty air, and driver skill.
- **Dynamic weather** — stochastic, mostly-dry conditions that can occasionally turn to light or heavy rain and back.
- **Race incidents** — errors, safety cars, and virtual safety cars triggered by driver mistakes.
- **Playback speed control** — 0.25× / 0.5× / 1× / 2× / 4×.
- **Start-light sequence** — the simulation is held on the grid until the lights go out.
- **Full-field finish** — the race only ends after *every* car crosses the line, not just the leader.
- **Post-race results** — final classification, podium, strategy timeline, race highlights, driver of the day, and a breakdown of how your setup affected the result.
- **Lobby system** — create or join a named, password-protected room.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite |
| Simulation | Plain JS (deterministic engine, seeded PRNG) |
| Rendering | Inline SVG + `requestAnimationFrame` |
| Backend (optional) | Python, FastAPI, [FastF1](https://docs.fastf1.dev/) |

---

## Project Structure

```
f1-race-simulator/
├── index.html                 # Vite entry, fonts
├── vite.config.js             # Dev server (port 3000) + /api proxy
├── public/
│   └── landing.png            # Shared hero / background image
├── src/
│   ├── main.jsx               # React root
│   ├── app.jsx                # App shell: landing, lobby, garage setup,
│   │                          #   race screen, results (the main UI)
│   ├── constants/index.js     # Teams, drivers, circuits, compounds
│   ├── simulation/
│   │   └── raceEngine.js       # The deterministic race engine
│   ├── hooks/
│   │   ├── useRaceController.js # Drives lap ticks + playback timing
│   │   └── usePitSystem.js      # Pit / fuel / ERS commands
│   └── components/
│       ├── TrackView.jsx       # Animated SVG track + car positions
│       └── RaceHUD.jsx         # Live timing, controls, leaderboard
└── backend/                   # Optional FastF1 data API (FastAPI)
    ├── main.py
    └── routers/               # sessions, drivers, race, telemetry,
                               #   strategy, simulate
```

> **Note:** The game runs **entirely client-side** off `raceEngine.js`. The Python `backend/` exposes real F1 data via FastF1 and is independent — the frontend does not currently call it.

---

## Getting Started

### Frontend (the simulator)

```bash
npm install
npm run dev          # → http://localhost:3000
```

Build for production:

```bash
npm run build
npm run preview
```

### Backend (optional — real F1 data API)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The Vite dev server proxies `/api` → `http://localhost:8000`.

---

## How to Play

1. **Create a room** (lobby name + password + username) or **join** an existing one.
2. **Start setup** to enter the garage and configure your car.
3. Pick your **starting tyre**, **fuel load**, **aero/setup**, **driving style**, and **pit strategy**.
4. **Launch the race** — wait for the lights to go out, then manage the race live:
   - request pit stops and choose your next compound,
   - switch fuel mode (push / save) and ERS mode,
   - adjust playback speed.
5. Review your **post-race results** and how your decisions shaped the outcome.

---

## How the Simulation Works

The engine ([`src/simulation/raceEngine.js`](src/simulation/raceEngine.js)) advances the race **one lap per tick**. Every tick it computes each car's lap time, accumulates total race time, recalculates positions from cumulative time, then resolves overtakes, incidents, and pit stops. A **seeded PRNG** (re-seeded per lap from `rngSeed + lap`) keeps each race reproducible while differing between races.

### Lap-time model

Each car's lap time is built from a transparent stack of factors:

```
lapTime = baseTrackTime
        + tyreCompoundOffset
        + tyreDegradation          (cliff model past the threshold)
        + fuelWeightPenalty        (~0.035s per kg)
        + fuelModePenalty          (save mode is slower)
        + aeroEffect               (downforce: straights vs corners trade-off)
        + ersEffect                (attack / harvest)
        + suspension / rideHeight  (subtle ±)
        + drivingStyleModifier     (aggressive faster, conservative slower)
        + driverSkillSpread        (AI only)
        + weatherTyreMismatch      (wrong tyres for conditions)
        + dirtyAir / DRS           (based on gap to car ahead)
```

### Tyres

Five compounds (Soft, Medium, Hard, Intermediate, Wet), each with a pace offset, a wear **threshold**, and a base degradation rate. Past the threshold, degradation enters a **cliff** (exponential falloff) — the classic "your tyres are gone" moment. A mandatory two-compound rule applies a penalty at the finish if you never changed compound types.

### Fuel & ERS

- **Fuel:** the car starts heavy and gains pace as fuel burns; running dry adds a heavy limp penalty. Push vs. save modes trade pace for consumption.
- **ERS:** a limited number of "attack" laps give a pace boost; "harvest" recharges at a small pace cost.

### Weather

Stochastic and **mostly dry**. Each lap there's a small (forecast-biased) chance dry turns to light rain, which can intensify to heavy rain or clear up again. The chosen weather strategy (Dry / Mixed / Wet) scales how likely rain is.

### Overtaking, incidents & safety cars

- **Overtakes** resolve probabilistically from the pace delta, circuit overtaking difficulty, driver racecraft, DRS proximity, and tyre-age advantage.
- **Incidents:** lower-skill AI drivers occasionally make errors (small time loss) or have bigger incidents that can trigger a **Safety Car** (field bunched up) or **Virtual Safety Car**.
- Pit stops are cheaper under SC/VSC, mirroring real strategy.

### Race lifecycle

`setup → racing → cooldown → finished`

- **racing** is gated until the start lights go out.
- **cooldown** holds after the leader finishes so the rest of the field crosses the line before results show.

---

## Backend API (FastF1)

The optional FastAPI service wraps [FastF1](https://docs.fastf1.dev/) to serve real historical F1 data:

| Route | Purpose |
|-------|---------|
| `GET /api/health` | Health check |
| `GET /api/sessions/{year}` | Season schedule |
| `GET /api/drivers/{year}` | Driver list / stats |
| `GET /api/race/{year}/{round}/results` | Race results, laps, positions |
| `GET /api/telemetry/...` | Lap telemetry (downsampled) |
| `GET /api/strategy/{year}/{round}` | Tyre strategies & pit stops |
| `POST /api/simulate` | Run a simulation seeded from real pace data |

---

## License

ISC
