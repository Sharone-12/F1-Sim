import { useState, useEffect } from "react";
import F1Logo from "../components/F1Logo";
import { CIRCUITS } from "../constants";

export default function LandingPage({ onStart }) {
  const [selectedCircuit, setSelectedCircuit] = useState(0);
  const [hoverBtn, setHoverBtn] = useState(false);
  const [circuits, setCircuits] = useState(CIRCUITS);

  // Try to fetch circuits from backend; fall back to hardcoded constants
  useEffect(() => {
    fetch("/api/sessions/2024")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.events?.length) {
          const mapped = data.events.map(e => ({
            name: e.name,
            location: e.location,
            laps: CIRCUITS.find(c =>
              c.name.toLowerCase().includes(e.name.toLowerCase().split(" ")[0])
            )?.laps ?? 57,
            country: e.country,
            round: e.round,
          }));
          setCircuits(mapped);
        }
      })
      .catch(() => {/* keep fallback */});
  }, []);

  return (
    <div style={{
      minHeight: "100vh", background: "#f5f0e8",
      backgroundImage: `
        linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)
      `,
      backgroundSize: "40px 40px",
      fontFamily: "'Titillium Web', 'Segoe UI', sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      {/* Nav */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 40px", position: "relative", zIndex: 10,
      }}>
        <F1Logo size={50} color="#15151E" />
        <div style={{ display: "flex", gap: 40, alignItems: "center" }}>
          {["SCHEDULE", "RESULTS", "DRIVERS", "TEAMS"].map(item => (
            <span key={item} style={{
              fontSize: 13, fontWeight: 700, letterSpacing: 1.5, color: "#15151E",
              cursor: "pointer", fontFamily: "'Titillium Web', sans-serif",
            }}>{item}</span>
          ))}
          <button style={{
            background: "#15151E", color: "#fff", border: "none", borderRadius: 6,
            padding: "10px 22px", fontSize: 13, fontWeight: 700, letterSpacing: 1,
            cursor: "pointer",
            fontFamily: "'Asset', sans-serif",
          }}>SUBSCRIBE</button>
        </div>
      </nav>

      {/* Ghost F1 logo bg */}
      <div style={{
        position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)",
        opacity: 0.04, pointerEvents: "none",
      }}>
        <F1Logo size={600} color="#15151E" />
      </div>

      {/* Hero */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingTop: 60, position: "relative", zIndex: 5,
      }}>
        <h1 style={{
          fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 900, color: "#15151E",
          letterSpacing: "0.08em", textAlign: "center", margin: 0,
          fontFamily: "'Asset', sans-serif", lineHeight: 1,
        }}>
          PREDICT THE FAST
        </h1>

        {/* Car silhouette */}
        <div style={{
          width: "clamp(300px, 50vw, 600px)", height: 250, margin: "30px 0 10px",
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative",
        }}>
          <div style={{
            width: "100%", height: "100%",
            background: "radial-gradient(ellipse at center bottom, rgba(21,21,30,0.12) 0%, transparent 70%)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg viewBox="0 0 400 160" width="100%" height="100%">
              <defs>
                <linearGradient id="carGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#2a2a3a" />
                  <stop offset="100%" stopColor="#15151E" />
                </linearGradient>
              </defs>
              <path d="M200 20 L240 35 L260 55 L270 70 L270 90 L260 105 L240 125 L200 140 L160 125 L140 105 L130 90 L130 70 L140 55 L160 35 Z" fill="url(#carGrad)" opacity="0.8" />
              <rect x="155" y="15" width="90" height="8" rx="2" fill="#15151E" opacity="0.7" />
              <rect x="160" y="138" width="80" height="10" rx="3" fill="#15151E" opacity="0.7" />
              <ellipse cx="125" cy="80" rx="20" ry="30" fill="#15151E" opacity="0.5" />
              <ellipse cx="275" cy="80" rx="20" ry="30" fill="#15151E" opacity="0.5" />
              <rect x="105" y="40" width="15" height="25" rx="4" fill="#333" />
              <rect x="280" y="40" width="15" height="25" rx="4" fill="#333" />
              <rect x="105" y="95" width="15" height="25" rx="4" fill="#333" />
              <rect x="280" y="95" width="15" height="25" rx="4" fill="#333" />
              <path d="M185 60 Q200 50 215 60 Q215 70 200 68 Q185 70 185 60Z" fill="none" stroke="#555" strokeWidth="2.5" />
              <ellipse cx="200" cy="65" rx="10" ry="8" fill="#0a0a12" />
            </svg>
          </div>
        </div>

        {/* Circuit selector */}
        <div style={{
          background: "rgba(21,21,30,0.06)", borderRadius: 16, padding: "24px 32px",
          maxWidth: 700, width: "90%", backdropFilter: "blur(10px)",
          border: "1px solid rgba(21,21,30,0.08)",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: "#15151E", opacity: 0.5, marginBottom: 16 }}>
            SELECT CIRCUIT
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 8,
          }}>
            {circuits.map((c, i) => (
              <button key={i} onClick={() => setSelectedCircuit(i)} style={{
                background: selectedCircuit === i ? "#15151E" : "rgba(21,21,30,0.05)",
                color: selectedCircuit === i ? "#fff" : "#15151E",
                border: selectedCircuit === i ? "2px solid #E10600" : "2px solid transparent",
                borderRadius: 10, padding: "10px 12px", cursor: "pointer",
                fontSize: 12, fontWeight: 600, textAlign: "left",
                transition: "all 0.2s",
                fontFamily: "'Titillium Web', sans-serif",
              }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{c.location}</div>
                <div style={{ opacity: 0.6, fontSize: 10, marginTop: 2 }}>{c.laps} laps</div>
              </button>
            ))}
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={() => onStart(selectedCircuit, circuits[selectedCircuit])}
          onMouseEnter={() => setHoverBtn(true)}
          onMouseLeave={() => setHoverBtn(false)}
          style={{
            marginTop: 40, marginBottom: 60,
            background: hoverBtn ? "#cc0500" : "#E10600",
            color: "#fff", border: "none", borderRadius: 12,
            padding: "18px 60px", fontSize: 18, fontWeight: 800,
            letterSpacing: 3, cursor: "pointer",
            fontFamily: "'Asset', sans-serif",
            transform: hoverBtn ? "scale(1.05)" : "scale(1)",
            transition: "all 0.2s ease",
            boxShadow: hoverBtn ? "0 8px 30px rgba(225,6,0,0.4)" : "0 4px 15px rgba(225,6,0,0.2)",
          }}
        >
          START RACE ▶
        </button>

        {/* Bottom links */}
        <div style={{
          display: "flex", gap: 40, padding: "20px 0 40px", flexWrap: "wrap", justifyContent: "center",
        }}>
          {["STANDINGS", "LATEST NEWS", "LATEST VIDEOS", "TIMINGS"].map(link => (
            <span key={link} style={{
              fontSize: 13, fontWeight: 700, letterSpacing: 1, color: "#15151E",
              opacity: 0.5, cursor: "pointer",
              borderBottom: "1px solid transparent",
            }}>{link} →</span>
          ))}
        </div>
      </div>
    </div>
  );
}
