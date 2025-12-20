import { createPhotonExecutor, getCommonPhotonFunctions } from "./photon-runtime"

export interface ProcessImageOptions {
    code: string
    sourceHelper?: (identifier: string) => Promise<any>
}

/**
 * Strip TypeScript type annotations from code to make it valid JavaScript
 * Handles function parameters, return types, and variable type annotations
 */
function stripTypeScriptTypes(code: string): string {
    // Remove TypeScript type annotations from function parameters
    // Handles: function name(param: Type) -> function name(param)
    // Also handles: (param: Type) => -> (param) =>

    // Match function parameters with types: (param: Type, param2: Type2)
    code = code.replace(/\(([^)]+)\)/g, (match, params) => {
        // Check if this parameter list contains type annotations
        if (!params.includes(':')) {
            return match // No types, return as-is
        }

        // Extract parameter names without types
        const paramNames = params.split(',').map((p: string) => {
            const trimmed = p.trim()
            // Handle rest parameters: ...param: Type
            if (trimmed.startsWith('...')) {
                return trimmed.split(':')[0].trim()
            }
            // Handle default parameters: param: Type = value
            const beforeDefault = trimmed.split('=')[0]
            // Extract just the parameter name (before the colon)
            return beforeDefault.split(':')[0].trim()
        }).filter((p: string) => p.length > 0)

        return `(${paramNames.join(', ')})`
    })

    // Remove return type annotations: function name(): ReturnType -> function name()
    // Handles both regular and async functions, including Promise<Type>
    // Match everything from : to { (including newlines and angle brackets)
    code = code.replace(/(async\s+)?function\s+(\w+)\s*\([^)]*\)\s*:\s*[^{]*/g, (_match, asyncKeyword, funcName) => {
        // Reconstruct the function signature without the return type
        return asyncKeyword ? `async function ${funcName}()` : `function ${funcName}()`
    })

    // Also handle arrow functions with return types: () => Type => () =>
    code = code.replace(/(async\s+)?\([^)]*\)\s*:\s*[^=]*=>/g, (match) => {
        // Remove return type, keep async if present
        const asyncMatch = match.match(/(async\s+)?\([^)]*\)/)?.[0]
        return asyncMatch ? `${asyncMatch} =>` : match.replace(/:\s*[^=]*=>/, ' =>')
    })

    // Remove arrow function return types: () => ReturnType -> () =>
    // Handles both regular and async arrow functions, including Promise<Type>
    code = code.replace(/(async\s+)?\([^)]*\)\s*:\s*[^=]+=>/g, (match) => {
        // Remove the return type part, keeping async keyword if present
        return match.replace(/\s*:\s*[^=]+=>/, ' =>')
    })

    // Remove variable type annotations: let x: Type = -> let x =
    code = code.replace(/(let|const|var)\s+(\w+)\s*:\s*[^=]+=/g, '$1 $2 =')

    // Remove type assertions: x as Type -> x
    code = code.replace(/\s+as\s+\w+(?:<[^>]*>)?/g, '')

    return code
}

// Cache the initialized photon module
let photonModule: any = null
let photonInitPromise: Promise<any> | null = null

export async function getPhoton() {
    // If already initialized, return it
    if (photonModule && photonModule.open_image) {
        return photonModule
    }

    // If initialization is in progress, wait for it
    if (photonInitPromise) {
        await photonInitPromise
        return photonModule
    }

    // Start initialization
    photonInitPromise = (async () => {
        const module = await import("@silvia-odwyer/photon")

        // Initialize WASM - let Photon auto-detect the WASM file
        // It uses import.meta.url internally to find the WASM file
        if (module.default) {
            await module.default()
        }

        photonModule = module
        return module
    })()

    await photonInitPromise
    return photonModule
}

export async function processImage({ code, sourceHelper }: ProcessImageOptions): Promise<string> {
    // Get initialized photon module
    const photon = await getPhoton()

    if (!photon || !photon.open_image) {
        throw new Error("Failed to initialize Photon module")
    }

    // Get commonly used functions for direct use
    const { putImageData } = getCommonPhotonFunctions(photon)

    // Execute user code with all photon functions available as globals
    // Main function must return a PhotonImage (load sources using source(identifier))
    let photonImage
    try {
        // Strip TypeScript type annotations before execution (for valid JavaScript)
        const javascriptCode = stripTypeScriptTypes(code)

        // Debug: log if type annotations might still be present
        if (javascriptCode.includes('Promise<') || javascriptCode.includes(': PhotonImage')) {
            console.warn('Warning: Type annotations may not have been fully stripped:', javascriptCode.substring(0, 200))
        }

        // Use the generated executor which handles all function injection
        // The executor calls main() which must return a PhotonImage
        const executeUserCode = createPhotonExecutor(photon, sourceHelper)
        photonImage = await executeUserCode(javascriptCode)

        if (!photonImage) {
            throw new Error("main() returned null or undefined. It must return a PhotonImage.")
        }
    } catch (error) {
        throw error
    }

    // Get dimensions from the returned PhotonImage
    const width = photonImage.get_width()
    const height = photonImage.get_height()

    if (width === 0 || height === 0) {
        throw new Error("Returned PhotonImage has invalid dimensions")
    }

    const outputCanvas = document.createElement("canvas")
    outputCanvas.width = width
    outputCanvas.height = height
    const outputCtx = outputCanvas.getContext("2d", {
        alpha: true,
        desynchronized: false,
        willReadFrequently: false,
    })

    if (!outputCtx) {
        throw new Error("Could not get 2D context from output canvas")
    }

    // Enable high-quality image smoothing
    outputCtx.imageSmoothingEnabled = true
    outputCtx.imageSmoothingQuality = "high"

    try {
        putImageData(outputCanvas, outputCtx, photonImage)
    } catch (error) {
        throw new Error(`Failed to put image data: ${error instanceof Error ? error.message : String(error)}`)
    }

    // Convert canvas to data URL with high quality (PNG format for lossless quality)
    return outputCanvas.toDataURL("image/png")
}

