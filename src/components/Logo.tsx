import logoDark from "@/assets/boojy-design-logo-dark.png"

/** Boojy Design wordmark (dark-theme PNG: white "esign" + amber D with dot). */
export function Logo({ height = 22 }: { height?: number }) {
  // PNG aspect ratio ≈ 949:331 (~2.87); width scales from height.
  return (
    <img
      src={logoDark}
      alt="Boojy Design"
      draggable={false}
      className="block select-none"
      style={{ height: height * 1.15, width: "auto" }}
    />
  )
}
