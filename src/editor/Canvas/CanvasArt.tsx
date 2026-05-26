/**
 * Static placeholder artwork (the prototype's "brush" preset): a pale wash with
 * a few multiply-blended brush strokes. Stands in for real painted pixels until
 * the engine lands. Colours here are *content*, not theme tokens.
 */
export function CanvasArt({ width = 820, height = 540 }: { width?: number; height?: number }) {
  const W = 800
  const H = 540
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      width={width}
      height={height}
      className="block rounded-[2px] bg-white"
      role="img"
      aria-label="Canvas artwork (placeholder)"
    >
      <defs>
        <linearGradient id="bd-wash" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F5EFE6" />
          <stop offset="1" stopColor="#E8E2D6" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="#FFFFFF" />
      <rect width={W} height={H} fill="url(#bd-wash)" opacity="0.6" />
      <g style={{ mixBlendMode: "multiply" }}>
        <path
          d="M 80 340 Q 220 200 380 280 T 700 220"
          fill="none"
          stroke="#2A3E5C"
          strokeWidth="28"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M 120 380 Q 260 260 420 330 T 720 280"
          fill="none"
          stroke="#C94A3C"
          strokeWidth="18"
          strokeLinecap="round"
          opacity="0.75"
        />
        <path
          d="M 60 440 Q 200 360 360 400 T 680 360"
          fill="none"
          stroke="#E89940"
          strokeWidth="34"
          strokeLinecap="round"
          opacity="0.9"
        />
        <path
          d="M 200 180 Q 320 140 460 170 T 660 140"
          fill="none"
          stroke="#1A1A22"
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.65"
        />
      </g>
    </svg>
  )
}
