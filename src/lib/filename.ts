/** Turn a document name into a safe `.png` download filename. Empty → "Untitled.png". */
export function toExportFilename(name: string): string {
  const base = name
    .trim()
    .replace(/\.png$/i, "")
    .trim()
  return `${base || "Untitled"}.png`
}
