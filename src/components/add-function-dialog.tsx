import * as React from "react"
import { useProject } from "@/contexts/project-context"
import { useEditor } from "@/contexts/editor-context"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { CodeFunctions } from "@/lib/project"

interface AddFunctionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DEFAULT_CODE = `async function main(): Promise<PhotonImage> {
    // Load a source image using source(identifier)
    // Available sources are listed in the sidebar
    const image = await source("sample-1");
    
    // Apply image processing operations
    // Photon functions modify the image in place
    grayscale(image);
    
    // You MUST return the PhotonImage
    return image;
}`

export function AddFunctionDialog({ open, onOpenChange }: AddFunctionDialogProps) {
  const { project, addFunction } = useProject()
  const { loadFunction } = useEditor()
  const [filename, setFilename] = React.useState("")
  const [code, setCode] = React.useState(DEFAULT_CODE)

  const handleSubmit = () => {
    if (!filename.trim()) {
      return
    }

    if (!code.trim()) {
      return
    }

    // Check for duplicate filename
    const existingFunction = project.functions.find((f) => f.filename === filename.trim())
    if (existingFunction) {
      alert(`A function with filename "${filename.trim()}" already exists. Please choose a different name.`)
      return
    }

    const newFunction: CodeFunctions = {
      filename: filename.trim(),
      code: code.trim(),
    }

    addFunction(newFunction)

    // Automatically load the new function into the editor
    loadFunction(filename.trim())

    // Reset form
    setFilename("")
    setCode(DEFAULT_CODE)
    onOpenChange(false)
  }

  const canSubmit = filename.trim() !== "" && code.trim() !== ""

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Add Function</AlertDialogTitle>
          <AlertDialogDescription>
            Add a new code function to your project. Functions can be loaded into the editor by clicking on them.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Filename Input */}
          <div className="space-y-2">
            <Label htmlFor="function-filename">Filename</Label>
            <Input
              id="function-filename"
              placeholder="e.g., grayscale-filter"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The filename without extension. A `.ts` extension will be shown in the sidebar.
            </p>
          </div>

          {/* Code Input */}
          <div className="space-y-2">
            <Label htmlFor="function-code">Code</Label>
            <Textarea
              id="function-code"
              placeholder="Enter your code here..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="font-mono text-sm min-h-[300px]"
              rows={15}
            />
            <p className="text-xs text-muted-foreground">
              The code must export a function named `main` that returns a PhotonImage.
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit} disabled={!canSubmit}>
            Add Function
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
