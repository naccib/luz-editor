import * as React from "react"
import { createContext, useContext, useState, useMemo, useCallback, useRef, type ReactNode } from "react"
import type { ImageSource } from "@/lib/image-sources"
import { loadImageSourceToData } from "@/lib/image-loader"
import { useProject } from "./project-context"

export type ImageLayout = "side-by-side" | "stacked" | "image-only" | "code-only"

export interface ImageDimensions {
    width: number
    height: number
}

const RESTORY_HISTORY_SIZE: number = 10

interface EditorContextValue {
    imageLayout: ImageLayout
    imageSource: ImageSource | null
    imageData: ImageData | null
    originalImageUrl: string | null
    imageDimensions: ImageDimensions | null
    processedImageUrl: string | null
    code: string
    activeFunctionFilename: string | null
    toolbarVisible: boolean
    processingError: string | null
    canRevert: boolean
    canRestore: boolean
    setImageLayout: (layout: ImageLayout) => void
    setImageSource: (source: ImageSource | null) => void
    setImageData: (data: ImageData | null) => void
    setOriginalImageUrl: (url: string | null) => void
    setImageDimensions: (dimensions: ImageDimensions | null) => void
    setProcessedImageUrl: (url: string | null) => void
    setCode: (code: string) => void
    loadFunction: (filename: string) => void
    setProcessingError: (error: string | null) => void
    toggleToolbar: () => void
    revert: () => void
    restore: () => void
}

const EditorContext = createContext<EditorContextValue | undefined>(undefined)

export function EditorProvider({ children }: { children: ReactNode }) {
    const { project, updateFunction } = useProject()
    const [imageLayout, setImageLayout] = useState<ImageLayout>("side-by-side")
    const [imageSource, setImageSource] = useState<ImageSource | null>({
        type: "url",
        identifier: "default",
        url: "https://picsum.photos/800/600",
    })
    const [imageData, setImageData] = useState<ImageData | null>(null)
    const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null)
    const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null)
    const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null)
    const [activeFunctionFilename, setActiveFunctionFilename] = useState<string | null>(null)
    const [code, setCode] = useState<string>("")
    const [toolbarVisible, setToolbarVisible] = useState<boolean>(true)
    const [processingError, setProcessingError] = useState<string | null>(null)

    // History state
    const [history, setHistory] = useState<string[]>([])
    const [historyIndex, setHistoryIndex] = useState<number>(0)
    const isNavigatingHistoryRef = useRef<boolean>(false)
    const isLoadingFunctionRef = useRef<boolean>(false)
    const historyIndexRef = useRef<number>(0)
    const lastSuccessfulCodeRef = useRef<string | null>(null)
    const restoredCodeRef = useRef<string | null>(null)
    const previousProcessedImageUrlRef = useRef<string | null>(null)
    const lastSyncedCodeRef = useRef<string | null>(null)

    // Keep ref in sync with state
    React.useEffect(() => {
        historyIndexRef.current = historyIndex
    }, [historyIndex])

    // Load function by filename
    const loadFunction = useCallback((filename: string) => {
        const func = project.functions.find((f) => f.filename === filename)
        if (func) {
            isLoadingFunctionRef.current = true
            setActiveFunctionFilename(filename)
            setCode(func.code)
            lastSyncedCodeRef.current = func.code
            // Completely reset history when switching to a different function
            setHistory([func.code])
            setHistoryIndex(0)
            historyIndexRef.current = 0
            isNavigatingHistoryRef.current = false
            lastSuccessfulCodeRef.current = null
            restoredCodeRef.current = null
            previousProcessedImageUrlRef.current = null
            // Clear loading flag after a short delay
            setTimeout(() => {
                isLoadingFunctionRef.current = false
            }, 100)
        }
    }, [project.functions])

    // Initialize with grayscale function on mount
    React.useEffect(() => {
        const grayscaleFunction = project.functions.find((f) => f.filename === "grayscale")
        if (grayscaleFunction && !activeFunctionFilename) {
            loadFunction("grayscale")
        }
    }, [project.functions, activeFunctionFilename, loadFunction])

    // Sync code changes back to the active function (only when user edits, not when loading)
    React.useEffect(() => {
        if (activeFunctionFilename && code && !isLoadingFunctionRef.current) {
            // Only sync if code actually changed from what we last synced
            if (lastSyncedCodeRef.current !== code) {
                const func = project.functions.find((f) => f.filename === activeFunctionFilename)
                if (func && func.code !== code) {
                    // Update the function and track the synced code
                    updateFunction(activeFunctionFilename, {
                        filename: activeFunctionFilename,
                        code: code,
                    })
                    lastSyncedCodeRef.current = code
                }
            }
        }
    }, [code, activeFunctionFilename, project.functions, updateFunction])

    // Load image source to bytes when source changes
    // Also create a data URL from the bytes so we never need to reload from source
    React.useEffect(() => {
        if (!imageSource) {
            setImageData(null)
            setOriginalImageUrl(null)
            setImageDimensions(null)
            return
        }

        let cancelled = false

        const loadImage = async () => {
            try {
                const result = await loadImageSourceToData(imageSource)
                if (!cancelled) {
                    setImageData(result.imageData)
                    setImageDimensions({
                        width: result.width,
                        height: result.height,
                    })

                    // Create a data URL from the image data once
                    // This ensures we never reload from the source URL
                    const canvas = document.createElement("canvas")
                    canvas.width = result.width
                    canvas.height = result.height
                    const ctx = canvas.getContext("2d")
                    if (ctx) {
                        ctx.putImageData(result.imageData, 0, 0)
                        const dataUrl = canvas.toDataURL()
                        setOriginalImageUrl(dataUrl)
                    }
                }
            } catch (error) {
                if (!cancelled) {
                    console.error("Failed to load image:", error)
                    setImageData(null)
                    setOriginalImageUrl(null)
                    setImageDimensions(null)
                }
            }
        }

        loadImage()

        return () => {
            cancelled = true
        }
    }, [imageSource])

    // Cleanup object URLs when image source changes
    const handleSetImageSource = useCallback((source: ImageSource | null) => {
        // Revoke previous object URL if it was a local file
        setImageSource((prevSource) => {
            if (prevSource?.type === "local" && prevSource.path.startsWith("blob:")) {
                URL.revokeObjectURL(prevSource.path)
            }
            return source
        })
    }, [])

    const toggleToolbar = useCallback(() => {
        setToolbarVisible((prev) => !prev)
    }, [])

    // Save code to history
    const saveToHistory = useCallback((newCode: string) => {
        // Don't save if we're currently navigating history
        if (isNavigatingHistoryRef.current) {
            return
        }

        setHistory((prevHistory) => {
            // Check if code actually changed
            const lastEntry = prevHistory[prevHistory.length - 1]
            if (lastEntry === newCode) {
                return prevHistory
            }

            const currentIndex = historyIndexRef.current
            let newHistory: string[]
            let newIndex: number

            if (currentIndex < prevHistory.length - 1) {
                // Truncate history at current index
                newHistory = [...prevHistory.slice(0, currentIndex + 1), newCode]
                newIndex = newHistory.length - 1
            } else {
                // Add new entry
                newHistory = [...prevHistory, newCode]
                // Keep only last RESTORY_HISTORY_SIZE entries
                if (newHistory.length > RESTORY_HISTORY_SIZE) {
                    newHistory = newHistory.slice(-RESTORY_HISTORY_SIZE)
                }
                newIndex = newHistory.length - 1
            }

            // Update history index and ref immediately
            setHistoryIndex(newIndex)
            historyIndexRef.current = newIndex
            return newHistory
        })
    }, [])

    // Wrapped setCode - don't save to history automatically
    // History is saved only when processing succeeds
    // Also syncs back to active function
    const handleSetCode = useCallback((newCode: string) => {
        setCode(newCode)
        // Reset refs when code changes (not during navigation)
        // This allows saving new successful states even if they match previous ones
        if (!isNavigatingHistoryRef.current) {
            lastSuccessfulCodeRef.current = null
            // Clear restored code ref when user makes new changes
            restoredCodeRef.current = null
        }
    }, [])

    const revert = useCallback(() => {
        setHistoryIndex((currentIndex) => {
            if (currentIndex > 0) {
                const newIndex = currentIndex - 1
                historyIndexRef.current = newIndex
                setHistory((prevHistory) => {
                    const restoredCode = prevHistory[newIndex]
                    restoredCodeRef.current = restoredCode
                    isNavigatingHistoryRef.current = true
                    setCode(restoredCode)
                    // Clear flag after a delay to prevent saving restored code
                    setTimeout(() => {
                        isNavigatingHistoryRef.current = false
                        // Clear restored code ref after processing completes
                        setTimeout(() => {
                            restoredCodeRef.current = null
                        }, 500)
                    }, 100)
                    return prevHistory
                })
                return newIndex
            }
            return currentIndex
        })
    }, [])

    const restore = useCallback(() => {
        setHistory((prevHistory) => {
            setHistoryIndex((currentIndex) => {
                if (currentIndex < prevHistory.length - 1) {
                    const newIndex = currentIndex + 1
                    const restoredCode = prevHistory[newIndex]
                    restoredCodeRef.current = restoredCode
                    historyIndexRef.current = newIndex
                    isNavigatingHistoryRef.current = true
                    setCode(restoredCode)
                    // Clear flag after a delay to prevent saving restored code
                    setTimeout(() => {
                        isNavigatingHistoryRef.current = false
                        // Clear restored code ref after processing completes
                        setTimeout(() => {
                            restoredCodeRef.current = null
                        }, 500)
                    }, 100)
                    return newIndex
                }
                return currentIndex
            })
            return prevHistory
        })
    }, [])

    // Save to history only when processing succeeds
    React.useEffect(() => {
        // Don't save if we're navigating history
        if (isNavigatingHistoryRef.current) {
            // Update ref to track current processedImageUrl even during navigation
            previousProcessedImageUrlRef.current = processedImageUrl
            return
        }

        // Don't save if this is restored code (from history navigation)
        if (restoredCodeRef.current === code) {
            // Update ref to track current processedImageUrl
            previousProcessedImageUrlRef.current = processedImageUrl
            return
        }

        // Only save when processing succeeds (processedImageUrl is set and no error)
        // AND when processedImageUrl has changed (indicating a new successful processing)
        if (processedImageUrl && !processingError) {
            // Check if this is a new successful result (processedImageUrl changed)
            const isNewSuccessfulResult = previousProcessedImageUrlRef.current !== processedImageUrl

            if (isNewSuccessfulResult) {
                // Don't save if this code was already successfully processed and saved
                if (lastSuccessfulCodeRef.current === code) {
                    previousProcessedImageUrlRef.current = processedImageUrl
                    return
                }

                // Save the successful code to history
                saveToHistory(code)
                lastSuccessfulCodeRef.current = code
            }

            // Update ref to track current processedImageUrl
            previousProcessedImageUrlRef.current = processedImageUrl
        } else {
            // Update ref when there's an error or no processed image
            previousProcessedImageUrlRef.current = processedImageUrl
        }
    }, [processedImageUrl, processingError, code, saveToHistory])

    // Cleanup on unmount
    React.useEffect(() => {
        return () => {
            if (imageSource?.type === "local" && imageSource.path.startsWith("blob:")) {
                URL.revokeObjectURL(imageSource.path)
            }
        }
    }, [imageSource])

    const canRevert = historyIndex > 0
    const canRestore = historyIndex < history.length - 1

    const contextValue = useMemo(
        () => ({
            imageLayout,
            imageSource,
            imageData,
            originalImageUrl,
            imageDimensions,
            processedImageUrl,
            code,
            activeFunctionFilename,
            toolbarVisible,
            processingError,
            canRevert,
            canRestore,
            setImageLayout,
            setImageSource: handleSetImageSource,
            setImageData,
            setOriginalImageUrl,
            setImageDimensions,
            setProcessedImageUrl,
            setCode: handleSetCode,
            loadFunction,
            setProcessingError,
            toggleToolbar,
            revert,
            restore,
        }),
        [
            imageLayout,
            imageSource,
            imageData,
            originalImageUrl,
            imageDimensions,
            processedImageUrl,
            code,
            activeFunctionFilename,
            toolbarVisible,
            processingError,
            canRevert,
            canRestore,
            handleSetImageSource,
            handleSetCode,
            loadFunction,
            toggleToolbar,
            revert,
            restore,
        ]
    )

    return (
        <EditorContext.Provider value={contextValue}>
            {children}
        </EditorContext.Provider>
    )
}

export function useEditor() {
    const context = useContext(EditorContext)
    if (context === undefined) {
        throw new Error("useEditor must be used within an EditorProvider")
    }
    return context
}

