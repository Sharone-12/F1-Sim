import { TEAMS } from "../constants";

export default function TeamLogo({ team, size = 24 }) {
  const t = TEAMS[team];
  if (!t) return null;
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: t.color, display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 800, color: "#fff", letterSpacing: -0.5,
      flexShrink: 0,
    }}>
      {t.abbr?.slice(0, 2)}
    </div>
  );
}
