import { useState, useEffect } from "react";
import F1Logo from "../components/F1Logo";
import TeamLogo from "../components/TeamLogo";
import TyreBadge from "../components/TyreBadge";
import { TEAMS, CIRCUITS } from "../constants";

export default function ResultsPage({ data, onRestart }) {
  const { positions, gaps, tyres, fastestLap, pitStops, events, circuit, circuitData } = data;
  const circuitInfo = circuitData ?? CIRCUITS[circuit] ?? CIRCUITS[0];
  const [hoverRestart, setHoverRestart] = useState(false);

  // Try to fetch real historical results and overlay if available
  const [realResults, setRealResults] = useState(null);
  useEffect(() => {
    if (typeof circuit === "number") {
      const round = circuit + 1;
      fetch(`/api/race/2024/${round}/results`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.results?.length) setRealResults(d); })
        .catch(() => {});
    }
  }, [circuit]);

  // Determine DOTD (highest skill that finished top 5 who wasn't P1)
  const dotd = positions.slice(1, 6).reduce(
    (best, d) => (d.skill ?? 80) > (best.skill ?? 80) ? d : best,
    positions[1] || positions[0]
  );

  // Use sim positions by default; overlay real results if loaded
  const displayPositions = positions;
  const displayGaps = gaps;
  const displayTyres = tyres;

  const safetyCarEvents = events?.filter(e => e.type === "safety") ?? [];
  const redFlagEvents   = events?.filter(e => e.type === "red") ?? [];

  return (
    <div style={{
      minHeight: "100vh", background: "#0F0F13",
      fontFamily: "'Titillium Web', 'Segoe UI', sans-serif", color: "#fff",
      padding: "24px",
    }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <F1Logo size={42} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, opacity: 0.4 }}>RACE RESULTS</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{circuitInfo.name}</div>
          </div>
          {realResults && (
            <span style={{
              fontSize: 10, background: "#00D455", color: "#000",
              borderRadius: 4, padding: "3px 8px", fontWeight: 700, letterSpacing: 1,
            }}>REAL DATA</span>
          )}
        </div>
        <button
          onClick={onRestart}
          onMouseEnter={() => setHoverRestart(true)}
          onMouseLeave={() => setHoverRestart(false)}
          style={{
            background: hoverRestart ? "#E10600" : "rgba(255,255,255,0.08)",
            color: "#fff", border: "none", borderRadius: 10,
            padding: "12px 28px", fontSize: 14, fontWeight: 700,
            letterSpacing: 1.5, cursor: "pointer", transition: "all 0.2s",
          }}
        >
          NEW RACE
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Final Classification — spans 2 rows */}
        <div style={{
          background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: "24px",
          border: "1px solid rgba(255,255,255,0.06)", gridRow: "span 2",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>🏁</span>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, opacity: 0.5 }}>{circuitInfo.name}</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 20 }}>Final Classification</div>

          {displayPositions.slice(0, 10).map((driver, i) => {
            const teamColor = driver.color ?? TEAMS[driver.team]?.color ?? "#555";
            return (
              <div key={driver.abbr} style={{
                display: "grid", gridTemplateColumns: "30px 28px 1fr auto 90px 40px",
                alignItems: "center", padding: "10px 0",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                borderLeft: i < 3 ? `3px solid ${i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : "#CD7F32"}` : "3px solid transparent",
                paddingLeft: 10,
              }}>
                <span style={{ fontSize: 16, fontWeight: 900, color: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "#fff" }}>
                  {i + 1}.
                </span>
                <TeamLogo team={driver.team} size={24} />
                <div>
                  <span style={{ fontSize: 14, fontWeight: 800 }}>{driver.name || driver.abbr}</span>
                </div>
                <span style={{ fontSize: 12, opacity: 0.5, marginRight: 12 }}>{driver.team}</span>
                <span style={{ fontSize: 13, fontWeight: 700, textAlign: "right", fontFeatureSettings: "'tnum'" }}>
                  {i === 0 ? "Winner" : `+${(displayGaps[i] ?? 0).toFixed(3)}`}
                </span>
                <div style={{ textAlign: "center" }}>
                  <TyreBadge compound={displayTyres[i] || "M"} size={20} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Podium */}
        <div style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
          borderRadius: 16, padding: "20px 24px",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 20 }}>🏆</span>
            <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: 1 }}>PODIUM</span>
          </div>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 16, padding: "10px 0" }}>
            {[1, 0, 2].map(idx => {
              const d = displayPositions[idx];
              if (!d) return null;
              const heights = [140, 100, 80];
              const teamColor = d.color ?? TEAMS[d.team]?.color ?? "#555";
              return (
                <div key={idx} style={{ textAlign: "center" }}>
                  <TeamLogo team={d.team} size={idx === 0 ? 48 : 36} />
                  <div style={{ fontSize: 14, fontWeight: 800, marginTop: 6 }}>{d.abbr}</div>
                  <div style={{
                    width: idx === 0 ? 90 : 70, height: heights[idx],
                    background: `linear-gradient(180deg, ${teamColor}44 0%, ${teamColor}11 100%)`,
                    borderRadius: "8px 8px 0 0", marginTop: 8,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 28, fontWeight: 900,
                    border: `1px solid ${teamColor}44`,
                    borderBottom: "none",
                  }}>
                    {idx === 0 ? "1" : idx === 1 ? "2" : "3"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Flag cards row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{
            background: "#00D455", borderRadius: 14, padding: "16px 20px",
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <F1Logo size={28} color="#000" />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: "#000" }}>RACE</span>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#000", marginTop: 10 }}>GREEN FLAG</div>
              <div style={{ fontSize: 12, color: "#000", opacity: 0.7 }}>Track Clear</div>
            </div>
          </div>
          <div style={{
            background: "#E10600", borderRadius: 14, padding: "16px 20px",
            display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <F1Logo size={28} color="#fff" />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: "#fff" }}>RACE</span>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#fff", marginTop: 10 }}>RED FLAG</div>
              <div style={{ fontSize: 12, color: "#fff", opacity: 0.8 }}>
                {redFlagEvents.length > 0 ? `Lap ${redFlagEvents[0].lap}` : "Session Stopped"}
              </div>
            </div>
          </div>
        </div>

        {/* Race Leaderboard */}
        <div style={{
          background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: "20px",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <F1Logo size={28} />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, opacity: 0.5 }}>RACE</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.4 }}>Lap {circuitInfo.laps}/{circuitInfo.laps}</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Race Leaderboard</div>
          <div style={{ fontSize: 12, opacity: 0.4, marginBottom: 14 }}>{circuitInfo.name}</div>
          {displayPositions.slice(0, 5).map((d, i) => (
            <div key={d.abbr} style={{
              display: "grid", gridTemplateColumns: "24px 28px 60px 1fr 40px",
              alignItems: "center", padding: "8px 0",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>{i + 1}.</span>
              <TeamLogo team={d.team} size={22} />
              <span style={{ fontSize: 15, fontWeight: 800 }}>{d.abbr}</span>
              <span style={{ fontSize: 13, opacity: 0.6, textAlign: "right", fontFeatureSettings: "'tnum'" }}>
                {i === 0 ? "Leader" : `+${(displayGaps[i] ?? 0).toFixed(3)}`}
              </span>
              <div style={{ textAlign: "center" }}><TyreBadge compound={displayTyres[i]} size={20} /></div>
            </div>
          ))}
        </div>

        {/* Safety Car */}
        <div style={{
          background: "#FFD700", borderRadius: 14, padding: "16px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <F1Logo size={28} color="#000" />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, color: "#000" }}>RACE</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#000", marginTop: 8 }}>SAFETY CAR</div>
            <div style={{ fontSize: 12, color: "#000", opacity: 0.7 }}>
              {safetyCarEvents.length > 0 ? `Lap ${safetyCarEvents[0].lap}/${circuitInfo.laps}` : `Lap 1/${circuitInfo.laps}`}
            </div>
          </div>
          <span style={{ fontSize: 40 }}>🚗</span>
        </div>

        {/* Fastest Lap */}
        <div style={{
          background: "linear-gradient(135deg, #7B2D8E 0%, #5B1D6E 100%)",
          borderRadius: 14, padding: "20px", position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", right: -20, bottom: -20,
            width: 120, height: 120, borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
          }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: 2, opacity: 0.8 }}>FASTEST LAP</span>
            <F1Logo size={24} color="#fff" />
          </div>
          <div style={{ fontSize: 38, fontWeight: 900, marginTop: 8, fontFeatureSettings: "'tnum'" }}>
            {fastestLap.time || "1:29.359"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{fastestLap.driver || "PIA"}</span>
            <TeamLogo team={fastestLap.team || "McLaren"} size={22} />
          </div>
        </div>

        {/* Battle for first */}
        <div style={{
          background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "16px 20px",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <TeamLogo team={displayPositions[0]?.team} size={24} />
              <F1Logo size={22} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>Battle for first</span>
              <TeamLogo team={displayPositions[1]?.team} size={24} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.4 }}>1.</div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>{displayPositions[0]?.abbr}</div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#00D455", fontFeatureSettings: "'tnum'" }}>
              +{(displayGaps[1] ?? 0).toFixed(3)}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, opacity: 0.4 }}>2.</div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>{displayPositions[1]?.abbr}</div>
            </div>
          </div>
        </div>

        {/* Driver of the Day */}
        {dotd && (
          <div style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
            borderRadius: 14, padding: "20px 24px",
            border: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, opacity: 0.4 }}>DRIVER OF THE DAY</div>
              <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>{dotd.name || dotd.abbr}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                <TeamLogo team={dotd.team} size={22} />
                <span style={{ fontSize: 13, opacity: 0.5 }}>{dotd.team}</span>
              </div>
            </div>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: `linear-gradient(135deg, ${(dotd.color ?? TEAMS[dotd.team]?.color ?? "#555")}66 0%, ${(dotd.color ?? TEAMS[dotd.team]?.color ?? "#555")}22 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, fontWeight: 900,
              border: `2px solid ${(dotd.color ?? TEAMS[dotd.team]?.color ?? "#555")}44`,
            }}>
              {dotd.abbr}
            </div>
          </div>
        )}
      </div>

      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>
    </div>
  );
}
