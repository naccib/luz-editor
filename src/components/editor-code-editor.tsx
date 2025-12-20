import { Editor, useMonaco } from "@monaco-editor/react"
import { useEditor } from "@/contexts/editor-context"
import { useEffect, useState } from "react"
import { PHOTON_TYPES_CONTENT } from "@/lib/photon-types-content"

// Use the generated types (main function signature is already included)
const PHOTON_TYPES = PHOTON_TYPES_CONTENT

function EditorCodeEditorInner() {
  const { code, setCode } = useEditor()
  const monaco = useMonaco()
  const [theme, setTheme] = useState<"light" | "dark">("light")

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    setTheme(mediaQuery.matches ? "dark" : "light")

    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? "dark" : "light")
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  // Add Photon type definitions to Monaco
  useEffect(() => {
    if (monaco) {
      const tsLang = monaco.languages.typescript as any
      if (tsLang.typescriptDefaults) {
        // Add the type definitions
        tsLang.typescriptDefaults.addExtraLib(
          PHOTON_TYPES,
          "file:///photon.d.ts"
        )
        // Enable type checking, inference, and JSDoc support
        tsLang.typescriptDefaults.setCompilerOptions({
          ...tsLang.typescriptDefaults.getCompilerOptions(),
          noImplicitAny: true,
          strict: true,
          checkJs: true,
        })
      }
    }
  }, [monaco])

  const handleEditorChange = (value: string | undefined) => {
    setCode(value ?? "")
  }

  return (
    <Editor
      height="100%"
      language="typescript"
      theme={theme === "dark" ? "vs-dark" : "light"}
      value={code}
      onChange={handleEditorChange}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: "on",
      }}
    />
  )
}

export function EditorCodeEditor() {
  return (
    <div className="h-full w-full">
      <EditorCodeEditorInner />
    </div>
  )
}

