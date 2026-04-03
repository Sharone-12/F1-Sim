export default function F1Logo({ size = 40, color = "#E10600" }) {
  return (
    <svg width={size} height={size * 0.45} viewBox="0 0 120 54" fill="none">
      <path d="M30.4 0H7.6C3.4 0 0 3.4 0 7.6V27L30.4 0Z" fill={color} />
      <path d="M0 27V46.4C0 50.6 3.4 54 7.6 54H22.8L0 27Z" fill={color} />
      <path d="M45.6 0L15.2 27L45.6 54H68.4L38 27L68.4 0H45.6Z" fill={color} />
      <path d="M76 0V54H98.8V33.8H120V20.2H98.8V0H76Z" fill={color} />
    </svg>
  );
}
