import * as React from "react"
import { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from "react"
import type { Project, CodeFunctions } from "@/lib/project"
import type { ImageSource } from "@/lib/image-sources"
import { loadImageSourceToData } from "@/lib/image-loader"
import { getCommonPhotonFunctions } from "@/lib/photon-runtime"

const DEFAULT_PROJECT: Project = {
    identifier: "sample-project",
    name: "Sample Project",
    description: null,
    sources: [
        {
            type: "url",
            identifier: "sample-1",
            url: "https://picsum.photos/800/600?random=1",
        },
        {
            type: "url",
            identifier: "sample-2",
            url: "https://picsum.photos/800/600?random=2",
        },
        {
            type: "url",
            identifier: "sample-3",
            url: "https://picsum.photos/800/600?random=3",
        },
    ],
    functions: [
        {
            filename: "grayscale",
            code: `async function main(): Promise<PhotonImage> {
    // Load a source image using source(identifier)
    // Available sources are listed in the sidebar
    const image = await source("sample-1");
    
    // Apply image processing operations
    // Photon functions modify the image in place
    grayscale(image);
    
    // You MUST return the PhotonImage
    return image;
}`,
        },
        {
            filename: "story-thumbnail",
            code: `async function main(): Promise<PhotonImage> {
    // Create Instagram story format
    const bgColor = rgba(15, 25, 45, 255);
    const story = createImageWithSizeTemplate("instagram-story", bgColor);
    
    // Load and enhance source image
    const sourceImg = await source("sample-1");
    adjust_brightness(sourceImg, 15);
    
    // Paste image with padding (centered, 800px wide)
    paste(sourceImg, story, 140, 200, 800, 800);
    
    // Add text at top and bottom (using draw_text for cleaner rendering)
    draw_text(story, "NEW RELEASE", 100, 100, 72);
    draw_text(story, "SWIPE UP", 100, 1700, 48);
    
    return story;
}`,
        },
    ],
}

interface ProjectContextValue {
    project: Project
    setProject: (project: Project) => void
    updateProjectIdentifier: (identifier: string) => void
    updateProjectName: (name: string) => void
    updateProjectDescription: (description: string | null) => void
    addSource: (source: ImageSource) => void
    removeSource: (identifier: string) => void
    updateSource: (identifier: string, source: ImageSource) => void
    addFunction: (func: CodeFunctions) => void
    removeFunction: (filename: string) => void
    updateFunction: (filename: string, func: CodeFunctions) => void
    createSourceHelper: (photon: any) => (identifier: string) => Promise<any>
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined)

export function ProjectProvider({ children }: { children: ReactNode }) {
    const [project, setProject] = useState<Project>(DEFAULT_PROJECT)

    const updateProjectIdentifier = useCallback((identifier: string) => {
        setProject((prev) => ({ ...prev, identifier }))
    }, [])

    const updateProjectName = useCallback((name: string) => {
        setProject((prev) => ({ ...prev, name }))
    }, [])

    const updateProjectDescription = useCallback((description: string | null) => {
        setProject((prev) => ({ ...prev, description }))
    }, [])

    const addSource = useCallback((source: ImageSource) => {
        setProject((prev) => ({
            ...prev,
            sources: [...prev.sources, source],
        }))
    }, [])

    const removeSource = useCallback((identifier: string) => {
        setProject((prev) => ({
            ...prev,
            sources: prev.sources.filter((s) => s.identifier !== identifier),
        }))
    }, [])

    const updateSource = useCallback((identifier: string, source: ImageSource) => {
        setProject((prev) => ({
            ...prev,
            sources: prev.sources.map((s) => (s.identifier === identifier ? source : s)),
        }))
    }, [])

    const addFunction = useCallback((func: CodeFunctions) => {
        setProject((prev) => ({
            ...prev,
            functions: [...prev.functions, func],
        }))
    }, [])

    const removeFunction = useCallback((filename: string) => {
        setProject((prev) => ({
            ...prev,
            functions: prev.functions.filter((f) => f.filename !== filename),
        }))
    }, [])

    const updateFunction = useCallback((filename: string, func: CodeFunctions) => {
        setProject((prev) => ({
            ...prev,
            functions: prev.functions.map((f) => (f.filename === filename ? func : f)),
        }))
    }, [])

    // Create source helper function that can be injected into the executor
    // Use a ref to always access the latest project sources
    const projectRef = React.useRef(project)
    React.useEffect(() => {
        projectRef.current = project
    }, [project])

    const createSourceHelper = useCallback(
        (photon: any) => {
            const { open_image } = getCommonPhotonFunctions(photon)

            return async (identifier: string): Promise<any> => {
                const source = projectRef.current.sources.find((s) => s.identifier === identifier)
                if (!source) {
                    throw new Error(`Source "${identifier}" not found`)
                }

                // Load image source to ImageData
                const { imageData, width, height } = await loadImageSourceToData(source)

                // Create canvas and convert to PhotonImage
                const canvas = document.createElement("canvas")
                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext("2d", { willReadFrequently: true })

                if (!ctx) {
                    throw new Error("Could not get 2D context from canvas")
                }

                ctx.putImageData(imageData, 0, 0)

                // Convert to PhotonImage
                const photonImage = open_image(canvas, ctx)
                if (!photonImage) {
                    throw new Error("Failed to create PhotonImage from source")
                }

                return photonImage
            }
        },
        [] // Empty deps - we use projectRef to access latest sources
    )

    const contextValue = useMemo(
        () => ({
            project,
            setProject,
            updateProjectIdentifier,
            updateProjectName,
            updateProjectDescription,
            addSource,
            removeSource,
            updateSource,
            addFunction,
            removeFunction,
            updateFunction,
            createSourceHelper,
        }),
        [project, updateProjectIdentifier, updateProjectName, updateProjectDescription, addSource, removeSource, updateSource, addFunction, removeFunction, updateFunction, createSourceHelper]
    )

    return <ProjectContext.Provider value={contextValue}>{children}</ProjectContext.Provider>
}

export function useProject() {
    const context = useContext(ProjectContext)
    if (context === undefined) {
        throw new Error("useProject must be used within a ProjectProvider")
    }
    return context
}
