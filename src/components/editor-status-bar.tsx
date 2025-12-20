import { useEditor } from "@/contexts/editor-context"

export function EditorStatusBar() {
  const { imageSource, imageDimensions, processingError } = useEditor()

  const getImageDisplay = () => {
    if (!imageSource) return null
    if (imageSource.type === "url") {
      return imageSource.url
    }
    return imageSource.path
  }

  const imageDisplay = getImageDisplay()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex h-6 items-center gap-4 border-t bg-muted/50 px-4 text-xs">
      {processingError ? (
        <span className="truncate text-destructive" title={processingError}>
          <strong>Error:</strong> {processingError}
        </span>
      ) : (
        <>
          {imageDisplay && (
            <>
              <span className="truncate text-muted-foreground" title={imageDisplay}>
                {imageSource?.type === "url" ? imageDisplay : "Local file"}
              </span>
              {imageDimensions && (
                <span className="shrink-0 text-muted-foreground">
                  {imageDimensions.width} × {imageDimensions.height}
                </span>
              )}
            </>
          )}
          {!imageDisplay && <span className="text-muted-foreground">No image loaded</span>}
        </>
      )}
    </div>
  )
}

