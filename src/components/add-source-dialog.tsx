import * as React from "react"
import { useProject } from "@/contexts/project-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { LinkIcon, FolderIcon } from "lucide-react"
import type { ImageSource } from "@/lib/image-sources"

interface AddSourceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddSourceDialog({ open, onOpenChange }: AddSourceDialogProps) {
  const { addSource } = useProject()
  const [sourceType, setSourceType] = React.useState<"url" | "local">("url")
  const [identifier, setIdentifier] = React.useState("")
  const [url, setUrl] = React.useState("")
  const [file, setFile] = React.useState<File | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type.startsWith("image/")) {
      setFile(selectedFile)
      setSourceType("local")
      // Auto-generate identifier from filename if not set
      if (!identifier) {
        const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "")
        setIdentifier(nameWithoutExt.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
      }
    }
  }

  const handleSubmit = () => {
    if (!identifier.trim()) {
      return
    }

    let newSource: ImageSource

    if (sourceType === "url") {
      if (!url.trim()) {
        return
      }
      newSource = {
        type: "url",
        identifier: identifier.trim(),
        url: url.trim(),
      }
    } else {
      if (!file) {
        return
      }
      // Create object URL for local file
      const objectUrl = URL.createObjectURL(file)
      newSource = {
        type: "local",
        identifier: identifier.trim(),
        path: objectUrl,
      }
    }

    addSource(newSource)

    // Reset form
    setIdentifier("")
    setUrl("")
    setFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    setSourceType("url")
    onOpenChange(false)
  }

  const canSubmit = identifier.trim() !== "" && (sourceType === "url" ? url.trim() !== "" : file !== null)

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Add Image Source</AlertDialogTitle>
          <AlertDialogDescription>Add a new image source to your project. Sources can be loaded using source(identifier) in your code.</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Source Type Selection */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={sourceType === "url" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSourceType("url")
                setFile(null)
                if (fileInputRef.current) {
                  fileInputRef.current.value = ""
                }
              }}
              className="flex-1"
            >
              <LinkIcon className="mr-2 h-4 w-4" />
              URL
            </Button>
            <Button
              type="button"
              variant={sourceType === "local" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSourceType("local")
                fileInputRef.current?.click()
              }}
              className="flex-1"
            >
              <FolderIcon className="mr-2 h-4 w-4" />
              Local File
            </Button>
          </div>

          {/* Identifier Input */}
          <div className="space-y-2">
            <Label htmlFor="source-identifier">Identifier</Label>
            <Input
              id="source-identifier"
              placeholder="e.g., my-image"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Used to load the source: source("{identifier || "identifier"})</p>
          </div>

          {/* URL Input */}
          {sourceType === "url" && (
            <div className="space-y-2">
              <Label htmlFor="source-url">Image URL</Label>
              <Input
                id="source-url"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          )}

          {/* File Input */}
          {sourceType === "local" && (
            <div className="space-y-2">
              <Label htmlFor="source-file">Image File</Label>
              <Input
                id="source-file"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              {file && (
                <p className="text-xs text-muted-foreground">Selected: {file.name}</p>
              )}
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit} disabled={!canSubmit}>
            Add Source
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
