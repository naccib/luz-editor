import * as React from "react"
import { useEditor } from "@/contexts/editor-context"
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

interface LoadImageDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  autoOpen?: boolean
}

export function LoadImageDialog({ open: controlledOpen, onOpenChange, autoOpen = true }: LoadImageDialogProps) {
  const { imageSource, setImageSource } = useEditor()
  const [internalOpen, setInternalOpen] = React.useState(false)
  const [sourceType, setSourceType] = React.useState<"url" | "local">("url")
  const [url, setUrl] = React.useState("")
  const [file, setFile] = React.useState<File | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = React.useCallback(
    (value: boolean) => {
      if (isControlled && onOpenChange) {
        onOpenChange(value)
      } else {
        setInternalOpen(value)
      }
    },
    [isControlled, onOpenChange]
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type.startsWith("image/")) {
      setFile(selectedFile)
      setSourceType("local")
    }
  }

  const handleLoad = () => {
    if (sourceType === "url" && url.trim()) {
      setImageSource({
        type: "url",
        identifier: `temp-url-${Date.now()}`,
        url: url.trim()
      })
      setOpen(false)
      setUrl("")
    } else if (sourceType === "local" && file) {
      // For local files, create an object URL
      const objectUrl = URL.createObjectURL(file)
      setImageSource({
        type: "local",
        identifier: `temp-local-${Date.now()}`,
        path: objectUrl
      })
      setOpen(false)
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const canLoad = (sourceType === "url" && url.trim()) || (sourceType === "local" && file)

  // Auto-open when no image is loaded
  React.useEffect(() => {
    if (autoOpen && !imageSource && !isControlled) {
      setOpen(true)
    }
  }, [imageSource, autoOpen, isControlled, setOpen])

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent size="default" className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Load Image</AlertDialogTitle>
          <AlertDialogDescription>
            Choose how you want to load an image for editing.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Source Type Selection */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={sourceType === "url" ? "default" : "outline"}
              size="sm"
              onClick={() => setSourceType("url")}
              className="flex-1"
            >
              <LinkIcon className="size-4 mr-2" />
              From URL
            </Button>
            <Button
              type="button"
              variant={sourceType === "local" ? "default" : "outline"}
              size="sm"
              onClick={() => setSourceType("local")}
              className="flex-1"
            >
              <FolderIcon className="size-4 mr-2" />
              From File
            </Button>
          </div>

          {/* URL Input */}
          {sourceType === "url" && (
            <div className="space-y-2">
              <Label htmlFor="image-url">Image URL</Label>
              <Input
                id="image-url"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canLoad) {
                    handleLoad()
                  }
                }}
              />
            </div>
          )}

          {/* File Input */}
          {sourceType === "local" && (
            <div className="space-y-2">
              <Label htmlFor="image-file">Select Image File</Label>
              <Input
                id="image-file"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              {file && (
                <p className="text-sm text-muted-foreground">
                  Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleLoad} disabled={!canLoad}>
            Load Image
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

