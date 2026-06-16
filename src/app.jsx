// ─── UPGRADED LANDING PAGE ────────────────────────────────────────────────────
// Drop-in replacement for the LandingPage function in app.jsx
// Panel-based navigation — no scroll bleed. Premium F1 aesthetic.

import { useState, useEffect, useRef } from "react";
import RaceHUD from "./components/RaceHUD";
import TrackView from "./components/TrackView";
import { syncRaceStateCalculations, TYRE_COMPOUNDS } from "./simulation/raceEngine";
import { useRaceController } from "./hooks/useRaceController";
import { usePitSystem } from "./hooks/usePitSystem";

const pitGarageImageSrc = "/landing.png";
const f1LogoImageSrc = new URL("./components/assets/New_era_F1_logo.png", import.meta.url).href;
const spaMapImageSrc = new URL("./components/assets/spa_map.png", import.meta.url).href;
// Served from /public — overwrite public/landing.png and changes reflect on refresh.
const landingImageSrc = "/landing.png";

// ─── CONSTANTS (copy from app.jsx) ───────────────────────────────────────────
const TEAMS = {
  "Red Bull":     { color: "#3671C6", accent: "#FFD700", abbr: "RBR" },
  McLaren:        { color: "#FF8700", accent: "#FF8700", abbr: "MCL" },
  Mercedes:       { color: "#27F4D2", accent: "#27F4D2", abbr: "MER" },
  Ferrari:        { color: "#E8002D", accent: "#E8002D", abbr: "FER" },
  Williams:       { color: "#64C4FF", accent: "#64C4FF", abbr: "WIL" },
  "Aston Martin": { color: "#229971", accent: "#229971", abbr: "AMR" },
  Alpine:         { color: "#0093CC", accent: "#FF87BC", abbr: "ALP" },
  Haas:           { color: "#B6BABD", accent: "#E6002D", abbr: "HAA" },
  RB:             { color: "#6692FF", accent: "#6692FF", abbr: "RBT" },
  "Kick Sauber":  { color: "#52E252", accent: "#52E252", abbr: "SAU" },
};

const DEFAULT_TOTAL_LAPS = 44;
const TOTAL_GRID_SLOTS = 20;
// After the leader finishes, hold this long so the rest of the field crosses
// the line before results are shown.
const COOLDOWN_MS = 2600;
const TYRE_SETUP_OPTIONS = [
  { value: "soft", label: "Soft", short: "S" },
  { value: "medium", label: "Medium", short: "M" },
  { value: "hard", label: "Hard", short: "H" },
  { value: "intermediate", label: "Intermediate", short: "I" },
  { value: "wet", label: "Wet", short: "W" },
];
const DRIVING_STYLE_OPTIONS = [
  { value: "conservative", label: "Conservative" },
  { value: "balanced", label: "Balanced" },
  { value: "aggressive", label: "Aggressive" },
];
const ERS_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];
const PIT_STRATEGY_OPTIONS = [
  { value: "1-stop", label: "1-stop" },
  { value: "2-stop", label: "2-stop" },
  { value: "custom", label: "Custom" },
];
const WEATHER_STRATEGY_OPTIONS = [
  { value: "dry", label: "Dry" },
  { value: "mixed", label: "Mixed" },
  { value: "wet", label: "Wet" },
];
const RACE_PACE_OPTIONS = [
  { value: "realistic", label: "Realistic" },
  { value: "arcade", label: "Arcade" },
];
const WEATHER_TO_RACE_WEATHER = {
  dry: "dry",
  mixed: "dry",          // starts dry but rain is likely at some point
  wet: "heavy_rain",
};
// Scales per-lap rain probability in the engine's stochastic weather model.
const WEATHER_TO_BIAS = {
  dry: 1,
  mixed: 3.5,
  wet: 5,
};
const TYRE_TO_RACE_COMPOUND = {
  soft: "S",
  medium: "M",
  hard: "H",
  intermediate: "I",
  wet: "W",
};
const PLAYER_COLORS = ["#E10600", "#27F4D2", "#FF8700", "#64C4FF", "#FFD700", "#B6BABD"];
const AI_DRIVER_POOL = [
  { id: "verstappen", name: "Max Verstappen", team: "Red Bull", tyre: "soft", fuel: 78, drivingStyle: "aggressive", ers: "high", pitStrategy: "2-stop" },
  { id: "norris", name: "Lando Norris", team: "McLaren", tyre: "medium", fuel: 74, drivingStyle: "balanced", ers: "medium", pitStrategy: "2-stop" },
  { id: "leclerc", name: "Charles Leclerc", team: "Ferrari", tyre: "soft", fuel: 72, drivingStyle: "aggressive", ers: "high", pitStrategy: "1-stop" },
  { id: "hamilton", name: "Lewis Hamilton", team: "Mercedes", tyre: "medium", fuel: 70, drivingStyle: "balanced", ers: "medium", pitStrategy: "2-stop" },
  { id: "piastri", name: "Oscar Piastri", team: "McLaren", tyre: "medium", fuel: 76, drivingStyle: "balanced", ers: "medium", pitStrategy: "2-stop" },
  { id: "russell", name: "George Russell", team: "Mercedes", tyre: "medium", fuel: 73, drivingStyle: "balanced", ers: "high", pitStrategy: "2-stop" },
  { id: "sainz", name: "Carlos Sainz", team: "Williams", tyre: "hard", fuel: 68, drivingStyle: "conservative", ers: "low", pitStrategy: "1-stop" },
  { id: "alonso", name: "Fernando Alonso", team: "Aston Martin", tyre: "hard", fuel: 69, drivingStyle: "conservative", ers: "medium", pitStrategy: "custom" },
  { id: "tsunoda", name: "Yuki Tsunoda", team: "RB", tyre: "soft", fuel: 75, drivingStyle: "aggressive", ers: "high", pitStrategy: "2-stop" },
  { id: "stroll", name: "Lance Stroll", team: "Aston Martin", tyre: "medium", fuel: 71, drivingStyle: "balanced", ers: "low", pitStrategy: "2-stop" },
  { id: "gasly", name: "Pierre Gasly", team: "Alpine", tyre: "medium", fuel: 72, drivingStyle: "balanced", ers: "medium", pitStrategy: "2-stop" },
  { id: "ocon", name: "Esteban Ocon", team: "Haas", tyre: "hard", fuel: 67, drivingStyle: "conservative", ers: "low", pitStrategy: "1-stop" },
  { id: "hulkenberg", name: "Nico Hulkenberg", team: "Kick Sauber", tyre: "hard", fuel: 68, drivingStyle: "balanced", ers: "medium", pitStrategy: "1-stop" },
  { id: "albon", name: "Alex Albon", team: "Williams", tyre: "soft", fuel: 74, drivingStyle: "aggressive", ers: "high", pitStrategy: "2-stop" },
  { id: "bearman", name: "Oliver Bearman", team: "Haas", tyre: "medium", fuel: 71, drivingStyle: "balanced", ers: "medium", pitStrategy: "2-stop" },
  { id: "hadjar", name: "Isack Hadjar", team: "RB", tyre: "soft", fuel: 73, drivingStyle: "aggressive", ers: "high", pitStrategy: "2-stop" },
  { id: "lawson", name: "Liam Lawson", team: "RB", tyre: "medium", fuel: 72, drivingStyle: "balanced", ers: "medium", pitStrategy: "2-stop" },
  { id: "antonelli", name: "Kimi Antonelli", team: "Mercedes", tyre: "soft", fuel: 75, drivingStyle: "aggressive", ers: "high", pitStrategy: "2-stop" },
  { id: "bortoleto", name: "Gabriel Bortoleto", team: "Kick Sauber", tyre: "hard", fuel: 69, drivingStyle: "conservative", ers: "low", pitStrategy: "1-stop" },
];
const DEFAULT_SETUP_RACE = {
  laps: DEFAULT_TOTAL_LAPS,
  weather: "dry",
  bots: true,
  weatherStrategy: "dry",
  safetyCarProbability: 22,
  paceMode: "realistic",
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const createSetupDriver = ({
  id,
  name,
  team = "",
  teamColor = "",
  type = "waiting",
  tyre = null,
  fuel = null,
  drivingStyle = null,
  ers = null,
  pitStrategy = null,
  slotIndex = 0,
  teamRole = "",
}) => ({
  id,
  name,
  team,
  teamColor: teamColor || TEAMS[team]?.color || "#7b828f",
  type,
  status: type === "player" ? "Player" : type === "ai" ? "AI" : "Waiting",
  tyre,
  fuel,
  drivingStyle,
  ers,
  pitStrategy,
  slotIndex,
  teamRole,
});

const createPlayer = ({
  id,
  name,
  team = "",
  isBot = false,
  tyre = "M",
  tyreAge = 0,
  tyreWear = 0,
  fuelLoad = 100,
  setup = {},
  drivingStyle = "balanced",
  ersMode = "medium",
  pitStrategy = "2-stop",
  position = 1,
  totalTime = 0,
  currentLapTime = 0,
  hasPitted = false,
  hasRequestedPit = false,
  pitCount = 0,
  nextTyreCompound = "M",
  setupLocked = false,
}) => ({
  id,
  name,
  team,
  isBot,
  tyre,
  tyreAge,
  tyreWear,
  fuelLoad,
  setup: {
    downforce: setup.downforce ?? 50,
    suspension: setup.suspension ?? 50,
    rideHeight: setup.rideHeight ?? 50,
  },
  drivingStyle,
  ersMode,
  pitStrategy,
  position,
  totalTime,
  currentLapTime,
  hasPitted,
  hasRequestedPit,
  pitCount,
  nextTyreCompound,
  setupLocked,
  stintHistory: [{ compound: tyre, startLap: 0 }],
});

const buildSetupDriverSlots = ({ username = "Player", includeBots = true, lobbyPlayers = [] } = {}) => {
  const humanPlayers = [
    { id: "player-1", name: username, team: "Ferrari", teamColor: TEAMS.Ferrari.color, type: "player" },
    ...lobbyPlayers.slice(1, TOTAL_GRID_SLOTS).map((player, index) => ({
      id: `player-${index + 2}`,
      name: player.username || `Player ${index + 2}`,
      team: player.team || `Player ${index + 2}`,
      teamColor: PLAYER_COLORS[(index + 1) % PLAYER_COLORS.length],
      type: "player",
    })),
  ];

  return Array.from({ length: TOTAL_GRID_SLOTS }, (_, index) => {
    const human = humanPlayers[index];
    if (human) {
      return createSetupDriver({
        id: human.id,
        name: human.name,
        team: human.team,
        teamColor: human.teamColor,
        type: "player",
        tyre: "medium",
        fuel: 72,
        drivingStyle: "balanced",
        ers: "medium",
        pitStrategy: "2-stop",
        slotIndex: index + 1,
        teamRole: "player",
      });
    }

    if (includeBots) {
      const bot = AI_DRIVER_POOL[index - humanPlayers.length] || AI_DRIVER_POOL[index % AI_DRIVER_POOL.length];
      return createSetupDriver({
        id: bot.id,
        name: bot.name,
        team: bot.team,
        type: "ai",
        tyre: bot.tyre,
        fuel: bot.fuel,
        drivingStyle: bot.drivingStyle,
        ers: bot.ers,
        pitStrategy: bot.pitStrategy,
        slotIndex: index + 1,
        teamRole: "ai",
      });
    }

    return createSetupDriver({
      id: `slot-${index + 1}`,
      name: `Waiting Slot ${String(index + 1).padStart(2, "0")}`,
      team: "Open Seat",
      teamColor: "#7b828f",
      type: "waiting",
      slotIndex: index + 1,
      teamRole: "waiting",
    });
  });
};

const buildActivePlayersFromSetup = (setup) => {
  const raceWeather = WEATHER_TO_RACE_WEATHER[setup.race.weatherStrategy] || "dry";

  return setup.drivers
    .filter((driver) => driver.type !== "waiting")
    .map((driver, index) => {
      const styleOffset = driver.drivingStyle === "aggressive" ? -4 : driver.drivingStyle === "conservative" ? 3 : 0;
      const ersOffset = driver.ers === "high" ? -2 : driver.ers === "low" ? 2 : 0;
      const paceOffset = setup.race.paceMode === "arcade" ? -2 : 1;
      const weatherOffset = raceWeather === "heavy_rain" ? 4 : raceWeather === "light_rain" ? 2 : 0;

      return createPlayer({
        id: driver.id,
        name: driver.name,
        team: driver.team,
        isBot: driver.type === "ai",
        tyre: TYRE_TO_RACE_COMPOUND[driver.tyre] || "M",
        tyreAge: 0,
        tyreWear: 0,
        fuelLoad: driver.fuel ?? 70,
        setup: {
          downforce: clamp(52 + styleOffset + weatherOffset, 35, 72),
          suspension: clamp(50 + paceOffset - ersOffset, 35, 72),
          rideHeight: clamp(48 + weatherOffset - paceOffset, 35, 72),
        },
        drivingStyle: driver.drivingStyle || "balanced",
        ersMode: driver.ers || "medium",
        pitStrategy: driver.pitStrategy || "2-stop",
        position: index + 1,
        setupLocked: driver.type === "ai",
      });
    });
};

const buildSetupState = (username = "Player", includeBots = true, lobbyPlayers = []) => {
  const setup = {
    drivers: buildSetupDriverSlots({ username, includeBots, lobbyPlayers }),
    race: { ...DEFAULT_SETUP_RACE, bots: includeBots },
    selectedDriverId: "player-1",
    flowStep: 2,
  };

  return setup;
};

const createInitialRaceState = (username = "Player", includeBots = true, lobbyPlayers = []) => {
  const setup = buildSetupState(username, includeBots, lobbyPlayers);
  const players = buildActivePlayersFromSetup(setup);

  return {
    players,
    setup,
    racePhase: "lobby",
    totalLaps: setup.race.laps,
    currentLap: 0,
    weather: WEATHER_TO_RACE_WEATHER[setup.race.weatherStrategy] || "dry",
    weatherBias: WEATHER_TO_BIAS[setup.race.weatherStrategy] || 1,
    leaderboard: [],
    events: [],
  };
};

// ─── ENHANCED GLOBAL STYLES ───────────────────────────────────────────────────
export const LANDING_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600;700;800&family=Bebas+Neue&family=Lilita+One&display=swap');

  @keyframes fadeInUp   { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn     { from { opacity:0; } to { opacity:1; } }
  @keyframes slideUp    { from { opacity:0; transform:translateY(40px); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideLeft  { from { opacity:0; transform:translateX(30px); } to { opacity:1; transform:translateX(0); } }
  @keyframes panelIn    { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes scanline   { 0% { transform:translateY(-100%); } 100% { transform:translateY(100vh); } }
  @keyframes pulse      { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
  @keyframes blinkBar   { 0%,100% { opacity:1; } 50% { opacity:0; } }
  @keyframes carMotion  { 0% { stroke-dashoffset: 1000; } 100% { stroke-dashoffset: 0; } }
  @keyframes countIn    { from { opacity:0; transform:scale(0.7); } to { opacity:1; transform:scale(1); } }
  @keyframes tyreRing   { from { stroke-dashoffset: 226; } to { stroke-dashoffset: 0; } }
  @keyframes shimmer    { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
  @keyframes revealLine { from { transform:scaleX(0); } to { transform:scaleX(1); } }
  @keyframes floatUp    { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }
  @keyframes heroDrift  { 0% { transform:scale(1.02) translate3d(0,0,0); } 50% { transform:scale(1.045) translate3d(0,-10px,0); } 100% { transform:scale(1.02) translate3d(0,0,0); } }
  @keyframes softPulse  { 0%,100% { opacity:0.55; } 50% { opacity:0.9; } }
  @keyframes heroSweep  { 0% { transform:translateX(-15%) skewX(-14deg); opacity:0; } 20% { opacity:0.26; } 100% { transform:translateX(115%) skewX(-14deg); opacity:0; } }
  @keyframes heroGlow   { 0%,100% { opacity:0.42; transform:scale(1); } 50% { opacity:0.6; transform:scale(1.04); } }
  @keyframes heroTitleIn { from { opacity:0; transform:translate(-50%, -46%); } to { opacity:1; transform:translate(-50%, -50%); } }
  @keyframes startLightOn { 0% { opacity:0; transform:scale(0.55); } 60% { opacity:1; transform:scale(1.12); } 100% { opacity:1; transform:scale(1); } }
  @keyframes goFlash { 0% { opacity:0; transform:translate(-50%,-50%) scale(0.6); } 18% { opacity:1; transform:translate(-50%,-50%) scale(1.08); } 78% { opacity:1; transform:translate(-50%,-50%) scale(1); } 100% { opacity:0; transform:translate(-50%,-50%) scale(1.18); } }
  @keyframes weatherIn { from { opacity:0; transform:translateX(-50%) translateY(-20px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
  @keyframes raceScreenIn { from { opacity:0; transform:scale(0.985); } to { opacity:1; transform:scale(1); } }

  ::-webkit-scrollbar { width:3px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(225,6,0,0.4); border-radius:2px; }

  .nav-link {
    font-family:'Barlow Condensed',sans-serif;
    font-weight:700; font-size:16px; letter-spacing:3.5px;
    color:rgba(255,255,255,0.76); cursor:pointer;
    text-transform:uppercase; transition:color 0.15s, transform 0.15s;
    border-bottom:1px solid transparent; padding-bottom:2px;
    position:relative;
    text-shadow:0 1px 10px rgba(0,0,0,0.2);
  }
  .nav-link:hover { color:#fff; transform:translateY(-1px); }
  .nav-link.active { color:#fff; border-bottom:1px solid var(--f1-red); }
  .nav-link.active::after {
    content:''; position:absolute; bottom:-1px; left:0; right:0;
    height:1px; background:var(--f1-red);
    animation:revealLine 0.3s ease;
    transform-origin:left;
  }

  .feat-card {
    background:linear-gradient(180deg, rgba(28,29,33,0.96) 0%, rgba(20,21,24,0.94) 100%);
    padding:36px 32px;
    border:1px solid rgba(255,255,255,0.08);
    border-radius:22px;
    box-shadow:0 22px 60px rgba(0,0,0,0.16);
    position:relative; overflow:hidden;
    backdrop-filter:blur(22px);
    transition:border-color 0.2s, background 0.2s, transform 0.2s, box-shadow 0.2s;
    cursor:default;
  }
  .feat-card::before {
    content:''; position:absolute; left:24px; right:24px; top:0;
    height:3px; background:linear-gradient(90deg,var(--f1-red),rgba(225,6,0,0));
    transform:scaleX(0); transform-origin:left;
    transition:transform 0.25s ease;
  }
  .feat-card:hover { transform:translateY(-4px); border-color:rgba(225,6,0,0.28); box-shadow:0 30px 80px rgba(0,0,0,0.22); }
  .feat-card:hover::before { transform:scaleX(1); }

  .step-item {
    position:relative; padding:28px 24px;
    border:1px solid rgba(255,255,255,0.08);
    border-radius:18px;
    background:linear-gradient(180deg, rgba(26,27,31,0.95) 0%, rgba(17,18,22,0.93) 100%);
    box-shadow:0 16px 40px rgba(0,0,0,0.16);
    backdrop-filter:blur(14px);
    transition:background 0.2s, border-color 0.2s, transform 0.2s;
  }
  .step-item:hover { background:linear-gradient(180deg, rgba(33,34,39,0.98) 0%, rgba(20,21,25,0.95) 100%); border-color:rgba(225,6,0,0.24); transform:translateX(4px); }
  .step-item::after {
    content:''; position:absolute; left:18px; right:18px; bottom:0;
    height:2px; background:linear-gradient(90deg,var(--f1-red),transparent);
    transform:scaleX(0); transform-origin:left; transition:transform 0.3s ease;
  }
  .step-item:hover::after { transform:scaleX(1); }

  .stat-block {
    border-left:2px solid rgba(255,255,255,0.06);
    padding-left:20px; transition:border-color 0.2s;
  }
  .stat-block:hover { border-color:var(--f1-red); }

  .tyre-option {
    cursor:pointer; transition:all 0.2s;
    border:1px solid rgba(255,255,255,0.08);
    border-radius:8px; padding:16px 20px;
  }
  .tyre-option:hover { border-color:rgba(255,255,255,0.2); background:rgba(255,255,255,0.03); }
  .tyre-option.selected { border-color:var(--f1-red); background:rgba(225,6,0,0.05); }

  .cta-primary {
    background:var(--f1-red); border:none; border-radius:4px;
    padding:13px 28px; color:#fff;
    font-family:'Barlow Condensed',sans-serif;
    font-weight:700; font-size:13px; letter-spacing:3px;
    cursor:pointer; transition:background 0.15s, transform 0.15s, box-shadow 0.15s;
  }
  .cta-primary:hover { background:var(--f1-red-hover); transform:translateY(-2px); box-shadow:0 12px 28px rgba(225,6,0,0.22); }
  .cta-primary:active { transform:translateY(0); }

  .cta-ghost {
    background:transparent; border:1px solid rgba(255,255,255,0.2);
    border-radius:4px; padding:13px 28px;
    color:rgba(255,255,255,0.65);
    font-family:'Barlow Condensed',sans-serif;
    font-weight:600; font-size:13px; letter-spacing:3px;
    cursor:pointer; transition:all 0.15s, transform 0.15s;
  }
  .cta-ghost:hover { border-color:rgba(255,255,255,0.5); color:#fff; transform:translateY(-2px); }

  .data-tag {
    font-family:'Barlow Condensed',sans-serif; font-weight:600;
    font-size:9px; letter-spacing:2.5px;
    color:rgba(17,17,17,0.52);
    border:1px solid rgba(17,17,17,0.09);
    background:rgba(255,255,255,0.55);
    border-radius:999px; padding:6px 11px;
    backdrop-filter:blur(10px);
  }

  .section-panel {
    position:absolute; top:0; left:0; right:0; bottom:0;
    overflow-y:auto;
    animation:panelIn 0.35s ease;
  }

  .section-shell {
    min-height:100vh;
    position:relative;
    color:#111;
    background:
      rgba(241, 243, 246, 0.92) url('${pitGarageImageSrc}') center center / cover no-repeat;
  }

  .section-shell::before {
    content:'';
    position:absolute;
    inset:0;
    background:
      radial-gradient(circle at top left, rgba(225,6,0,0.08), transparent 32%),
      linear-gradient(90deg, rgba(17,17,17,0.06) 1px, transparent 1px),
      linear-gradient(rgba(17,17,17,0.04) 1px, transparent 1px);
    background-size:auto, 56px 56px, 56px 56px;
    pointer-events:none;
  }

  .section-inner {
    position:relative;
    z-index:1;
    max-width:1320px;
    margin:0 auto;
    width:100%;
    padding:88px 64px 112px;
  }

  .glass-panel {
    background:rgba(255, 255, 255, 0.75);
    border:1px solid rgba(255, 255, 255, 0.5);
    border-radius:30px;
    box-shadow:0 30px 80px rgba(0,0,0,0.1);
    backdrop-filter:blur(20px);
  }

  .hero-center-title {
    font-family:'Lilita One',sans-serif;
    font-size:clamp(52px, 6vw, 98px);
    line-height:0.98;
    letter-spacing:0.02em;
    text-transform:uppercase;
    white-space:nowrap;
    color:#f8f7f4;
    -webkit-text-stroke:6px #1f2028;
    paint-order:stroke fill;
    text-shadow:
      0 2px 0 #1f2028,
      0 6px 0 #1f2028,
      0 10px 18px rgba(0,0,0,0.18);
  }

  .hero-action {
    display:flex;
    align-items:center;
    gap:16px;
    min-width:240px;
    padding:18px 24px;
    border-radius:22px;
    border:1px solid rgba(255,255,255,0.18);
    background:linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 100%);
    box-shadow:0 18px 40px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.14);
    backdrop-filter:blur(14px);
    cursor:pointer;
    transition:transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
  }

  .hero-action:hover {
    transform:translateY(-3px);
    border-color:rgba(255,255,255,0.28);
  }

  .hero-action.primary {
    background:linear-gradient(180deg, rgba(225,6,0,0.88) 0%, rgba(178,9,7,0.84) 100%);
    border-color:rgba(255,255,255,0.14);
  }

  .hero-action-icon {
    width:58px;
    height:58px;
    border-radius:18px;
    display:flex;
    align-items:center;
    justify-content:center;
    font-family:'Bebas Neue',sans-serif;
    font-size:30px;
    letter-spacing:1px;
    color:#fff;
    background:rgba(18,18,24,0.24);
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.12);
    flex-shrink:0;
  }

  .hero-action.primary .hero-action-icon {
    background:rgba(255,255,255,0.14);
  }

  .hero-action-copy {
    text-align:left;
  }

  .hero-action-title {
    font-family:'Bebas Neue',sans-serif;
    font-size:34px;
    line-height:0.95;
    letter-spacing:0.06em;
    color:#fff;
  }

  .hero-action-sub {
    margin-top:6px;
    font-family:'Barlow Condensed',sans-serif;
    font-weight:700;
    font-size:12px;
    letter-spacing:0.32em;
    text-transform:uppercase;
    color:rgba(255,255,255,0.62);
  }

  .setup-overlay {
    position:fixed;
    inset:0;
    z-index:190;
    background:radial-gradient(circle at top, rgba(225,6,0,0.1), transparent 28%), rgba(7,8,10,0.88);
    backdrop-filter:blur(14px);
    display:flex;
    align-items:center;
    justify-content:center;
    padding:28px;
    animation:fadeIn 0.22s ease;
  }

  .setup-shell {
    width:min(1480px, 100%);
    max-height:calc(100vh - 56px);
    overflow:hidden;
    border-radius:34px;
    border:1px solid rgba(255,255,255,0.18);
    background:
      linear-gradient(180deg, rgba(14,16,20,0.96) 0%, rgba(25,27,34,0.94) 100%),
      url('${pitGarageImageSrc}') center center / cover no-repeat;
    box-shadow:0 40px 90px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.14);
    position:relative;
  }

  .setup-shell::before {
    content:'';
    position:absolute;
    inset:0;
    background:
      linear-gradient(135deg, rgba(255,255,255,0.08), transparent 32%, transparent 70%, rgba(225,6,0,0.06)),
      radial-gradient(circle at top left, rgba(255,255,255,0.16), transparent 38%),
      linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px),
      linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px);
    background-size:auto, auto, 30px 30px, 30px 30px;
    pointer-events:none;
  }

  .setup-content {
    position:relative;
    z-index:1;
    display:flex;
    flex-direction:column;
    height:100%;
    max-height:calc(100vh - 56px);
  }

  .setup-header {
    display:flex;
    align-items:flex-start;
    justify-content:space-between;
    gap:24px;
    padding:24px 26px 18px;
    border-bottom:1px solid rgba(255,255,255,0.12);
    background:linear-gradient(180deg, rgba(7,8,10,0.72), rgba(7,8,10,0.18));
    backdrop-filter:blur(12px);
  }

  .setup-flow {
    display:flex;
    align-items:center;
    gap:10px;
    margin-top:18px;
    flex-wrap:wrap;
  }

  .setup-flow-pill {
    padding:8px 12px;
    border-radius:999px;
    border:1px solid rgba(255,255,255,0.12);
    background:rgba(255,255,255,0.04);
    color:rgba(255,255,255,0.72);
    font-family:'Barlow Condensed',sans-serif;
    font-size:11px;
    font-weight:700;
    letter-spacing:2.4px;
    text-transform:uppercase;
  }

  .setup-layout {
    display:grid;
    grid-template-columns:minmax(280px, 0.88fr) minmax(0, 1.28fr) minmax(300px, 0.84fr);
    gap:18px;
    padding:18px 18px 0;
    min-height:0;
    flex:1;
  }

  .setup-column {
    min-height:0;
    overflow:auto;
    padding-right:4px;
  }

  .setup-card {
    position:relative;
    border-radius:28px;
    border:1px solid rgba(255,255,255,0.12);
    background:linear-gradient(180deg, rgba(12,14,18,0.96) 0%, rgba(19,21,28,0.94) 100%);
    box-shadow:0 24px 60px rgba(0,0,0,0.3);
    padding:20px;
    display:flex;
    flex-direction:column;
    gap:18px;
    overflow:hidden;
  }

  .setup-card::before {
    content:'';
    position:absolute;
    left:22px;
    right:22px;
    top:0;
    height:2px;
    background:linear-gradient(90deg, rgba(225,6,0,0.9), rgba(255,255,255,0));
  }

  .setup-chip-row {
    display:flex;
    flex-wrap:wrap;
    gap:10px;
  }

  .setup-chip {
    border-radius:999px;
    padding:8px 12px;
    border:1px solid rgba(255,255,255,0.1);
    background:rgba(255,255,255,0.04);
    color:rgba(255,255,255,0.78);
    font-family:'Barlow Condensed',sans-serif;
    font-size:11px;
    font-weight:700;
    letter-spacing:2px;
    text-transform:uppercase;
  }

  .setup-tyre-grid,
  .setup-style-grid {
    display:grid;
    grid-template-columns:repeat(3, minmax(0, 1fr));
    gap:10px;
  }

  .setup-choice {
    border-radius:18px;
    border:1px solid rgba(255,255,255,0.12);
    background:linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03));
    color:#fff;
    padding:14px 12px;
    cursor:pointer;
    transition:transform 0.15s ease, border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
  }

  .setup-choice:hover {
    transform:translateY(-2px);
    border-color:rgba(255,255,255,0.26);
  }

  .setup-choice.active {
    box-shadow:0 14px 30px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.16);
  }

  .setup-choice:disabled {
    opacity:0.62;
    cursor:not-allowed;
    transform:none;
  }

  .setup-switch {
    position:relative;
    display:inline-flex;
    align-items:center;
    justify-content:space-between;
    width:100%;
    gap:14px;
    padding:14px 16px;
    border-radius:18px;
    border:1px solid rgba(255,255,255,0.1);
    background:rgba(255,255,255,0.04);
    color:#fff;
    cursor:pointer;
    transition:transform 0.16s ease, border-color 0.16s ease, background 0.16s ease;
  }

  .setup-switch:hover {
    transform:translateY(-1px);
    border-color:rgba(255,255,255,0.22);
  }

  .setup-switch.active {
    border-color:rgba(225,6,0,0.42);
    background:rgba(225,6,0,0.1);
  }

  .setup-switch-track {
    width:46px;
    height:24px;
    border-radius:999px;
    background:rgba(255,255,255,0.14);
    position:relative;
    flex-shrink:0;
    transition:background 0.16s ease;
  }

  .setup-switch.active .setup-switch-track {
    background:var(--f1-red);
  }

  .setup-switch-thumb {
    position:absolute;
    width:18px;
    height:18px;
    top:3px;
    left:3px;
    border-radius:50%;
    background:#fff;
    transition:left 0.16s ease;
    box-shadow:0 4px 10px rgba(0,0,0,0.26);
  }

  .setup-switch.active .setup-switch-thumb {
    left:25px;
  }

  .setup-slider {
    display:flex;
    flex-direction:column;
    gap:10px;
    padding:14px 16px 16px;
    border-radius:18px;
    border:1px solid rgba(255,255,255,0.08);
    background:rgba(255,255,255,0.04);
  }

  .setup-range {
    -webkit-appearance:none;
    appearance:none;
    width:100%;
    height:8px;
    border-radius:999px;
    background:linear-gradient(90deg, rgba(225,6,0,0.92), rgba(255,255,255,0.18));
    outline:none;
  }

  .setup-range::-webkit-slider-thumb {
    -webkit-appearance:none;
    appearance:none;
    width:24px;
    height:24px;
    border-radius:50%;
    border:2px solid rgba(255,255,255,0.86);
    background:linear-gradient(180deg, #fafafa 0%, #b6bcc8 100%);
    box-shadow:0 8px 18px rgba(0,0,0,0.35);
    cursor:pointer;
  }

  .setup-range::-moz-range-thumb {
    width:24px;
    height:24px;
    border:none;
    border-radius:50%;
    background:linear-gradient(180deg, #fafafa 0%, #b6bcc8 100%);
    box-shadow:0 8px 18px rgba(0,0,0,0.35);
    cursor:pointer;
  }

  .setup-lineup {
    display:flex;
    gap:10px;
    overflow-x:auto;
    padding-bottom:4px;
  }

  .setup-lineup::-webkit-scrollbar {
    height:4px;
  }

  .driver-slot {
    min-width:148px;
    flex:0 0 148px;
    border-radius:18px;
    border:1px solid rgba(255,255,255,0.1);
    background:linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03));
    padding:12px;
    color:#fff;
    cursor:pointer;
    transition:transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
    position:relative;
    overflow:hidden;
  }

  .driver-slot:hover {
    transform:translateY(-3px);
    border-color:rgba(255,255,255,0.24);
  }

  .driver-slot.active {
    transform:translateY(-3px);
    border-color:rgba(255,255,255,0.34);
    box-shadow:0 18px 40px rgba(0,0,0,0.26), 0 0 0 1px rgba(225,6,0,0.18), 0 0 30px rgba(225,6,0,0.14);
  }

  .driver-slot.active::before {
    content:'';
    position:absolute;
    inset:-2px;
    border-radius:20px;
    border:1px solid rgba(225,6,0,0.36);
    pointer-events:none;
  }

  .driver-strip {
    width:100%;
    height:5px;
    border-radius:999px;
    margin-bottom:10px;
  }

  .driver-meta {
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:10px;
    margin-top:10px;
  }

  .driver-badge {
    padding:5px 8px;
    border-radius:999px;
    font-family:'Barlow Condensed',sans-serif;
    font-size:10px;
    font-weight:800;
    letter-spacing:2px;
    text-transform:uppercase;
    border:1px solid rgba(255,255,255,0.12);
    background:rgba(255,255,255,0.04);
  }

  .driver-badge.player {
    color:#fff;
    background:rgba(225,6,0,0.18);
    border-color:rgba(225,6,0,0.32);
  }

  .driver-badge.ai {
    color:rgba(255,255,255,0.92);
    background:rgba(39,244,210,0.1);
    border-color:rgba(39,244,210,0.22);
  }

  .driver-badge.waiting {
    color:rgba(255,255,255,0.58);
    background:rgba(255,255,255,0.03);
  }

  .setup-panel-title {
    display:flex;
    align-items:flex-start;
    justify-content:space-between;
    gap:16px;
    margin-bottom:16px;
  }

  .setup-panel-subtitle {
    font-family:'Barlow Condensed',sans-serif;
    font-weight:500;
    font-size:14px;
    line-height:1.6;
    color:rgba(255,255,255,0.66);
    margin-top:8px;
  }

  .setup-detail {
    border-radius:24px;
    border:1px solid rgba(255,255,255,0.1);
    background:linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
    padding:18px;
  }

  .setup-detail.glow {
    box-shadow:0 0 0 1px rgba(225,6,0,0.12), 0 24px 60px rgba(0,0,0,0.28);
  }

  .setup-section {
    border-radius:24px;
    border:1px solid rgba(255,255,255,0.08);
    background:rgba(255,255,255,0.04);
    padding:18px;
    margin-bottom:16px;
  }

  .setup-section + .setup-section {
    margin-top:14px;
  }

  .setup-section-header {
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
    margin-bottom:14px;
  }

  .setup-section-grid {
    display:grid;
    grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));
    gap:10px;
  }

  .setup-race-config {
    display:grid;
    gap:14px;
  }

  .setup-note {
    margin-top:4px;
    color:rgba(255,255,255,0.52);
    font-size:12px;
    line-height:1.5;
    font-family:'Barlow Condensed',sans-serif;
    font-weight:500;
  }

  .setup-error {
    color:#ff5c5c;
    font-family:'Barlow Condensed',sans-serif;
    font-size:12px;
    letter-spacing:1px;
    font-weight:700;
    text-transform:uppercase;
  }

  .setup-summary {
    display:grid;
    grid-template-columns:repeat(2, minmax(0, 1fr));
    gap:10px;
  }

  .setup-summary-card {
    border-radius:18px;
    border:1px solid rgba(255,255,255,0.08);
    background:rgba(255,255,255,0.04);
    padding:14px 12px;
  }

  .setup-footer {
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:18px;
    padding:16px 18px 20px;
    border-top:1px solid rgba(255,255,255,0.1);
    background:linear-gradient(180deg, rgba(7,8,10,0.12), rgba(7,8,10,0.52));
  }

  @media (max-width: 900px) {
    .setup-header,
    .setup-footer {
      flex-direction:column;
      align-items:stretch;
    }

    .setup-layout {
      grid-template-columns:1fr;
      overflow:auto;
      padding-bottom:12px;
    }

    .setup-column {
      overflow:visible;
    }

    .setup-tyre-grid,
    .setup-style-grid {
      grid-template-columns:1fr;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    * {
      animation-delay: 0s !important;
      animation-duration: 0s !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0s !important;
      scroll-behavior: auto !important;
    }
  }
`;

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function WeatherIcon({ weather, size = 40 }) {
  const stroke = weather === "heavy_rain" ? "#2d7ef7" : weather === "light_rain" ? "#43d17f" : "#f5a623";
  const common = { fill: "none", stroke, strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" };

  if (weather === "dry") {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="9" {...common} fill={`${stroke}22`} />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const r = (deg * Math.PI) / 180;
          const x1 = 24 + Math.cos(r) * 15, y1 = 24 + Math.sin(r) * 15;
          const x2 = 24 + Math.cos(r) * 20, y2 = 24 + Math.sin(r) * 20;
          return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} {...common} />;
        })}
      </svg>
    );
  }

  const heavy = weather === "heavy_rain";
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      {/* cloud */}
      <path
        d="M14 28 a7 7 0 0 1 1.2 -13.9 a9 9 0 0 1 17.2 2.4 a6 6 0 0 1 -1.4 11.5 Z"
        {...common}
        fill={`${stroke}1f`}
      />
      {/* rain drops */}
      {(heavy ? [13, 20, 27, 34] : [17, 26, 33]).map((x, i) => (
        <line key={x} x1={x} y1={32} x2={x - 2.5} y2={heavy ? 42 : 39} {...common} strokeWidth={heavy ? 2.8 : 2.2} opacity={0.9 - i * 0.08} />
      ))}
    </svg>
  );
}

function RedLabel({ children }) {
  return (
    <div style={{
      fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
      fontSize:10, letterSpacing:4, color:"#E10600", marginBottom:12,
      textTransform:"uppercase",
    }}>{children}</div>
  );
}

function BigTitle({ children, style = {} }) {
  return (
    <div style={{
      fontFamily:"'Bebas Neue',sans-serif",
      letterSpacing:2, lineHeight:1, color:"#fff",
      ...style,
    }}>{children}</div>
  );
}

function Divider() {
  return <div style={{ height:1, background:"rgba(255,255,255,0.05)", margin:"0" }} />;
}

function SectionShell({ children }) {
  return (
    <div className="section-shell">
      <TelemetryBar />
      <div className="section-inner">{children}</div>
    </div>
  );
}

function GarageHeader({ eyebrow, title, body, rightContent }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1.1fr) minmax(340px,0.9fr)", gap:32, alignItems:"end", marginBottom:52 }}>
      <div>
        <RedLabel>{eyebrow}</RedLabel>
        <BigTitle style={{ fontSize:"clamp(58px,6vw,96px)", color:"#111", letterSpacing:1.5, marginBottom:18 }}>{title}</BigTitle>
        <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:500, fontSize:18, color:"rgba(17,17,17,0.68)", lineHeight:1.7, maxWidth:620 }}>{body}</p>
      </div>
      <div className="glass-panel" style={{ padding:"30px 32px", alignSelf:"stretch", display:"flex", flexDirection:"column", justifyContent:"space-between", minHeight:190 }}>
        {rightContent}
      </div>
    </div>
  );
}

// ─── TYRE DIAGRAM SVG ─────────────────────────────────────────────────────────
function TyreDiagram({ compound = "M", wear = 100 }) {
  const map = { S: { color:"#FF3333", name:"Soft" }, M: { color:"#FFD700", name:"Medium" }, H: { color:"#EBEBEB", name:"Hard" } };
  const c = map[compound] || map.M;
  const r = 36; const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - wear / 100);
  return (
    <svg width="90" height="90" viewBox="0 0 90 90">
      <circle cx="45" cy="45" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
      <circle cx="45" cy="45" r={r} fill="none" stroke={c.color} strokeWidth="8"
        strokeDasharray={circ} strokeDashoffset={dashOffset}
        strokeLinecap="round"
        style={{ transform:"rotate(-90deg)", transformOrigin:"45px 45px", animation:"tyreRing 1.2s ease forwards" }}
      />
      <text x="45" y="42" textAnchor="middle" fill={c.color}
        style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:1 }}>{compound}</text>
      <text x="45" y="56" textAnchor="middle" fill="rgba(255,255,255,0.3)"
        style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:600, letterSpacing:1 }}>{wear}%</text>
    </svg>
  );
}

// ─── LIVE TELEMETRY TICKER ─────────────────────────────────────────────────────
function TelemetryBar() {
  const data = [
    { label:"CIRCUIT", val:"SPA-FRANCORCHAMPS" },
    { label:"LAPS", val:"44" },
    { label:"GRID", val:"20 DRIVERS" },
    { label:"WEATHER", val:"DRY" },
    { label:"TRACK TEMP", val:"34°C" },
    { label:"AIR TEMP", val:"22°C" },
    { label:"WIND", val:"12 KM/H SW" },
    { label:"MODE", val:"STRATEGY SIM" },
    { label:"VERSION", val:"2025" },
  ];
  return (
    <div style={{
      background:"rgba(0,0,0,0.85)", borderBottom:"1px solid rgba(225,6,0,0.3)",
      height:32, overflow:"hidden", display:"flex", alignItems:"center",
    }}>
      <div style={{
        display:"flex", gap:0, alignItems:"center",
        animation:"none", whiteSpace:"nowrap",
      }}>
        {[...data,...data].map((d,i) => (
          <span key={i} style={{ display:"flex", alignItems:"center", gap:0 }}>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:9, letterSpacing:2.5, color:"rgba(225,6,0,0.9)", padding:"0 12px 0 14px" }}>{d.label}</span>
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:500, fontSize:10, letterSpacing:1.5, color:"rgba(255,255,255,0.55)", paddingRight:14 }}>{d.val}</span>
            <span style={{ width:1, height:14, background:"rgba(255,255,255,0.1)", display:"inline-block", verticalAlign:"middle" }} />
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── GUIDE SECTION ────────────────────────────────────────────────────────────
function GuideSection({ onCreateRoom, onShowJoin }) {
  const steps = [
    {
      num:"01", phase:"PRE-RACE",
      label:"Choose your setup.",
      sub:"Select your tyre compound, fuel load, and car balance. Every variable feeds into the lap time model.",
      detail:["Tyre compound: Soft / Medium / Hard","Fuel load: light for speed, heavy for safety","Downforce: straights vs corners","Suspension: wear rate vs stability"],
    },
    {
      num:"02", phase:"BRIEFING",
      label:"Read the race.",
      sub:"Study track characteristics and opponent tendencies. What strategy will they run? What's your counter?",
      detail:["Sector analysis: fast, medium, slow corners","Tyre wear rate at Spa-Francorchamps","Rain probability: 22% — have a plan","Opponent fuel strategy prediction"],
    },
    {
      num:"03", phase:"STRATEGY",
      label:"Plan your pit windows.",
      sub:"Undercut or overcut? One-stop or two-stop? The timing of your stops defines your race.",
      detail:["Undercut: pit early, gain track position","Overcut: extend stint, opponent pits first","Tyre delta vs position delta trade-off","Safety car probability: ~7% per lap"],
    },
    {
      num:"04", phase:"RACE DAY",
      label:"Adapt in real time.",
      sub:"Weather changes. Safety cars deploy. Rivals make mistakes. Your ability to react is your edge.",
      detail:["Weather: Dry → Light Rain → Heavy Rain","Pit window opens each lap","Sector conditions update live","Every decision is logged and explainable"],
    },
  ];

  const [active, setActive] = useState(0);
  const item = steps[active];

  return (
    <SectionShell>
      <GarageHeader
        eyebrow="How It Works"
        title={<>RACE WEEKEND<br />IN THREE MOVES</>}
        rightContent={
          <>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:3.5, color:"rgba(17,17,17,0.42)", textTransform:"uppercase" }}>Strategy Snapshot</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
              {[{ label:"Tyre Calls", val:"3" }, { label:"Key Phases", val:"4" }, { label:"Race Pace", val:"Live" }].map((stat) => (
                <div key={stat.label} style={{ padding:"18px 16px", borderRadius:18, background:"rgba(19,20,24,0.92)", border:"1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, color:"#fff", lineHeight:1 }}>{stat.val}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:10, letterSpacing:2.4, color:"rgba(255,255,255,0.46)", textTransform:"uppercase", marginTop:6 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </>
        }
      />

      <div style={{ display:"grid", gridTemplateColumns:"0.92fr 1.08fr", gap:32, alignItems:"start" }}>
        <div className="glass-panel" style={{ padding:"26px", display:"grid", gap:18 }}>
          {steps.map((s, i) => (
            <div key={s.num} className="step-item" onClick={() => setActive(i)} style={{ cursor:"pointer", paddingLeft:20 }}>
              <div style={{ display:"grid", gridTemplateColumns:"56px 1fr 24px", gap:16, alignItems:"start" }}>
                <div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:52, color: i === active ? "rgba(225,6,0,0.95)" : "rgba(255,255,255,0.16)", lineHeight:0.9 }}>{s.num}</div>
                </div>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8, flexWrap:"wrap" }}>
                    <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:21, letterSpacing:0.4, color:"#fff" }}>{s.label}</span>
                    <span className="data-tag">{s.phase}</span>
                  </div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:500, fontSize:15, color:"rgba(255,255,255,0.62)", lineHeight:1.6 }}>{s.sub}</div>
                </div>
                <div style={{ color: i === active ? "#E10600" : "rgba(255,255,255,0.16)", fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, paddingTop:2 }}>
                  {i === active ? "▸" : "▹"}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div key={active} className="glass-panel" style={{ padding:"34px 34px 32px", animation:"panelIn 0.3s ease", position:"sticky", top:72 }}>
          <div style={{ display:"flex", gap:8, marginBottom:22, flexWrap:"wrap" }}>
            <span className="data-tag">{item.phase}</span>
            <span className="data-tag">STEP {item.num}</span>
            <span className="data-tag">Spa-Francorchamps</span>
          </div>
          <BigTitle style={{ fontSize:68, color:"#111", marginBottom:18 }}>{item.label.replace(".","")}</BigTitle>
          <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:500, fontSize:18, color:"rgba(17,17,17,0.72)", lineHeight:1.8, marginBottom:26 }}>
            {item.sub}
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:24 }}>
            {item.detail.map((d,i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"18px 16px", borderRadius:18, background:"rgba(22,23,27,0.92)", border:"1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:"#E10600", marginTop:6, flexShrink:0 }} />
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:14, color:"rgba(255,255,255,0.72)", lineHeight:1.5 }}>{d}</span>
              </div>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:28 }}>
            {[{ label:"Window", val:item.num === "03" ? "Lap 12-18" : "Live" }, { label:"Risk", val:item.num === "04" ? "Reactive" : "Measured" }, { label:"Mode", val:"No RNG" }].map((metric) => (
              <div key={metric.label} style={{ padding:"16px 14px", borderRadius:18, background:"linear-gradient(180deg, rgba(17,17,17,0.94), rgba(33,33,33,0.88))", color:"#fff" }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, lineHeight:1, letterSpacing:1 }}>{metric.val}</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:10, letterSpacing:2.4, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", marginTop:6 }}>{metric.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button className="cta-primary" onClick={onCreateRoom}>START A RACE</button>
            <button className="cta-ghost" style={{ color:"#111", borderColor:"rgba(17,17,17,0.14)", background:"rgba(255,255,255,0.5)" }} onClick={onShowJoin}>JOIN EXISTING</button>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

function HowItWorksSection({ onCreateRoom, onShowJoin }) {
  const pillars = [
    {
      tag: "Data Layer",
      title: "FastF1 As Reference",
      body: "Real circuit layouts, tyre benchmarks, and historical pace are used to calibrate baselines, but the race logic itself is custom-built and fully controlled.",
      stats: ["Track baselines", "Sector weighting", "No live telemetry dependency"],
    },
    {
      tag: "Simulation",
      title: "Lap-By-Lap Engine",
      body: "Every lap is split into three sectors, calculated per driver, combined into total lap time, then added to cumulative race time for live position updates.",
      stats: ["Sector 1: Straights", "Sector 2: Medium corners", "Sector 3: Technical"],
    },
    {
      tag: "Outcome Logic",
      title: "Explainable Results",
      body: "The engine keeps randomness minimal so outcomes stay traceable. Wins come from setup, tyre calls, pit timing, weather adaptation, and execution.",
      stats: ["Minimal randomness", "Dynamic positions", "Decision-based results"],
    },
  ];

  const controls = [
    { name:"Tyre Strategy", impact:"Soft, medium, and hard compounds shift pace, wear rate, and grip loss across the stint." },
    { name:"Fuel Load", impact:"Heavier cars start slower, then gain pace gradually as fuel burns away." },
    { name:"Car Setup", impact:"Downforce, suspension, and ride height affect sectors differently and change dry/wet balance." },
    { name:"Driving Style", impact:"Aggressive gains pace but burns tyres faster. Conservative protects the stint." },
    { name:"Pit Strategy", impact:"Stops add time loss, reset tyre wear, and create undercut or overcut opportunities." },
    { name:"Weather System", impact:"Dry, light rain, and heavy rain can flip the best setup and punish wrong tyres." },
  ];

  const modules = [
    "Data Layer",
    "Simulation Engine",
    "Strategy Engine",
    "Weather Engine",
    "Visualization Layer",
  ];

  const equation = [
    "Base Track Time",
    "Tyre Effect",
    "Tyre Wear Penalty",
    "Fuel Weight Penalty",
    "Setup Impact",
    "Weather Impact",
    "Driving Style Modifier",
    "Minor Random Variation",
  ];

  return (
    <SectionShell>
      <GarageHeader
        eyebrow="How It Works"
        title={<>THE STRATEGY<br />ENGINE, EXPLAINED</>}
        body="This section breaks down how the simulator actually thinks: reference data in, sector-based lap calculation, player decisions layered on top, and race outcomes that stay explainable from start to finish."
        rightContent={
          <>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:3.5, color:"rgba(17,17,17,0.42)", textTransform:"uppercase", marginBottom:14 }}>Engine Snapshot</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
              {[
                { label:"Players", val:"20" },
                { label:"Sectors", val:"3" },
                { label:"Weather", val:"Dynamic" },
                { label:"Outcome", val:"Traceable" },
              ].map((stat) => (
                <div key={stat.label} style={{ padding:"18px 16px", borderRadius:18, background:"rgba(19,20,24,0.92)", border:"1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:"#fff", lineHeight:1 }}>{stat.val}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:10, letterSpacing:2.4, color:"rgba(255,255,255,0.46)", textTransform:"uppercase", marginTop:6 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </>
        }
      />

      <div style={{ display:"grid", gridTemplateColumns:"1.08fr 0.92fr", gap:28, alignItems:"start", marginBottom:24 }}>
        <div className="glass-panel" style={{ padding:"30px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,minmax(0,1fr))", gap:16 }}>
            {pillars.map((pillar) => (
              <div key={pillar.title} className="feat-card" style={{ minHeight:320 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                  <span className="data-tag">{pillar.tag}</span>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:"rgba(255,255,255,0.26)", letterSpacing:1.5 }}>SYS</span>
                </div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:22, letterSpacing:0.8, color:"#fff", marginBottom:12, textTransform:"uppercase" }}>{pillar.title}</div>
                <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:500, fontSize:15, color:"rgba(255,255,255,0.62)", lineHeight:1.8, marginBottom:20 }}>{pillar.body}</p>
                <div style={{ display:"grid", gap:10 }}>
                  {pillar.stats.map((stat) => (
                    <div key={stat} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 12px", borderRadius:14, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ width:6, height:6, borderRadius:"50%", background:"#E10600", flexShrink:0 }} />
                      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:13, color:"rgba(255,255,255,0.72)" }}>{stat}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel" style={{ padding:"34px 34px 32px", position:"sticky", top:72 }}>
          <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" }}>
            <span className="data-tag">Lap Time Model</span>
            <span className="data-tag">Minimal RNG</span>
            <span className="data-tag">Explainable</span>
          </div>
          <BigTitle style={{ fontSize:60, color:"#111", marginBottom:16 }}>WHY RESULTS<br />MAKE SENSE</BigTitle>
          <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:500, fontSize:18, color:"rgba(17,17,17,0.72)", lineHeight:1.8, marginBottom:22 }}>
            Each lap is built from a transparent stack of variables. The engine is designed to answer one question after every race: why did this result happen?
          </p>
          <div style={{ display:"grid", gap:10, marginBottom:22 }}>
            {equation.map((part, index) => (
              <div key={part} style={{ display:"grid", gridTemplateColumns:"34px 1fr", alignItems:"center", gap:12, padding:"14px 16px", borderRadius:16, background:index < 7 ? "rgba(22,23,27,0.92)" : "rgba(225,6,0,0.12)", border:"1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:index < 7 ? "#fff" : "#111", lineHeight:1 }}>{index < 7 ? "+" : "±"}</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:15, color:index < 7 ? "rgba(255,255,255,0.74)" : "rgba(17,17,17,0.8)", textTransform:"uppercase", letterSpacing:0.7 }}>{part}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button className="cta-primary" onClick={onCreateRoom}>CREATE LOBBY</button>
            <button className="cta-ghost" style={{ color:"#111", borderColor:"rgba(17,17,17,0.14)", background:"rgba(255,255,255,0.5)" }} onClick={onShowJoin}>JOIN LOBBY</button>
          </div>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
        <div className="glass-panel" style={{ padding:"30px" }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:4, color:"rgba(17,17,17,0.34)", marginBottom:18 }}>PLAYER CONTROL VARIABLES</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            {controls.map((control, index) => (
              <div key={control.name} style={{ padding:"18px 18px 20px", borderRadius:20, background:index % 2 === 0 ? "rgba(22,23,27,0.92)" : "rgba(255,255,255,0.42)", border:"1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:34, lineHeight:1, color:index % 2 === 0 ? "#fff" : "#111", marginBottom:10 }}>{String(index + 1).padStart(2, "0")}</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:18, color:index % 2 === 0 ? "#fff" : "#111", marginBottom:8, textTransform:"uppercase", letterSpacing:0.8 }}>{control.name}</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:500, fontSize:14, lineHeight:1.7, color:index % 2 === 0 ? "rgba(255,255,255,0.66)" : "rgba(17,17,17,0.68)" }}>{control.impact}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel" style={{ padding:"30px" }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:4, color:"rgba(17,17,17,0.34)", marginBottom:18 }}>SYSTEM STRUCTURE</div>
          <div style={{ display:"grid", gap:12, marginBottom:24 }}>
            {modules.map((module, index) => (
              <div key={module} style={{ display:"grid", gridTemplateColumns:"72px 1fr auto", alignItems:"center", gap:16, padding:"16px 18px", borderRadius:18, background:"linear-gradient(180deg, rgba(22,23,27,0.94), rgba(28,29,34,0.92))", border:"1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, color:"rgba(225,6,0,0.95)", lineHeight:1 }}>{String(index + 1).padStart(2, "0")}</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:18, color:"#fff", letterSpacing:0.8, textTransform:"uppercase" }}>{module}</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, color:"rgba(255,255,255,0.4)", letterSpacing:3, textTransform:"uppercase" }}>Active</div>
              </div>
            ))}
          </div>
          <div style={{ padding:"22px 24px", borderRadius:22, background:"linear-gradient(135deg, rgba(225,6,0,0.16) 0%, rgba(231,233,238,0.88) 100%)", border:"1px solid rgba(255,255,255,0.16)" }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:4, color:"rgba(17,17,17,0.38)", marginBottom:10 }}>FINAL OBJECTIVE</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:38, color:"#111", lineHeight:0.95, marginBottom:10 }}>STRATEGIC.<br />CONTROLLED.<br />TRACEABLE.</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:15, color:"rgba(17,17,17,0.7)", lineHeight:1.7 }}>
              Every race outcome should be tied back to player decisions, system weighting, and track context rather than hidden chaos.
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

// ─── FEATURES SECTION ─────────────────────────────────────────────────────────
function FeaturesSection({ onCreateRoom, onShowJoin }) {
  const features = [
    {
      icon:"◉", name:"Tyre Strategy",
      tag:"COMPOUNDS",
      desc:"Soft, Medium, Hard — each with a performance window and degradation curve. Choose wrong and your race falls apart in the final laps.",
      metrics:[{ label:"Soft peak", val:"Laps 1–8" },{ label:"Medium peak", val:"Laps 8–22" },{ label:"Hard range", val:"Up to 45 laps" }],
    },
    {
      icon:"⏱", name:"Pit Timing",
      tag:"UNDERCUT / OVERCUT",
      desc:"One lap can be the difference between P3 and P8. Undercut to gain track position. Overcut if your tyre advantage is real.",
      metrics:[{ label:"Undercut window", val:"±2 laps" },{ label:"Stop time", val:"~2.4s avg" },{ label:"Position risk", val:"HIGH" }],
    },
    {
      icon:"⬡", name:"Fuel Management",
      tag:"WEIGHT DELTA",
      desc:"Every kilogram of excess fuel costs time. Start heavy for margin, start light for pace. It's a calculated bet from lap one.",
      metrics:[{ label:"Weight penalty", val:"~0.03s/kg/lap" },{ label:"Max fuel", val:"110 kg" },{ label:"Race distance", val:"307 km" }],
    },
    {
      icon:"◈", name:"Car Setup",
      tag:"BALANCE",
      desc:"High downforce rewards Eau Rouge. Low downforce wins the Kemmel straight. No single setup is perfect. Choose your compromise.",
      metrics:[{ label:"Sectors", val:"3 types" },{ label:"Setup vars", val:"3 axes" },{ label:"Conflict", val:"ALWAYS" }],
    },
    {
      icon:"◌", name:"Dynamic Weather",
      tag:"CONDITIONS",
      desc:"Rain probability at Spa is 22%. Wrong tyres in wet conditions cost 3–8 seconds per lap. A wet-weather call can win or end your race.",
      metrics:[{ label:"Rain prob", val:"22%" },{ label:"Intermediate delta", val:"+0.8s" },{ label:"Wet delta", val:"+2.1s" }],
    },
    {
      icon:"▣", name:"Sector Simulation",
      tag:"TRACK MODEL",
      desc:"La Source, Kemmel, Pouhon — each sector penalises different setups. A stiff suspension may be fast in Sector 2 and destroy tyres in Sector 3.",
      metrics:[{ label:"S1", val:"Technical" },{ label:"S2", val:"High speed" },{ label:"S3", val:"Mixed" }],
    },
    {
      icon:"▲", name:"Race Logic Engine",
      tag:"DETERMINISTIC",
      desc:"Every lap is calculated. Every result is explainable. There is no dice roll, no luck modifier, no hidden randomness affecting your position.",
      metrics:[{ label:"Variables", val:"12+ per lap" },{ label:"RNG", val:"ZERO" },{ label:"Outcome", val:"EARNED" }],
    },
  ];

  const [hovered, setHovered] = useState(null);

  return (
    <SectionShell>
      <GarageHeader
        eyebrow="Features"
        title={<>A CLEANER<br />PIT-WALL UI</>}
        rightContent={
          <>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:3.5, color:"rgba(17,17,17,0.42)", textTransform:"uppercase", marginBottom:14 }}>Engine Summary</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
              {[{ label:"Physics", val:"Sector" }, { label:"Weather", val:"Dynamic" }, { label:"Results", val:"Earned" }].map((stat) => (
                <div key={stat.label} style={{ padding:"18px 16px", borderRadius:18, background:"rgba(19,20,24,0.92)", border:"1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:"#fff", lineHeight:1 }}>{stat.val}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:10, letterSpacing:2.4, color:"rgba(255,255,255,0.46)", textTransform:"uppercase", marginTop:6 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </>
        }
      />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,minmax(0,1fr))", gap:22 }}>
          {features.map((f, i) => (
            <div
              key={f.name}
              className="feat-card"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Tag */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                <span className="data-tag">{f.tag}</span>
                <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, color: hovered === i ? "#E10600" : "rgba(255,255,255,0.24)", transition:"color 0.2s", letterSpacing:1 }}>{f.icon}</span>
              </div>

              {/* Name */}
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:22, letterSpacing:1, color:"#fff", marginBottom:12, textTransform:"uppercase" }}>{f.name}</div>

              {/* Desc */}
              <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:500, fontSize:15, color:"rgba(255,255,255,0.62)", lineHeight:1.8, marginBottom:24 }}>{f.desc}</p>

              {/* Metrics */}
              <div style={{ display:"flex", gap:10, borderTop:"1px solid rgba(17,17,17,0.06)", paddingTop:16 }}>
                {f.metrics.map((metric) => (
                  <div key={metric.label} style={{ flex:1, padding:"14px 12px", borderRadius:16, background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:"#fff", lineHeight:1 }}>{metric.val}</div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:9, letterSpacing:2, color:"rgba(255,255,255,0.4)", marginTop:6, textTransform:"uppercase" }}>{metric.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

      <div className="glass-panel" style={{ marginTop:24, padding:"20px 22px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:20, flexWrap:"wrap" }}>
        <div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:3, color:"rgba(17,17,17,0.44)", textTransform:"uppercase", marginBottom:6 }}>Experience</div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:16, color:"#111" }}>Every system card now mirrors the landing page instead of fighting it.</div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button className="cta-primary" onClick={onCreateRoom}>CREATE LOBBY</button>
          <button className="cta-ghost" style={{ color:"#111", borderColor:"rgba(17,17,17,0.14)", background:"rgba(255,255,255,0.5)" }} onClick={onShowJoin}>JOIN LOBBY</button>
        </div>
      </div>
    </SectionShell>
  );
}

function AboutSection({ onCreateRoom, onShowJoin }) {
  const principles = [
    { label:"Deterministic Engine", desc:"Every lap is calculated from setup, compound, fuel and track context. Outcomes come from decisions, not hidden randomness." },
    { label:"Strategy First", desc:"The simulator is built around pit windows, tyre life and trade-offs. It rewards planning and punishes vague calls." },
    { label:"Readable Telemetry", desc:"Important variables stay visible so players can understand why a stint worked, stalled, or collapsed." },
  ];

  const stats = [
    { stat:"12+", label:"Variables Per Lap" },
    { stat:"3", label:"Tyre Compounds" },
    { stat:"44", label:"Spa Race Laps" },
    { stat:"0", label:"Luck Modifiers" },
  ];

  return (
    <SectionShell>
      <GarageHeader
        eyebrow="About"
        title={<>BUILT LIKE A<br />RACE BRIEFING</>}
        rightContent={
          <>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:3.5, color:"rgba(17,17,17,0.42)", textTransform:"uppercase", marginBottom:14 }}>Design Notes</div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              {["Glass Panels","High Contrast","Telemetry Cards","Garage Grid"].map((tag) => (
                <span key={tag} className="data-tag">{tag}</span>
              ))}
            </div>
          </>
        }
      />

      <div style={{ display:"grid", gridTemplateColumns:"1.08fr 0.92fr", gap:28, alignItems:"start" }}>
        <div>
          <div className="glass-panel" style={{ padding:"34px 34px 16px" }}>
          <RedLabel>Philosophy</RedLabel>
          <BigTitle style={{ fontSize:68, marginBottom:24, color:"#111" }}>WHY THIS SIM<br />FEELS DIFFERENT</BigTitle>
          <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:500, fontSize:18, color:"rgba(17,17,17,0.68)", lineHeight:1.8, maxWidth:560, marginBottom:40 }}>
            Built for players who enjoy the chess match of Formula 1. The experience focuses on clear trade-offs, visible systems, and race outcomes you can explain lap by lap.
          </p>

          {principles.map((p,i) => (
            <div key={i} style={{ marginBottom:24, padding:"18px 18px 18px 0", borderTop: i === 0 ? "1px solid rgba(17,17,17,0.06)" : "1px solid rgba(17,17,17,0.06)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
                <div style={{ width:20, height:1, background:"#E10600" }} />
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:14, letterSpacing:1.5, color:"#111", textTransform:"uppercase" }}>{p.label}</span>
              </div>
              <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:500, fontSize:13, color:"rgba(17,17,17,0.58)", lineHeight:1.8, paddingLeft:32 }}>{p.desc}</p>
            </div>
          ))}
          </div>

          <div className="glass-panel" style={{ padding:"24px 28px", marginTop:18 }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:9, letterSpacing:3, color:"rgba(17,17,17,0.34)", marginBottom:14 }}>BUILT WITH</div>
            {["React 18","Sector-based physics model","Deterministic race engine","Real F1-inspired strategy loops"].map((t,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom: i < 3 ? "1px solid rgba(17,17,17,0.05)" : "none" }}>
                <div style={{ width:3, height:3, borderRadius:"50%", background:"#E10600" }} />
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:12, color:"rgba(17,17,17,0.54)" }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="glass-panel" style={{ padding:"26px", marginBottom:18 }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:4, color:"rgba(17,17,17,0.3)", marginBottom:20 }}>SYSTEM SPECS</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:8 }}>
            {stats.map(({ stat, label }) => (
              <div key={label} style={{ background:"linear-gradient(180deg, rgba(17,17,17,0.95), rgba(40,40,40,0.92))", borderRadius:18, padding:"30px 26px" }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:50, color:"#fff", letterSpacing:2, lineHeight:1 }}>{stat}</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:9, letterSpacing:3, color:"rgba(255,255,255,0.38)", marginTop:6, textTransform:"uppercase" }}>{label}</div>
              </div>
            ))}
          </div>
          </div>

          <div className="glass-panel" style={{ padding:"28px", marginBottom:18, background:"linear-gradient(135deg,rgba(225,6,0,0.18) 0%, rgba(231,233,238,0.88) 100%)" }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:9, letterSpacing:3, color:"rgba(17,17,17,0.34)", marginBottom:12 }}>AVAILABLE NOW</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:32, color:"#111", letterSpacing:1.5, marginBottom:4 }}>SPA-FRANCORCHAMPS</div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:11, color:"rgba(17,17,17,0.52)", letterSpacing:1 }}>BELGIAN GRAND PRIX  •  7.004 KM  •  44 LAPS  •  2 DRS ZONES</div>
          </div>

          <div style={{ display:"flex", gap:10 }}>
            <button className="cta-primary" onClick={onCreateRoom}>CREATE LOBBY</button>
            <button className="cta-ghost" style={{ color:"#111", borderColor:"rgba(17,17,17,0.14)", background:"rgba(255,255,255,0.5)" }} onClick={onShowJoin}>JOIN LOBBY</button>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

function SetupSlider({
  label,
  value,
  onChange,
  minLabel,
  maxLabel,
  unit = "%",
  disabled = false,
  min = 0,
  max = 100,
  step = 1,
}) {
  return (
    <div className="setup-slider">
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:12, letterSpacing:2.6, color:"rgba(255,255,255,0.72)", textTransform:"uppercase" }}>{label}</div>
        <div style={{ minWidth:62, textAlign:"right", fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:1.2, color:"#fff", lineHeight:1 }}>{value}{unit}</div>
      </div>
      <input
        className="setup-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div style={{ display:"flex", justifyContent:"space-between", fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:10, letterSpacing:2.2, color:"rgba(255,255,255,0.36)", textTransform:"uppercase" }}>
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

function ChoiceRow({ label, value, options, onChange, disabled = false }) {
  return (
    <div className="setup-section">
      <div className="setup-section-header">
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, letterSpacing:2.8, color:"rgba(255,255,255,0.58)", textTransform:"uppercase" }}>{label}</div>
        <div className="setup-chip">{String(value).replace(/_/g, " ")}</div>
      </div>
      <div className="setup-style-grid">
        {options.map((option) => {
          const isActive = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              className={`setup-choice${isActive ? " active" : ""}`}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              style={{
                borderColor: isActive ? "rgba(225,6,0,0.72)" : "rgba(255,255,255,0.12)",
                background: isActive
                  ? "linear-gradient(180deg, rgba(225,6,0,0.22) 0%, rgba(255,255,255,0.04) 100%)"
                  : "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
              }}
            >
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, lineHeight:1, letterSpacing:1.1, color:"#fff", textTransform:"uppercase" }}>
                {option.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DriverSlotCard({ driver, active, onSelect }) {
  return (
    <button
      type="button"
      className={`driver-slot${active ? " active" : ""}`}
      onClick={() => onSelect(driver.id)}
    >
      <div className="driver-strip" style={{ background: driver.type === "waiting" ? "#7b828f" : driver.teamColor }} />
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10 }}>
        <div style={{ minWidth:0, flex:1 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:1, lineHeight:0.95, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {driver.name}
          </div>
          <div style={{ marginTop:4, fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, letterSpacing:1.6, color:"rgba(255,255,255,0.48)", textTransform:"uppercase", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {driver.type === "waiting" ? "Open Seat" : driver.team}
          </div>
        </div>
        <div className={`driver-badge ${driver.type}`}>{driver.status}</div>
      </div>
      <div className="driver-meta">
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, letterSpacing:2.2, color:"rgba(255,255,255,0.42)", textTransform:"uppercase" }}>
          Slot {String(driver.slotIndex).padStart(2, "0")}
        </div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:1.8, color:"rgba(255,255,255,0.72)", textTransform:"uppercase" }}>
          {driver.type === "waiting" ? "Unassigned" : `${driver.tyre} tyre`}
        </div>
      </div>
      <div style={{ marginTop:10, fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:600, letterSpacing:1.6, color:"rgba(255,255,255,0.42)", textTransform:"uppercase" }}>
        {driver.status}
      </div>
    </button>
  );
}

function DriverSetupPanel({ driver, onUpdateDriver }) {
  const disabled = !driver || driver.type === "waiting";

  if (!driver) {
    return (
      <div className="setup-detail glow" style={{ minHeight:340, display:"grid", placeItems:"center", textAlign:"center" }}>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:44, letterSpacing:2, lineHeight:0.95, color:"#fff" }}>No Driver Selected</div>
          <div className="setup-panel-subtitle">Choose a slot from the lineup to edit strategy inputs.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="setup-detail glow">
      <div className="setup-panel-title">
        <div style={{ minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
            <div style={{ width:12, height:12, borderRadius:"50%", background:driver.type === "waiting" ? "#7b828f" : driver.teamColor, boxShadow:`0 0 0 4px ${(driver.type === "waiting" ? "#7b828f" : driver.teamColor)}22` }} />
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, letterSpacing:3.2, color:"#E10600", textTransform:"uppercase" }}>
              Slot {String(driver.slotIndex).padStart(2, "0")}
            </div>
          </div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:42, lineHeight:0.96, letterSpacing:1.2, color:"#fff", marginTop:6 }}>
            {driver.name}
          </div>
          <div className="setup-panel-subtitle">{driver.type === "waiting" ? "Open Seat" : driver.team} • {driver.status}</div>
        </div>
        <div className={`driver-badge ${driver.type}`}>{driver.status}</div>
      </div>

      {driver.type === "waiting" ? (
        <div className="setup-section" style={{ minHeight:220, display:"grid", placeItems:"center", textAlign:"center" }}>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:34, lineHeight:1, color:"#fff" }}>Empty grid slot</div>
            <div className="setup-note">Leave this slot open for multiplayer, or enable bots to backfill the grid automatically.</div>
          </div>
        </div>
      ) : (
        <>
          <div className="setup-chip-row">
            <div className="setup-chip">Tyre {driver.tyre}</div>
            <div className="setup-chip">Fuel {driver.fuel}%</div>
            <div className="setup-chip">ERS {driver.ers}</div>
            <div className="setup-chip">Pit {driver.pitStrategy}</div>
          </div>

          <div className="setup-section">
            <div className="setup-section-header">
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, letterSpacing:2.8, color:"rgba(255,255,255,0.58)", textTransform:"uppercase" }}>Tyre Compound</div>
              <div className="setup-chip">{driver.tyre}</div>
            </div>
            <div className="setup-tyre-grid">
              {TYRE_SETUP_OPTIONS.map((option) => {
                const compoundMeta = TYRE_COMPOUNDS[option.short];
                const isActive = driver.tyre === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`setup-choice${isActive ? " active" : ""}`}
                    disabled={disabled}
                    onClick={() => onUpdateDriver(driver.id, { tyre: option.value })}
                    style={{
                      borderColor: isActive ? compoundMeta.color : "rgba(255,255,255,0.12)",
                      background: isActive
                        ? `linear-gradient(180deg, ${compoundMeta.color}22 0%, rgba(255,255,255,0.05) 100%)`
                        : "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
                    }}
                  >
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:34, lineHeight:1, letterSpacing:1.5, color:compoundMeta.color }}>{option.short}</div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, letterSpacing:2.2, color:"rgba(255,255,255,0.68)", textTransform:"uppercase", marginTop:6 }}>
                      {compoundMeta.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <SetupSlider
            label="Starting Fuel Load"
            value={driver.fuel}
            onChange={(value) => onUpdateDriver(driver.id, { fuel: value })}
            minLabel="Low"
            maxLabel="High"
            disabled={disabled}
            min={0}
            max={100}
            step={1}
          />

          <ChoiceRow
            label="Driving Style"
            value={driver.drivingStyle}
            options={DRIVING_STYLE_OPTIONS}
            onChange={(value) => onUpdateDriver(driver.id, { drivingStyle: value })}
            disabled={disabled}
          />

          <ChoiceRow
            label="ERS Mode"
            value={driver.ers}
            options={ERS_OPTIONS}
            onChange={(value) => onUpdateDriver(driver.id, { ers: value })}
            disabled={disabled}
          />

          <ChoiceRow
            label="Pit Strategy"
            value={driver.pitStrategy}
            options={PIT_STRATEGY_OPTIONS}
            onChange={(value) => onUpdateDriver(driver.id, { pitStrategy: value })}
            disabled={disabled}
          />
        </>
      )}
    </div>
  );
}

function SetupToggle({ label, value, onToggle, onLabel, offLabel, description }) {
  return (
    <button type="button" className={`setup-switch${value ? " active" : ""}`} onClick={() => onToggle(!value)}>
      <div style={{ minWidth:0, textAlign:"left" }}>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:12, letterSpacing:2.2, textTransform:"uppercase" }}>{label}</div>
        {description && <div className="setup-note">{description}</div>}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, letterSpacing:2, textTransform:"uppercase", color:"rgba(255,255,255,0.62)" }}>
          {value ? onLabel : offLabel}
        </div>
        <div className="setup-switch-track">
          <span className="setup-switch-thumb" />
        </div>
      </div>
    </button>
  );
}

function StrategySetupPanel({
  raceState,
  onClose,
  onSelectDriver,
  onUpdateDriver,
  onUpdateRace,
  onConfirmSetup,
  onToggleBots,
  setupError,
}) {
  const setup = raceState.setup || buildSetupState();
  const selectedDriver = setup.drivers.find((driver) => driver.id === setup.selectedDriverId) || setup.drivers[0];
  const occupiedDrivers = setup.drivers.filter((driver) => driver.type !== "waiting");
  const activeCount = occupiedDrivers.length;
  const canConfirm = activeCount > 0 && occupiedDrivers.every((driver) => driver.tyre && driver.fuel !== null && driver.fuel !== undefined);

  return (
    <div className="setup-overlay" onClick={onClose}>
      <div className="setup-shell" onClick={(event) => event.stopPropagation()}>
        <div className="setup-content">
          <div className="setup-header">
            <div style={{ minWidth:0 }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, letterSpacing:4, color:"#E10600", textTransform:"uppercase", marginBottom:8 }}>
                Setup Phase • Step 2 of 3
              </div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(38px, 5vw, 66px)", lineHeight:0.92, letterSpacing:1.5, color:"#fff", marginBottom:10 }}>
                Race Strategy Control
              </div>
              <div style={{ maxWidth:840, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:500, fontSize:16, lineHeight:1.55, color:"rgba(255,255,255,0.72)" }}>
                Set up a full 20-slot grid, click any driver to edit their race plan, and keep the entire setup state live until the race starts.
              </div>
              <div className="setup-flow">
                <span className="setup-flow-pill">01 Create Lobby</span>
                <span className="setup-flow-pill" style={{ background:"rgba(225,6,0,0.16)", borderColor:"rgba(225,6,0,0.28)", color:"#fff" }}>02 Setup</span>
                <span className="setup-flow-pill">03 Confirm & Race</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close setup panel"
              style={{ width:42, height:42, borderRadius:"50%", border:"1px solid rgba(255,255,255,0.18)", background:"rgba(255,255,255,0.06)", color:"#fff", fontSize:22, lineHeight:1, cursor:"pointer", flexShrink:0 }}
            >
              ×
            </button>
          </div>

          <div className="setup-layout">
            <div className="setup-column">
              <div className="setup-card" style={{ marginBottom:18 }}>
                <div className="setup-section-header" style={{ marginBottom:10 }}>
                  <div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:3, color:"#E10600", textTransform:"uppercase", marginBottom:8 }}>Circuit Info</div>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, lineHeight:1, color:"#fff" }}>SPA-FRANCORCHAMPS</div>
                    <div className="setup-note">Belgian Grand Prix • 7.004 km • 19 turns • 44 laps</div>
                  </div>
                  <div className="setup-chip">High Speed</div>
                </div>

                <div style={{
                  borderRadius:24,
                  background:"linear-gradient(180deg, #ffffff 0%, #f3f4f8 100%)",
                  border:"1px solid rgba(255,255,255,0.16)",
                  boxShadow:"inset 0 1px 0 rgba(255,255,255,0.9), 0 18px 40px rgba(0,0,0,0.2)",
                  padding:16,
                }}>
                  <img
                    src={spaMapImageSrc}
                    alt="Spa-Francorchamps track map"
                    style={{
                      width:"100%",
                      height:"auto",
                      display:"block",
                      objectFit:"contain",
                      background:"#fff",
                      borderRadius:18,
                      filter:"contrast(1.55) brightness(1.08) saturate(0.95) drop-shadow(0 14px 28px rgba(0,0,0,0.18))",
                    }}
                  />
                </div>

                <div className="setup-summary">
                  <div className="setup-summary-card">
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, color:"#fff", lineHeight:1 }}>20</div>
                    <div className="setup-note">Total grid slots</div>
                  </div>
                  <div className="setup-summary-card">
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, color:"#fff", lineHeight:1 }}>{activeCount}</div>
                    <div className="setup-note">Active drivers</div>
                  </div>
                </div>
              </div>

              <div className="setup-card">
                <div className="setup-section-header" style={{ marginBottom:10 }}>
                  <div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:3, color:"#E10600", textTransform:"uppercase", marginBottom:8 }}>Grid Lineup</div>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, lineHeight:1, color:"#fff" }}>Clickable Driver Slots</div>
                  </div>
                  <div className="setup-chip">20 Cards</div>
                </div>
                <div className="setup-lineup">
                  {setup.drivers.map((driver) => (
                    <DriverSlotCard
                      key={driver.id}
                      driver={driver}
                      active={driver.id === setup.selectedDriverId}
                      onSelect={onSelectDriver}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="setup-column">
              <DriverSetupPanel driver={selectedDriver} onUpdateDriver={onUpdateDriver} />
            </div>

            <div className="setup-column">
              <div className="setup-card">
                <div className="setup-section-header" style={{ marginBottom:10 }}>
                  <div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:3, color:"#E10600", textTransform:"uppercase", marginBottom:8 }}>Race Config</div>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, lineHeight:1, color:"#fff" }}>Global Setup</div>
                  </div>
                  <div className="setup-chip">Live</div>
                </div>

                <div className="setup-race-config">
                  <SetupSlider
                    label="Laps"
                    value={setup.race.laps}
                    onChange={(value) => onUpdateRace({ laps: value })}
                    minLabel="Sprint"
                    maxLabel="Endurance"
                    unit=""
                    min={1}
                    max={70}
                    step={1}
                  />

                  <ChoiceRow
                    label="Weather Strategy"
                    value={setup.race.weatherStrategy}
                    options={WEATHER_STRATEGY_OPTIONS}
                    onChange={(value) => onUpdateRace({ weatherStrategy: value })}
                  />

                  <SetupSlider
                    label="Safety Car Probability"
                    value={setup.race.safetyCarProbability}
                    onChange={(value) => onUpdateRace({ safetyCarProbability: value })}
                    minLabel="Low"
                    maxLabel="High"
                    min={0}
                    max={100}
                    step={1}
                  />

                  <ChoiceRow
                    label="Race Pace Mode"
                    value={setup.race.paceMode}
                    options={RACE_PACE_OPTIONS}
                    onChange={(value) => onUpdateRace({ paceMode: value })}
                  />

                  <SetupToggle
                    label="Bots"
                    value={setup.race.bots}
                    onToggle={onToggleBots}
                    onLabel="On"
                    offLabel="Off"
                    description={setup.race.bots ? "Remaining slots are filled by AI drivers." : "Unused slots stay open for waiting players."}
                  />

                  <div className="setup-section">
                    <div className="setup-section-header">
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, letterSpacing:2.8, color:"rgba(255,255,255,0.58)", textTransform:"uppercase" }}>Setup Summary</div>
                      <div className="setup-chip">{activeCount}/20 Active</div>
                    </div>
                    <div className="setup-summary">
                      <div className="setup-summary-card">
                        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:"#fff" }}>{setup.race.weatherStrategy}</div>
                        <div className="setup-note">Weather strategy</div>
                      </div>
                      <div className="setup-summary-card">
                        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:"#fff" }}>{setup.race.paceMode}</div>
                        <div className="setup-note">Pace mode</div>
                      </div>
                    </div>
                    <div className="setup-note" style={{ marginTop:12 }}>
                      {setup.race.bots ? "Bots are filling the grid, so the race can start immediately when the setup is valid." : "Bots are off, so extra slots can remain open for additional human players."}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="setup-footer">
            <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"center" }}>
              <div className="setup-chip">Step {setup.flowStep}/3</div>
              <div className="setup-chip">Grid Slots 20</div>
              <div className="setup-chip">Active {activeCount}</div>
              <div className="setup-chip">Weather {setup.race.weatherStrategy}</div>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:8, minWidth:280, alignItems:"flex-end" }}>
              {setupError && <div className="setup-error">{setupError}</div>}
              <div style={{ display:"flex", gap:12, flexWrap:"wrap", justifyContent:"flex-end" }}>
                <button type="button" className="cta-ghost" onClick={onClose}>Back</button>
                <button type="button" className="cta-primary" onClick={onConfirmSetup} disabled={!canConfirm} style={{ opacity: canConfirm ? 1 : 0.45, cursor: canConfirm ? "pointer" : "not-allowed" }}>
                  Confirm &amp; Race
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── POST-RACE RESULTS ───────────────────────────────────────────────────────
function PostRaceResults({ raceState, onBackToLobby }) {
  const sortedPlayers = raceState.players.slice().sort((a, b) => a.position - b.position);
  const leader = sortedPlayers[0];
  const setupDriversById = new Map((raceState.setup?.drivers || []).map((driver) => [driver.id, driver]));
  const winner = sortedPlayers[0];
  const fastestLap = sortedPlayers.reduce((best, driver) => {
    if (!Number.isFinite(driver.currentLapTime)) {
      return best;
    }

    if (!best || driver.currentLapTime < best.time) {
      return { driver, time: driver.currentLapTime };
    }

    return best;
  }, null);
  const weatherLabel = String(raceState.weather).replace(/_/g, " ");
  const driverOfTheDay = sortedPlayers.reduce((best, driver) => {
    const startingSlot = setupDriversById.get(driver.id)?.slotIndex ?? driver.position;
    const gainedPlaces = startingSlot - driver.position;
    const paceBonus = fastestLap?.driver?.id === driver.id ? 1 : 0;
    const strategyBonus = driver.pitCount === 1 ? 0.5 : 0;
    const score = gainedPlaces * 3 + paceBonus + strategyBonus - (driver.position - 1) * 0.2;

    if (!best || score > best.score) {
      return { driver, score, startingSlot, gainedPlaces };
    }

    return best;
  }, null);
  const highlightItems = [
    ...(fastestLap ? [{
      id: `fastest-${fastestLap.driver.id}`,
      lap: raceState.totalLaps,
      title: "Fastest Lap",
      detail: `${fastestLap.driver.name} set ${fastestLap.time.toFixed(3)}s`,
      accent: "#b66dff",
    }] : []),
    ...raceState.events
      .filter((event) => ["undercut", "overcut", "pit_stop", "weather_change"].includes(event.type))
      .slice(-6)
      .map((event) => ({
        id: `${event.type}-${event.playerId}-${event.lap}`,
        lap: event.lap,
        title:
          event.type === "pit_stop"
            ? "Pit Stop"
            : event.type === "undercut"
              ? "Undercut"
              : event.type === "overcut"
                ? "Overcut"
                : "Weather Change",
        detail:
          event.type === "weather_change"
            ? `${String(event.title || event.to || "weather change").replace(/_/g, " ")} • lap ${event.lap}`
            : `${sortedPlayers.find((driver) => driver.id === event.playerId)?.name || event.playerId} • lap ${event.lap}`,
        accent:
          event.type === "pit_stop"
            ? "#f4c542"
            : event.type === "undercut"
              ? "#38c97a"
              : event.type === "overcut"
                ? "#59a8ff"
                : "#6d7dff",
      })),
  ]
    .sort((a, b) => b.lap - a.lap)
    .slice(0, 5);

  const winnerTeamColor = winner ? (TEAMS[winner.team]?.color || "#E10600") : "#E10600";
  const formatLapTime = (value) => (Number.isFinite(value) ? `${value.toFixed(3)}s` : "--");
  const podiumAccent = ["var(--f1-red)", "#B6BABD", "#C58D56"];

  // Premium light frosted container panel
  const glassPanel = {
    background: "rgba(255, 255, 255, 0.75)",
    border: "1px solid rgba(255, 255, 255, 0.5)",
    borderRadius: 30,
    boxShadow: "0 30px 80px rgba(0,0,0,0.06)",
    backdropFilter: "blur(20px)",
  };
  // Dark inner card
  const darkCard = {
    background: "rgba(12, 14, 18, 0.85)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    borderRadius: 22,
    boxShadow: "0 22px 60px rgba(0,0,0,0.16)",
  };
  const darkStat = {
    padding: "18px 16px",
    borderRadius: 18,
    background: "rgba(19, 20, 24, 0.92)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  };
  const eyebrow = { fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: 4, color: "var(--f1-red)", textTransform: "uppercase" };
  const sectionLabel = { fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: 4, color: "rgba(17, 17, 17, 0.34)", textTransform: "uppercase" };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:400, overflowY:"auto", color:"#111", fontFamily:"'Barlow Condensed',sans-serif",
      background:`rgba(241, 243, 246, 0.95) url(${pitGarageImageSrc}) center center / cover no-repeat` }}>
      {/* Grid overlay + accent */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", backgroundImage:"linear-gradient(90deg, rgba(17,17,17,0.05) 1px, transparent 1px), linear-gradient(rgba(17,17,17,0.04) 1px, transparent 1px)", backgroundSize:"56px 56px", opacity:0.5 }} />
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", background:"radial-gradient(circle at top left, rgba(225,6,0,0.06), transparent 28%)" }} />

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"56px 24px 64px", position:"relative", zIndex:1 }}>

        {/* ── HEADER ── */}
        <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1.1fr) minmax(340px,0.9fr)", gap:32, alignItems:"end", marginBottom:30 }}>
          <div>
            <div style={{ ...eyebrow, marginBottom:14 }}>Race Complete</div>
            <BigTitle style={{ fontSize:"clamp(58px,6.5vw,104px)", color:"#111", letterSpacing:1.5, marginBottom:18 }}>CHECKERED<br/>FLAG</BigTitle>
            <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:500, fontSize:18, color:"rgba(17,17,17,0.68)", lineHeight:1.7, maxWidth:560 }}>
              {winner?.name || "The field"} takes the win at Spa-Francorchamps after {raceState.totalLaps} laps. Full classification, strategy, and your setup impact below.
            </p>
          </div>
          <div style={{ ...glassPanel, padding:"26px 26px 24px" }}>
            <div style={{ ...sectionLabel, marginBottom:14 }}>Race Snapshot</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
              {[
                { val:`${raceState.totalLaps}`, label:"Laps" },
                { val:winner ? `${winner.pitCount}` : "--", label:"Winner Stops" },
                { val:weatherLabel.split(" ")[0].toUpperCase(), label:"Weather" },
                { val: fastestLap ? `${fastestLap.time.toFixed(1)}` : "--", label:"Fastest" },
              ].map((s) => (
                <div key={s.label} style={darkStat}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, color:"#fff", lineHeight:1 }}>{s.val}</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:9, letterSpacing:2, color:"rgba(255,255,255,0.46)", textTransform:"uppercase", marginTop:6 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── WINNER SPOTLIGHT ── */}
        <div style={{ ...glassPanel, padding:"30px", marginBottom:24 }}>
          <div style={{ ...darkCard, position:"relative", overflow:"hidden", padding:"30px 32px", borderTop:`4px solid ${winnerTeamColor}` }}>
            <div style={{ position:"relative", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16, flexWrap:"wrap" }}>
              <div>
                <span className="data-tag" style={{ background:"rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.7)", borderColor:"rgba(255,255,255,0.12)" }}>Winner Spotlight</span>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:58, color:"#fff", lineHeight:0.9, letterSpacing:1.2, marginTop:14 }}>{winner?.name || "--"}</div>
                <div style={{ marginTop:8, fontWeight:700, fontSize:12, letterSpacing:2.2, color:winnerTeamColor, textTransform:"uppercase" }}>{winner?.team || "Race Winner"}</div>
              </div>
              <div style={{ minWidth:84, height:84, borderRadius:20, background:winnerTeamColor, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:42, color:"#fff", fontWeight:700 }}>P1</div>
            </div>
            <div style={{ position:"relative", display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginTop:22 }}>
              {[
                { label:"Race Time", value:winner ? `${winner.totalTime.toFixed(3)}s` : "--" },
                { label:"Fastest Lap", value: fastestLap ? formatLapTime(fastestLap.time) : "--" },
                { label:"Pit Stops", value:winner ? `${winner.pitCount}` : "--" },
                { label:"Started", value:`P${setupDriversById.get(winner?.id)?.slotIndex ?? winner?.position ?? 1}` },
              ].map((item) => (
                <div key={item.label} style={{ padding:"13px 14px", borderRadius:14, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:9, letterSpacing:2, color:"rgba(255,255,255,0.42)", textTransform:"uppercase" }}>{item.label}</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:25, color:"#fff", lineHeight:1, marginTop:8, letterSpacing:1 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Podium row */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginTop:16 }}>
            {sortedPlayers.slice(0, 3).map((driver, i) => {
              const teamColor = TEAMS[driver.team]?.color || "var(--f1-red)";
              return (
                <div key={driver.id} style={{
                  ...darkCard,
                  position:"relative",
                  overflow:"hidden",
                  padding:"24px 22px",
                  textAlign:"center",
                  border:`1px solid ${i === 0 ? "rgba(225,6,0,0.3)" : "rgba(255,255,255,0.08)"}`,
                  borderTop:`4px solid ${teamColor}`
                }}>
                  <div style={{ position:"relative", fontFamily:"'Bebas Neue',sans-serif", fontSize:44, color:podiumAccent[i], lineHeight:1 }}>P{i + 1}</div>
                  <div style={{ position:"relative", fontFamily:"'Bebas Neue',sans-serif", fontSize:26, color:"#fff", letterSpacing:1, marginTop:8 }}>{driver.name}</div>
                  <div style={{ position:"relative", fontWeight:600, fontSize:11, letterSpacing:2, color:"rgba(255,255,255,0.46)", marginTop:6, textTransform:"uppercase" }}>
                    {driver.totalTime.toFixed(1)}s &bull; {driver.pitCount} stop{driver.pitCount !== 1 ? "s" : ""}
                  </div>
                  {!driver.isBot && <div style={{ position:"relative", marginTop:9, padding:"4px 11px", borderRadius:999, background:"rgba(225,6,0,0.18)", color:"#ff6a5d", fontWeight:700, fontSize:10, letterSpacing:2, display:"inline-block" }}>YOU</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CLASSIFICATION ── */}
        <div style={{ ...glassPanel, padding:"30px", marginBottom:24 }}>
          <div style={{ ...sectionLabel, marginBottom:18 }}>Final Classification</div>
          <div style={{ ...darkCard, overflow:"hidden", boxShadow:"none" }}>
            <div style={{ display:"grid", gridTemplateColumns:"58px 1.6fr 1fr 1fr 64px 56px 1.2fr", gap:14, padding:"14px 22px", borderBottom:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.4)", fontSize:10, fontWeight:700, letterSpacing:2, textTransform:"uppercase" }}>
              <div>Pos</div><div>Driver</div><div>Gap</div><div>Best Lap</div><div>Pits</div><div>Tyre</div><div>Stint</div>
            </div>
            {sortedPlayers.map((driver, idx) => {
              const gap = driver.position === 1 ? "LEADER" : `+${(driver.totalTime - leader.totalTime).toFixed(1)}s`;
              const bestLapLabel = fastestLap?.driver?.id === driver.id ? fastestLap.time.toFixed(3) : driver.currentLapTime.toFixed(3);
              const stintLabel = (driver.stintHistory || [{ compound: driver.tyre }]).map((stint) => stint.compound).join(" → ");
              const isFastest = fastestLap?.driver?.id === driver.id;
              return (
                <div key={driver.id} style={{
                  display:"grid", gridTemplateColumns:"58px 1.6fr 1fr 1fr 64px 56px 1.2fr",
                  alignItems:"center", gap:14, padding:"13px 22px",
                  borderBottom: idx < sortedPlayers.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  background: !driver.isBot ? "linear-gradient(90deg, rgba(225,6,0,0.14) 0%, transparent 62%)" : "transparent",
                  boxShadow: `inset 3px 0 0 ${driver.position === 1 ? "#E10600" : driver.position === 2 ? "rgba(255,255,255,0.4)" : driver.position === 3 ? "#C58D56" : "transparent"}`,
                }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, color:"rgba(255,255,255,0.85)" }}>{driver.position}</div>
                  <div>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:21, color:"#fff", letterSpacing:1 }}>
                      {driver.name} {!driver.isBot && <span style={{ color:"#ff6a5d", fontSize:12 }}>&#9733;</span>}
                    </div>
                    <div style={{ fontWeight:600, fontSize:10, letterSpacing:1.5, color:TEAMS[driver.team]?.color ? `${TEAMS[driver.team].color}dd` : "rgba(255,255,255,0.36)", textTransform:"uppercase" }}>
                      {driver.team || (driver.isBot ? "BOT" : "PLAYER")} · Grid {setupDriversById.get(driver.id)?.slotIndex ?? driver.position}
                    </div>
                  </div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:"rgba(255,255,255,0.6)" }}>{gap}</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:isFastest ? "#c79bff" : "rgba(255,255,255,0.82)" }}>{bestLapLabel}s</div>
                  <div style={{ fontWeight:700, fontSize:13, color:"rgba(255,255,255,0.56)" }}>{driver.pitCount}</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:17, letterSpacing:1, color:TYRE_COMPOUNDS[driver.tyre]?.color || "#fff" }}>{driver.tyre}</div>
                  <div style={{ fontWeight:700, fontSize:11, letterSpacing:1.2, color:"rgba(255,255,255,0.5)", textTransform:"uppercase" }}>{stintLabel}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── STRATEGY TIMELINE ── */}
        <div style={{ ...glassPanel, padding:"30px", marginBottom:24 }}>
          <div style={{ ...sectionLabel, marginBottom:18 }}>Strategy Timeline</div>
          {sortedPlayers.map((driver) => {
            const stints = driver.stintHistory || [{ compound: driver.tyre, startLap: 0 }];
            return (
              <div key={driver.id} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:9 }}>
                <div style={{ width:128, fontFamily:"'Bebas Neue',sans-serif", fontSize:15, color: !driver.isBot ? "var(--f1-red)" : "rgba(255,255,255,0.78)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{driver.name}</div>
                <div style={{ flex:1, display:"flex", height:22, borderRadius:999, overflow:"hidden", background:"rgba(19,20,24,0.9)", border:"1px solid rgba(255,255,255,0.1)" }}>
                  {stints.map((stint, i) => {
                    const endLap = stint.endLap || raceState.totalLaps;
                    const width = ((endLap - stint.startLap) / raceState.totalLaps) * 100;
                    const tyreColor = TYRE_COMPOUNDS[stint.compound]?.color || "#888";
                    return (
                      <div key={i} style={{
                        width:`${width}%`, background:`${tyreColor}44`,
                        borderRight: i < stints.length - 1 ? "2px solid rgba(0,0,0,0.55)" : "none",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontFamily:"'Bebas Neue',sans-serif", fontSize:12, color:tyreColor, letterSpacing:1,
                      }}>
                        {width > 8 ? stint.compound : ""}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:10, fontWeight:600, fontSize:9, letterSpacing:2, color:"rgba(255,255,255,0.4)" }}>
            <span>LAP 0</span><span>LAP {raceState.totalLaps}</span>
          </div>
        </div>

        {/* ── HIGHLIGHTS + DRIVER OF THE DAY ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(320px, 1fr))", gap:24, marginBottom:24 }}>
          <div style={{ ...glassPanel, padding:"30px" }}>
            <div style={{ ...sectionLabel, marginBottom:18 }}>Race Highlights</div>
            {highlightItems.length === 0 ? (
              <div style={{ color:"rgba(255,255,255,0.5)", fontWeight:600, fontSize:14 }}>No major highlights recorded.</div>
            ) : (
              highlightItems.map((item, i) => (
                <div key={item.id} style={{ display:"grid", gridTemplateColumns:"70px 1fr auto", gap:14, alignItems:"center", padding:"13px 0", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:"rgba(255,255,255,0.46)" }}>LAP {item.lap}</div>
                  <div>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:23, color:"#fff", lineHeight:0.95 }}>{item.title}</div>
                    <div style={{ marginTop:4, fontWeight:600, fontSize:13, color:"rgba(255,255,255,0.6)" }}>{item.detail}</div>
                  </div>
                  <div style={{ width:11, height:11, borderRadius:"50%", background:item.accent, boxShadow:`0 0 0 5px ${item.accent}22` }} />
                </div>
              ))
            )}
          </div>

          <div style={{ ...glassPanel, padding:"30px" }}>
            <div style={{ ...sectionLabel, marginBottom:18 }}>Driver Of The Day</div>
            {driverOfTheDay && (
              <div style={{ ...darkCard, position:"relative", overflow:"hidden", padding:"24px" }}>
                <div style={{ position:"absolute", inset:0, background:"radial-gradient(circle at top right, rgba(182,109,255,0.2) 0%, transparent 48%)", pointerEvents:"none" }} />
                <div style={{ position:"relative", fontFamily:"'Bebas Neue',sans-serif", fontSize:42, color:"#fff", lineHeight:0.92, marginBottom:8 }}>{driverOfTheDay.driver.name}</div>
                <div style={{ position:"relative", fontWeight:700, fontSize:12, letterSpacing:2.4, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", marginBottom:18 }}>
                  Grid {driverOfTheDay.startingSlot} → Finish P{driverOfTheDay.driver.position}
                </div>
                <div style={{ position:"relative", display:"grid", gap:10 }}>
                  {[
                    { label:"Places Gained", value: `${driverOfTheDay.gainedPlaces >= 0 ? "+" : ""}${driverOfTheDay.gainedPlaces}` },
                    { label:"Pit Stops", value: `${driverOfTheDay.driver.pitCount}` },
                    { label:"Final Time", value: `${driverOfTheDay.driver.totalTime.toFixed(3)}s` },
                  ].map((item) => (
                    <div key={item.label} style={{ padding:"12px 14px", borderRadius:14, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.07)", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:9, letterSpacing:2, color:"rgba(255,255,255,0.42)", textTransform:"uppercase" }}>{item.label}</div>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, color:"#fff", lineHeight:1 }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── SETUP IMPACT ── */}
        <div style={{ ...glassPanel, padding:"30px", marginBottom:30 }}>
          <div style={{ ...sectionLabel, marginBottom:18 }}>Your Setup Impact</div>
          {(() => {
            const user = raceState.players.find(p => !p.isBot);
            if (!user) return <div style={{ color:"rgba(255,255,255,0.5)", fontWeight:600, fontSize:14 }}>No player car in this session.</div>;
            const items = [
              { label:"Starting Tyre", value:user.stintHistory?.[0]?.compound || "M", desc:"Your initial compound choice shaped early pace" },
              { label:"Downforce", value:`${user.setup.downforce}%`, desc: user.setup.downforce > 60 ? "High grip in corners, slower on straights" : user.setup.downforce < 40 ? "Low drag on straights, less corner grip" : "Balanced aero package" },
              { label:"Driving Style", value:user.drivingStyle, desc: user.drivingStyle === "aggressive" ? "Faster laps but higher tyre wear" : user.drivingStyle === "conservative" ? "Preserved tyres but slower pace" : "Even balance of pace and wear" },
              { label:"Final Position", value:`P${user.position}`, desc:`Finished ${user.position === 1 ? "on top" : `${user.totalTime > leader.totalTime ? `+${(user.totalTime - leader.totalTime).toFixed(1)}s behind` : "as leader"}`}` },
            ];
            return (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))", gap:14 }}>
                {items.map((item, i) => (
                  <div key={i} style={{ ...darkCard, padding:"18px 18px 20px", boxShadow:"none" }}>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:2, color:"rgba(255,255,255,0.42)", textTransform:"uppercase", marginBottom:10 }}>{item.label}</div>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, color:"#fff", letterSpacing:1, lineHeight:1, marginBottom:10, textTransform:"uppercase" }}>{item.value}</div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:500, fontSize:13, lineHeight:1.6, color:"rgba(255,255,255,0.62)" }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        <div style={{ textAlign:"center" }}>
          <button type="button" className="cta-primary" onClick={onBackToLobby} style={{ padding:"16px 48px", fontSize:14, borderRadius:6 }}>
            BACK TO LOBBY
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN LANDING PAGE EXPORT ─────────────────────────────────────────────────
export function LandingPage({
  onCreateRoom,
  onJoinRoom,
  pitGarageSrc = pitGarageImageSrc,
  f1LogoSrc = f1LogoImageSrc,
}) {
  const [raceState, setRaceState] = useState(() => createInitialRaceState());
  const [activeSection, setActiveSection] = useState("home");
  const [showResults, setShowResults] = useState(false);
  const [botsEnabled, setBotsEnabled] = useState(true);
  const [setupError, setSetupError] = useState("");
  const [weatherBanner, setWeatherBanner] = useState(null);
  const [startLightsCount, setStartLightsCount] = useState(0);
  const [startLightsVisible, setStartLightsVisible] = useState(false);
  const [startLightsGo, setStartLightsGo] = useState(false);
  const [lightsOut, setLightsOut] = useState(false);
  const [finishTransitionVisible, setFinishTransitionVisible] = useState(false);
  const prevRacePhaseRef = useRef(null);
  const lastWeatherBannerIdRef = useRef(null);

  // ── LOBBY STATE ──
  const [lobby, setLobby] = useState(null);
  const [screen, setScreen] = useState("landing"); // "landing" | "lobby-room"

  // Create lobby form
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createUsername, setCreateUsername] = useState("");
  const [createError, setCreateError] = useState("");

  // Join lobby form
  const [showJoin, setShowJoin] = useState(false);
  const [joinLobbyName, setJoinLobbyName] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [joinUsername, setJoinUsername] = useState("");
  const [joinError, setJoinError] = useState("");
  const [raceSpeed, setRaceSpeed] = useState(1);
  useRaceController(raceState, setRaceState, raceSpeed, lightsOut);
  const { requestPit, selectPitTyre } = usePitSystem(setRaceState);
  const finishWinner = raceState.players.slice().sort((a, b) => a.position - b.position)[0];
  const finishWinnerLabel = finishWinner ? `Winner ${finishWinner.name}` : "Winner Pending";

  const syncSetupState = (previousState, nextSetup) => ({
    ...previousState,
    setup: nextSetup,
    players: buildActivePlayersFromSetup(nextSetup),
    totalLaps: nextSetup.race.laps,
    weather: WEATHER_TO_RACE_WEATHER[nextSetup.race.weatherStrategy] || "dry",
  });

  const rebuildSetupDriversForBots = (drivers, includeBots) => {
    const humanCount = drivers.filter((driver) => driver.type === "player").length || 1;

    return drivers.map((driver, index) => {
      if (driver.type === "player") {
        return driver;
      }

      if (!includeBots) {
        return {
          ...driver,
          type: "waiting",
          status: "Waiting",
        };
      }

      const profile = AI_DRIVER_POOL[(index - humanCount + AI_DRIVER_POOL.length) % AI_DRIVER_POOL.length];
      return {
        ...driver,
        id: driver.type === "waiting" ? profile.id : driver.id,
        name: driver.type === "waiting" ? profile.name : driver.name,
        team: driver.type === "waiting" ? profile.team : driver.team,
        teamColor: driver.type === "waiting" ? (TEAMS[profile.team]?.color || driver.teamColor) : driver.teamColor,
        type: "ai",
        status: "AI",
        tyre: driver.tyre ?? profile.tyre,
        fuel: driver.fuel ?? profile.fuel,
        drivingStyle: driver.drivingStyle ?? profile.drivingStyle,
        ers: driver.ers ?? profile.ers,
        pitStrategy: driver.pitStrategy ?? profile.pitStrategy,
      };
    });
  };

  const handleOpenSetup = () => {
    setSetupError("");
    setRaceState((previousState) => ({
      ...previousState,
      racePhase: "setup",
      setup: {
        ...previousState.setup,
        race: {
          ...previousState.setup?.race,
          bots: botsEnabled,
        },
      },
    }));
    setActiveSection("home");
  };

  const handleCloseSetup = () => {
    setSetupError("");
    setRaceState((previousState) => ({
      ...previousState,
      racePhase: "lobby",
    }));
  };

  const handleSelectDriver = (driverId) => {
    setRaceState((previousState) => ({
      ...previousState,
      setup: {
        ...previousState.setup,
        selectedDriverId: driverId,
      },
    }));
  };

  const handleUpdateDriver = (driverId, updates) => {
    setRaceState((previousState) => {
      const nextSetup = {
        ...previousState.setup,
        drivers: previousState.setup.drivers.map((driver) => (
          driver.id === driverId ? { ...driver, ...updates } : driver
        )),
      };

      if (nextSetup.selectedDriverId !== driverId && nextSetup.selectedDriverId == null) {
        nextSetup.selectedDriverId = driverId;
      }

      return syncSetupState(previousState, nextSetup);
    });
  };

  const handleUpdateRace = (updates) => {
    setRaceState((previousState) => {
      const nextSetup = {
        ...previousState.setup,
        race: {
          ...previousState.setup.race,
          ...updates,
        },
      };

      return syncSetupState(previousState, nextSetup);
    });
  };

  const handleConfirmSetup = () => {
    setRaceState((previousState) => {
      const setup = previousState.setup || buildSetupState();
      const activeDrivers = setup.drivers.filter((driver) => driver.type !== "waiting");
      const hasValidTyreFuel = activeDrivers.length > 0 && activeDrivers.every((driver) => driver.tyre && driver.fuel !== null && driver.fuel !== undefined);

      if (!hasValidTyreFuel) {
        setSetupError("At least one driver needs tyre compound and fuel assigned.");
        return previousState;
      }

      setSetupError("");
      setShowResults(false);

      return syncRaceStateCalculations({
        ...syncSetupState(previousState, setup),
        racePhase: "racing",
        players: buildActivePlayersFromSetup(setup).map((player) => ({
          ...player,
          setupLocked: true,
        })),
        weather: WEATHER_TO_RACE_WEATHER[setup.race.weatherStrategy] || "dry",
        weatherBias: WEATHER_TO_BIAS[setup.race.weatherStrategy] || 1,
        rngSeed: (Math.floor(Math.random() * 2147483647) | 0) || 1,
        totalLaps: setup.race.laps,
      });
    });
  };

  const handleStartSetup = () => {
    const username = lobby?.players?.[0]?.username || "Player";
    const newState = createInitialRaceState(username, botsEnabled, lobby?.players || []);
    setRaceState({
      ...newState,
      racePhase: "setup",
      setup: {
        ...newState.setup,
        race: {
          ...newState.setup.race,
          bots: botsEnabled,
        },
      },
      players: buildActivePlayersFromSetup({
        ...newState.setup,
        race: {
          ...newState.setup.race,
          bots: botsEnabled,
        },
      }),
    });
    setSetupError("");
    setScreen("landing");
  };

  const handleBackToLobby = () => {
    setShowResults(false);
    const username = lobby?.players?.[0]?.username || "Player";
    setRaceState(createInitialRaceState(username, botsEnabled, lobby?.players || []));
    setSetupError("");
    setScreen(lobby ? "lobby-room" : "landing");
  };

  const handleCreateLobby = () => {
    if (!createName.trim()) { setCreateError("Enter a lobby name"); return; }
    if (!createPassword.trim()) { setCreateError("Enter a password"); return; }
    if (!createUsername.trim()) { setCreateError("Enter your username"); return; }
    setLobby({
      name: createName.trim(),
      password: createPassword.trim(),
      players: [{ username: createUsername.trim(), isHost: true }],
    });
    setShowCreate(false);
    setCreateName(""); setCreatePassword(""); setCreateUsername(""); setCreateError("");
    setScreen("lobby-room");
  };

  const handleJoinLobby = () => {
    if (!joinLobbyName.trim()) { setJoinError("Enter lobby name"); return; }
    if (!joinPassword.trim()) { setJoinError("Enter password"); return; }
    if (!joinUsername.trim()) { setJoinError("Enter your username"); return; }
    if (!lobby || lobby.name !== joinLobbyName.trim()) { setJoinError("Lobby not found"); return; }
    if (lobby.password !== joinPassword.trim()) { setJoinError("Incorrect password"); return; }
    setLobby(prev => ({ ...prev, players: [...prev.players, { username: joinUsername.trim(), isHost: false }] }));
    setShowJoin(false);
    setJoinLobbyName(""); setJoinPassword(""); setJoinUsername(""); setJoinError("");
    setScreen("lobby-room");
  };

  // Finish sequence and delayed results reveal
  // Cooldown: leader has finished — let the rest of the field cross the line,
  // then move to the finished/results phase.
  useEffect(() => {
    if (raceState.racePhase !== "cooldown") return undefined;
    const timer = setTimeout(() => {
      setRaceState((previous) => (
        previous.racePhase === "cooldown"
          ? { ...previous, racePhase: "finished" }
          : previous
      ));
    }, COOLDOWN_MS);
    return () => clearTimeout(timer);
  }, [raceState.racePhase]);

  useEffect(() => {
    if (raceState.racePhase === "finished") {
      setFinishTransitionVisible(true);
      setShowResults(false);
      const revealTimer = setTimeout(() => setShowResults(true), 1850);
      const hideTimer = setTimeout(() => setFinishTransitionVisible(false), 2350);
      return () => {
        clearTimeout(revealTimer);
        clearTimeout(hideTimer);
      };
    }

    setFinishTransitionVisible(false);
    setShowResults(false);
    return undefined;
  }, [raceState.racePhase]);

  useEffect(() => {
    if (raceState.racePhase !== "racing") {
      setWeatherBanner(null);
      lastWeatherBannerIdRef.current = null;
      return undefined;
    }

    const latestWeatherEvent = [...raceState.events]
      .reverse()
      .find((event) => event.type === "weather_change");

    // Track the shown id in a ref so re-renders don't cancel the dismiss timer.
    if (!latestWeatherEvent || lastWeatherBannerIdRef.current === latestWeatherEvent.timestamp) {
      return undefined;
    }
    lastWeatherBannerIdRef.current = latestWeatherEvent.timestamp;

    const to = latestWeatherEvent.to;
    const nextBanner = {
      id: latestWeatherEvent.timestamp,
      text:
        latestWeatherEvent.title ||
        (to === "dry"
          ? "TRACK DRYING OUT"
          : to === "light_rain"
            ? "LIGHT RAIN STARTED"
            : to === "heavy_rain"
              ? "HEAVY RAIN — STORM"
              : `${String(to).replace(/_/g, " ").toUpperCase()} STARTED`),
      weather: to,
      lap: latestWeatherEvent.lap,
    };

    setWeatherBanner(nextBanner);
    const timer = window.setTimeout(() => {
      setWeatherBanner((current) => (current?.id === nextBanner.id ? null : current));
    }, 3800);

    return () => window.clearTimeout(timer);
  }, [raceState.events, raceState.racePhase]);

  useEffect(() => {
    if (prevRacePhaseRef.current !== "racing" && raceState.racePhase === "racing") {
      setStartLightsVisible(true);
      setStartLightsCount(0);
      setStartLightsGo(false);
      setLightsOut(false);
      const timers = [
        setTimeout(() => setStartLightsCount(1), 350),
        setTimeout(() => setStartLightsCount(2), 800),
        setTimeout(() => setStartLightsCount(3), 1250),
        setTimeout(() => setStartLightsCount(4), 1700),
        setTimeout(() => setStartLightsCount(5), 2150),
        setTimeout(() => setStartLightsCount(0), 3100),
        setTimeout(() => { setStartLightsGo(true); setLightsOut(true); }, 3400),
        setTimeout(() => { setStartLightsVisible(false); setStartLightsGo(false); }, 4900),
      ];
      prevRacePhaseRef.current = raceState.racePhase;
      return () => timers.forEach(clearTimeout);
    }
    prevRacePhaseRef.current = raceState.racePhase;
  }, [raceState.racePhase]);

  const sections = ["How It Works", "Guide", "Features", "About"];
  const sectionKey = s => s.toLowerCase().replace(/\s+/g, "-");
  const isRaceVisualActive = raceState.racePhase === "racing" || raceState.racePhase === "cooldown" || raceState.racePhase === "finished";

  return (
    <div style={{ minHeight:"100vh", background:"#0d0d0d", fontFamily:"'Barlow Condensed',sans-serif", position:"relative", overflow:"hidden", height:"100vh" }}>
      <style>{LANDING_STYLES}</style>

      {/* ── NAV ── */}
      {!isRaceVisualActive && (
        <nav style={{
          position:"absolute", top:0, left:0, right:0, zIndex:50,
          height:86, display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"0 34px",
          margin:"18px 22px 0",
          borderRadius:24,
          background:"linear-gradient(180deg, rgba(145,151,162,0.7) 0%, rgba(90,96,107,0.46) 100%)",
          border:"1px solid rgba(255,255,255,0.2)",
          boxShadow:"0 18px 48px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.18)",
          backdropFilter:"blur(22px)",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, cursor:"pointer" }} onClick={() => setActiveSection("home")}>
            {f1LogoSrc && <img src={f1LogoSrc} alt="F1" style={{ height:44, width:"auto", filter:"drop-shadow(0 6px 14px rgba(225,6,0,0.22))" }} />}
            <div style={{ width:1, height:28, background:"rgba(255,255,255,0.24)" }} />
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:15, letterSpacing:4.8, color:"rgba(255,255,255,0.9)", textTransform:"uppercase" }}>Race Simulator</span>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:36 }}>
            {sections.map(item => (
              <span
                key={item}
                className={`nav-link${activeSection === sectionKey(item) ? " active" : ""}`}
                onClick={() => setActiveSection(sectionKey(item))}
              >{item}</span>
            ))}
          </div>
        </nav>
      )}

      {/* ── SECTIONS CONTAINER ── */}
      <div style={{ position:"relative", width:"100%", height:"100vh", overflow:"hidden" }}>

        {isRaceVisualActive && (
          <div
            style={{
              position:"absolute",
              inset:0,
              padding:"18px",
              animation:"raceScreenIn 0.5s cubic-bezier(0.22,1,0.36,1) both",
              background:`linear-gradient(180deg, rgba(200,205,214,0.97) 0%, rgba(172,178,188,0.95) 100%), url(${pitGarageSrc}) center/cover no-repeat`,
            }}
          >
            {/* Landing-page style grid overlay */}
            <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(90deg, rgba(255,255,255,0.52) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.42) 1px, transparent 1px)", backgroundSize:"56px 56px", pointerEvents:"none" }} />
            {/* Red accent top-left glow */}
            <div style={{ position:"absolute", inset:0, background:"radial-gradient(circle at top left, rgba(225,6,0,0.09), transparent 36%)", pointerEvents:"none" }} />

            <div style={{ position:"relative", width:"100%", height:"100%", zIndex:1 }}>
              <TrackView raceState={raceState} lapDurationMs={1800 / raceSpeed} cooldownMs={COOLDOWN_MS} running={raceState.racePhase === "finished" || raceState.racePhase === "cooldown" || lightsOut} />

              {/* Playback speed control — sits over the top-right of the track panel */}
              {raceState.racePhase === "racing" && (
                <div
                  style={{
                    position:"absolute",
                    top:104,
                    right:330,
                    zIndex:9,
                    display:"flex",
                    alignItems:"center",
                    gap:6,
                    padding:"7px 9px",
                    borderRadius:16,
                    background:"rgba(6,8,12,0.78)",
                    border:"1px solid rgba(255,255,255,0.1)",
                    boxShadow:"0 10px 24px rgba(0,0,0,0.3)",
                  }}
                >
                  <span style={{
                    fontFamily:"'Barlow Condensed',sans-serif",
                    fontWeight:700, fontSize:9, letterSpacing:2,
                    color:"rgba(255,255,255,0.42)", textTransform:"uppercase",
                    marginRight:2,
                  }}>
                    Speed
                  </span>
                  {[0.25, 0.5, 1, 2, 4].map((s) => {
                    const active = raceSpeed === s;
                    return (
                      <button
                        key={s}
                        onClick={() => setRaceSpeed(s)}
                        style={{
                          cursor:"pointer",
                          minWidth:34,
                          padding:"5px 8px",
                          borderRadius:10,
                          border:`1px solid ${active ? "#E10600" : "rgba(255,255,255,0.14)"}`,
                          background: active ? "rgba(225,6,0,0.9)" : "rgba(255,255,255,0.04)",
                          color: active ? "#fff" : "rgba(255,255,255,0.62)",
                          fontFamily:"'Bebas Neue',sans-serif",
                          fontSize:15, letterSpacing:0.5, lineHeight:1,
                          transition:"all 0.18s ease",
                        }}
                      >
                        {s}x
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Weather banner — light theme */}
              {weatherBanner && raceState.racePhase === "racing" && (() => {
                  const accent = weatherBanner.weather === "heavy_rain" ? "#2d7ef7"
                    : weatherBanner.weather === "light_rain" ? "#43d17f"
                    : "#f5a623";
                  return (
                <div
                  style={{
                    position:"absolute",
                    top:152,
                    left:"50%",
                    transform:"translateX(-50%)",
                    zIndex:9,
                    display:"flex",
                    alignItems:"center",
                    gap:16,
                    padding:"13px 26px 13px 18px",
                    borderRadius:22,
                    background:"linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(244,246,250,0.92) 100%)",
                    border:`1px solid ${accent}44`,
                    boxShadow:`0 18px 44px rgba(0,0,0,0.13), inset 0 1px 0 rgba(255,255,255,0.95), 0 0 0 4px ${accent}14`,
                    backdropFilter:"blur(20px)",
                    pointerEvents:"none",
                    minWidth:280,
                    animation:"weatherIn 0.45s cubic-bezier(0.22,1,0.36,1) both",
                  }}
                >
                  <div style={{
                    flexShrink:0,
                    width:58, height:58,
                    borderRadius:16,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    background:`${accent}16`,
                    border:`1px solid ${accent}33`,
                  }}>
                    <WeatherIcon weather={weatherBanner.weather} size={38} />
                  </div>
                  <div style={{ textAlign:"left" }}>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:3.2, color:"#E10600", textTransform:"uppercase", marginBottom:4 }}>
                      Race Control · Lap {weatherBanner.lap}
                    </div>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:32, lineHeight:0.95, letterSpacing:1.4, color:"#111" }}>
                      {weatherBanner.text}
                    </div>
                  </div>
                </div>
                  );
                })()}

              <RaceHUD
                raceState={raceState}
                onRequestPit={requestPit}
                onSelectTyre={selectPitTyre}
              />

              {/* F1 start lights sequence */}
              {startLightsVisible && (
                <div style={{
                  position:"absolute", inset:0, zIndex:200,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  pointerEvents:"none",
                  background:startLightsGo ? "transparent" : "rgba(10,12,16,0.55)",
                  backdropFilter:startLightsGo ? "none" : "blur(5px)",
                  transition:"background 0.45s ease, backdrop-filter 0.45s ease",
                }}>
                  {!startLightsGo ? (
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:24, animation:"fadeIn 0.4s ease" }}>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, letterSpacing:5.5, color:"rgba(255,255,255,0.42)", textTransform:"uppercase" }}>
                        Lights Out And Away We Go
                      </div>
                      <div style={{
                        display:"flex", gap:14,
                        padding:"22px 30px",
                        borderRadius:22,
                        background:"rgba(6,7,9,0.94)",
                        border:"1px solid rgba(255,255,255,0.06)",
                        boxShadow:"0 48px 100px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.05)",
                      }}>
                        {[1,2,3,4,5].map(i => (
                          <div key={i} style={{
                            width:54, height:54, borderRadius:12,
                            background:startLightsCount >= i ? "#E10600" : "rgba(48,0,0,0.6)",
                            border:`2px solid ${startLightsCount >= i ? "rgba(255,110,110,0.5)" : "rgba(80,0,0,0.4)"}`,
                            boxShadow:startLightsCount >= i
                              ? "0 0 22px rgba(225,6,0,0.9), 0 0 54px rgba(225,6,0,0.45), inset 0 1px 0 rgba(255,200,200,0.22)"
                              : "inset 0 1px 0 rgba(255,255,255,0.03)",
                            transition:"background 0.1s ease, box-shadow 0.28s ease, border-color 0.12s ease",
                            animation:startLightsCount >= i ? "startLightOn 0.22s cubic-bezier(0.22,1,0.36,1)" : "none",
                          }} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      position:"absolute", left:"50%", top:"50%",
                      fontFamily:"'Bebas Neue',sans-serif",
                      fontSize:"114px", lineHeight:1, letterSpacing:"0.08em",
                      color:"#fff",
                      textShadow:"0 0 40px rgba(225,6,0,0.95), 0 0 80px rgba(225,6,0,0.55), 0 0 120px rgba(225,6,0,0.22)",
                      animation:"goFlash 1.45s cubic-bezier(0.22,1,0.36,1) both",
                      whiteSpace:"nowrap", userSelect:"none",
                    }}>GO</div>
                  )}
                </div>
              )}

              {finishTransitionVisible && raceState.racePhase === "finished" && (
                <div style={{
                  position:"absolute",
                  inset:0,
                  zIndex:220,
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"center",
                  pointerEvents:"none",
                  background:"rgba(241, 243, 246, 0.75)",
                  backdropFilter:"blur(12px)",
                  animation:"fadeIn 0.3s ease",
                }}>
                  <div style={{
                    position:"relative",
                    width:"min(720px, calc(100vw - 56px))",
                    padding:"40px 40px 36px",
                    borderRadius:30,
                    background:"rgba(255, 255, 255, 0.96)",
                    border:"1px solid rgba(17, 17, 17, 0.08)",
                    boxShadow:"0 30px 80px rgba(0,0,0,0.12)",
                    backdropFilter:"blur(20px)",
                    overflow:"hidden",
                    textAlign:"center",
                    animation:"raceScreenIn 0.55s cubic-bezier(0.22,1,0.36,1) both",
                  }}>
                    <div style={{ display:"inline-flex", alignItems:"center", gap:9, padding:"8px 14px", borderRadius:999, background:"rgba(17, 17, 17, 0.04)", border:"1px solid rgba(17, 17, 17, 0.08)", position:"relative", zIndex:1 }}>
                      <div style={{ width:14, height:14, background:"repeating-conic-gradient(from 45deg, #fff 0 25%, #111 0 50%)", backgroundSize:"10px 10px", borderRadius:3 }} />
                      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:3, color:"var(--f1-red)", textTransform:"uppercase" }}>Session Complete</span>
                    </div>
                    <div style={{ position:"relative", zIndex:1, fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(64px,8.5vw,118px)", lineHeight:0.86, letterSpacing:"0.03em", color:"#111", marginTop:20 }}>
                      CHECKERED FLAG
                    </div>
                    <div style={{ position:"relative", zIndex:1, marginTop:14, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:13, letterSpacing:3, color:"rgba(17, 17, 17, 0.58)", textTransform:"uppercase" }}>
                      {raceState.totalLaps} laps complete · results incoming
                    </div>
                    <div style={{ position:"relative", zIndex:1, display:"flex", justifyContent:"center", gap:12, marginTop:24, flexWrap:"wrap" }}>
                      {finishWinner && (
                        <div style={{
                          padding:"9px 16px",
                          borderRadius:999,
                          background:"rgba(17, 17, 17, 0.04)",
                          border:`1px solid ${TEAMS[finishWinner.team]?.color || "var(--f1-red)"}`,
                          color:"#111",
                          fontFamily:"'Barlow Condensed',sans-serif",
                          fontWeight:700,
                          fontSize:12,
                          letterSpacing:2,
                          textTransform:"uppercase",
                          boxShadow:`inset 0 0 12px ${TEAMS[finishWinner.team]?.color || "var(--f1-red)"}10`
                        }}>
                          <span style={{ color: TEAMS[finishWinner.team]?.color || "var(--f1-red)", marginRight: 6 }}>🏁</span>
                          {finishWinnerLabel}
                        </div>
                      )}
                      <div style={{
                        padding:"9px 16px",
                        borderRadius:999,
                        background:"rgba(17, 17, 17, 0.04)",
                        border:"1px solid rgba(17, 17, 17, 0.08)",
                        color:"rgba(17, 17, 17, 0.78)",
                        fontFamily:"'Barlow Condensed',sans-serif",
                        fontWeight:700,
                        fontSize:12,
                        letterSpacing:2,
                        textTransform:"uppercase"
                      }}>
                        Spa-Francorchamps
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* HOME / HERO */}
        {!isRaceVisualActive && activeSection === "home" && (
          <div
            style={{
              position:"absolute",
              inset:0,
              animation:"fadeIn 0.4s ease",
              background: `#f3f5f9 url(${landingImageSrc}) center center / cover no-repeat`,
              transformOrigin:"center",
            }}
          >
            <div style={{ position:"absolute", inset:0, background:"radial-gradient(circle at 50% 42%, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 22%, transparent 52%)", animation:"heroGlow 7s ease-in-out infinite", pointerEvents:"none" }} />
            <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(rgba(255,255,255,0.14) 0.8px, transparent 0.8px)", backgroundSize:"18px 18px", opacity:0.16, mixBlendMode:"soft-light", pointerEvents:"none" }} />
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 32%, transparent 70%, rgba(225,6,0,0.05) 100%)", pointerEvents:"none" }} />
            {/* Overlays */}
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, rgba(255,255,255,0.08) 0%, transparent 18%, transparent 58%, rgba(0,0,0,0.64) 100%)", pointerEvents:"none" }} />
            <div style={{ position:"absolute", inset:0, background:"radial-gradient(circle at center, transparent 28%, rgba(0,0,0,0.12) 72%, rgba(0,0,0,0.36) 100%)", pointerEvents:"none" }} />

            <div style={{ position:"absolute", left:"100%", top:"58%", transform:"translateX(-50%)", display:"flex", gap:18, zIndex:3, animation:"fadeInUp 0.9s ease 0.18s both" }}>
              <div className="hero-action" onClick={() => setShowJoin(true)}>
                <div className="hero-action-icon">IN</div>
                <div className="hero-action-copy">
                  <div className="hero-action-title">JOIN</div>
                  <div className="hero-action-sub">Enter Existing Room</div>
                </div>
              </div>
              <div className="hero-action primary" onClick={() => setShowCreate(true)}>
                <div className="hero-action-icon">GO</div>
                <div className="hero-action-copy">
                  <div className="hero-action-title">CREATE</div>
                  <div className="hero-action-sub">Start New Session</div>
                </div>
              </div>
            </div>

            {/* JOIN */}
            <div onClick={() => setShowJoin(true)} style={{ position:"absolute", bottom:56, left:52, cursor:"pointer", animation:"fadeInUp 0.7s ease 0.3s both", zIndex:3 }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(46px,6vw,84px)", color:"#fff", lineHeight:0.9, letterSpacing:"0.04em", transition:"color 0.2s, transform 0.2s", textShadow:"0 12px 28px rgba(0,0,0,0.24)" }}
                onMouseEnter={e => e.currentTarget.style.color="#E10600"}
                onMouseLeave={e => e.currentTarget.style.color="#fff"}
              >JOIN</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:"clamp(12px,1.4vw,18px)", color:"rgba(255,255,255,0.58)", letterSpacing:4, marginTop:8 }}>ROOM</div>
            </div>

            {/* CREATE */}
            <div onClick={() => setShowCreate(true)} style={{ position:"absolute", bottom:56, right:52, textAlign:"right", cursor:"pointer", animation:"fadeInUp 0.7s ease 0.45s both", zIndex:3 }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(46px,6vw,84px)", color:"#fff", lineHeight:0.9, letterSpacing:"0.04em", transition:"color 0.2s, transform 0.2s", textShadow:"0 12px 28px rgba(0,0,0,0.24)" }}
                onMouseEnter={e => e.currentTarget.style.color="#E10600"}
                onMouseLeave={e => e.currentTarget.style.color="#fff"}
              >CREATE</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:"clamp(12px,1.4vw,18px)", color:"rgba(255,255,255,0.58)", letterSpacing:4, marginTop:8 }}>ROOM</div>
            </div>

          </div>
        )}

        {/* HOW IT WORKS */}
        {!isRaceVisualActive && activeSection === "how-it-works" && (
          <div className="section-panel" style={{ paddingTop:62 }}>
            <HowItWorksSection onCreateRoom={() => setShowCreate(true)} onShowJoin={() => setShowJoin(true)} />
          </div>
        )}

        {/* GUIDE */}
        {!isRaceVisualActive && activeSection === "guide" && (
          <div className="section-panel" style={{ paddingTop:62 }}>
            <GuideSection onCreateRoom={() => setShowCreate(true)} onShowJoin={() => setShowJoin(true)} />
          </div>
        )}

        {/* FEATURES */}
        {!isRaceVisualActive && activeSection === "features" && (
          <div className="section-panel" style={{ paddingTop:62 }}>
            <FeaturesSection onCreateRoom={() => setShowCreate(true)} onShowJoin={() => setShowJoin(true)} />
          </div>
        )}

        {/* ABOUT */}
        {!isRaceVisualActive && activeSection === "about" && (
          <div className="section-panel" style={{ paddingTop:62 }}>
            <AboutSection onCreateRoom={() => setShowCreate(true)} onShowJoin={() => setShowJoin(true)} />
          </div>
        )}
      </div>

      {raceState.racePhase === "setup" && (
        <StrategySetupPanel
          raceState={raceState}
          onClose={handleCloseSetup}
          onSelectDriver={handleSelectDriver}
          onUpdateDriver={handleUpdateDriver}
          onUpdateRace={handleUpdateRace}
          onConfirmSetup={handleConfirmSetup}
          onToggleBots={(val) => {
            setBotsEnabled(val);
            setSetupError("");
            setRaceState((previousState) => {
              const nextSetup = {
                ...(previousState.setup || buildSetupState()),
                race: {
                  ...(previousState.setup?.race || DEFAULT_SETUP_RACE),
                  bots: val,
                },
                drivers: rebuildSetupDriversForBots(previousState.setup?.drivers || buildSetupState().drivers, val),
              };

              return syncSetupState(previousState, nextSetup);
            });
          }}
          setupError={setupError}
        />
      )}

      {showResults && raceState.racePhase === "finished" && (
        <PostRaceResults raceState={raceState} onBackToLobby={handleBackToLobby} />
      )}

      {/* ── CREATE LOBBY MODAL ── */}
      {showCreate && (
        <div
          style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", animation:"fadeIn 0.2s ease" }}
          onClick={() => { setShowCreate(false); setCreateError(""); setCreateName(""); setCreatePassword(""); setCreateUsername(""); }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position:"relative", background:"#111", border:"1px solid rgba(255,255,255,0.1)", borderRadius:16, padding:"36px 40px", width:"min(440px,92vw)", animation:"slideUp 0.3s ease" }}>
            <button
              onClick={() => { setShowCreate(false); setCreateError(""); setCreateName(""); setCreatePassword(""); setCreateUsername(""); }}
              style={{ position:"absolute", top:16, right:16, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:6, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"rgba(255,255,255,0.5)", fontSize:16, lineHeight:1, transition:"all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.12)"; e.currentTarget.style.color="#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.06)"; e.currentTarget.style.color="rgba(255,255,255,0.5)"; }}
            >✕</button>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:11, letterSpacing:3, color:"#E10600", marginBottom:6 }}>MULTIPLAYER</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, color:"#fff", marginBottom:24, letterSpacing:1 }}>Create Lobby</div>

            {[
              { label:"LOBBY NAME", value:createName, set:setCreateName, placeholder:"e.g.  Monaco GP" },
              { label:"PASSWORD",   value:createPassword, set:setCreatePassword, placeholder:"••••••••", type:"password" },
              { label:"YOUR NAME",  value:createUsername, set:setCreateUsername, placeholder:"e.g.  Hamilton" },
            ].map(({ label, value, set, placeholder, type }) => (
              <div key={label} style={{ marginBottom:14 }}>
                <div style={{ marginBottom:6, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:500, fontSize:11, letterSpacing:2, color:"rgba(255,255,255,0.4)" }}>{label}</div>
                <input
                  value={value} type={type || "text"}
                  onChange={e => { set(e.target.value); setCreateError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleCreateLobby()}
                  placeholder={placeholder}
                  style={{ width:"100%", background:"rgba(255,255,255,0.06)", border:`1px solid ${createError ? "#E10600" : "rgba(255,255,255,0.12)"}`, borderRadius:8, padding:"12px 16px", color:"#fff", fontSize:15, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:1, outline:"none", caretColor:"#E10600", boxSizing:"border-box" }}
                />
              </div>
            ))}

            {createError && <div style={{ color:"#E10600", fontSize:11, marginBottom:8, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:1 }}>{createError}</div>}
            <button
              onClick={handleCreateLobby}
              style={{ width:"100%", marginTop:6, background:"#E10600", border:"none", borderRadius:8, padding:"14px", color:"#fff", fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:15, letterSpacing:3, cursor:"pointer", transition:"background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background="#c00400"}
              onMouseLeave={e => e.currentTarget.style.background="#E10600"}
            >CREATE LOBBY →</button>
          </div>
        </div>
      )}

      {/* ── JOIN LOBBY MODAL ── */}
      {showJoin && (
        <div
          style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", animation:"fadeIn 0.2s ease" }}
          onClick={() => { setShowJoin(false); setJoinError(""); setJoinLobbyName(""); setJoinPassword(""); setJoinUsername(""); }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position:"relative", background:"#111", border:"1px solid rgba(255,255,255,0.1)", borderRadius:16, padding:"36px 40px", width:"min(440px,92vw)", animation:"slideUp 0.3s ease" }}>
            <button
              onClick={() => { setShowJoin(false); setJoinError(""); setJoinLobbyName(""); setJoinPassword(""); setJoinUsername(""); }}
              style={{ position:"absolute", top:16, right:16, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:6, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"rgba(255,255,255,0.5)", fontSize:16, lineHeight:1, transition:"all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.12)"; e.currentTarget.style.color="#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.06)"; e.currentTarget.style.color="rgba(255,255,255,0.5)"; }}
            >✕</button>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:11, letterSpacing:3, color:"#E10600", marginBottom:6 }}>MULTIPLAYER</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, color:"#fff", marginBottom:24, letterSpacing:1 }}>Join Lobby</div>

            {[
              { label:"LOBBY NAME", value:joinLobbyName, set:setJoinLobbyName, placeholder:"e.g.  Monaco GP" },
              { label:"PASSWORD",   value:joinPassword,   set:setJoinPassword,   placeholder:"••••••••", type:"password" },
              { label:"YOUR NAME",  value:joinUsername,   set:setJoinUsername,   placeholder:"e.g.  Verstappen" },
            ].map(({ label, value, set, placeholder, type }) => (
              <div key={label} style={{ marginBottom:14 }}>
                <div style={{ marginBottom:6, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:500, fontSize:11, letterSpacing:2, color:"rgba(255,255,255,0.4)" }}>{label}</div>
                <input
                  value={value} type={type || "text"}
                  onChange={e => { set(e.target.value); setJoinError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleJoinLobby()}
                  placeholder={placeholder}
                  style={{ width:"100%", background:"rgba(255,255,255,0.06)", border:`1px solid ${joinError ? "#E10600" : "rgba(255,255,255,0.12)"}`, borderRadius:8, padding:"12px 16px", color:"#fff", fontSize:15, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:1, outline:"none", caretColor:"#E10600", boxSizing:"border-box" }}
                />
              </div>
            ))}

            {joinError && <div style={{ color:"#E10600", fontSize:11, marginBottom:8, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:1 }}>{joinError}</div>}
            <button
              onClick={handleJoinLobby}
              style={{ width:"100%", marginTop:6, background:"#E10600", border:"none", borderRadius:8, padding:"14px", color:"#fff", fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:15, letterSpacing:3, cursor:"pointer", transition:"background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background="#c00400"}
              onMouseLeave={e => e.currentTarget.style.background="#E10600"}
            >JOIN LOBBY →</button>
          </div>
        </div>
      )}

      {/* ── LOBBY ROOM SCREEN ── */}
      {screen === "lobby-room" && lobby && (
        <div style={{
          position:"fixed", inset:0, zIndex:300,
          background:`linear-gradient(180deg, rgba(8, 10, 14, 0.96) 0%, rgba(16, 18, 22, 0.92) 100%), url(${pitGarageSrc}) center center / cover no-repeat`,
          display:"flex", flexDirection:"column",
          fontFamily:"'Barlow Condensed',sans-serif",
          color:"#fff",
          animation:"fadeIn 0.35s ease",
          overflow:"hidden",
        }}>
          {/* Grid overlay — matches section-shell::before */}
          <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:0,
            background:"radial-gradient(circle at top left, rgba(225,6,0,0.12), transparent 32%), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize:"auto, 56px 56px, 56px 56px",
          }} />

          {/* Nav — same as landing */}
          <nav style={{
            position:"relative", zIndex:10, flexShrink:0,
            height:86, display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"0 34px", margin:"18px 22px 0", borderRadius:24,
            background:"rgba(22, 24, 30, 0.82)",
            border:"1px solid rgba(255,255,255,0.08)",
            boxShadow:"0 18px 48px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.18)",
            backdropFilter:"blur(22px)",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              {f1LogoSrc && <img src={f1LogoSrc} alt="F1" style={{ height:44, width:"auto", filter:"drop-shadow(0 6px 14px rgba(225,6,0,0.22))" }} />}
              <div style={{ width:1, height:28, background:"rgba(255,255,255,0.24)" }} />
              <span style={{ fontWeight:700, fontSize:15, letterSpacing:4.8, color:"rgba(255,255,255,0.9)", textTransform:"uppercase" }}>Race Simulator</span>
            </div>
            <button
              onClick={() => { setScreen("landing"); setLobby(null); }}
              style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.22)", borderRadius:8, padding:"10px 22px", color:"rgba(255,255,255,0.72)", fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:12, letterSpacing:3, cursor:"pointer", transition:"all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.55)"; e.currentTarget.style.color="#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.22)"; e.currentTarget.style.color="rgba(255,255,255,0.72)"; }}
            >← LEAVE</button>
          </nav>

          {/* Content */}
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 24px", position:"relative", zIndex:1 }}>
            <div style={{ width:"min(620px,100%)", display:"flex", flexDirection:"column", gap:22 }}>

              {/* Lobby title */}
              <div style={{ animation:"panelIn 0.4s ease" }}>
                <div style={{ fontWeight:600, fontSize:11, letterSpacing:3.5, color:"var(--f1-red)", marginBottom:6 }}>LOBBY</div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(44px,5vw,76px)", color:"#fff", letterSpacing:"0.02em", lineHeight:0.95 }}>{lobby.name}</div>
                <div style={{ marginTop:12, height:2, width:56, background:"var(--f1-red)", borderRadius:1 }} />
              </div>

              {/* Players glass panel */}
              <div style={{
                background:"rgba(22, 24, 30, 0.82)",
                border:"1px solid rgba(255,255,255,0.08)",
                borderRadius:26, backdropFilter:"blur(22px)",
                boxShadow:"0 28px 72px rgba(0,0,0,0.35)",
                padding:"30px 32px",
                animation:"panelIn 0.45s ease 0.05s both",
              }}>
                <div style={{ fontWeight:600, fontSize:10, letterSpacing:3.5, color:"rgba(255,255,255,0.46)", marginBottom:18, textTransform:"uppercase" }}>
                  Drivers on Grid — {lobby.players.length}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {lobby.players.map((p, i) => (
                    <div key={i} style={{
                      display:"flex", alignItems:"center", gap:16,
                      padding:"15px 20px",
                      background:"rgba(255,255,255,0.04)",
                      border:"1px solid rgba(255,255,255,0.08)",
                      borderRadius:16,
                      boxShadow:"0 4px 18px rgba(0,0,0,0.1)",
                      transition:"transform 0.15s",
                    }}>
                      {/* Avatar */}
                      <div style={{
                        width:42, height:42, borderRadius:"50%", flexShrink:0,
                        background: p.isHost ? "linear-gradient(135deg,var(--f1-red),#ff4422)" : "linear-gradient(135deg,rgba(100,104,115,0.3),rgba(80,84,95,0.2))",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontFamily:"'Bebas Neue',sans-serif", fontSize:17,
                        color: "#fff",
                        boxShadow: p.isHost ? "0 4px 14px rgba(225,6,0,0.28)" : "none",
                        border:"1.5px solid rgba(255,255,255,0.15)",
                      }}>
                        {p.username.charAt(0).toUpperCase()}
                      </div>
                      {/* Name + role */}
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:18, color:"#fff", letterSpacing:1.5, textTransform:"uppercase", lineHeight:1 }}>{p.username}</div>
                        <div style={{ fontSize:10, letterSpacing:3, marginTop:3, color: p.isHost ? "var(--f1-red)" : "rgba(255,255,255,0.46)", fontWeight:600 }}>
                          {p.isHost ? "HOST" : "DRIVER"}
                        </div>
                      </div>
                      {/* Position number */}
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:1, color:"rgba(255,255,255,0.2)", lineHeight:1 }}>P{i + 1}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* NEXT button */}
              <button
                onClick={handleStartSetup}
                style={{
                  width:"100%", padding:"18px", borderRadius:16, border:"none",
                  background:"var(--f1-red)",
                  color:"#fff", fontFamily:"'Bebas Neue',sans-serif", fontSize:26,
                  letterSpacing:3, cursor:"pointer", transition:"transform 0.15s, box-shadow 0.15s",
                  boxShadow:"0 8px 28px rgba(225,6,0,0.3)",
                  animation:"panelIn 0.5s ease 0.15s both",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 12px 36px rgba(225,6,0,0.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 8px 28px rgba(225,6,0,0.3)"; }}
              >
                NEXT &rarr; SETUP STRATEGY
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPage;
