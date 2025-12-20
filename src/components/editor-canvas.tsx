import * as React from "react"
import { useEditor } from "@/contexts/editor-context"
import { useProject } from "@/contexts/project-context"
import { processImage } from "@/lib/image-processor"
import { getPhoton } from "@/lib/image-processor"

export function EditorCanvas() {
  const { code, processedImageUrl, setProcessedImageUrl, setProcessingError, processingError, imageLayout } = useEditor()
  const { createSourceHelper } = useProject()
  const [processing, setProcessing] = React.useState(false)
  const [sourceHelper, setSourceHelper] = React.useState<((identifier: string) => Promise<any>) | undefined>(undefined)
  const [lastSuccessfulImage, setLastSuccessfulImage] = React.useState<string | null>(null)

  // Canvas state
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const imageRef = React.useRef<HTMLImageElement | null>(null)
  const [imageLoaded, setImageLoaded] = React.useState(false)
  const [zoom, setZoom] = React.useState(1.0)
  const [panX, setPanX] = React.useState(0)
  const [panY, setPanY] = React.useState(0)
  const [isDragging, setIsDragging] = React.useState(false)
  const dragStartRef = React.useRef<{ x: number; y: number } | null>(null)
  const animationFrameRef = React.useRef<number | null>(null)
  const lastLayoutRef = React.useRef<typeof imageLayout | null>(null)

  // Initialize source helper when photon is available
  React.useEffect(() => {
    let cancelled = false
    const initSourceHelper = async () => {
      try {
        const photon = await getPhoton()
        if (!cancelled && photon) {
          const helper = createSourceHelper(photon)
          setSourceHelper(() => helper)
        }
      } catch (error) {
        console.error("Failed to initialize source helper:", error)
      }
    }
    initSourceHelper()
    return () => {
      cancelled = true
    }
  }, [createSourceHelper])

  // Process image when code changes
  // Code must load sources using source(identifier) and return a PhotonImage
  React.useEffect(() => {
    if (!code || !sourceHelper) {
      setProcessedImageUrl(null)
      return
    }

    let cancelled = false

    const process = async () => {
      setProcessing(true)
      setProcessingError(null)

      try {
        const result = await processImage({
          code,
          sourceHelper,
        })
        if (!cancelled) {
          setProcessedImageUrl(result)
          setProcessingError(null)
          setLastSuccessfulImage(result)
          // Reset zoom and pan when new image loads
          setZoom(1.0)
          setPanX(0)
          setPanY(0)
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err)
          const errorMessage = err instanceof Error ? err.message : "Failed to process image"
          setProcessingError(errorMessage)
          // Don't clear processedImageUrl - keep showing the last successful image
        }
      } finally {
        if (!cancelled) {
          setProcessing(false)
        }
      }
    }

    // Debounce processing
    const timeoutId = setTimeout(process, 300)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [code, sourceHelper, setProcessedImageUrl, setProcessingError])

  // Display the processed image result
  // If there's an error, show the last successful image dimmed
  const displayImageSrc = processedImageUrl || lastSuccessfulImage
  // Show error state when there's an error and we're not currently processing
  const hasError = processingError !== null && !processing
  const hasPreviousImage = lastSuccessfulImage !== null

  // Calculate best fit transform to fit image in viewport
  const calculateBestFit = React.useCallback(() => {
    const container = containerRef.current
    const img = imageRef.current
    if (!container || !img) return

    const rect = container.getBoundingClientRect()
    const containerWidth = rect.width
    const containerHeight = rect.height
    const imgWidth = img.width
    const imgHeight = img.height

    if (imgWidth === 0 || imgHeight === 0) return

    // Add padding (e.g., 40px on each side = 80px total reduction)
    const padding = 40
    const availableWidth = containerWidth - padding * 2
    const availableHeight = containerHeight - padding * 2

    // Calculate scale to fit image within available space (maintaining aspect ratio)
    const scaleX = availableWidth / imgWidth
    const scaleY = availableHeight / imgHeight
    const bestFitZoom = Math.min(scaleX, scaleY, 1.0) // Don't zoom in beyond 1:1

    // Center the image (pan = 0)
    setZoom(bestFitZoom)
    setPanX(0)
    setPanY(0)
  }, [])

  // Load image when displayImageSrc changes
  React.useEffect(() => {
    if (!displayImageSrc) {
      imageRef.current = null
      setImageLoaded(false)
      return
    }

    setImageLoaded(false)
    const img = new Image()
    img.onload = () => {
      imageRef.current = img
      setImageLoaded(true)
      // Calculate best fit when image loads
      // Use a small delay to ensure container has correct size
      setTimeout(() => {
        calculateBestFit()
      }, 0)
    }
    img.onerror = () => {
      imageRef.current = null
      setImageLoaded(false)
    }
    img.src = displayImageSrc

    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [displayImageSrc, calculateBestFit])

  // Recalculate best fit when layout changes
  React.useEffect(() => {
    // Only recalculate if layout actually changed
    if (lastLayoutRef.current !== imageLayout) {
      lastLayoutRef.current = imageLayout
      // Use a small delay to ensure container has resized
      const timeoutId = setTimeout(() => {
        if (imageLoaded && imageRef.current) {
          calculateBestFit()
        }
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [imageLayout, imageLoaded, calculateBestFit])

  // Drawing function
  const draw = React.useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d", {
      alpha: true,
      desynchronized: false,
      willReadFrequently: false,
    })
    if (!ctx) return

    const rect = container.getBoundingClientRect()
    const width = rect.width
    const height = rect.height

    // Handle high-DPI displays for crisp rendering
    const dpr = window.devicePixelRatio || 1
    const displayWidth = width
    const displayHeight = height

    // Set canvas size accounting for device pixel ratio
    canvas.width = displayWidth * dpr
    canvas.height = displayHeight * dpr

    // Scale context to match device pixel ratio
    ctx.scale(dpr, dpr)

    // Enable high-quality image smoothing
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"

    // Clear canvas
    ctx.clearRect(0, 0, displayWidth, displayHeight)

    // Draw checkerboard background
    const checkerSize = 20
    // Use standard checkerboard colors that work with both light and dark themes
    const lightSquare = "#f5f5f5"
    const darkSquare = "#e0e0e0"

    // Fill with light color first
    ctx.fillStyle = lightSquare
    ctx.fillRect(0, 0, displayWidth, displayHeight)

    // Draw dark squares
    ctx.fillStyle = darkSquare
    for (let y = 0; y < displayHeight; y += checkerSize) {
      for (let x = 0; x < displayWidth; x += checkerSize) {
        if ((Math.floor(x / checkerSize) + Math.floor(y / checkerSize)) % 2 === 1) {
          ctx.fillRect(x, y, checkerSize, checkerSize)
        }
      }
    }

    // Draw image if available
    const img = imageRef.current
    if (img) {
      const imgWidth = img.width
      const imgHeight = img.height
      const scaledWidth = imgWidth * zoom
      const scaledHeight = imgHeight * zoom

      // Calculate centered position with pan offset
      const x = (displayWidth - scaledWidth) / 2 + panX
      const y = (displayHeight - scaledHeight) / 2 + panY

      // Apply error styling if needed
      if (hasError && hasPreviousImage) {
        ctx.globalAlpha = 0.5
        ctx.filter = "grayscale(100%)"
      } else {
        ctx.globalAlpha = 1.0
        ctx.filter = "none"
      }

      // Use high-quality rendering
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight)

      // Reset global alpha and filter
      ctx.globalAlpha = 1.0
      ctx.filter = "none"
    }
  }, [zoom, panX, panY, hasError, hasPreviousImage, imageLoaded, displayImageSrc])

  // Redraw when dependencies change
  React.useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    animationFrameRef.current = requestAnimationFrame(() => {
      draw()
    })
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [draw])

  // Handle resize
  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver(() => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      animationFrameRef.current = requestAnimationFrame(() => {
        draw()
      })
    })

    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [draw])

  // Mouse event handlers - use native event listener for better scroll prevention
  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      // Check if mouse is over the container
      const rect = container.getBoundingClientRect()
      const mouseX = e.clientX
      const mouseY = e.clientY

      const isOverContainer =
        mouseX >= rect.left &&
        mouseX <= rect.right &&
        mouseY >= rect.top &&
        mouseY <= rect.bottom

      if (!isOverContainer || !imageRef.current) return

      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()

      const canvas = canvasRef.current
      if (!canvas) return

      const canvasRect = canvas.getBoundingClientRect()
      const canvasMouseX = mouseX - canvasRect.left
      const canvasMouseY = mouseY - canvasRect.top

      // Use multiplicative zoom for smoother, less sensitive zooming
      const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05
      const newZoom = Math.max(0.1, Math.min(10.0, zoom * zoomFactor))

      // Calculate the point under cursor in image space
      const img = imageRef.current
      const canvasWidth = canvasRect.width
      const canvasHeight = canvasRect.height
      const scaledWidth = img.width * zoom
      const scaledHeight = img.height * zoom
      const imageX = (canvasWidth - scaledWidth) / 2 + panX
      const imageY = (canvasHeight - scaledHeight) / 2 + panY

      // Convert mouse position to image space coordinates
      const imageSpaceX = (canvasMouseX - imageX) / zoom
      const imageSpaceY = (canvasMouseY - imageY) / zoom

      // Calculate new image position to keep the point under cursor fixed
      const newScaledWidth = img.width * newZoom
      const newScaledHeight = img.height * newZoom
      const newImageX = canvasMouseX - imageSpaceX * newZoom
      const newImageY = canvasMouseY - imageSpaceY * newZoom

      // Convert back to pan offset
      const newPanX = newImageX - (canvasWidth - newScaledWidth) / 2
      const newPanY = newImageY - (canvasHeight - newScaledHeight) / 2

      setZoom(newZoom)
      setPanX(newPanX)
      setPanY(newPanY)
    }

    // Use capture phase and non-passive to ensure preventDefault works
    // Add to document to catch before any parent scroll handlers
    document.addEventListener("wheel", handleWheel, { passive: false, capture: true })

    return () => {
      document.removeEventListener("wheel", handleWheel, { capture: true } as EventListenerOptions)
    }
  }, [zoom, panX, panY])

  const handleMouseDown = React.useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return // Only left mouse button
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX - panX, y: e.clientY - panY }
  }, [panX, panY])

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging || !dragStartRef.current) return
      setPanX(e.clientX - dragStartRef.current.x)
      setPanY(e.clientY - dragStartRef.current.y)
    },
    [isDragging]
  )

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false)
    dragStartRef.current = null
  }, [])

  const handleMouseLeave = React.useCallback(() => {
    setIsDragging(false)
    dragStartRef.current = null
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full items-center justify-center overflow-hidden bg-muted/30"
      style={{
        cursor: displayImageSrc ? (isDragging ? "grabbing" : "grab") : "default",
        touchAction: "none",
        overscrollBehavior: "none",
      }}
    >
      {/* Processing indicator */}
      {processing && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <div className="text-sm font-medium text-foreground">Processing...</div>
          </div>
        </div>
      )}

      {/* Error indicator overlay - positioned at bottom */}
      {hasError && (
        <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-center pb-4 px-4">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 shadow-lg backdrop-blur-sm max-w-full">
            <div className="flex items-start gap-2">
              <svg
                className="h-4 w-4 text-destructive shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-destructive">
                  {"Processing failed"}
                </div>
                {processingError && (
                  <div className="mt-1 text-xs text-destructive/80 font-mono break-words">
                    {processingError}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {displayImageSrc !== null ? (
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <div className="text-center">
            <p className="text-sm">No image processed yet</p>
            <p className="mt-2 text-xs">Load a source using source(identifier) in your code</p>
          </div>
        </div>
      )}
    </div>
  )
}

