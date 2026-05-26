/** Generate a new layer id. Shared by `addLayer` and the duplicate path. */
export function newLayerId(): string {
  return `l-${Math.random().toString(36).slice(2, 8)}`
}
