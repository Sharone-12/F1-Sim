import { TYRE_COMPOUNDS } from "../constants";

export default function TyreBadge({ compound, size = 22 }) {
  // Handle both short (S/M/H) and long (SOFT/MEDIUM/HARD) compound names
  const key = compound?.length > 1
    ? { SOFT: "S", MEDIUM: "M", HARD: "H" }[compound?.toUpperCase()] ?? compound?.[0]
    : compound;
  const c = TYRE_COMPOUNDS[key];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: size, height: size, borderRadius: size / 2,
      border: `2px solid ${c?.color || "#888"}`, color: c?.color || "#888",
      fontSize: size * 0.5, fontWeight: 800, flexShrink: 0,
    }}>
      {key || "?"}
    </span>
  );
}
