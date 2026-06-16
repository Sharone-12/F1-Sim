import { useEffect, useRef, useState, useCallback, memo } from "react";
import { TYRE_COMPOUNDS } from "../simulation/raceEngine";

const TRACK_VIEWBOX = { width: 1180, height: 760 };
const SECTOR_BREAKPOINTS = [
  { key: "S1", start: 0,    end: 0.33, color: "rgba(225,6,0,0.82)" },
  { key: "S2", start: 0.33, end: 0.66, color: "rgba(255,194,78,0.72)" },
  { key: "S3", start: 0.66, end: 1,    color: "rgba(112,187,255,0.72)" },
];
const DRIVER_COLORS = ["#E10600", "#27F4D2", "#FF8700", "#3671C6", "#52E252", "#FF87BC"];

const SPA_TRACK_PATH = `
  M 170 628
  C 148 662, 118 676, 110 644
  C 100 608, 118 544, 152 486
  C 188 424, 222 358, 252 298
  C 274 254, 290 230, 320 208
  C 344 190, 362 182, 378 166
  C 394 150, 410 124, 430 96
  C 448 70, 472 62, 496 80
  C 516 94, 532 122, 556 132
  C 594 150, 640 120, 690 84
  C 760 34, 834 22, 880 52
  C 914 76, 930 100, 948 118
  C 972 144, 978 172, 956 192
  C 930 216, 900 198, 872 176
  C 838 148, 804 142, 776 170
  C 744 202, 708 228, 660 248
  C 622 266, 592 286, 584 320
  C 576 356, 588 396, 620 414
  C 654 434, 702 430, 754 428
  C 808 428, 858 432, 898 456
  C 934 478, 952 504, 950 538
  C 946 580, 926 624, 890 636
  C 844 650, 788 640, 742 624
  C 698 608, 666 574, 626 546
  C 586 520, 536 514, 488 524
  C 434 536, 388 562, 336 586
  C 286 608, 250 620, 220 626
  C 194 632, 182 614, 186 590
  C 194 560, 208 530, 196 518
  C 186 508, 176 524, 170 628
`;

const TURN_MARKERS = [
  { label: "La Source",      x: 140, y: 646 },
  { label: "Eau Rouge",      x: 220, y: 470 },
  { label: "Raidillon",      x: 276, y: 392 },
  { label: "Kemmel",         x: 346, y: 308 },
  { label: "Les Combes",     x: 644, y: 112 },
  { label: "Bruxelles",      x: 806, y: 272 },
  { label: "Double Gauche",  x: 676, y: 352 },
  { label: "Les Fagnes",     x: 888, y: 470 },
  { label: "Blanchimont",    x: 548, y: 520 },
  { label: "Bus Stop",       x: 248, y: 566 },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const wrapDistance = (distance, totalLength) => {
  if (!totalLength) return 0;
  return ((distance % totalLength) + totalLength) % totalLength;
};
const shortestDistanceDelta = (from, to, totalLength) => {
  if (!totalLength) return 0;
  let delta = to - from;
  if (delta > totalLength / 2) delta -= totalLength;
  if (delta < -totalLength / 2) delta += totalLength;
  return delta;
};

function getDriverLabel(player) {
  const [firstName, lastName] = player.name.split(" ");
  return lastName ? lastName.toUpperCase() : firstName.toUpperCase();
}

function deriveSpeed(lapTime) {
  if (!Number.isFinite(lapTime) || lapTime <= 0) return null;
  return Math.round((7.004 / lapTime) * 3600);
}

function TrackViewInner({ raceState, lapDurationMs = 1800, cooldownMs = 2600, running = true }) {
  const pathRef = useRef(null);
  const pathLenRef = useRef(0);
  const [pathReady, setPathReady] = useState(false);
  const smoothedRef = useRef({});
  const carGroupRefs = useRef({});
  const raceStateRef = useRef(raceState);
  const lapDurationRef = useRef(lapDurationMs);
  const cooldownRef = useRef(cooldownMs);
  const runningRef = useRef(running);
  // Wall-clock timestamp at which the current lap began — drives the 0→1 sweep
  // internally so we don't depend on a prop blocked by this component's memo.
  const lapStartRef = useRef(performance.now());
  const lapNumberRef = useRef(raceState.currentLap);
  const cooldownStartRef = useRef(0);
  const phaseRef = useRef(raceState.racePhase);

  // Keep refs in sync — no re-renders triggered
  raceStateRef.current = raceState;
  lapDurationRef.current = lapDurationMs;
  cooldownRef.current = cooldownMs;

  // Restart the sweep when the lights go out, or whenever the sim advances a lap.
  if (running && !runningRef.current) {
    lapStartRef.current = performance.now();
  }
  runningRef.current = running;

  if (raceState.currentLap !== lapNumberRef.current) {
    lapNumberRef.current = raceState.currentLap;
    lapStartRef.current = performance.now();
  }

  // Stamp the moment the cooldown begins so trailing cars can run to the line.
  if (raceState.racePhase === "cooldown" && phaseRef.current !== "cooldown") {
    cooldownStartRef.current = performance.now();
  }
  phaseRef.current = raceState.racePhase;

  const setCarRef = useCallback((id, el) => {
    if (el) carGroupRefs.current[id] = el;
  }, []);

  useEffect(() => {
    if (!pathRef.current) return;
    pathLenRef.current = pathRef.current.getTotalLength();
    setPathReady(true);
  }, []);

  const pathLength = pathLenRef.current;

  // rAF animation loop — ALL position math happens here, direct DOM writes
  useEffect(() => {
    if (!pathReady) return undefined;

    let frameId;
    const svgPath = pathRef.current;
    if (!svgPath) return undefined;

    const animate = () => {
      const state = raceStateRef.current;
      const phase = state.racePhase;
      const len = pathLenRef.current;
      const smoothed = smoothedRef.current;
      const players = state.players;
      const finishLaps = state.totalLaps;

      const now = performance.now();
      const racingProgress = !runningRef.current
        ? 0
        : clamp((now - lapStartRef.current) / lapDurationRef.current, 0, 1);
      // How far through the post-leader cooldown we are (0→1).
      const coolFrac = phase === "finished"
        ? 1
        : phase === "cooldown"
          ? clamp((now - cooldownStartRef.current) / cooldownRef.current, 0, 1)
          : 0;

      const leaderTime = players.reduce(
        (lowest, p) => Math.min(lowest, p.totalTime),
        Number.POSITIVE_INFINITY,
      );

      // Largest gap (in laps) — the backmarker reaches the line at coolFrac = 1.
      let maxLapGap = 0;
      if (phase === "cooldown" || phase === "finished") {
        for (const p of players) {
          const lt = p.currentLapTime > 0 ? p.currentLapTime : 90;
          const g = (p.totalTime - leaderTime) / lt;
          if (g > maxLapGap) maxLapGap = g;
        }
      }

      for (let i = 0; i < players.length; i++) {
        const player = players[i];

        // Continuous lap progress: the leader advances currentLap + (0→1) across
        // the tick; everyone else is offset backwards by their time gap expressed
        // in laps. This makes ONE lap = ONE full circuit, and the value increases
        // smoothly across tick boundaries (currentLap+1 picks up where progress
        // left off).
        const lapTime = player.currentLapTime > 0 ? player.currentLapTime : 90;
        const lapGap = (player.totalTime - leaderTime) / lapTime;

        let cumulativeLaps;
        if (phase === "cooldown" || phase === "finished") {
          // Drive every car forward to the finish line (clamped), so the whole
          // field crosses the line before results show — leader first.
          cumulativeLaps = Math.min(finishLaps, finishLaps + coolFrac * maxLapGap - lapGap);
        } else {
          cumulativeLaps = state.currentLap + racingProgress - lapGap;
        }
        const frac = ((cumulativeLaps % 1) + 1) % 1;

        // The SVG path is drawn anti-clockwise; reverse it so cars run clockwise.
        const targetDistance = wrapDistance((1 - frac) * len, len);

        // Light smoothing only to absorb discrete jumps (gap changes, pit stops,
        // overtakes) without lagging the main forward sweep.
        const current = smoothed[player.id];
        let distance;
        if (current == null) {
          distance = targetDistance;
        } else {
          const delta = shortestDistanceDelta(current, targetDistance, len);
          distance = wrapDistance(current + delta * 0.5, len);
        }
        smoothed[player.id] = distance;

        const el = carGroupRefs.current[player.id];
        if (el) {
          const pt = svgPath.getPointAtLength(distance);
          el.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
        }
      }

      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, [pathReady]);

  // carData: metadata only (color, label, gap) — NO position, NO transform
  const leaderTime = raceState.players.reduce(
    (lowest, p) => Math.min(lowest, p.totalTime),
    Number.POSITIVE_INFINITY,
  );
  const displayCars = raceState.players.map((player, index) => ({
    ...player,
    color:         DRIVER_COLORS[index % DRIVER_COLORS.length],
    speed:         deriveSpeed(player.currentLapTime),
    gapFromLeader: player.totalTime - leaderTime,
  }));

  const fastestCurrent = raceState.players.reduce((best, p) => {
    if (!Number.isFinite(p.currentLapTime)) return best;
    return !best || p.currentLapTime < best.currentLapTime ? p : best;
  }, null);

  const top3 = raceState.players
    .slice()
    .sort((a, b) => a.position - b.position)
    .slice(0, Math.min(3, raceState.players.length));

  return (
    /* Transparent outer shell — the app.jsx light background shows through */
    <div style={{ position: "relative", width: "100%", height: "100%" }}>

      {/* ── Center track display panel (intentionally dark — it's a "monitor screen") ── */}
      <div
        style={{
          position: "absolute",
          top: 94, left: 286, right: 318, bottom: 22,
          zIndex: 2,
          borderRadius: 28,
          overflow: "hidden",
          background: "linear-gradient(180deg, rgba(14,17,24,0.96) 0%, rgba(8,11,17,0.98) 100%)",
          border: "1px solid rgba(0,0,0,0.18)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        {/* Subtle inner grid */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
          opacity: 0.4, pointerEvents: "none",
        }} />
        {/* Vignette */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(circle at center, transparent 42%, rgba(0,0,0,0.22) 100%)",
          pointerEvents: "none",
        }} />

        {/* Circuit badge */}
        <div style={{ position: "absolute", top: 18, left: 22, zIndex: 4, display: "flex", gap: 10 }}>
          <div style={{
            padding: "9px 13px",
            borderRadius: 16,
            background: "rgba(6,8,12,0.76)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <div style={{
              fontFamily: "'Barlow Condensed',sans-serif",
              fontWeight: 700, fontSize: 9, letterSpacing: 2.8,
              color: "#E10600", textTransform: "uppercase", marginBottom: 5,
            }}>
              Circuit
            </div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, lineHeight: 0.95, letterSpacing: 1, color: "#fff" }}>
              SPA-FRANCORCHAMPS
            </div>
          </div>
          <div style={{
            padding: "9px 13px",
            borderRadius: 16,
            background: "rgba(6,8,12,0.76)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <div style={{
              fontFamily: "'Barlow Condensed',sans-serif",
              fontWeight: 700, fontSize: 9, letterSpacing: 2.8,
              color: "rgba(255,255,255,0.42)", textTransform: "uppercase", marginBottom: 5,
            }}>
              Live Focus
            </div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, lineHeight: 0.95, letterSpacing: 1, color: "#fff" }}>
              {fastestCurrent ? `${getDriverLabel(fastestCurrent)} PUSHING` : "GRID FORMING"}
            </div>
          </div>
        </div>

        {/* Track SVG */}
        <svg
          viewBox={`0 0 ${TRACK_VIEWBOX.width} ${TRACK_VIEWBOX.height}`}
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <defs>
            <filter id="spa-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="9" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="sector-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="track-metal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="rgba(255,255,255,0.92)" />
              <stop offset="65%"  stopColor="rgba(214,219,228,0.88)" />
              <stop offset="100%" stopColor="rgba(169,177,191,0.86)" />
            </linearGradient>
          </defs>

          {/* Track base layers */}
          <path ref={pathRef} d={SPA_TRACK_PATH} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="56" strokeLinecap="round" strokeLinejoin="round" />
          <path d={SPA_TRACK_PATH} fill="none" stroke="rgba(255,255,255,0.11)" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round" filter="url(#spa-glow)" />
          <path d={SPA_TRACK_PATH} fill="none" stroke="url(#track-metal)" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />

          {/* Sector highlights */}
          {pathLength > 0 && SECTOR_BREAKPOINTS.map((sector) => {
            const segLen = pathLength * (sector.end - sector.start);
            const gapLen = pathLength - segLen;
            return (
              <path
                key={sector.key}
                d={SPA_TRACK_PATH}
                fill="none"
                stroke={sector.color}
                strokeWidth="8"
                strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray={`${segLen} ${gapLen}`}
                strokeDashoffset={-pathLength * sector.start}
                opacity="0.86"
                filter="url(#sector-glow)"
              />
            );
          })}

          {/* Pit lane marker */}
          <g transform="translate(240 548)">
            <rect x="-10" y="-10" width="20" height="20" rx="5" fill="rgba(6,8,12,0.9)" stroke="rgba(255,255,255,0.14)" />
            <path d="M -6 -6 L 6 -6 L 6 6 L -6 6 Z" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="4 3" />
          </g>

          {/* Turn markers */}
          {TURN_MARKERS.map((turn) => (
            <g key={turn.label} transform={`translate(${turn.x} ${turn.y})`}>
              <circle cx="0" cy="0" r="13" fill="rgba(6,8,12,0.88)" stroke="rgba(255,255,255,0.12)" />
              <circle cx="0" cy="0" r="4"  fill="rgba(255,255,255,0.72)" />
              <text x="20" y="4" fill="rgba(255,255,255,0.42)"
                style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 1.2 }}>
                {turn.label}
              </text>
            </g>
          ))}

          {/* Cars — transform is set exclusively by rAF loop, not React */}
          {displayCars.map((player) => (
            <g
              key={player.id}
              ref={(el) => setCarRef(player.id, el)}
            >
              {/* Halo */}
              <circle cx="0" cy="0" r="18" fill={`${player.color}18`} />
              {/* Dot */}
              <circle
                cx="0" cy="0" r="10"
                fill={player.color}
                stroke="rgba(255,255,255,0.92)" strokeWidth="2.5"
                style={{ filter: `drop-shadow(0 0 7px ${player.color}99) drop-shadow(0 6px 14px rgba(0,0,0,0.4))` }}
              />
              {/* Label */}
              <foreignObject x="14" y="-22" width="138" height="48" style={{ overflow: "visible" }}>
                <div style={{
                  display: "inline-flex", flexDirection: "column",
                  padding: "4px 9px 5px",
                  borderRadius: 9,
                  background: "rgba(6,8,12,0.88)",
                  border: `1px solid ${player.color}38`,
                  boxShadow: "0 8px 18px rgba(0,0,0,0.36)",
                  whiteSpace: "nowrap",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, color: player.color, lineHeight: 1 }}>
                      {player.position}
                    </span>
                    <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 11, letterSpacing: 1.8, color: "#fff", lineHeight: 1 }}>
                      {getDriverLabel(player)}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                    {player.gapFromLeader > 0.01 ? (
                      <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 600, fontSize: 9, letterSpacing: 0.8, color: "rgba(255,255,255,0.48)" }}>
                        +{player.gapFromLeader.toFixed(1)}s
                      </span>
                    ) : (
                      <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: 1, color: "#f4c542" }}>
                        LEAD
                      </span>
                    )}
                    {player.speed && (
                      <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: 0.8, color: "rgba(255,255,255,0.54)" }}>
                        {player.speed}km/h
                      </span>
                    )}
                  </div>
                </div>
              </foreignObject>
            </g>
          ))}
        </svg>

        {/* ── Bottom telemetry strip — top 3 live driver cards ── */}
        <div style={{
          position: "absolute", left: 22, right: 22, bottom: 16,
          zIndex: 4,
          display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 10,
        }}>
          {top3.map((driver) => {
            const tyreMeta  = TYRE_COMPOUNDS[driver.tyre] || TYRE_COMPOUNDS.M;
            const tyreLife  = Math.max(0, 100 - driver.tyreWear);
            return (
              <div key={driver.id} style={{
                padding: "11px 13px",
                borderRadius: 16,
                background: "rgba(6,8,12,0.78)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}>
                <div style={{
                  fontFamily: "'Barlow Condensed',sans-serif",
                  fontWeight: 700, fontSize: 10, letterSpacing: 2,
                  color: "rgba(255,255,255,0.42)", textTransform: "uppercase",
                  marginBottom: 7,
                }}>
                  P{driver.position} · {getDriverLabel(driver)}
                </div>
                {/* Tyre bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                  <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 13, color: tyreMeta.color, lineHeight: 1, minWidth: 10 }}>
                    {driver.tyre}
                  </span>
                  <div style={{ flex: 1, height: 4, borderRadius: 999, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${tyreLife}%`,
                      background: tyreMeta.color, borderRadius: 999,
                      transition: "width 0.7s cubic-bezier(0.22,1,0.36,1)",
                    }} />
                  </div>
                  <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.46)", minWidth: 22, textAlign: "right" }}>
                    {Math.round(tyreLife)}%
                  </span>
                </div>
                {/* Fuel bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: 1, color: "rgba(255,255,255,0.3)", minWidth: 10 }}>F</span>
                  <div style={{ flex: 1, height: 3, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${clamp(driver.fuelLoad, 0, 100)}%`,
                      background: driver.fuelLoad < 20 ? "#ef4444" : "#60a5fa",
                      borderRadius: 999,
                      transition: "width 0.7s cubic-bezier(0.22,1,0.36,1)",
                    }} />
                  </div>
                  <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.46)", minWidth: 22, textAlign: "right" }}>
                    {driver.fuelLoad.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default memo(TrackViewInner, (prev, next) => {
  // Re-render on tick boundaries (raceState) or when playback speed changes.
  // Per-frame progress is computed internally in the rAF loop.
  return prev.raceState === next.raceState
    && prev.lapDurationMs === next.lapDurationMs
    && prev.cooldownMs === next.cooldownMs
    && prev.running === next.running;
});
