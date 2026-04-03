// ─── UPGRADED LANDING PAGE ────────────────────────────────────────────────────
// Drop-in replacement for the LandingPage function in app.jsx
// Panel-based navigation — no scroll bleed. Premium F1 aesthetic.

import { useState } from "react";
import RaceHUD from "./components/RaceHUD";
import TrackView from "./components/TrackView";
import { syncRaceStateCalculations } from "./simulation/raceEngine";
import { useRaceController } from "./hooks/useRaceController";
import { usePitSystem } from "./hooks/usePitSystem";

const pitGarageImageSrc = new URL("./components/assets/pit_garage.png", import.meta.url).href;
const f1LogoImageSrc = new URL("./components/assets/New_era_F1_logo.png", import.meta.url).href;

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

const createPlayer = ({
  id,
  name,
  tyre = "M",
  tyreAge = 0,
  tyreWear = 0,
  fuelLoad = 100,
  setup = {},
  drivingStyle = "balanced",
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
  position,
  totalTime,
  currentLapTime,
  hasPitted,
  hasRequestedPit,
  pitCount,
  nextTyreCompound,
  setupLocked,
});

const createSamplePlayers = () => ([
  createPlayer({
    id: "hamilton",
    name: "Lewis Hamilton",
    tyre: "S",
    tyreAge: 4,
    tyreWear: 6,
    fuelLoad: 92,
    setup: { downforce: 64, suspension: 58, rideHeight: 42 },
    drivingStyle: "balanced",
    position: 1,
  }),
  createPlayer({
    id: "verstappen",
    name: "Max Verstappen",
    tyre: "M",
    tyreAge: 3,
    tyreWear: 4,
    fuelLoad: 94,
    setup: { downforce: 57, suspension: 61, rideHeight: 39 },
    drivingStyle: "aggressive",
    position: 2,
  }),
  createPlayer({
    id: "norris",
    name: "Lando Norris",
    tyre: "H",
    tyreAge: 2,
    tyreWear: 2,
    fuelLoad: 96,
    setup: { downforce: 60, suspension: 55, rideHeight: 44 },
    drivingStyle: "conservative",
    position: 3,
  }),
]);

const createInitialRaceState = () => {
  const initialRaceState = {
    players: createSamplePlayers(),
    racePhase: "lobby",
    totalLaps: DEFAULT_TOTAL_LAPS,
    currentLap: 0,
    weather: "dry",
    leaderboard: [],
    events: [],
  };

  return syncRaceStateCalculations(initialRaceState);
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
  .nav-link.active { color:#fff; border-bottom:1px solid #E10600; }
  .nav-link.active::after {
    content:''; position:absolute; bottom:-1px; left:0; right:0;
    height:1px; background:#E10600;
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
    height:3px; background:linear-gradient(90deg,#E10600,rgba(225,6,0,0));
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
    height:2px; background:linear-gradient(90deg,#E10600,transparent);
    transform:scaleX(0); transform-origin:left; transition:transform 0.3s ease;
  }
  .step-item:hover::after { transform:scaleX(1); }

  .stat-block {
    border-left:2px solid rgba(255,255,255,0.06);
    padding-left:20px; transition:border-color 0.2s;
  }
  .stat-block:hover { border-color:#E10600; }

  .tyre-option {
    cursor:pointer; transition:all 0.2s;
    border:1px solid rgba(255,255,255,0.08);
    border-radius:8px; padding:16px 20px;
  }
  .tyre-option:hover { border-color:rgba(255,255,255,0.2); background:rgba(255,255,255,0.03); }
  .tyre-option.selected { border-color:#E10600; background:rgba(225,6,0,0.05); }

  .cta-primary {
    background:#E10600; border:none; border-radius:4px;
    padding:13px 28px; color:#fff;
    font-family:'Barlow Condensed',sans-serif;
    font-weight:700; font-size:13px; letter-spacing:3px;
    cursor:pointer; transition:background 0.15s, transform 0.15s, box-shadow 0.15s;
  }
  .cta-primary:hover { background:#c00400; transform:translateY(-2px); box-shadow:0 12px 28px rgba(225,6,0,0.22); }
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
      linear-gradient(180deg, rgba(205,209,216,0.9) 0%, rgba(176,181,190,0.82) 100%),
      url('${pitGarageImageSrc}') center center / cover no-repeat;
  }

  .section-shell::before {
    content:'';
    position:absolute;
    inset:0;
    background:
      radial-gradient(circle at top left, rgba(225,6,0,0.12), transparent 32%),
      linear-gradient(90deg, rgba(255,255,255,0.52) 1px, transparent 1px),
      linear-gradient(rgba(255,255,255,0.42) 1px, transparent 1px);
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
    background:linear-gradient(180deg, rgba(186,191,200,0.88) 0%, rgba(157,163,173,0.78) 100%);
    border:1px solid rgba(255,255,255,0.18);
    border-radius:30px;
    box-shadow:0 30px 80px rgba(0,0,0,0.18);
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
    background:rgba(7,8,10,0.78);
    backdrop-filter:blur(12px);
    display:flex;
    align-items:center;
    justify-content:center;
    padding:28px;
    animation:fadeIn 0.22s ease;
  }

  .setup-shell {
    width:min(1340px, 100%);
    max-height:calc(100vh - 56px);
    overflow:hidden;
    border-radius:34px;
    border:1px solid rgba(255,255,255,0.18);
    background:
      linear-gradient(180deg, rgba(158,164,175,0.9) 0%, rgba(92,98,108,0.9) 100%),
      url('${pitGarageImageSrc}') center center / cover no-repeat;
    box-shadow:0 40px 90px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.22);
    position:relative;
  }

  .setup-shell::before {
    content:'';
    position:absolute;
    inset:0;
    background:
      linear-gradient(135deg, rgba(255,255,255,0.12), transparent 36%, transparent 65%, rgba(225,6,0,0.08)),
      radial-gradient(circle at top left, rgba(255,255,255,0.22), transparent 36%),
      linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px),
      linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px);
    background-size:auto, auto, 28px 28px, 28px 28px;
    pointer-events:none;
  }

  .setup-content {
    position:relative;
    z-index:1;
    display:flex;
    flex-direction:column;
    max-height:calc(100vh - 56px);
  }

  .setup-header {
    display:flex;
    align-items:flex-start;
    justify-content:space-between;
    gap:24px;
    padding:28px 30px 22px;
    border-bottom:1px solid rgba(255,255,255,0.12);
    background:linear-gradient(180deg, rgba(17,18,21,0.58), rgba(17,18,21,0.18));
  }

  .setup-grid {
    display:grid;
    grid-template-columns:repeat(auto-fit, minmax(310px, 1fr));
    gap:22px;
    padding:24px 30px 30px;
    overflow:auto;
  }

  .setup-card {
    position:relative;
    border-radius:28px;
    border:1px solid rgba(255,255,255,0.12);
    background:linear-gradient(180deg, rgba(18,19,23,0.94) 0%, rgba(29,31,36,0.92) 100%);
    box-shadow:0 24px 60px rgba(0,0,0,0.28);
    padding:22px;
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

  .setup-footer {
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:18px;
    padding:22px 30px 28px;
    border-top:1px solid rgba(255,255,255,0.1);
    background:linear-gradient(180deg, rgba(17,18,21,0.16), rgba(17,18,21,0.45));
  }

  @media (max-width: 900px) {
    .setup-header,
    .setup-footer {
      flex-direction:column;
      align-items:stretch;
    }

    .setup-tyre-grid,
    .setup-style-grid {
      grid-template-columns:1fr;
    }
  }

`;

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

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

function SetupSlider({ label, value, onChange, minLabel, maxLabel, unit = "%", disabled = false }) {
  return (
    <div className="setup-slider">
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:12, letterSpacing:2.6, color:"rgba(255,255,255,0.72)", textTransform:"uppercase" }}>{label}</div>
        <div style={{ minWidth:62, textAlign:"right", fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:1.2, color:"#fff", lineHeight:1 }}>{value}{unit}</div>
      </div>
      <input
        className="setup-range"
        type="range"
        min="0"
        max="100"
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

function PlayerSetupCard({ player, onUpdatePlayer }) {
  const disabled = player.setupLocked;

  return (
    <div className="setup-card">
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:18 }}>
        <div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, letterSpacing:3.2, color:"#E10600", textTransform:"uppercase", marginBottom:6 }}>
            Driver {String(player.position).padStart(2, "0")}
          </div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:38, color:"#fff", lineHeight:0.95, letterSpacing:1.4 }}>
            {player.name}
          </div>
        </div>
        <div className="setup-chip">{player.setupLocked ? "Locked" : "Editable"}</div>
      </div>

      <div className="setup-chip-row">
        <div className="setup-chip">Tyre Age {player.tyreAge}L</div>
        <div className="setup-chip">Wear {player.tyreWear}%</div>
        <div className="setup-chip">Style {player.drivingStyle}</div>
      </div>

      <div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, letterSpacing:2.8, color:"rgba(255,255,255,0.58)", textTransform:"uppercase", marginBottom:10 }}>
          Tyre Compound
        </div>
        <div className="setup-tyre-grid">
          {["S", "M", "H"].map((compound) => {
            const compoundMeta = TYRE_COMPOUNDS[compound];
            const isActive = player.tyre === compound;

            return (
              <button
                key={compound}
                type="button"
                className={`setup-choice${isActive ? " active" : ""}`}
                disabled={disabled}
                onClick={() => onUpdatePlayer(player.id, { tyre: compound })}
                style={{
                  borderColor: isActive ? compoundMeta.color : "rgba(255,255,255,0.12)",
                  background: isActive
                    ? `linear-gradient(180deg, ${compoundMeta.color}22 0%, rgba(255,255,255,0.05) 100%)`
                    : "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
                }}
              >
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:34, lineHeight:1, letterSpacing:1.5, color:compoundMeta.color }}>{compound}</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, letterSpacing:2.2, color:"rgba(255,255,255,0.68)", textTransform:"uppercase", marginTop:6 }}>
                  {compoundMeta.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <SetupSlider
        label="Fuel Load"
        value={player.fuelLoad}
        onChange={(value) => onUpdatePlayer(player.id, { fuelLoad: value })}
        minLabel="Trimmed"
        maxLabel="Heavy"
        disabled={disabled}
      />

      <SetupSlider
        label="Downforce"
        value={player.setup.downforce}
        onChange={(value) => onUpdatePlayer(player.id, { setup: { downforce: value } })}
        minLabel="Low Drag"
        maxLabel="High Grip"
        disabled={disabled}
      />

      <SetupSlider
        label="Suspension"
        value={player.setup.suspension}
        onChange={(value) => onUpdatePlayer(player.id, { setup: { suspension: value } })}
        minLabel="Soft"
        maxLabel="Stiff"
        disabled={disabled}
      />

      <SetupSlider
        label="Ride Height"
        value={player.setup.rideHeight}
        onChange={(value) => onUpdatePlayer(player.id, { setup: { rideHeight: value } })}
        minLabel="Low"
        maxLabel="High"
        disabled={disabled}
      />

      <div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, letterSpacing:2.8, color:"rgba(255,255,255,0.58)", textTransform:"uppercase", marginBottom:10 }}>
          Driving Style
        </div>
        <div className="setup-style-grid">
          {["aggressive", "balanced", "conservative"].map((style) => {
            const isActive = player.drivingStyle === style;

            return (
              <button
                key={style}
                type="button"
                className={`setup-choice${isActive ? " active" : ""}`}
                disabled={disabled}
                onClick={() => onUpdatePlayer(player.id, { drivingStyle: style })}
                style={{
                  borderColor: isActive ? "rgba(225,6,0,0.72)" : "rgba(255,255,255,0.12)",
                  background: isActive
                    ? "linear-gradient(180deg, rgba(225,6,0,0.22) 0%, rgba(255,255,255,0.04) 100%)"
                    : "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
                }}
              >
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, lineHeight:1, letterSpacing:1.1, color:"#fff", textTransform:"uppercase" }}>
                  {style}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StrategySetupPanel({ raceState, onClose, onUpdatePlayer, onConfirmSetup }) {
  return (
    <div className="setup-overlay" onClick={onClose}>
      <div className="setup-shell" onClick={(event) => event.stopPropagation()}>
        <div className="setup-content">
          <div className="setup-header">
            <div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:11, letterSpacing:4, color:"#E10600", textTransform:"uppercase", marginBottom:8 }}>
                Setup Phase
              </div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(38px, 5vw, 64px)", lineHeight:0.92, letterSpacing:1.5, color:"#fff", marginBottom:10 }}>
                Race Strategy Control
              </div>
              <div style={{ maxWidth:760, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:500, fontSize:17, lineHeight:1.45, color:"rgba(255,255,255,0.76)" }}>
                Dial in compounds, fuel, balance, and driving intent for each player before the first lap. Nothing random, just clean strategic inputs locked before the race begins.
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

          <div className="setup-grid">
            {raceState.players.map((player) => (
              <PlayerSetupCard
                key={player.id}
                player={player}
                onUpdatePlayer={onUpdatePlayer}
              />
            ))}
          </div>

          <div className="setup-footer">
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              <div className="setup-chip">Phase {raceState.racePhase}</div>
              <div className="setup-chip">Drivers {raceState.players.length}</div>
              <div className="setup-chip">Weather {raceState.weather.replace("_", " ")}</div>
              <div className="setup-chip">Laps {raceState.totalLaps}</div>
            </div>

            <div style={{ display:"flex", gap:12, flexWrap:"wrap", justifyContent:"flex-end" }}>
              <button type="button" className="cta-ghost" onClick={onClose}>Back</button>
              <button type="button" className="cta-primary" onClick={onConfirmSetup}>Confirm Setup</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HERO / HOME SECTION ──────────────────────────────────────────────────────
// (unchanged from original — just wraps the pit garage hero)

// ─── MAIN LANDING PAGE EXPORT ─────────────────────────────────────────────────
export function LandingPage({
  onCreateRoom,
  onJoinRoom,
  pitGarageSrc = pitGarageImageSrc,
  f1LogoSrc = f1LogoImageSrc,
}) {
  const [raceState, setRaceState] = useState(createInitialRaceState);
  const [activeSection, setActiveSection] = useState("home");
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const { playbackProgress } = useRaceController(raceState, setRaceState);
  const { requestPit, selectPitTyre } = usePitSystem(setRaceState);

  const handleOpenSetup = () => {
    setRaceState((previousState) => syncRaceStateCalculations({
      ...previousState,
      racePhase: "setup",
      players: previousState.players.map((player) => ({
        ...player,
        setupLocked: false,
      })),
    }));
    setActiveSection("home");
  };

  const handleCloseSetup = () => {
    setRaceState((previousState) => ({
      ...previousState,
      racePhase: "lobby",
    }));
  };

  const handlePlayerSetupChange = (playerId, updates) => {
    setRaceState((previousState) => syncRaceStateCalculations({
      ...previousState,
      players: previousState.players.map((player) => {
        if (player.id !== playerId || player.setupLocked) {
          return player;
        }

        return {
          ...player,
          ...updates,
          setup: {
            ...player.setup,
            ...(updates.setup ?? {}),
          },
        };
      }),
    }));
  };

  const handleConfirmSetup = () => {
    let nextRaceState;

    setRaceState((previousState) => {
      nextRaceState = syncRaceStateCalculations({
        ...previousState,
        racePhase: "racing",
        players: previousState.players.map((player) => ({
          ...player,
          setupLocked: true,
        })),
      });

      return nextRaceState;
    });

    if (typeof onCreateRoom === "function") {
      onCreateRoom(nextRaceState);
    }
  };

  const handleJoin = () => {
    const clean = joinCode.trim().toUpperCase();
    if (clean.length < 4) { setJoinError("Enter a valid room code"); return; }
    if (typeof onJoinRoom === "function") {
      onJoinRoom(clean);
    }
  };

  const sections = ["How It Works", "Guide", "Features", "About"];
  const sectionKey = s => s.toLowerCase().replace(/\s+/g, "-");
  const isRaceVisualActive = raceState.racePhase === "racing" || raceState.racePhase === "finished";

  return (
    <div style={{ minHeight:"100vh", background:"#0d0d0d", fontFamily:"'Barlow Condensed',sans-serif", position:"relative", overflow:"hidden", height:"100vh" }}>
      <style>{LANDING_STYLES}</style>

      {/* ── NAV ── */}
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
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:14, cursor:"pointer" }} onClick={() => setActiveSection("home")}>
          {f1LogoSrc && <img src={f1LogoSrc} alt="F1" style={{ height:44, width:"auto", filter:"drop-shadow(0 6px 14px rgba(225,6,0,0.22))" }} />}
          <div style={{ width:1, height:28, background:"rgba(255,255,255,0.24)" }} />
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:15, letterSpacing:4.8, color:"rgba(255,255,255,0.9)", textTransform:"uppercase" }}>Race Simulator</span>
        </div>

        {/* Nav links */}
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

      {/* ── SECTIONS CONTAINER ── */}
      <div style={{ position:"relative", width:"100%", height:"100vh", overflow:"hidden" }}>

        {isRaceVisualActive && (
          <div style={{ position:"absolute", inset:0, padding:"122px 28px 28px", animation:"fadeIn 0.35s ease" }}>
            <div style={{ position:"relative", width:"100%", height:"100%" }}>
              <TrackView raceState={raceState} playbackProgress={raceState.racePhase === "finished" ? 1 : playbackProgress} />
              <RaceHUD
                raceState={raceState}
                playbackProgress={playbackProgress}
                onRequestPit={requestPit}
                onSelectTyre={selectPitTyre}
              />
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
              background: `#0d0d0d url(${pitGarageSrc}) center center / cover no-repeat`,
              transformOrigin:"center",
            }}
          >
            <div style={{ position:"absolute", inset:0, backdropFilter:"blur(2.5px)", background:"rgba(255,255,255,0.03)", pointerEvents:"none" }} />
            <div style={{ position:"absolute", inset:-20, background:`url(${pitGarageSrc}) center center / cover no-repeat`, animation:"heroDrift 14s ease-in-out infinite", opacity:0.24, mixBlendMode:"soft-light", filter:"blur(5px)", pointerEvents:"none" }} />
            <div style={{ position:"absolute", inset:0, background:"radial-gradient(circle at 50% 42%, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 22%, transparent 52%)", animation:"heroGlow 7s ease-in-out infinite", pointerEvents:"none" }} />
            <div style={{ position:"absolute", top:0, bottom:0, width:"24%", background:"linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)", filter:"blur(20px)", animation:"heroSweep 7.5s ease-in-out infinite", pointerEvents:"none" }} />
            <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(rgba(255,255,255,0.14) 0.8px, transparent 0.8px)", backgroundSize:"18px 18px", opacity:0.16, mixBlendMode:"soft-light", pointerEvents:"none" }} />
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 32%, transparent 70%, rgba(225,6,0,0.05) 100%)", pointerEvents:"none" }} />
            {/* Overlays */}
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, rgba(255,255,255,0.08) 0%, transparent 18%, transparent 58%, rgba(0,0,0,0.64) 100%)", pointerEvents:"none" }} />
            <div style={{ position:"absolute", inset:0, background:"radial-gradient(circle at center, transparent 28%, rgba(0,0,0,0.12) 72%, rgba(0,0,0,0.36) 100%)", pointerEvents:"none" }} />

            <div style={{ position:"absolute", left:"50%", top:"44%", transform:"translate(-50%, -50%)", textAlign:"center", zIndex:2, pointerEvents:"none", animation:"heroTitleIn 0.85s ease both" }}>
              <div style={{ position:"relative", display:"inline-block", padding:"20px 34px 18px", borderRadius:26, background:"linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 100%)", border:"1px solid rgba(255,255,255,0.2)", backdropFilter:"blur(14px)", boxShadow:"0 18px 44px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.18)" }}>
                <div style={{ position:"absolute", inset:0, borderRadius:26, background:"linear-gradient(135deg, rgba(255,255,255,0.14), transparent 42%, transparent 70%, rgba(225,6,0,0.06))", pointerEvents:"none" }} />
                <div style={{ position:"absolute", left:16, right:16, top:9, height:1, background:"linear-gradient(90deg, transparent, rgba(255,255,255,0.36), transparent)", pointerEvents:"none" }} />
                <div style={{ position:"absolute", left:18, right:18, bottom:9, height:1, background:"linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)", pointerEvents:"none" }} />
                <div className="hero-center-title">OUTSMART THE GRID</div>
              </div>
            </div>

            <div style={{ position:"absolute", left:"100%", top:"58%", transform:"translateX(-50%)", display:"flex", gap:18, zIndex:3, animation:"fadeInUp 0.9s ease 0.18s both" }}>
              <div className="hero-action" onClick={() => setShowJoin(true)}>
                <div className="hero-action-icon">IN</div>
                <div className="hero-action-copy">
                  <div className="hero-action-title">JOIN</div>
                  <div className="hero-action-sub">Enter Existing Room</div>
                </div>
              </div>
              <div className="hero-action primary" onClick={handleOpenSetup}>
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
            <div onClick={handleOpenSetup} style={{ position:"absolute", bottom:56, right:52, textAlign:"right", cursor:"pointer", animation:"fadeInUp 0.7s ease 0.45s both", zIndex:3 }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(46px,6vw,84px)", color:"#fff", lineHeight:0.9, letterSpacing:"0.04em", transition:"color 0.2s, transform 0.2s", textShadow:"0 12px 28px rgba(0,0,0,0.24)" }}
                onMouseEnter={e => e.currentTarget.style.color="#E10600"}
                onMouseLeave={e => e.currentTarget.style.color="#fff"}
              >CREATE</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:"clamp(12px,1.4vw,18px)", color:"rgba(255,255,255,0.58)", letterSpacing:4, marginTop:8 }}>ROOM</div>
            </div>

            {/* Bottom links */}
            <div style={{ position:"absolute", bottom:22, left:0, right:0, display:"flex", justifyContent:"center", gap:48, animation:"fadeIn 0.8s ease 0.7s both", zIndex:3 }}>
              {["Standings","Latest News","Latest Videos","Timings"].map(l => (
                <span key={l} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:11, letterSpacing:3, color:"rgba(255,255,255,0.42)", cursor:"pointer", textTransform:"uppercase", transition:"color 0.15s, transform 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.color="rgba(255,255,255,0.7)"}
                  onMouseLeave={e => e.currentTarget.style.color="rgba(255,255,255,0.35)"}
                >{l} →</span>
              ))}
            </div>
          </div>
        )}

        {/* HOW IT WORKS */}
        {!isRaceVisualActive && activeSection === "how-it-works" && (
          <div className="section-panel" style={{ paddingTop:62 }}>
            <HowItWorksSection onCreateRoom={handleOpenSetup} onShowJoin={() => setShowJoin(true)} />
          </div>
        )}

        {/* GUIDE */}
        {!isRaceVisualActive && activeSection === "guide" && (
          <div className="section-panel" style={{ paddingTop:62 }}>
            <GuideSection onCreateRoom={handleOpenSetup} onShowJoin={() => setShowJoin(true)} />
          </div>
        )}

        {/* FEATURES */}
        {!isRaceVisualActive && activeSection === "features" && (
          <div className="section-panel" style={{ paddingTop:62 }}>
            <FeaturesSection onCreateRoom={handleOpenSetup} onShowJoin={() => setShowJoin(true)} />
          </div>
        )}

        {/* ABOUT */}
        {!isRaceVisualActive && activeSection === "about" && (
          <div className="section-panel" style={{ paddingTop:62 }}>
            <AboutSection onCreateRoom={handleOpenSetup} onShowJoin={() => setShowJoin(true)} />
          </div>
        )}
      </div>

      {raceState.racePhase === "setup" && (
        <StrategySetupPanel
          raceState={raceState}
          onClose={handleCloseSetup}
          onUpdatePlayer={handlePlayerSetupChange}
          onConfirmSetup={handleConfirmSetup}
        />
      )}

      {/* ── JOIN MODAL ── */}
      {showJoin && (
        <div
          style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", animation:"fadeIn 0.2s ease" }}
          onClick={() => { setShowJoin(false); setJoinError(""); setJoinCode(""); }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background:"#111", border:"1px solid rgba(255,255,255,0.1)", borderRadius:16, padding:"36px 40px", width:"min(440px,92vw)", animation:"slideUp 0.3s ease" }}
          >
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:11, letterSpacing:3, color:"#E10600", marginBottom:6 }}>MULTIPLAYER</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, color:"#fff", marginBottom:24, letterSpacing:1 }}>Join a Room</div>
            <div style={{ marginBottom:8, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:500, fontSize:11, letterSpacing:2, color:"rgba(255,255,255,0.4)" }}>ROOM CODE</div>
            <input
              value={joinCode}
              onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError(""); }}
              onKeyDown={e => e.key === "Enter" && handleJoin()}
              placeholder="e.g.  SPA-4829"
              maxLength={8}
              style={{ width:"100%", background:"rgba(255,255,255,0.06)", border:`1px solid ${joinError ? "#E10600" : "rgba(255,255,255,0.12)"}`, borderRadius:8, padding:"14px 18px", color:"#fff", fontSize:22, fontFamily:"'Bebas Neue',sans-serif", letterSpacing:3, outline:"none", caretColor:"#E10600", boxSizing:"border-box" }}
            />
            {joinError && <div style={{ color:"#E10600", fontSize:11, marginTop:6, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:1 }}>{joinError}</div>}
            <button
              onClick={handleJoin}
              style={{ width:"100%", marginTop:20, background:"#E10600", border:"none", borderRadius:8, padding:"14px", color:"#fff", fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:15, letterSpacing:3, cursor:"pointer", transition:"background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background="#c00400"}
              onMouseLeave={e => e.currentTarget.style.background="#E10600"}
            >JOIN ROOM →</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPage;
