import { EditorProvider } from "@/contexts/editor-context"
import { EditorCanvas } from "./editor-canvas"
import { EditorCodeEditor } from "./editor-code-editor"
import { EditorToolbar } from "./editor-toolbar"
import { EditorStatusBar } from "./editor-status-bar"
import { EditorSidebar } from "./editor-sidebar"
import { useEditor } from "@/contexts/editor-context"
import { cn } from "@/lib/utils"

function EditorContent() {
    const { imageLayout } = useEditor()

    const getGridClasses = () => {
        switch (imageLayout) {
            case "side-by-side":
                return "grid-cols-2"
            case "stacked":
                return "grid-rows-2"
            case "image-only":
            case "code-only":
                return "grid-cols-1"
            default:
                return "grid-cols-2"
        }
    }

    return (
        <div className="relative flex h-screen w-screen overflow-hidden">
            <EditorSidebar />
            <div className={cn("grid flex-1 h-full w-full pb-6", getGridClasses())}>
                {imageLayout === "side-by-side" && (
                    <>
                        <div className="relative overflow-hidden">
                            <EditorToolbar position="top" />
                            <EditorCanvas />
                        </div>
                        <div className="overflow-hidden border-l">
                            <EditorCodeEditor />
                        </div>
                    </>
                )}
                {imageLayout === "stacked" && (
                    <>
                        <div className="relative overflow-hidden">
                            <EditorToolbar position="top" />
                            <EditorCanvas />
                        </div>
                        <div className="overflow-hidden border-t">
                            <EditorCodeEditor />
                        </div>
                    </>
                )}
                {imageLayout === "image-only" && (
                    <div className="relative overflow-hidden">
                        <EditorToolbar position="top" />
                        <EditorCanvas />
                    </div>
                )}
                {imageLayout === "code-only" && (
                    <div className="relative overflow-hidden">
                        <EditorCodeEditor />
                        <EditorToolbar position="bottom" />
                    </div>
                )}
            </div>
            <EditorStatusBar />
        </div>
    )
}

export function Editor() {
    return (
        <EditorProvider>
            <EditorContent />
        </EditorProvider>
    )
}

