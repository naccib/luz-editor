import type { ImageSource } from "./image-sources"

export interface ImageDataResult {
  imageData: ImageData
  width: number
  height: number
}

/**
 * Load an image source and convert it to ImageData (bytes) once.
 * The ImageSource is kept only for reference.
 */
export async function loadImageSourceToData(source: ImageSource): Promise<ImageDataResult> {
  // Get the image URL/path from the source
  const imageSrc = source.type === "url" ? source.url : source.path

  // Create an image element to load the source image
  const img = new Image()
  img.crossOrigin = "anonymous"

  await new Promise<void>((resolve, reject) => {
    img.onload = () => {
      // Verify image loaded successfully
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        reject(new Error("Image has invalid dimensions"))
        return
      }
      resolve()
    }
    img.onerror = (err) => reject(new Error(`Failed to load image: ${err}`))
    img.src = imageSrc
  })

  // Verify image dimensions
  if (!img.naturalWidth || !img.naturalHeight) {
    throw new Error("Image has invalid dimensions")
  }

  // Create a canvas and draw the image
  const canvas = document.createElement("canvas")
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight

  if (canvas.width === 0 || canvas.height === 0) {
    throw new Error("Canvas has invalid dimensions")
  }

  const ctx = canvas.getContext("2d", { willReadFrequently: true })

  if (!ctx) {
    throw new Error("Could not get 2D context from canvas")
  }

  // Draw the image to canvas
  ctx.drawImage(img, 0, 0)

  // Get ImageData (bytes) from canvas
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

  if (!imageData || imageData.data.length === 0) {
    throw new Error("Failed to get image data from canvas")
  }

  return {
    imageData,
    width: canvas.width,
    height: canvas.height,
  }
}

