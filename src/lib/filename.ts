/** Turn a document name into a safe `.png` download filename. Empty → "Untitled.png". */
export function toExportFilename(name: string): string {
  const base = name
    .trim()
    .replace(/\.png$/i, "")
    .trim()
  return `${base || "Untitled"}.png`
}

/** Derive a layer name from an image filename: strip the extension, trim, fallback "Image". */
export function toLayerName(filename: string): string {
  const base = filename
    .trim()
    .replace(/\.[^.]+$/, "")
    .trim()
  return base || "Image"
}
