import { TYRE_COMPOUNDS } from "../simulation/raceEngine";

export default function RaceHUD({
  raceState,
  playbackProgress,
  onRequestPit,
  onSelectTyre,
}) {
  const topThreeDrivers = raceState.players
    .slice()
    .sort((a, b) => a.position - b.position)
    .slice(0, 3);
  const pitCompoundOptions = ["S", "M", "H"];

  return (
    <>
      <div style={{ position:"absolute", top:24, left:24, display:"flex", gap:14, flexWrap:"wrap", zIndex:4 }}>
        <div style={{ padding:"16px 18px", borderRadius:20, background:"rgba(12,14,18,0.72)", border:"1px solid rgba(255,255,255,0.12)", backdropFilter:"blur(14px)", boxShadow:"0 16px 34px rgba(0,0,0,0.24)" }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:3, color:"#E10600", textTransform:"uppercase", marginBottom:6 }}>Race Status</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:34, letterSpacing:1.2, color:"#fff", lineHeight:0.95 }}>
            Lap {Math.min(raceState.currentLap, raceState.totalLaps)} / {raceState.totalLaps}
          </div>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:12, letterSpacing:2.2, color:"rgba(255,255,255,0.58)", textTransform:"uppercase", marginTop:8 }}>
            {raceState.racePhase === "finished" ? "Checkered Flag" : "Live Simulation"}
          </div>
        </div>

        <div style={{ padding:"16px 18px", borderRadius:20, background:"rgba(12,14,18,0.72)", border:"1px solid rgba(255,255,255,0.12)", backdropFilter:"blur(14px)", boxShadow:"0 16px 34px rgba(0,0,0,0.24)" }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:3, color:"#E10600", textTransform:"uppercase", marginBottom:6 }}>Weather</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:1, color:"#fff", lineHeight:0.95 }}>
            {raceState.weather.replace("_", " ")}
          </div>
        </div>
      </div>

      <div style={{ position:"absolute", top:24, right:24, width:"min(310px, 34vw)", padding:"18px 20px", borderRadius:24, background:"rgba(12,14,18,0.74)", border:"1px solid rgba(255,255,255,0.12)", backdropFilter:"blur(14px)", boxShadow:"0 16px 34px rgba(0,0,0,0.24)", zIndex:4 }}>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:3, color:"#E10600", textTransform:"uppercase", marginBottom:12 }}>Top 3</div>
        {topThreeDrivers.map((driver) => (
          <div key={driver.id} style={{ display:"grid", gridTemplateColumns:"34px 1fr auto", alignItems:"center", gap:12, padding:"10px 0", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ width:30, height:30, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(225,6,0,0.16)", color:"#fff", fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:1 }}>
              {driver.position}
            </div>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, lineHeight:0.95, letterSpacing:1.1, color:"#fff" }}>{driver.name}</div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:11, letterSpacing:2, color:"rgba(255,255,255,0.42)", textTransform:"uppercase", marginTop:5 }}>
                {driver.tyre} tyre • wear {Math.round(driver.tyreWear)}%
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, lineHeight:1, letterSpacing:1.1, color:"#fff" }}>
                {driver.currentLapTime.toFixed(1)}s
              </div>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:10, letterSpacing:2, color:"rgba(255,255,255,0.38)", textTransform:"uppercase", marginTop:4 }}>
                Lap Pace
              </div>
            </div>
          </div>
        ))}
      </div>

      {raceState.racePhase === "racing" && (
        <div style={{ position:"absolute", right:24, bottom:24, width:"min(420px, 40vw)", maxHeight:"46%", overflowY:"auto", padding:"18px 20px", borderRadius:24, background:"rgba(12,14,18,0.76)", border:"1px solid rgba(255,255,255,0.12)", backdropFilter:"blur(14px)", boxShadow:"0 16px 34px rgba(0,0,0,0.24)", zIndex:4 }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:10, letterSpacing:3, color:"#E10600", textTransform:"uppercase", marginBottom:12 }}>Pit Wall</div>
          {raceState.players
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((driver) => (
              <div key={driver.id} style={{ padding:"12px 0", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginBottom:10 }}>
                  <div>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, lineHeight:0.95, letterSpacing:1.1, color:"#fff" }}>
                      {driver.position}. {driver.name}
                    </div>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, fontSize:11, letterSpacing:2, color:"rgba(255,255,255,0.42)", textTransform:"uppercase", marginTop:4 }}>
                      Current {driver.tyre} • next {driver.nextTyreCompound} • wear {Math.round(driver.tyreWear)}%
                    </div>
                  </div>
                  {driver.hasRequestedPit && (
                    <div style={{ padding:"6px 10px", borderRadius:999, background:"rgba(244,197,66,0.16)", color:"#f4c542", border:"1px solid rgba(244,197,66,0.3)", fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:10, letterSpacing:2, textTransform:"uppercase" }}>
                      Pit In
                    </div>
                  )}
                </div>

                <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                  {pitCompoundOptions.map((compound) => (
                    <button
                      key={`${driver.id}-${compound}`}
                      type="button"
                      onClick={() => onSelectTyre(driver.id, compound)}
                      style={{
                        minWidth:44,
                        padding:"8px 12px",
                        borderRadius:12,
                        border:`1px solid ${driver.nextTyreCompound === compound ? TYRE_COMPOUNDS[compound].color : "rgba(255,255,255,0.12)"}`,
                        background: driver.nextTyreCompound === compound ? `${TYRE_COMPOUNDS[compound].color}22` : "rgba(255,255,255,0.04)",
                        color: driver.nextTyreCompound === compound ? TYRE_COMPOUNDS[compound].color : "#fff",
                        fontFamily:"'Bebas Neue',sans-serif",
                        fontSize:22,
                        letterSpacing:1,
                        cursor:"pointer",
                      }}
                    >
                      {compound}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => onRequestPit(driver.id)}
                  disabled={driver.hasRequestedPit}
                  style={{
                    width:"100%",
                    padding:"11px 14px",
                    borderRadius:14,
                    border:"none",
                    background: driver.hasRequestedPit ? "rgba(255,255,255,0.12)" : "#E10600",
                    color:"#fff",
                    fontFamily:"'Barlow Condensed',sans-serif",
                    fontWeight:800,
                    fontSize:12,
                    letterSpacing:2.6,
                    textTransform:"uppercase",
                    cursor: driver.hasRequestedPit ? "default" : "pointer",
                    opacity: driver.hasRequestedPit ? 0.68 : 1,
                  }}
                >
                  {driver.hasRequestedPit ? "Pit Requested" : "Pit This Lap"}
                </button>
              </div>
            ))}
        </div>
      )}
    </>
  );
}
