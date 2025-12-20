import type { ImageSource } from "./image-sources"

export type Project = {
    /**
     * The identifier for the project (e.g., "sample-project").
     */
    identifier: string;

    /**
     * The name of the project.
     */
    name: string;

    /**
     * The description of the project.
     */
    description: string | null;

    /**
     * The image sources for the project.
     * 
     * Will be exposed to the editor through the `source(identifier: string)` function.
     */
    sources: ImageSource[];

    /**
     * The functions for the project.
     * 
     * Can be loaded into the editor.
     */
    functions: CodeFunctions[];
}

/**
 * A self-contained code block that can be executed to produce an image.
 */
export type CodeFunctions = {
    /**
     * The filename of the source code. A `.ts` is appended to the filename when displayed.
     */
    filename: string;

    /**
     * The code for the source code.
     */
    code: string;
}