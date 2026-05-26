import type { Layer } from "@/editor/types"

/** Tiny per-layer preview shown in the Layers panel. */
export function LayerThumb({ layer }: { layer: Layer }) {
  if (layer.type === "image") {
    return (
      <div className="h-full w-full bg-[linear-gradient(180deg,#3A1F4D_0%,#C94A3C_50%,#F2A85B_100%)]" />
    )
  }
  if (layer.type === "vector" && layer.kind === "ellipse") {
    return <div className="h-3.5 w-[18px] rounded-full bg-accent" />
  }
  if (layer.type === "vector" && layer.kind === "rect") {
    return <div className="h-4 w-[22px] bg-[#2A3E5C]" />
  }
  // raster: a small brush stroke
  return (
    <svg viewBox="0 0 36 28" className="h-full w-full" aria-hidden="true">
      <path
        d="M 5 19 Q 13 9 19 14 T 31 9"
        stroke="var(--color-accent)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}
