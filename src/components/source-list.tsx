import * as React from "react"
import { useProject } from "@/contexts/project-context"
import { loadImageSourceToData } from "@/lib/image-loader"
import { Badge } from "@/components/ui/badge"

interface SourceThumbnail {
    identifier: string
    thumbnailUrl: string | null
    loading: boolean
    error: string | null
}

export function SourceList() {
    const { project } = useProject()
    const [thumbnails, setThumbnails] = React.useState<Map<string, SourceThumbnail>>(new Map())

    // Load thumbnails asynchronously
    React.useEffect(() => {
        const loadThumbnails = async () => {
            const newThumbnails = new Map<string, SourceThumbnail>()

            // Initialize all sources as loading
            project.sources.forEach((source) => {
                newThumbnails.set(source.identifier, {
                    identifier: source.identifier,
                    thumbnailUrl: null,
                    loading: true,
                    error: null,
                })
            })

            setThumbnails(newThumbnails)

            // Load each thumbnail
            for (const source of project.sources) {
                try {
                    const { imageData, width, height } = await loadImageSourceToData(source)

                    // Create thumbnail - resize to max 64px while maintaining aspect ratio
                    const maxSize = 64
                    let thumbWidth = width
                    let thumbHeight = height

                    if (width > height) {
                        if (width > maxSize) {
                            thumbWidth = maxSize
                            thumbHeight = Math.round((height / width) * maxSize)
                        }
                    } else {
                        if (height > maxSize) {
                            thumbHeight = maxSize
                            thumbWidth = Math.round((width / height) * maxSize)
                        }
                    }

                    const canvas = document.createElement("canvas")
                    canvas.width = thumbWidth
                    canvas.height = thumbHeight
                    const ctx = canvas.getContext("2d")
                    if (ctx) {
                        ctx.drawImage(
                            await createImageFromImageData(imageData, width, height),
                            0,
                            0,
                            thumbWidth,
                            thumbHeight
                        )
                        const thumbnailUrl = canvas.toDataURL()

                        setThumbnails((prev) => {
                            const updated = new Map(prev)
                            updated.set(source.identifier, {
                                identifier: source.identifier,
                                thumbnailUrl,
                                loading: false,
                                error: null,
                            })
                            return updated
                        })
                    }
                } catch (error) {
                    setThumbnails((prev) => {
                        const updated = new Map(prev)
                        updated.set(source.identifier, {
                            identifier: source.identifier,
                            thumbnailUrl: null,
                            loading: false,
                            error: error instanceof Error ? error.message : "Failed to load",
                        })
                        return updated
                    })
                }
            }
        }

        loadThumbnails()
    }, [project.sources])

    // Helper to create Image from ImageData
    const createImageFromImageData = async (imageData: ImageData, width: number, height: number): Promise<HTMLImageElement> => {
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
            throw new Error("Could not get 2D context")
        }
        ctx.putImageData(imageData, 0, 0)

        return new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => resolve(img)
            img.onerror = reject
            img.src = canvas.toDataURL()
        })
    }

    if (project.sources.length === 0) {
        return (
            <div className="px-4 py-2 text-sm text-muted-foreground">No sources available</div>
        )
    }

    return (
        <div className="space-y-2">
            {project.sources.map((source) => {
                const thumbnail = thumbnails.get(source.identifier)
                return (
                    <div
                        key={source.identifier}
                        className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:bg-muted/50 transition-colors"
                    >
                        <div className="flex-shrink-0">
                            {thumbnail?.loading ? (
                                <div className="flex h-12 w-12 items-center justify-center rounded border border-border bg-muted">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-foreground" />
                                </div>
                            ) : thumbnail?.thumbnailUrl ? (
                                <img
                                    src={thumbnail.thumbnailUrl}
                                    alt={source.identifier}
                                    className="h-12 w-12 rounded border border-border object-cover"
                                />
                            ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded border border-border bg-muted text-xs text-muted-foreground">
                                    {thumbnail?.error ? "Error" : "—"}
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-medium">{source.identifier}</span>
                                <Badge variant="outline" className="shrink-0 text-xs">
                                    {source.type === "url" ? "URL" : "Local"}
                                </Badge>
                            </div>
                            {source.type === "url" && (
                                <div className="truncate text-xs text-muted-foreground">{source.url}</div>
                            )}
                            {source.type === "local" && (
                                <div className="truncate text-xs text-muted-foreground">{source.path}</div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
