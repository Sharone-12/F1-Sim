import { useState, useEffect, useRef, useCallback } from "react";
import F1Logo from "../components/F1Logo";
import TeamLogo from "../components/TeamLogo";
import TyreBadge from "../components/TyreBadge";
import { DRIVERS, CIRCUITS, TEAMS, TYRE_COMPOUNDS } from "../constants";

// ── Local fallback simulation (used when backend is unavailable) ──────────────
function runLocalSim(positions, tyres, fastestLap, totalLaps, lapNum, pitStops) {
  const updated = [...positions];
  const newGaps = [];
  let newTyres = [...tyres];
  let currentFlag = "green";
  let currentFlagMsg = "";
  const newEvents = [];

  const eventRoll = Math.random();
  if (eventRoll < 0.01 && lapNum > 3 && lapNum < totalLaps - 5) {
    currentFlag = "red";
    currentFlagMsg = "Session Stopped";
    newEvents.push({ lap: lapNum, type: "red", msg: "RED FLAG - Session Stopped" });
  } else if (eventRoll < 0.04 && lapNum > 2) {
    currentFlag = "safety";
    currentFlagMsg = `Lap Incident - Lap ${lapNum}/${totalLaps}`;
    newEvents.push({ lap: lapNum, type: "safety", msg: `Safety Car - Lap ${lapNum}` });
  } else if (eventRoll < 0.08) {
    currentFlag = "yellow";
    currentFlagMsg = "Yellow Flag - Caution";
  }

  let newFastestLap = { ...fastestLap };
  for (let i = 0; i < updated.length; i++) {
    const driver = updated[i];
    const tyreCompound = newTyres[i];
    const tyreDeg = TYRE_COMPOUNDS[tyreCompound]?.deg || 1.0;
    const lapTime = 85 + (100 - driver.skill) * 0.3 + (Math.random() * 2 - 1) + (tyreDeg * lapNum * 0.01);

    if (tyreCompound === "S" && lapNum > 15 && Math.random() < 0.03) {
      newTyres[i] = "H";
      newEvents.push({ lap: lapNum, type: "pit", msg: `${driver.abbr} pits for Hard tyres` });
    } else if (tyreCompound === "M" && lapNum > 25 && Math.random() < 0.025) {
      newTyres[i] = "H";
      newEvents.push({ lap: lapNum, type: "pit", msg: `${driver.abbr} pits for Hard tyres` });
    }

    if (!newFastestLap.time || lapTime < newFastestLap.time_s) {
      const mins = Math.floor(lapTime / 60);
      const secs = (lapTime % 60).toFixed(3);
      newFastestLap = {
        driver: driver.abbr, team: driver.team,
        time: `${mins}:${secs.padStart(6, "0")}`, time_s: lapTime,
      };
    }

    newGaps.push(i === 0 ? 0 : parseFloat((Math.random() * 1.5 + 0.1).toFixed(3)));
  }

  if (currentFlag === "green") {
    for (let i = 1; i < updated.length; i++) {
      if (Math.random() < 0.03 * (1 + (updated[i].skill - updated[i - 1].skill) / 50)) {
        [updated[i], updated[i - 1]] = [updated[i - 1], updated[i]];
        [newTyres[i], newTyres[i - 1]] = [newTyres[i - 1], newTyres[i]];
        if (i === 1) {
          newEvents.push({ lap: lapNum, type: "overtake", msg: `${updated[i - 1].abbr} overtakes ${updated[i].abbr} for P1!` });
        }
      }
    }
  }

  return {
    positions: updated,
    gaps: newGaps,
    tyres: newTyres,
    flag: currentFlag,
    flagMessage: currentFlagMsg,
    fastestLap: newFastestLap,
    events: newEvents,
    pitStopDelta: Object.fromEntries(
      newEvents.filter(e => e.type === "pit").map(e => [e.msg.split(" ")[0], 1])
    ),
  };
}

// ── Converts backend sim data to frontend state format ─────────────────────
function backendLapToState(lapData, prevPitStops) {
  if (!lapData) return null;
  const positions = lapData.positions.map(p => ({
    abbr: p.driver,
    name: p.driver,
    team: p.team,
    skill: 85, // not used in display
    color: p.team_color,
  }));
  const gaps = lapData.positions.map(p => p.gap ?? 0);
  // Map SOFT/MEDIUM/HARD → S/M/H for TyreBadge
  const tyreMap = { SOFT: "S", MEDIUM: "M", HARD: "H" };
  const tyres = lapData.positions.map(p => tyreMap[p.tyre] ?? p.tyre?.[0] ?? "M");
  const pitStops = { ...prevPitStops };
  lapData.positions.forEach(p => { pitStops[p.driver] = p.pits; });
  return { positions, gaps, tyres, pitStops, flag: lapData.flag, flagMessage: "" };
}

// ─────────────────────────────────────────────────────────────────────────────

export default function RaceSimPage({ circuit, circuitData: circuitDataProp, onFinish }) {
  const circuitInfo = circuitDataProp ?? CIRCUITS[circuit] ?? CIRCUITS[0];
  const totalLaps = circuitInfo.laps;

  const [lap, setLap] = useState(0);
  const [positions, setPositions] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [tyres, setTyres] = useState([]);
  const [flag, setFlag] = useState("green");
  const [flagMessage, setFlagMessage] = useState("");
  const [fastestLap, setFastestLap] = useState({ driver: null, time: null });
  const [raceStarted, setRaceStarted] = useState(false);
  const [raceFinished, setRaceFinished] = useState(false);
  const [speed, setSpeed] = useState(200);
  const [pitStops, setPitStops] = useState({});
  const [events, setEvents] = useState([]);
  const [loadingBackend, setLoadingBackend] = useState(false);

  // Backend sim data (pre-loaded laps array)
  const backendLaps = useRef(null);
  const intervalRef = useRef(null);

  // ── Initialize ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const shuffled = [...DRIVERS].sort((a, b) => (b.skill + Math.random() * 10) - (a.skill + Math.random() * 10));
    setPositions(shuffled);
    setGaps(shuffled.map(() => 0));
    setTyres(shuffled.map(() => Math.random() > 0.5 ? "S" : "M"));
    setPitStops(Object.fromEntries(shuffled.map(d => [d.abbr, 0])));
    backendLaps.current = null;

    // Try to pre-fetch sim from backend
    setLoadingBackend(true);
    fetch("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ circuit: circuitInfo.name, year: 2024 }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.laps?.length) {
          backendLaps.current = data.laps;
          // Seed initial display from lap 1
          const state = backendLapToState(data.laps[0], {});
          if (state) {
            setPositions(state.positions);
            setGaps(state.gaps);
            setTyres(state.tyres);
            setPitStops(state.pitStops);
          }
          // Seed fastest lap if present
          if (data.fastest_lap?.driver) {
            setFastestLap(data.fastest_lap);
          }
        }
      })
      .catch(() => {/* use local sim */})
      .finally(() => setLoadingBackend(false));
  }, [circuit]);

  // ── Tick ───────────────────────────────────────────────────────────────────
  const simulateLap = useCallback(() => {
    setLap(prev => {
      const newLap = prev + 1;
      if (newLap > totalLaps) {
        setRaceFinished(true);
        return prev;
      }

      if (backendLaps.current && backendLaps.current[newLap - 1]) {
        // Use backend data
        const lapData = backendLaps.current[newLap - 1];
        setPitStops(prev => {
          const state = backendLapToState(lapData, prev);
          setPositions(state.positions);
          setGaps(state.gaps);
          setTyres(state.tyres);
          setFlag(lapData.flag || "green");
          return state.pitStops;
        });
        // Collect events from backend
        // (backend events are in the top-level array; we already set them on load)
      } else {
        // Local fallback
        setPositions(prevPos => {
          const result = runLocalSim(prevPos, tyres, fastestLap, totalLaps, newLap, pitStops);
          setGaps(result.gaps);
          setTyres(result.tyres);
          setFlag(result.flag);
          setFlagMessage(result.flagMessage);
          setFastestLap(result.fastestLap);
          setEvents(e => [...e, ...result.events]);
          setPitStops(prev => {
            const updated = { ...prev };
            Object.keys(result.pitStopDelta).forEach(abbr => {
              updated[abbr] = (updated[abbr] || 0) + result.pitStopDelta[abbr];
            });
            return updated;
          });
          return result.positions;
        });
      }

      return newLap;
    });
  }, [totalLaps, tyres, fastestLap, pitStops]);

  // Seed events from backend on load
  useEffect(() => {
    if (backendLaps.current === null) return;
    // This runs once when backendLaps is populated; handled in fetch above
  }, []);

  useEffect(() => {
    if (raceStarted && !raceFinished) {
      intervalRef.current = setInterval(simulateLap, speed);
      return () => clearInterval(intervalRef.current);
    }
  }, [raceStarted, raceFinished, simulateLap, speed]);

  useEffect(() => {
    if (raceFinished && intervalRef.current) {
      clearInterval(intervalRef.current);
      // Gather all events from backend if available
      const allEvents = backendLaps.current
        ? [] // backend events handled separately
        : events;
      setTimeout(() => onFinish({ positions, gaps, tyres, fastestLap, pitStops, events: allEvents, circuit, circuitData: circuitInfo }), 2000);
    }
  }, [raceFinished]);

  const flagColors = {
    green:  { bg: "#00D455", text: "#000", label: "GREEN FLAG",  sub: "Track Clear" },
    yellow: { bg: "#FFD700", text: "#000", label: "YELLOW FLAG", sub: "Caution" },
    red:    { bg: "#E10600", text: "#fff", label: "RED FLAG",    sub: "Session Stopped" },
    safety: { bg: "#FFD700", text: "#000", label: "SAFETY CAR",  sub: flagMessage },
  };

  const progress = totalLaps > 0 ? (lap / totalLaps) * 100 : 0;

  return (
    <div style={{
      minHeight: "100vh", background: "#0F0F13",
      fontFamily: "'Titillium Web', 'Segoe UI', sans-serif", color: "#fff",
      padding: "20px 24px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <F1Logo size={42} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, opacity: 0.5 }}>RACE</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1 }}>{circuitInfo.name}</div>
          </div>
          {loadingBackend && (
            <span style={{ fontSize: 10, opacity: 0.4, letterSpacing: 1 }}>Loading real data…</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "8px 20px", textAlign: "center",
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, opacity: 0.4 }}>LAP</div>
            <div style={{ fontSize: 26, fontWeight: 900 }}>{lap}<span style={{ opacity: 0.4, fontSize: 16 }}>/{totalLaps}</span></div>
          </div>
          {!raceStarted ? (
            <button onClick={() => setRaceStarted(true)} style={{
              background: "#E10600", color: "#fff", border: "none", borderRadius: 10,
              padding: "12px 32px", fontSize: 15, fontWeight: 800, letterSpacing: 2, cursor: "pointer",
            }}>
              LIGHTS OUT ▶
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              {[100, 200, 500].map(s => (
                <button key={s} onClick={() => setSpeed(s)} style={{
                  background: speed === s ? "#E10600" : "rgba(255,255,255,0.08)",
                  color: "#fff", border: "none", borderRadius: 8,
                  padding: "8px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                }}>{s === 100 ? "2x" : s === 200 ? "1x" : "0.5x"}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, marginBottom: 16, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${progress}%`,
          background: raceFinished ? "#00D455" : "#E10600",
          borderRadius: 2, transition: "width 0.3s",
        }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, minHeight: "calc(100vh - 140px)" }}>
        {/* Leaderboard */}
        <div style={{
          background: "rgba(255,255,255,0.03)", borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden",
        }}>
          <div style={{
            display: "grid", gridTemplateColumns: "40px 36px 1fr 100px 50px 40px",
            padding: "12px 16px", fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
            color: "rgba(255,255,255,0.3)", borderBottom: "1px solid rgba(255,255,255,0.06)",
            alignItems: "center",
          }}>
            <span>POS</span><span></span><span>DRIVER</span>
            <span style={{ textAlign: "right" }}>INTERVAL</span>
            <span style={{ textAlign: "center" }}>TYRE</span><span></span>
          </div>
          <div style={{ maxHeight: "calc(100vh - 240px)", overflowY: "auto" }}>
            {positions.map((driver, i) => {
              const teamColor = driver.color ?? TEAMS[driver.team]?.color ?? "#555";
              const isLeader = i === 0;
              return (
                <div key={driver.abbr} style={{
                  display: "grid", gridTemplateColumns: "40px 36px 1fr 100px 50px 40px",
                  padding: "10px 16px", alignItems: "center",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  background: isLeader ? "rgba(225,6,0,0.06)" : i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                  borderLeft: `3px solid ${teamColor}`,
                  transition: "all 0.3s",
                }}>
                  <span style={{ fontSize: 16, fontWeight: 900, opacity: isLeader ? 1 : 0.7 }}>{i + 1}</span>
                  <TeamLogo team={driver.team} size={26} />
                  <div>
                    <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: 0.5 }}>{driver.abbr}</span>
                    <span style={{ fontSize: 11, opacity: 0.4, marginLeft: 8 }}>{driver.team}</span>
                  </div>
                  <span style={{
                    textAlign: "right", fontSize: 14, fontWeight: 700,
                    color: isLeader ? "#FFD700" : "#fff", fontFeatureSettings: "'tnum'",
                  }}>
                    {isLeader ? "Leader" : `+${(gaps[i] ?? 0).toFixed(3)}`}
                  </span>
                  <div style={{ textAlign: "center" }}>
                    <TyreBadge compound={tyres[i] || "M"} />
                  </div>
                  <span style={{ fontSize: 10, opacity: 0.3, textAlign: "center" }}>
                    {pitStops[driver.abbr] || 0}P
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Flag status */}
          <div style={{
            background: (flagColors[flag] || flagColors.green).bg,
            borderRadius: 14, padding: "16px 20px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            transition: "background 0.5s",
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <F1Logo size={28} color={(flagColors[flag] || flagColors.green).text} />
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: (flagColors[flag] || flagColors.green).text, opacity: 0.7 }}>RACE</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: (flagColors[flag] || flagColors.green).text }}>{(flagColors[flag] || flagColors.green).label}</div>
              <div style={{ fontSize: 12, color: (flagColors[flag] || flagColors.green).text, opacity: 0.8 }}>{(flagColors[flag] || flagColors.green).sub}</div>
            </div>
            <div style={{ fontSize: 32, opacity: 0.6 }}>
              {flag === "green" ? "🏁" : flag === "safety" ? "🚗" : flag === "red" ? "⛔" : "⚠️"}
            </div>
          </div>

          {/* Battle for first */}
          {positions.length >= 2 && (
            <div style={{
              background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "16px 20px",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <F1Logo size={24} />
                <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1 }}>Battle for first</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <TeamLogo team={positions[0]?.team} size={28} />
                  <div>
                    <div style={{ fontSize: 10, opacity: 0.4 }}>1.</div>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>{positions[0]?.abbr}</div>
                  </div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#00D455", fontFeatureSettings: "'tnum'" }}>
                  +{(gaps[1] ?? 0).toFixed(3)}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, opacity: 0.4 }}>2.</div>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>{positions[1]?.abbr}</div>
                  </div>
                  <TeamLogo team={positions[1]?.team} size={28} />
                </div>
              </div>
            </div>
          )}

          {/* Fastest lap */}
          {fastestLap.driver && (
            <div style={{
              background: "linear-gradient(135deg, #7B2D8E 0%, #5B1D6E 100%)",
              borderRadius: 14, padding: "16px 20px",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", right: -10, top: -10, opacity: 0.1, fontSize: 100, fontWeight: 900, lineHeight: 1 }}>⏱</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <F1Logo size={24} color="#fff" />
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, opacity: 0.7 }}>RACE</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 2, opacity: 0.8 }}>FASTEST LAP</div>
              <div style={{ fontSize: 32, fontWeight: 900, fontFeatureSettings: "'tnum'" }}>{fastestLap.time}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{fastestLap.driver}</span>
                <TeamLogo team={fastestLap.team} size={20} />
              </div>
            </div>
          )}

          {/* Live events feed */}
          <div style={{
            background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: "16px 20px",
            border: "1px solid rgba(255,255,255,0.06)", flex: 1,
            maxHeight: 300, overflowY: "auto",
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, opacity: 0.4, marginBottom: 10 }}>LIVE FEED</div>
            {events.slice(-12).reverse().map((ev, i) => (
              <div key={i} style={{
                fontSize: 12, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
                display: "flex", gap: 8, alignItems: "center",
              }}>
                <span style={{ fontSize: 10, fontWeight: 800, opacity: 0.3, minWidth: 36 }}>L{ev.lap}</span>
                <span style={{
                  width: 6, height: 6, borderRadius: 3, flexShrink: 0,
                  background: ev.type === "red" ? "#E10600" : ev.type === "safety" ? "#FFD700" : ev.type === "overtake" ? "#00D455" : "#3671C6",
                }} />
                <span style={{ opacity: 0.8 }}>{ev.msg}</span>
              </div>
            ))}
            {events.length === 0 && (
              <div style={{ fontSize: 12, opacity: 0.3, textAlign: "center", padding: 20 }}>
                {raceStarted ? "Waiting for events..." : "Press LIGHTS OUT to begin"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chequered flag overlay */}
      {raceFinished && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 100,
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 60 }}>🏁</div>
            <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: 4, marginTop: 10 }}>CHEQUERED FLAG</div>
            <div style={{ fontSize: 16, opacity: 0.5, marginTop: 8 }}>
              {positions[0]?.name || positions[0]?.abbr} wins the {circuitInfo.name}!
            </div>
            <div style={{ fontSize: 14, opacity: 0.3, marginTop: 16 }}>Loading results...</div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>
    </div>
  );
}
