import { useEffect, useMemo, useRef, useState } from "react";
import TeamLogo from "./TeamLogo";
import { TYRE_COMPOUNDS } from "../simulation/raceEngine";

// F1 logo (same asset used by App.jsx nav)
const f1LogoSrc = new URL("./assets/New_era_F1_logo.png", import.meta.url).href;

// ── Shared panel token ────────────────────────────────────────────────────────
const GLASS = {
  background: "linear-gradient(160deg, rgba(255,255,255,0.92) 0%, rgba(238,241,247,0.86) 100%)",
  border: "1px solid rgba(255,255,255,0.78)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,0.9) inset",
  backdropFilter: "blur(28px)",
};

// Metallic section header (sits above content in each panel)
const SECTION_HDR = {
  borderBottom: "1px solid rgba(0,0,0,0.055)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.68), rgba(245,247,252,0.44))",
  padding: "11px 16px 9px",
};

const TRACK_STATUS_META = {
  racing:   { label: "GREEN FLAG", accent: "#16a34a", dot: "#22c55e" },
  finished: { label: "CHECKERED",  accent: "#ca8a04", dot: "#eab308" },
  default:  { label: "STANDBY",    accent: "#6b7280", dot: "#9ca3af" },
};

// ── Formatters ────────────────────────────────────────────────────────────────
function formatGap(player, leader) {
  if (!leader || player.id === leader.id) return "LEADER";
  return `+${(player.totalTime - leader.totalTime).toFixed(3)}`;
}
function formatLapTime(v) {
  return typeof v === "number" && Number.isFinite(v) ? `${v.toFixed(3)}s` : "--";
}
function formatWeather(w) { return String(w).replace(/_/g, " ").toUpperCase(); }
function deriveSpeed(t) {
  if (!Number.isFinite(t) || t <= 0) return null;
  return Math.round((7.004 / t) * 3600);
}
function formatRaceTime(s) {
  if (!Number.isFinite(s) || s <= 0) return "--:--";
  const m = Math.floor(s / 60), sec = s - m * 60;
  return `${m}:${String(Math.floor(sec)).padStart(2, "0")}.${String(Math.round((sec % 1) * 1000)).padStart(3, "0")}`;
}
function getPitWindowStatus(d) {
  if (d.tyreWear > 80 || d.fuelLoad < 15) return { label: "PIT NOW",    color: "#dc2626" };
  if (d.tyreWear > 60 || d.fuelLoad < 30) return { label: "PIT WINDOW", color: "#b45309" };
  return                                           { label: "STAY OUT",  color: "#16a34a" };
}
function shortName(name) {
  const p = String(name).trim().split(" ");
  return p.length > 1 ? p[p.length - 1].toUpperCase() : p[0]?.toUpperCase?.() || name;
}

// ── Tiny label used in every stat cell ───────────────────────────────────────
function Lbl({ children }) {
  return (
    <div style={{
      fontFamily: "'Barlow Condensed',sans-serif",
      fontWeight: 700, fontSize: 8, letterSpacing: 2,
      color: "rgba(17,17,17,0.4)", textTransform: "uppercase", marginBottom: 3,
      whiteSpace: "nowrap",
    }}>{children}</div>
  );
}

// ── One stat cell used in the top bar ────────────────────────────────────────
function TopCell({ label, value, sub, unit, accent = "#111", dot, padRight = true }) {
  return (
    <div style={{
      padding: padRight ? "0 14px" : "0 0 0 14px",
      borderRight: padRight ? "1px solid rgba(0,0,0,0.065)" : "none",
      height: "100%",
      display: "flex", flexDirection: "column", justifyContent: "center",
      flexShrink: 0,
    }}>
      <Lbl>{label}</Lbl>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {dot && (
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: dot, flexShrink: 0 }} />
        )}
        <div style={{
          fontFamily: "'Bebas Neue',sans-serif",
          fontSize: 20, letterSpacing: 0.8, lineHeight: 1,
          color: accent, whiteSpace: "nowrap",
        }}>
          {value}
        </div>
        {unit && (
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif",
            fontWeight: 600, fontSize: 8, letterSpacing: 1.5,
            color: "rgba(17,17,17,0.36)", textTransform: "uppercase", marginBottom: 1,
          }}>{unit}</div>
        )}
      </div>
      {sub && (
        <div style={{
          fontFamily: "'Barlow Condensed',sans-serif",
          fontWeight: 600, fontSize: 9, letterSpacing: 1,
          color: "rgba(17,17,17,0.48)", textTransform: "uppercase", marginTop: 1,
        }}>{sub}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function RaceHUD({ raceState, onRequestPit, onSelectTyre, onSetFuelMode, onSetErsMode }) {
  const sortedDrivers = useMemo(
    () => raceState.players.slice().sort((a, b) => a.position - b.position),
    [raceState.players],
  );
  const leader = sortedDrivers[0];
  const defaultPlayer = sortedDrivers.find((d) => !d.isBot) || sortedDrivers[0] || null;

  const [selectedDriverId, setSelectedDriverId] = useState(defaultPlayer?.id ?? null);
  const [bestLaps, setBestLaps] = useState({});
  const [posChanges, setPosChanges] = useState({});

  const prevLapRef       = useRef(0);
  const prevPositionsRef = useRef({});
  const posTimerRef      = useRef(null);
  const pitCompoundOptions = ["S", "M", "H", "I", "W"];

  useEffect(() => {
    if (!selectedDriverId && defaultPlayer?.id) { setSelectedDriverId(defaultPlayer.id); return; }
    if (selectedDriverId && !sortedDrivers.some((d) => d.id === selectedDriverId))
      setSelectedDriverId(defaultPlayer?.id ?? null);
  }, [selectedDriverId, defaultPlayer, sortedDrivers]);

  useEffect(() => {
    setBestLaps((prev) => {
      const next = { ...prev };
      raceState.players.forEach((d) => {
        if (!Number.isFinite(d.currentLapTime) || d.currentLapTime <= 0) return;
        next[d.id] = Math.min(prev[d.id] ?? Infinity, d.currentLapTime);
      });
      return next;
    });
  }, [raceState.currentLap, raceState.players]);

  useEffect(() => {
    if (raceState.currentLap > 0 && raceState.currentLap !== prevLapRef.current) {
      const newPos = Object.fromEntries(sortedDrivers.map((d) => [d.id, d.position]));
      if (prevLapRef.current > 0) {
        const ch = {};
        sortedDrivers.forEach((d) => {
          const p = prevPositionsRef.current[d.id];
          if (p != null && p !== d.position) ch[d.id] = p - d.position;
        });
        if (Object.keys(ch).length) {
          setPosChanges(ch);
          clearTimeout(posTimerRef.current);
          posTimerRef.current = setTimeout(() => setPosChanges({}), 3500);
        }
      }
      prevPositionsRef.current = newPos;
      prevLapRef.current = raceState.currentLap;
    }
  }, [raceState.currentLap, sortedDrivers]);

  const fastestLapEntry = useMemo(() => sortedDrivers.reduce((best, d) => {
    const bl = bestLaps[d.id];
    if (!Number.isFinite(bl)) return best;
    return !best || bl < best.time ? { driver: d, time: bl } : best;
  }, null), [bestLaps, sortedDrivers]);

  const sel          = sortedDrivers.find((d) => d.id === selectedDriverId) || defaultPlayer;
  const selBest      = sel ? bestLaps[sel.id] : null;
  const flag = raceState.flag || "green";
  const statusMeta = flag === "sc" ? { label: "SAFETY CAR", accent: "#ca8a04", dot: "#eab308" }
    : flag === "vsc" ? { label: "VSC", accent: "#ca8a04", dot: "#eab308" }
    : TRACK_STATUS_META[raceState.racePhase] || TRACK_STATUS_META.default;
  const selSpeed     = sel ? deriveSpeed(sel.currentLapTime) : null;
  const selDelta     = sel && Number.isFinite(sel.currentLapTime) && Number.isFinite(selBest)
    ? sel.currentLapTime - selBest : null;
  const pitStatus    = sel ? getPitWindowStatus(sel) : null;

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
          SLIM TOP BAR  (top:14, height:52, full width minus 14px padding)
      ════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          position: "absolute",
          top: 14, left: 14, right: 14,
          height: 52,
          zIndex: 8,
          display: "flex",
          alignItems: "stretch",
          ...GLASS,
          borderRadius: 16,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        {/* F1 red pin line — top */}
        <div style={{
          position: "absolute", top: 0, left: 0, width: 96, height: 2,
          background: "#E10600", pointerEvents: "none",
        }} />

        {/* ── F1 logo section ── */}
        <div style={{
          padding: "0 16px",
          borderRight: "1px solid rgba(0,0,0,0.075)",
          display: "flex", alignItems: "center",
          background: "rgba(225,6,0,0.045)",
          flexShrink: 0,
        }}>
          {f1LogoSrc && (
            <img
              src={f1LogoSrc}
              alt="F1"
              style={{ height: 20, width: "auto", filter: "saturate(1.1)" }}
            />
          )}
        </div>

        {/* ── Circuit name ── */}
        <TopCell label="Circuit" value="SPA" sub="Francorchamps" />

        {/* ── Core race stats ── */}
        <TopCell
          label="Lap"
          value={`${Math.min(raceState.currentLap, raceState.totalLaps)} / ${raceState.totalLaps}`}
        />
        <TopCell
          label="Weather"
          value={formatWeather(raceState.weather)}
        />
        <TopCell
          label="Track Status"
          value={statusMeta.label}
          accent={statusMeta.accent}
          dot={statusMeta.dot}
        />
        <TopCell
          label="Fastest Lap"
          value={fastestLapEntry ? shortName(fastestLapEntry.driver.name) : "—"}
          sub={fastestLapEntry ? formatLapTime(fastestLapEntry.time) : undefined}
          accent="#7c3aed"
        />

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* ── Driver telemetry (right group) ── */}
        <TopCell
          label="Speed"
          value={selSpeed ? `${selSpeed}` : "—"}
          unit="km/h"
        />
        <TopCell
          label="Delta"
          value={selDelta != null ? (selDelta >= 0 ? "+" : "") + selDelta.toFixed(3) + "s" : "—"}
          accent={selDelta != null
            ? selDelta > 0.5 ? "#dc2626" : selDelta < -0.5 ? "#16a34a" : "#b45309"
            : "rgba(17,17,17,0.38)"}
        />
        <TopCell
          label="Fuel"
          value={sel ? `${sel.fuelLoad.toFixed(0)}%` : "—"}
          accent={sel && sel.fuelLoad < 20 ? "#dc2626" : "#111"}
        />
        <TopCell
          label="Tyre"
          value={sel ? `${sel.tyre} · ${Math.round(sel.tyreWear)}%` : "—"}
          accent={sel ? TYRE_COMPOUNDS[sel.tyre]?.color || "#111" : "#111"}
          padRight={false}
        />
        <div style={{ width: 14 }} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          TIMING TOWER  (left panel, top:78, width:248)
      ════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          position: "absolute",
          top: 78, bottom: 14, left: 14,
          width: 248,
          zIndex: 8,
          borderRadius: 20,
          overflow: "hidden",
          ...GLASS,
        }}
      >
        {/* Metallic accent line */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: "linear-gradient(90deg, #E10600, rgba(225,6,0,0))",
        }} />

        {/* Header */}
        <div style={SECTION_HDR}>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif",
            fontWeight: 700, fontSize: 9, letterSpacing: 3,
            color: "#E10600", textTransform: "uppercase", marginBottom: 2,
          }}>
            Timing Tower
          </div>
          <div style={{
            fontFamily: "'Bebas Neue',sans-serif",
            fontSize: 24, letterSpacing: 1.2, lineHeight: 1, color: "#111",
          }}>
            SPA-FRANCORCHAMPS
          </div>
        </div>

        {/* Column headers */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "30px 20px 1fr 50px",
          alignItems: "center",
          gap: 6,
          padding: "4px 12px 3px 14px",
          borderBottom: "1px solid rgba(0,0,0,0.05)",
          background: "rgba(248,250,254,0.55)",
        }}>
          {["P", "", "Driver · Gap", "Best"].map((h) => (
            <div key={h} style={{
              fontFamily: "'Barlow Condensed',sans-serif",
              fontWeight: 700, fontSize: 8, letterSpacing: 2,
              color: "rgba(17,17,17,0.3)", textTransform: "uppercase",
            }}>{h}</div>
          ))}
        </div>

        {/* Driver rows */}
        <div style={{ overflowY: "auto", height: "calc(100% - 80px)" }}>
          {sortedDrivers.map((driver) => {
            const tyreMeta   = TYRE_COMPOUNDS[driver.tyre] || TYRE_COMPOUNDS.M;
            const active     = driver.id === sel?.id;
            const bestStr    = Number.isFinite(bestLaps[driver.id]) ? formatLapTime(bestLaps[driver.id]) : "—";
            const posChange  = posChanges[driver.id];

            return (
              <button
                key={driver.id}
                type="button"
                onClick={() => setSelectedDriverId(driver.id)}
                style={{
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns: "30px 20px 1fr 50px",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 12px 7px 14px",
                  border: "none",
                  borderLeft: `3px solid ${active ? tyreMeta.color : "transparent"}`,
                  background: active
                    ? "linear-gradient(90deg, rgba(225,6,0,0.05), rgba(225,6,0,0.01))"
                    : "transparent",
                  borderTop: "1px solid rgba(0,0,0,0.04)",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "background 0.2s cubic-bezier(0.22,1,0.36,1)",
                }}
              >
                {/* Position + change indicator */}
                <div style={{ position: "relative", lineHeight: 1 }}>
                  <div style={{
                    fontFamily: "'Bebas Neue',sans-serif",
                    fontSize: 21, color: active ? "#111" : "rgba(17,17,17,0.65)",
                  }}>
                    {driver.position}
                  </div>
                  {posChange != null && posChange !== 0 && (
                    <div style={{
                      position: "absolute", top: -2, right: -6,
                      fontFamily: "'Barlow Condensed',sans-serif",
                      fontWeight: 900, fontSize: 8,
                      color: posChange > 0 ? "#16a34a" : "#dc2626",
                      animation: "fadeInUp 0.3s ease both",
                    }}>
                      {posChange > 0 ? "▲" : "▼"}
                    </div>
                  )}
                </div>

                <TeamLogo team={driver.team} size={18} />

                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'Bebas Neue',sans-serif",
                    fontSize: 17, lineHeight: 1, color: "#111", letterSpacing: 0.8,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {shortName(driver.name)}
                  </div>
                  <div style={{
                    marginTop: 2,
                    fontFamily: "'Barlow Condensed',sans-serif",
                    fontWeight: 600, fontSize: 9, letterSpacing: 1,
                    color: "rgba(17,17,17,0.44)", textTransform: "uppercase",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    <span style={{ color: tyreMeta.color }}>{driver.tyre}</span>
                    {` ${driver.tyreAge}L · `}
                    {formatGap(driver, leader)}
                  </div>
                </div>

                {/* Best lap */}
                <div style={{
                  fontFamily: "'Barlow Condensed',sans-serif",
                  fontWeight: 700, fontSize: 9, letterSpacing: 0.3,
                  color: "rgba(17,17,17,0.5)", textAlign: "right", whiteSpace: "nowrap",
                }}>
                  {bestStr}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          PIT WALL  (right panel, top:78, width:268)
      ════════════════════════════════════════════════════════════════════ */}
      {sel && (
        <div
          style={{
            position: "absolute",
            top: 78, bottom: 14, right: 14,
            width: 268,
            zIndex: 8,
            borderRadius: 20,
            overflow: "hidden",
            ...GLASS,
          }}
        >
          {/* Metallic accent line — right-side red */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 2,
            background: "linear-gradient(90deg, rgba(225,6,0,0), #E10600)",
          }} />

          {/* Driver header */}
          <div style={{
            ...SECTION_HDR,
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: 10,
            alignItems: "center",
          }}>
            <div>
              <div style={{
                fontFamily: "'Barlow Condensed',sans-serif",
                fontWeight: 700, fontSize: 9, letterSpacing: 3,
                color: "#E10600", textTransform: "uppercase", marginBottom: 5,
              }}>
                Pit Wall
              </div>
              <TeamLogo team={sel.team} size={36} />
            </div>
            <div>
              <div style={{
                fontFamily: "'Bebas Neue',sans-serif",
                fontSize: 26, lineHeight: 0.95, letterSpacing: 0.8, color: "#111",
              }}>
                {sel.name}
              </div>
              <div style={{
                marginTop: 4,
                fontFamily: "'Barlow Condensed',sans-serif",
                fontWeight: 600, fontSize: 10, letterSpacing: 2,
                color: "rgba(17,17,17,0.46)", textTransform: "uppercase",
              }}>
                {sel.team} · P{sel.position}
              </div>
            </div>
          </div>

          <div style={{ padding: "10px 14px 14px", display: "grid", gap: 9, overflowY: "auto", maxHeight: "calc(100% - 108px)" }}>

            {/* ── Stats (2 × 3 grid) ── */}
            <div style={{
              borderRadius: 14,
              background: "rgba(255,255,255,0.58)",
              border: "1px solid rgba(0,0,0,0.07)",
              padding: "10px 12px",
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 10px" }}>
                {[
                  { label: "Tyre",      value: `${sel.tyre} · ${Math.round(sel.tyreWear)}%`, accent: TYRE_COMPOUNDS[sel.tyre]?.color || "#111" },
                  { label: "Fuel",      value: `${sel.fuelLoad.toFixed(1)} kg`,               accent: sel.fuelLoad < 15 ? "#dc2626" : sel.fuelLoad < 30 ? "#b45309" : "#111" },
                  { label: "Last Lap",  value: formatLapTime(sel.currentLapTime),             accent: "#334155" },
                  { label: "Best Lap",  value: formatLapTime(selBest),                        accent: "#7c3aed" },
                  { label: "ERS",       value: `${Math.round(sel.ersLapsRemaining ?? 10)} laps`,  accent: (sel.ersLapsRemaining ?? 10) < 3 ? "#dc2626" : "#111" },
                  { label: "Race Time", value: formatRaceTime(sel.totalTime),                  accent: "rgba(17,17,17,0.68)" },
                ].map((item) => (
                  <div key={item.label}>
                    <Lbl>{item.label}</Lbl>
                    <div style={{
                      fontFamily: "'Bebas Neue',sans-serif",
                      fontSize: 20, lineHeight: 0.95, letterSpacing: 0.8,
                      color: item.accent,
                    }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Pit window badge ── */}
            {pitStatus && (
              <div style={{
                borderRadius: 12,
                border: `1px solid ${pitStatus.color}3a`,
                background: `${pitStatus.color}0c`,
                padding: "8px 12px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{
                  fontFamily: "'Barlow Condensed',sans-serif",
                  fontWeight: 700, fontSize: 9, letterSpacing: 2.2,
                  color: "rgba(17,17,17,0.46)", textTransform: "uppercase",
                }}>
                  Pit Window
                </div>
                <div style={{
                  fontFamily: "'Bebas Neue',sans-serif",
                  fontSize: 18, letterSpacing: 1, color: pitStatus.color,
                }}>
                  {pitStatus.label}
                </div>
              </div>
            )}

            {/* ── Next tyre ── */}
            <div style={{
              borderRadius: 14,
              background: "rgba(255,255,255,0.58)",
              border: "1px solid rgba(0,0,0,0.07)",
              padding: "10px 12px",
            }}>
              <Lbl>Next Tyre</Lbl>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6, marginTop: 8 }}>
                {pitCompoundOptions.map((c) => {
                  const meta   = TYRE_COMPOUNDS[c];
                  const active = sel.nextTyreCompound === c;
                  return (
                    <button
                      key={`${sel.id}-${c}`}
                      type="button"
                      onClick={() => onSelectTyre(sel.id, c)}
                      style={{
                        padding: "9px 0 7px",
                        borderRadius: 11,
                        border: `1px solid ${active ? meta.color : "rgba(0,0,0,0.11)"}`,
                        background: active ? `${meta.color}16` : "rgba(0,0,0,0.025)",
                        color: active ? meta.color : "rgba(17,17,17,0.55)",
                        fontFamily: "'Bebas Neue',sans-serif",
                        fontSize: 20, letterSpacing: 1,
                        cursor: "pointer",
                        transition: "all 0.18s cubic-bezier(0.22,1,0.36,1)",
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Fuel Mode ── */}
            {onSetFuelMode && (
              <div style={{
                borderRadius: 14,
                background: "rgba(255,255,255,0.58)",
                border: "1px solid rgba(0,0,0,0.07)",
                padding: "10px 12px",
              }}>
                <Lbl>Fuel Mode</Lbl>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
                  {[
                    { mode: "push", label: "PUSH", desc: "Full power", color: "#E10600" },
                    { mode: "save", label: "SAVE", desc: "+0.3s, less burn", color: "#16a34a" },
                  ].map(({ mode, label, desc, color }) => {
                    const active = (sel.fuelMode || "push") === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => onSetFuelMode(sel.id, mode)}
                        style={{
                          padding: "10px 8px 8px",
                          borderRadius: 11,
                          border: `1px solid ${active ? color + "55" : "rgba(0,0,0,0.08)"}`,
                          background: active ? color + "12" : "rgba(0,0,0,0.02)",
                          cursor: "pointer",
                          textAlign: "center",
                          transition: "all 0.18s ease",
                        }}
                      >
                        <div style={{
                          fontFamily: "'Bebas Neue',sans-serif",
                          fontSize: 18, letterSpacing: 1.5, lineHeight: 1,
                          color: active ? color : "rgba(17,17,17,0.45)",
                        }}>{label}</div>
                        <div style={{
                          fontFamily: "'Barlow Condensed',sans-serif",
                          fontWeight: 600, fontSize: 8, letterSpacing: 1,
                          color: "rgba(17,17,17,0.35)", marginTop: 3,
                          textTransform: "uppercase",
                        }}>{desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── ERS Mode ── */}
            {onSetErsMode && (
              <div style={{
                borderRadius: 14,
                background: "rgba(255,255,255,0.58)",
                border: "1px solid rgba(0,0,0,0.07)",
                padding: "10px 12px",
              }}>
                <Lbl>ERS Deploy</Lbl>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5, marginTop: 6 }}>
                  {[
                    { mode: "attack", label: "ATK", desc: "−0.15s", color: "#E10600" },
                    { mode: "normal", label: "NRM", desc: "Neutral", color: "#334155" },
                    { mode: "harvest", label: "HRV", desc: "+0.1s charge", color: "#16a34a" },
                  ].map(({ mode, label, desc, color }) => {
                    const rawErs = sel.ersMode || "normal";
                    const mappedErs = rawErs === "high" ? "attack" : rawErs === "low" ? "harvest" : rawErs === "medium" ? "normal" : rawErs;
                    const active = mappedErs === mode;
                    const disabled = mode === "attack" && (sel.ersLapsRemaining ?? 10) <= 0;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => !disabled && onSetErsMode(sel.id, mode)}
                        style={{
                          padding: "9px 4px 7px",
                          borderRadius: 10,
                          border: `1px solid ${active ? color + "55" : "rgba(0,0,0,0.08)"}`,
                          background: active ? color + "12" : "rgba(0,0,0,0.02)",
                          cursor: disabled ? "not-allowed" : "pointer",
                          textAlign: "center",
                          opacity: disabled ? 0.4 : 1,
                          transition: "all 0.18s ease",
                        }}
                      >
                        <div style={{
                          fontFamily: "'Bebas Neue',sans-serif",
                          fontSize: 16, letterSpacing: 1, lineHeight: 1,
                          color: active ? color : "rgba(17,17,17,0.45)",
                        }}>{label}</div>
                        <div style={{
                          fontFamily: "'Barlow Condensed',sans-serif",
                          fontWeight: 600, fontSize: 7, letterSpacing: 0.8,
                          color: "rgba(17,17,17,0.35)", marginTop: 2,
                          textTransform: "uppercase",
                        }}>{desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Pit button ── */}
            <button
              type="button"
              onClick={() => onRequestPit(sel.id)}
              disabled={sel.hasRequestedPit}
              style={{
                width: "100%",
                padding: "13px 16px",
                borderRadius: 14,
                border: "none",
                background: sel.hasRequestedPit
                  ? "rgba(0,0,0,0.07)"
                  : "linear-gradient(135deg, #E10600, #c00400)",
                color: sel.hasRequestedPit ? "rgba(17,17,17,0.38)" : "#fff",
                fontFamily: "'Barlow Condensed',sans-serif",
                fontWeight: 800, fontSize: 13, letterSpacing: 2.8,
                textTransform: "uppercase",
                cursor: sel.hasRequestedPit ? "default" : "pointer",
                boxShadow: sel.hasRequestedPit
                  ? "none"
                  : "0 10px 24px rgba(225,6,0,0.26), inset 0 1px 0 rgba(255,255,255,0.16)",
                opacity: sel.hasRequestedPit ? 0.65 : 1,
                transition: "opacity 0.2s ease, box-shadow 0.2s ease",
              }}
            >
              {sel.hasRequestedPit ? "Pit Requested" : "Pit This Lap"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
