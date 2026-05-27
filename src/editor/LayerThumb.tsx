import { useThumbnailStore } from "@/editor/state/thumbnailStore"
import type { Layer } from "@/editor/types"

/** Tiny per-layer preview shown in the Layers panel. Shows the layer's content (trimmed to its
 *  non-transparent bounds, scaled to fill) once it has any; a blank layer shows an empty box. */
export function LayerThumb({ layer }: { layer: Layer }) {
  const dataUrl = useThumbnailStore((s) => s.cache.get(layer.id))
  if (!dataUrl) return <div className="h-full w-full" aria-hidden="true" />
  return <img src={dataUrl} alt="" className="h-full w-full object-contain" />
}
