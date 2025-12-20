#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "fs"
import { join } from "path"

const PHOTON_TYPES_PATH = join(process.cwd(), "node_modules/@silvia-odwyer/photon/photon_rs.d.ts")
const OUTPUT_PATH = join(process.cwd(), "src/lib/photon-types.d.ts")
const OUTPUT_CONTENT_PATH = join(process.cwd(), "src/lib/photon-types-content.ts")
const OUTPUT_RUNTIME_PATH = join(process.cwd(), "src/lib/photon-runtime.ts")

interface FunctionSignature {
  name: string
  signature: string
}

interface ClassDefinition {
  name: string
  definition: string
}

interface EnumDefinition {
  name: string
  definition: string
}

function extractFunctions(content: string): FunctionSignature[] {
  const functions: FunctionSignature[] = []

  // Match export function declarations with optional JSDoc comments
  // Pattern: /** ... */ export function name(...): returnType;
  const functionRegex = /\/\*\*[\s\S]*?\*\/\s*export\s+function\s+(\w+)\s*\(([^)]*)\)\s*:\s*([^;]+);/g

  let match
  while ((match = functionRegex.exec(content)) !== null) {
    const name = match[1]
    const params = match[2].trim()
    const returnType = match[3].trim()

    // Skip internal WASM functions and initialization functions
    if (name.startsWith("__") || name.startsWith("init") || name === "run") {
      continue
    }

    functions.push({
      name,
      signature: `declare function ${name}(${params}): ${returnType};`
    })
  }

  // Also match functions without JSDoc comments
  const simpleFunctionRegex = /^export\s+function\s+(\w+)\s*\(([^)]*)\)\s*:\s*([^;]+);/gm
  while ((match = simpleFunctionRegex.exec(content)) !== null) {
    const name = match[1]
    const params = match[2].trim()
    const returnType = match[3].trim()

    // Skip if already added or is internal function
    if (name.startsWith("__") || name.startsWith("init") || name === "run" || functions.some(f => f.name === name)) {
      continue
    }

    functions.push({
      name,
      signature: `declare function ${name}(${params}): ${returnType};`
    })
  }

  return functions
}

function extractClasses(content: string): ClassDefinition[] {
  const classes: ClassDefinition[] = []
  const classNames = ["PhotonImage", "Rgb", "Rgba"]

  for (const className of classNames) {
    // Match export class declarations - need to handle nested braces properly
    const classStartRegex = new RegExp(`export\\s+class\\s+${className}\\s*\\{`, "s")
    const startMatch = content.match(classStartRegex)

    if (!startMatch) continue

    const startIndex = startMatch.index! + startMatch[0].length
    let braceCount = 1
    let endIndex = startIndex

    // Find the matching closing brace
    for (let i = startIndex; i < content.length && braceCount > 0; i++) {
      if (content[i] === "{") braceCount++
      if (content[i] === "}") braceCount--
      if (braceCount === 0) {
        endIndex = i
        break
      }
    }

    const classBody = content.substring(startIndex, endIndex)

    // Extract all method signatures (with optional JSDoc comments)
    const methods: string[] = []
    const foundMethods = new Set<string>()

    // First, extract constructors (they may or may not have JSDoc)
    const constructorRegex = /constructor\s*\(([^)]*)\)\s*;/g
    let constructorMatch
    while ((constructorMatch = constructorRegex.exec(classBody)) !== null) {
      const params = constructorMatch[1].trim()
      methods.push(`  constructor(${params});`)
      foundMethods.add("constructor")
    }

    // Match methods with JSDoc: /** ... */ static? methodName(...): returnType;
    const methodWithDocRegex = /\/\*\*[\s\S]*?\*\/\s*(static\s+)?(\w+)\s*\(([^)]*)\)\s*:\s*([^;]+);/g
    let methodMatch

    while ((methodMatch = methodWithDocRegex.exec(classBody)) !== null) {
      const isStatic = !!methodMatch[1]
      const methodName = methodMatch[2]
      const params = methodMatch[3].trim()
      const returnType = methodMatch[4].trim()

      // Skip constructor (already handled)
      if (methodName === "constructor") {
        continue
      }

      // Skip if already found
      if (foundMethods.has(methodName)) {
        continue
      }

      if (isStatic) {
        methods.push(`  static ${methodName}(${params}): ${returnType};`)
      } else {
        methods.push(`  ${methodName}(${params}): ${returnType};`)
      }

      foundMethods.add(methodName)
    }

    // Match methods without JSDoc: static? methodName(...): returnType;
    const methodWithoutDocRegex = /(static\s+)?(\w+)\s*\(([^)]*)\)\s*:\s*([^;]+);/g
    while ((methodMatch = methodWithoutDocRegex.exec(classBody)) !== null) {
      const isStatic = !!methodMatch[1]
      const methodName = methodMatch[2]
      const params = methodMatch[3].trim()
      const returnType = methodMatch[4].trim()

      // Skip constructor (already handled) or if already found
      if (methodName === "constructor" || foundMethods.has(methodName)) {
        continue
      }

      if (isStatic) {
        methods.push(`  static ${methodName}(${params}): ${returnType};`)
      } else {
        methods.push(`  ${methodName}(${params}): ${returnType};`)
      }

      foundMethods.add(methodName)
    }

    if (methods.length > 0) {
      classes.push({
        name: className,
        definition: `declare class ${className} {\n${methods.join("\n")}\n}`
      })
    }
  }

  return classes
}

function extractEnums(content: string): EnumDefinition[] {
  const enums: EnumDefinition[] = []
  const enumNames = ["SamplingFilter"]

  for (const enumName of enumNames) {
    // Match export enum declarations
    const enumRegex = new RegExp(
      `export\\s+enum\\s+${enumName}\\s*\\{([^}]+)\\}`
    )

    const match = content.match(enumRegex)
    if (match) {
      const enumBody = match[1]
      const members: string[] = []

      // Extract enum members: Name = value,
      const memberRegex = /(\w+)\s*=\s*([^,}]+)/g
      let memberMatch
      while ((memberMatch = memberRegex.exec(enumBody)) !== null) {
        const memberName = memberMatch[1]
        const memberValue = memberMatch[2].trim()
        members.push(`  ${memberName} = ${memberValue}`)
      }

      if (members.length > 0) {
        enums.push({
          name: enumName,
          definition: `declare enum ${enumName} {\n${members.join(",\n")}\n}`
        })
      }
    }
  }

  return enums
}

function generateTypeDefinitions(functions: FunctionSignature[], classes: ClassDefinition[], enums: EnumDefinition[]): string {
  const lines: string[] = []

  lines.push("// Auto-generated type definitions for Photon")
  lines.push("// This file is generated by scripts/generate-photon-types.ts")
  lines.push("// DO NOT EDIT THIS FILE MANUALLY")
  lines.push("")
  lines.push("// Global function declarations - use functions directly (e.g., grayscale(image))")
  lines.push("")

  // Sort functions alphabetically
  functions.sort((a, b) => a.name.localeCompare(b.name))

  for (const func of functions) {
    lines.push(func.signature)
  }

  lines.push("")
  lines.push("// Class declarations")
  lines.push("")

  for (const classDef of classes) {
    lines.push(classDef.definition)
    lines.push("")
  }

  if (enums.length > 0) {
    lines.push("// Enum declarations")
    lines.push("")

    for (const enumDef of enums) {
      lines.push(enumDef.definition)
      lines.push("")
    }
  }

  // Add helper functions
  lines.push("// Helper functions")
  lines.push("declare function copy(source: PhotonImage): PhotonImage;")
  lines.push("declare function copy(source: PhotonImage, dest: PhotonImage): PhotonImage;")
  lines.push("")

  // Add main function signature for user code
  lines.push("// User code entry point")
  lines.push("declare function main(image: PhotonImage): PhotonImage | void;")

  return lines.join("\n")
}

function generateRuntimeHelper(functions: FunctionSignature[]): string {
  // Filter out reserved keywords and invalid identifiers
  const validFunctions = functions.filter(f => {
    const name = f.name
    // Exclude reserved keywords and invalid identifiers
    return !['default', 'class', 'function', 'return', 'if', 'else', 'for', 'while', 'var', 'let', 'const'].includes(name) &&
      /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)
  })

  // Sort functions alphabetically for consistency
  validFunctions.sort((a, b) => a.name.localeCompare(b.name))

  const functionNames = validFunctions.map(f => f.name)
  const functionNamesStr = functionNames.map(name => `"${name}"`).join(", ")
  const functionParamsStr = functionNames.join(", ")

  return `// Auto-generated runtime helper for Photon
// This file is generated by scripts/generate-photon-types.ts
// DO NOT EDIT THIS FILE MANUALLY

/**
 * Get all photon function names (excluding internal WASM functions and reserved keywords)
 */
export const PHOTON_FUNCTION_NAMES = [
  ${functionNamesStr}
] as const

/**
 * Extract photon functions from the module and return them as an object
 * This allows using functions directly (e.g., grayscale(image)) instead of photon.grayscale(image)
 */
export function extractPhotonFunctions(photon: any): Record<string, Function> {
  const functions: Record<string, Function> = {}
  
  for (const name of PHOTON_FUNCTION_NAMES) {
    if (typeof photon[name] === 'function') {
      functions[name] = photon[name]
    }
  }
  
  return functions
}

/**
 * Get photon classes (Rgb, Rgba, PhotonImage) from the module
 */
export function getPhotonClasses(photon: any) {
  return {
    Rgb: photon.Rgb,
    Rgba: photon.Rgba,
    PhotonImage: photon.PhotonImage,
  }
}

/**
 * Create a function executor that injects all photon functions and classes as parameters
 * This allows user code to use functions and classes directly without the photon namespace
 */
export function createPhotonExecutor(photon: any) {
  const functions = extractPhotonFunctions(photon)
  const classes = getPhotonClasses(photon)
  const functionNames = Object.keys(functions)
  const classNames = Object.keys(classes)
  
  // Create the copy helper function that has access to PhotonImage class
  const PhotonImageClass = classes.PhotonImage
  const copyHelper = (source: any, dest?: any): any => {
    if (dest === undefined) {
      // Case 1: Create a new copy of the image
      return new PhotonImageClass(source.get_raw_pixels(), source.get_width(), source.get_height())
    } else {
      // Case 2: Copy source image data into dest
      dest.set_imgdata(source.get_image_data())
      return dest
    }
  }
  
  // Combine function and class parameters, plus the copy helper
  const allParams = [...functionNames, ...classNames, "copy", "image"]
  const functionParams = allParams.join(", ")
  const functionArgs = [
    ...functionNames.map(name => functions[name]),
    ...classNames.map(name => classes[name]),
    copyHelper, // Add the copy helper function
  ]
  
  return (code: string, image: any) => {
    const executeUserCode = new Function(
      functionParams,
      \`
    if (!image) {
      throw new Error('image parameter is null');
    }
    
    \${code}
    
    // Ensure main function exists and call it
    // Main function can optionally return a PhotonImage
    // If it returns nothing, the input image is used
    if (typeof main !== 'function') {
      throw new Error('Code must export a function named "main" that takes a PhotonImage and optionally returns a PhotonImage');
    }
    
    const result = main(image);
    // Return the result if main returned an image, otherwise return the input image
    return result !== undefined && result !== null ? result : image;
  \`
    )
    
    return executeUserCode(...functionArgs, image)
  }
}

/**
 * Copy helper function - handles two cases:
 * 1. copy(image) -> returns a new PhotonImage copy
 * 2. copy(source, dest) -> copies source image data into dest
 */
export function copy(source: any, dest?: any): any {
  if (dest === undefined) {
    // Case 1: Create a new copy of the image
    return new source.constructor(source.get_raw_pixels(), source.get_width(), source.get_height())
  } else {
    // Case 2: Copy source data into dest
    dest.set_imgdata(source.get_image_data())
    return dest
  }
}

/**
 * Get commonly used functions for direct use in the processor
 */
export function getCommonPhotonFunctions(photon: any) {
  return {
    open_image: photon.open_image,
    putImageData: photon.putImageData,
  }
}
`
}

function main() {
  console.log("Reading photon type definitions...")
  const content = readFileSync(PHOTON_TYPES_PATH, "utf-8")

  console.log("Extracting functions...")
  const functions = extractFunctions(content)
  console.log(`Found ${functions.length} functions`)

  console.log("Extracting classes...")
  const classes = extractClasses(content)
  console.log(`Found ${classes.length} classes`)

  console.log("Extracting enums...")
  const enums = extractEnums(content)
  console.log(`Found ${enums.length} enums`)

  console.log("Generating type definitions...")
  const output = generateTypeDefinitions(functions, classes, enums)

  console.log(`Writing to ${OUTPUT_PATH}...`)
  writeFileSync(OUTPUT_PATH, output, "utf-8")

  // Generate a TypeScript file that exports the types as a string constant
  // This allows importing the types in the Monaco editor
  const contentFile = `// This file exports the photon type definitions as a string
// It's auto-generated by scripts/generate-photon-types.ts
// DO NOT EDIT THIS FILE MANUALLY
// To regenerate, run: bun run generate:photon-types

export const PHOTON_TYPES_CONTENT = \`${output.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`\n`

  console.log(`Writing to ${OUTPUT_CONTENT_PATH}...`)
  writeFileSync(OUTPUT_CONTENT_PATH, contentFile, "utf-8")

  // Generate runtime helper for executing user code with photon functions
  console.log("Generating runtime helper...")
  const runtimeHelper = generateRuntimeHelper(functions)

  console.log(`Writing to ${OUTPUT_RUNTIME_PATH}...`)
  writeFileSync(OUTPUT_RUNTIME_PATH, runtimeHelper, "utf-8")

  console.log("✓ Type definitions and runtime helper generated successfully!")
}

main()

