/**
 * Decode an image File/Blob into a drawable bitmap. Prefers `createImageBitmap`; falls back
 * to an `<img>` + object URL (revoked after load). The result is a `CanvasImageSource`.
 */
export async function decodeImageFile(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file)
    } catch {
      // Fall through to the <img> path on decode failure.
    }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Failed to decode image"))
    }
    img.src = url
  })
}
