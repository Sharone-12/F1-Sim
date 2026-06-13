// ─── F1 RACE ENGINE ──────────────────────────────────────────────────────────
// Deterministic physics-based simulation. User outcomes = pure consequence
// of decisions. AI drivers get controlled randomness for variety.

// ─── TYRE COMPOUNDS ──────────────────────────────────────────────────────────

export const TYRE_COMPOUNDS = {
  S: { color: "#FF3333", name: "Soft",         offset: -0.8, threshold: 10, baseDeg: 0.05 },
  M: { color: "#FFD700", name: "Medium",       offset: 0,    threshold: 22, baseDeg: 0.03 },
  H: { color: "#EBEBEB", name: "Hard",         offset: 0.6,  threshold: 33, baseDeg: 0.015 },
  I: { color: "#43d17f", name: "Intermediate",  offset: 0.3,  threshold: 20, baseDeg: 0.035 },
  W: { color: "#2d7ef7", name: "Wet",           offset: 0.8,  threshold: 18, baseDeg: 0.04 },
};

// ─── CIRCUIT ─────────────────────────────────────────────────────────────────

export const SPA_CIRCUIT = {
  name: "Spa-Francorchamps",
  baseLapTime: 106,
  totalLaps: 44,
  length: 7.004,
  overtakeDifficulty: 0.55,
  pitTime: 24,
  straightPct: 0.45,
  cornerPct: 0.55,
  safetyCarRate: 0.015,
};

// ─── FUEL / ERS / AERO CONSTANTS ─────────────────────────────────────────────

const FUEL_BURN       = { push: 1.8, save: 1.5 };
const FUEL_WEIGHT_PEN = 0.035;          // s per kg
const FUEL_SAVE_PEN   = 0.3;            // s when in save mode
const FUEL_LIMP_PEN   = 5.0;
const FUEL_LOW_PEN    = 0.5;

export const ERS_MAX_ATTACK = 10;       // total attack laps
const ERS_EFFECT      = { attack: -0.15, normal: 0, harvest: 0.1 };

const DIRTY_AIR_GAP   = 1.5;
const DIRTY_AIR_PEN   = 0.3;
const DRS_GAP         = 1.0;
const DRS_BONUS       = -0.2;

// ─── AI DRIVER DATABASE ──────────────────────────────────────────────────────

export const AI_DRIVERS = [
  { id: "verstappen", name: "Max Verstappen",  team: "Red Bull",      baseSkill: 97, racecraft: 0.92 },
  { id: "hamilton",   name: "Lewis Hamilton",   team: "Mercedes",      baseSkill: 95, racecraft: 0.90 },
  { id: "norris",     name: "Lando Norris",     team: "McLaren",       baseSkill: 93, racecraft: 0.85 },
  { id: "leclerc",    name: "Charles Leclerc",  team: "Ferrari",       baseSkill: 93, racecraft: 0.83 },
  { id: "piastri",    name: "Oscar Piastri",    team: "McLaren",       baseSkill: 91, racecraft: 0.80 },
  { id: "russell",    name: "George Russell",   team: "Mercedes",      baseSkill: 91, racecraft: 0.82 },
  { id: "sainz",      name: "Carlos Sainz",     team: "Williams",      baseSkill: 90, racecraft: 0.78 },
  { id: "alonso",     name: "Fernando Alonso",  team: "Aston Martin",  baseSkill: 89, racecraft: 0.85 },
  { id: "gasly",      name: "Pierre Gasly",     team: "Alpine",        baseSkill: 86, racecraft: 0.74 },
  { id: "stroll",     name: "Lance Stroll",     team: "Aston Martin",  baseSkill: 82, racecraft: 0.65 },
];

const AI_STRATEGIES = [
  { name: "aggressive",   startTyre: "S", pits: [{ lapRange: [10, 14], compound: "H" }] },
  { name: "conservative", startTyre: "M", pits: [{ lapRange: [22, 28], compound: "H" }] },
  { name: "two-stop",     startTyre: "S", pits: [{ lapRange: [11, 14], compound: "M" }, { lapRange: [33, 37], compound: "S" }] },
  { name: "undercut",     startTyre: "M", pits: [{ lapRange: [18, 22], compound: "H" }] },
  { name: "overcut",      startTyre: "M", pits: [{ lapRange: [26, 32], compound: "H" }] },
];

// ─── SEEDED PRNG ─────────────────────────────────────────────────────────────

function rng(seed) {
  let s = seed | 0;
  return () => { s = (s * 1664525 + 1013904223) | 0; return (s >>> 0) / 4294967295; };
}

function gaussian(r) {
  return Math.sqrt(-2 * Math.log(r() || 0.0001)) * Math.cos(2 * Math.PI * r());
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const r3 = v => Math.round(v * 1000) / 1000;

function downforceEffects(slider) {
  const n = (slider ?? 50) / 100;
  return {
    straightPen: 0.4 - n * 0.8,   // +0.4 low → −0.4 high
    cornerPen:  -0.3 + n * 0.6,   // −0.3 low → +0.3 high
    tyreDegMul:  1.15 - n * 0.3,   //  1.15 low →  0.85 high
  };
}

// ─── TYRE DEGRADATION (cliff model) ─────────────────────────────────────────

export function tyreDeg(compound, tyreAge, downforceSlider = 50) {
  const t = TYRE_COMPOUNDS[compound];
  if (!t) return 0;
  const deg = t.baseDeg * downforceEffects(downforceSlider).tyreDegMul;
  if (tyreAge <= t.threshold) return r3(tyreAge * deg);
  const over = tyreAge - t.threshold;
  return r3(t.threshold * deg + over * deg * Math.pow(1.5, over * 0.3));
}

// Percentage for UI (0–100)
function tyreWearPct(compound, tyreAge, downforceSlider) {
  const t = TYRE_COMPOUNDS[compound];
  if (!t) return 0;
  return Math.min(100, Math.round((tyreAge / (t.threshold + 5)) * 100));
}

// ─── WEATHER ─────────────────────────────────────────────────────────────────

const WEATHER_TYRE_PEN = {
  dry:        { S: 0, M: 0, H: 0, I: 1.5, W: 3 },
  light_rain: { S: 2.5, M: 2.5, H: 2.5, I: 0, W: 1 },
  heavy_rain: { S: 5, M: 5, H: 5, I: 2, W: 0 },
};

export function updateWeather(raceState) {
  const lap = raceState.currentLap;
  let weather = "dry";
  if (lap >= 26) weather = "heavy_rain";
  else if (lap >= 16) weather = "light_rain";
  return { ...raceState, weather };
}

// ─── LAP TIME CALCULATION ────────────────────────────────────────────────────

export function calculateLapTime(driver, raceState) {
  const c = raceState.circuit || SPA_CIRCUIT;
  let t = c.baseLapTime;

  // Tyre compound offset
  t += TYRE_COMPOUNDS[driver.tyre]?.offset ?? 0;

  // Tyre degradation (cliff model)
  t += tyreDeg(driver.tyre, driver.tyreAge, driver.setup?.downforce);

  // Fuel weight
  const fuel = driver.fuelLoad ?? 100;
  t += fuel * FUEL_WEIGHT_PEN;
  if (fuel <= 0) t += FUEL_LIMP_PEN;
  else if (fuel < 5) t += FUEL_LOW_PEN;

  // Fuel mode
  if (driver.fuelMode === "save") t += FUEL_SAVE_PEN;

  // Downforce vs circuit
  const df = downforceEffects(driver.setup?.downforce);
  t -= df.straightPen * c.straightPct;
  t -= df.cornerPen * c.cornerPct;

  // ERS (supports both naming: attack/normal/harvest AND high/medium/low)
  const ersRaw = driver.ersMode || "normal";
  const ers = ersRaw === "high" ? "attack" : ersRaw === "low" ? "harvest" : ersRaw === "medium" ? "normal" : ersRaw;
  if (ers === "attack" && (driver.ersLapsRemaining ?? ERS_MAX_ATTACK) > 0)
    t += ERS_EFFECT.attack;
  else if (ers === "harvest")
    t += ERS_EFFECT.harvest;

  // Suspension (subtle: ±0.1s)
  t += ((50 - (driver.setup?.suspension ?? 50)) * 0.002);

  // Ride height (subtle)
  t += (((driver.setup?.rideHeight ?? 50) - 50) * 0.001);

  // Driving style
  if (driver.drivingStyle === "aggressive") t -= 0.3;
  else if (driver.drivingStyle === "conservative") t += 0.2;

  // AI skill spread (look up from AI_DRIVERS if not set)
  if (driver.isBot) {
    const skill = driver.adjustedSkill ?? AI_DRIVERS.find(a => a.id === driver.id)?.baseSkill ?? 88;
    t += (100 - skill) * 0.035;
  }

  // Weather × tyre mismatch
  t += WEATHER_TYRE_PEN[raceState.weather]?.[driver.tyre] ?? 0;

  // Dirty air / DRS (based on previous-lap gap)
  const gap = driver.gapToAhead ?? 99;
  if (gap > 0 && gap < DIRTY_AIR_GAP && (raceState.flag || "green") === "green") {
    t += DIRTY_AIR_PEN;
    if (gap < DRS_GAP) t += DRS_BONUS;
  }

  return r3(t);
}

// ─── PIT STOP ────────────────────────────────────────────────────────────────

export function performPitStop(driver, nextCompound, currentLap = 0, raceState = {}) {
  const c = raceState.circuit || SPA_CIRCUIT;
  const underSC = raceState.flag === "sc" || raceState.flag === "vsc";
  const pitTime = underSC ? c.pitTime * 0.6 : c.pitTime;

  const stints = driver.stintHistory || [{ compound: driver.tyre, startLap: 0 }];
  const closed = stints.map((s, i, a) =>
    i === a.length - 1 && !s.endLap ? { ...s, endLap: currentLap } : s
  );

  return {
    ...driver,
    tyre: nextCompound,
    tyreAge: 0,
    pitCount: (driver.pitCount || 0) + 1,
    hasPitted: true,
    hasRequestedPit: false,
    nextTyreCompound: nextCompound,
    totalTime: r3(driver.totalTime + pitTime),
    stintHistory: [...closed, { compound: nextCompound, startLap: currentLap }],
    compoundsUsed: [...new Set([...(driver.compoundsUsed || []), driver.tyre, nextCompound])],
  };
}

// ─── AI STRATEGY DECISIONS ───────────────────────────────────────────────────

function aiPitDecision(driver, raceState, rand) {
  if (driver.hasRequestedPit) return driver;
  const lap = raceState.currentLap + 1;

  // Generate a strategy on first pit decision if none exists
  let strat = driver.strategy;
  if (!strat && driver.isBot) {
    const idx = Math.abs((driver.id || "").charCodeAt(0) * 7 + (driver.id || "").charCodeAt(1) * 13) % AI_STRATEGIES.length;
    strat = {
      name: AI_STRATEGIES[idx].name,
      pits: AI_STRATEGIES[idx].pits.map(p => ({
        lapRange: [p.lapRange[0] + Math.floor(rand() * 3) - 1, p.lapRange[1] + Math.floor(rand() * 3) - 1],
        compound: p.compound,
      })),
    };
  }

  // Planned stops
  if (strat?.pits) {
    for (let i = 0; i < strat.pits.length; i++) {
      if (driver.pitCount > i) continue;
      const [lo, hi] = strat.pits[i].lapRange;
      if (lap > hi) return { ...driver, hasRequestedPit: true, nextTyreCompound: strat.pits[i].compound };
      if (lap >= lo && rand() < 0.3 + ((lap - lo) / (hi - lo)) * 0.7)
        return { ...driver, hasRequestedPit: true, nextTyreCompound: strat.pits[i].compound };
      break;
    }
  }

  // Emergency: wrong tyres for weather
  if (raceState.weather === "heavy_rain" && !["W", "I"].includes(driver.tyre))
    return { ...driver, hasRequestedPit: true, nextTyreCompound: "W" };
  if (raceState.weather === "light_rain" && !["I", "W"].includes(driver.tyre) && driver.tyreAge > 8)
    return { ...driver, hasRequestedPit: true, nextTyreCompound: "I" };

  // Emergency: past cliff
  const td = TYRE_COMPOUNDS[driver.tyre];
  if (td && driver.tyreAge > td.threshold + 5 && driver.pitCount < 3)
    return { ...driver, hasRequestedPit: true, nextTyreCompound: lap > raceState.totalLaps * 0.6 ? "H" : "M" };

  // Opportunistic: pit under safety car
  if ((raceState.flag === "sc" || raceState.flag === "vsc") && driver.tyreAge > 10 && driver.pitCount < 2)
    return { ...driver, hasRequestedPit: true, nextTyreCompound: "H" };

  return driver;
}

// ─── AI DRIVER INIT ──────────────────────────────────────────────────────────

export function initializeAiDriver(data, position, rand) {
  const form = r3(gaussian(rand) * 2);
  const strat = AI_STRATEGIES[Math.floor(rand() * AI_STRATEGIES.length)];
  const pits = strat.pits.map(p => ({
    lapRange: [p.lapRange[0] + Math.floor(rand() * 3) - 1, p.lapRange[1] + Math.floor(rand() * 3) - 1],
    compound: p.compound,
  }));

  return {
    id: data.id, name: data.name, team: data.team, isBot: true,
    baseSkill: data.baseSkill, adjustedSkill: r3(data.baseSkill + form),
    raceDayForm: form, racecraft: data.racecraft,
    strategy: { name: strat.name, pits },
    tyre: strat.startTyre, tyreAge: 0,
    fuelLoad: r3(88 + rand() * 12),
    fuelMode: "push", ersMode: "normal", ersLapsRemaining: ERS_MAX_ATTACK,
    setup: {
      downforce: 30 + Math.floor(rand() * 40),
      suspension: 30 + Math.floor(rand() * 40),
      rideHeight: 30 + Math.floor(rand() * 40),
    },
    drivingStyle: ["aggressive", "balanced", "conservative"][Math.floor(rand() * 3)],
    position, totalTime: 0, currentLapTime: 0,
    gapToLeader: 0, gapToAhead: 0,
    pitCount: 0, hasPitted: false, hasRequestedPit: false,
    nextTyreCompound: "M",
    compoundsUsed: [strat.startTyre],
    stintHistory: [{ compound: strat.startTyre, startLap: 0 }],
    lapTimes: [], tyreWear: 0, setupLocked: true,
  };
}

// ─── SYNC (setup preview) ────────────────────────────────────────────────────

export function syncRaceStateCalculations(raceState) {
  const circuit = raceState.circuit || SPA_CIRCUIT;
  const players = raceState.players.map(p => {
    const lt = calculateLapTime(p, { ...raceState, circuit });
    return { ...p, currentLapTime: r3(lt), tyreWear: tyreWearPct(p.tyre, p.tyreAge, p.setup?.downforce) };
  });
  return {
    ...raceState, circuit,
    players,
    leaderboard: players.slice().sort((a, b) => a.position - b.position).map(leaderEntry),
  };
}

function leaderEntry(p) {
  return {
    playerId: p.id, name: p.name, position: p.position,
    totalTime: p.totalTime, currentLapTime: p.currentLapTime,
    pitCount: p.pitCount || 0, tyre: p.tyre,
    gapToLeader: p.gapToLeader || 0, gapToAhead: p.gapToAhead || 0,
    tyreAge: p.tyreAge || 0, fuelLoad: p.fuelLoad,
  };
}

// ─── OVERTAKING ──────────────────────────────────────────────────────────────

function processOvertakes(players, circuit, rand) {
  const sorted = players.slice().sort((a, b) => a.position - b.position);
  const events = [];

  for (let i = 1; i < sorted.length; i++) {
    const att = sorted[i], def = sorted[i - 1];
    const gap = att.gapToAhead ?? (att.totalTime - def.totalTime);
    if (gap > 1.0 || gap <= 0) continue;
    const diff = def.currentLapTime - att.currentLapTime;
    if (diff <= 0) continue;

    let chance = (diff / 1.0) * circuit.overtakeDifficulty * (att.racecraft ?? 0.75);
    if (gap < DRS_GAP) chance *= 1.4;
    if ((def.tyreAge ?? 0) - (att.tyreAge ?? 0) > 10) chance *= 1.3;
    chance = Math.min(chance, 0.7);

    if (rand() < chance) {
      const dp = def.position, ap = att.position;
      sorted[i - 1] = { ...def, position: ap };
      sorted[i] = { ...att, position: dp };
      events.push({ type: "overtake", attackerId: att.id, defenderId: def.id });
    }
  }
  return { players: sorted, events };
}

// ─── INCIDENTS / SAFETY CAR ──────────────────────────────────────────────────

function checkIncidents(players, raceState, rand) {
  const out = [];
  for (const d of players) {
    if (!d.isBot) continue;
    const skill = d.adjustedSkill ?? 90;
    if (rand() < (1 - skill / 100) * 0.02) {
      if (rand() < 0.1) {
        out.push({ type: "incident", playerId: d.id, timeLost: r3(3 + rand() * 5) });
        out.push(rand() < 0.3 ? { type: "sc_trigger" } : { type: "vsc_trigger" });
      } else {
        out.push({ type: "error", playerId: d.id, timeLost: r3(0.5 + rand() * 1.5) });
      }
    }
  }
  return out;
}

// ─── GAP CALCULATION ─────────────────────────────────────────────────────────

function recalcGaps(players) {
  const s = players.slice().sort((a, b) => a.totalTime - b.totalTime);
  return s.map((p, i) => ({
    ...p,
    position: i + 1,
    gapToLeader: r3(p.totalTime - s[0].totalTime),
    gapToAhead: i > 0 ? r3(p.totalTime - s[i - 1].totalTime) : 0,
  }));
}

// ─── MAIN SIMULATION TICK ────────────────────────────────────────────────────

export function simulateRaceTick(raceState) {
  const seed = (raceState.rngSeed || 42) + (raceState.currentLap || 0) * 7919;
  const rand = rng(seed);
  const lap = raceState.currentLap + 1;
  const c = raceState.circuit || SPA_CIRCUIT;
  const events = [...raceState.events];

  // 1. Weather
  const ws = updateWeather(raceState);
  if (raceState.weather !== ws.weather)
    events.push({ type: "weather_change", from: raceState.weather, to: ws.weather, lap, timestamp: events.length });

  // 2. Safety car countdown
  let flag = raceState.flag || "green";
  let scLaps = raceState.safetyCarLapsRemaining || 0;
  if (scLaps > 0) {
    scLaps--;
    if (scLaps === 0) { flag = "green"; events.push({ type: "flag_change", to: "green", lap, timestamp: events.length }); }
  }

  // 3. AI pit decisions
  let players = ws.players.map(p =>
    p.isBot ? aiPitDecision(p, { ...ws, flag, currentLap: raceState.currentLap }, rand) : p
  );

  // 4. Pit stops
  players = players.map(p => {
    if (!p.hasRequestedPit) return p;
    events.push({ type: "pit_stop", playerId: p.id, lap, newCompound: p.nextTyreCompound || "M", timestamp: events.length });
    return performPitStop(p, p.nextTyreCompound || "M", lap, { ...raceState, flag, circuit: c });
  });

  // 5. Lap times
  const calcState = { ...ws, circuit: c, flag };
  players = players.map(p => {
    let lt = calculateLapTime(p, calcState);
    if (p.isBot) lt += (rand() - 0.5) * 0.3;
    if (flag === "sc") lt = c.baseLapTime + 15;
    else if (flag === "vsc") lt = Math.max(lt, c.baseLapTime + 5);

    const newFuel = r3(Math.max(0, (p.fuelLoad ?? 100) - FUEL_BURN[p.fuelMode || "push"]));
    const newErs = p.ersMode === "attack"
      ? Math.max(0, (p.ersLapsRemaining ?? ERS_MAX_ATTACK) - 1)
      : p.ersMode === "harvest"
        ? Math.min(ERS_MAX_ATTACK, (p.ersLapsRemaining ?? ERS_MAX_ATTACK) + 0.5)
        : (p.ersLapsRemaining ?? ERS_MAX_ATTACK);

    return {
      ...p,
      currentLapTime: r3(lt),
      totalTime: r3(p.totalTime + lt),
      tyreAge: p.tyreAge + 1,
      tyreWear: tyreWearPct(p.tyre, p.tyreAge + 1, p.setup?.downforce),
      fuelLoad: newFuel,
      ersLapsRemaining: newErs,
      lapTimes: [...(p.lapTimes || []), r3(lt)],
    };
  });

  // 6. Positions by total time
  players = recalcGaps(players);

  // 7. Overtaking
  if (flag === "green") {
    const ov = processOvertakes(players, c, rand);
    players = ov.players;
    ov.events.forEach(e => events.push({ ...e, lap, timestamp: events.length }));
  }

  // 8. Incidents
  if (flag === "green") {
    const incs = checkIncidents(players, raceState, rand);
    for (const inc of incs) {
      if (inc.type === "error" || inc.type === "incident") {
        players = players.map(p => p.id === inc.playerId
          ? { ...p, totalTime: r3(p.totalTime + inc.timeLost), currentLapTime: r3(p.currentLapTime + inc.timeLost) }
          : p);
        events.push({ ...inc, lap, timestamp: events.length });
      } else if (inc.type === "sc_trigger") {
        flag = "sc"; scLaps = 3 + Math.floor(rand() * 3);
        events.push({ type: "safety_car", lap, duration: scLaps, timestamp: events.length });
        const leader = players.reduce((m, p) => p.totalTime < m.totalTime ? p : m, players[0]);
        players = players.sort((a, b) => a.position - b.position).map((p, i) => ({ ...p, totalTime: r3(leader.totalTime + i * 1.0) }));
      } else if (inc.type === "vsc_trigger") {
        flag = "vsc"; scLaps = 2 + Math.floor(rand() * 2);
        events.push({ type: "vsc", lap, duration: scLaps, timestamp: events.length });
      }
    }
    if (incs.length > 0) players = recalcGaps(players);
  }

  // 9. Fastest lap
  let fastest = raceState.fastestLap;
  for (const p of players) {
    if (!fastest || p.currentLapTime < fastest.time)
      fastest = { driverId: p.id, driverName: p.name, time: p.currentLapTime, lap };
  }

  // 10. Mandatory 2-compound check at finish
  const isLast = lap >= (raceState.totalLaps || 44);
  if (isLast) {
    players = players.map(p => {
      if (new Set(p.compoundsUsed || [p.tyre]).size < 2)
        return { ...p, totalTime: r3(p.totalTime + 30), penalized: true };
      return p;
    });
    players = recalcGaps(players);
  }

  events.push({ type: "lap_complete", lap, timestamp: events.length });

  return {
    ...ws, players, currentLap: lap,
    leaderboard: players.slice().sort((a, b) => a.position - b.position).map(leaderEntry),
    events, flag, safetyCarLapsRemaining: scLaps, fastestLap: fastest,
    rngSeed: raceState.rngSeed, circuit: c,
  };
}
