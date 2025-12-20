# Luz Editor

A powerful, code-based image editing application built with React, TypeScript, and Photon. Edit images programmatically using TypeScript/JavaScript with real-time preview and a modern, intuitive interface.

![Luz Editor](https://img.shields.io/badge/Luz-Editor-blue)
![React](https://img.shields.io/badge/React-19.2.0-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178c6)
![Vite](https://img.shields.io/badge/Vite-7.2.4-646cff)

## Features

### 🎨 Code-Based Image Editing
- Write image processing code in TypeScript/JavaScript
- Access to 100+ Photon image processing functions
- Real-time preview as you code
- Type-safe development experience

### 🖼️ Flexible Layouts
- **Side by Side**: View code and image simultaneously
- **Stacked**: Code above, image below (or vice versa)
- **Image Only**: Focus on the visual result
- **Code Only**: Maximize coding space

### 📁 Project Management
- Organize multiple image sources
- Create and manage reusable code functions
- Edit project names and descriptions
- Persistent project state

### ⚡ Real-Time Processing
- Instant image updates as you type
- Error handling with clear feedback
- Undo/redo functionality
- High-quality image rendering

### 🎯 Developer Experience
- Monaco Editor with syntax highlighting
- IntelliSense for Photon functions
- TypeScript support with type stripping
- Keyboard shortcuts (Esc to toggle toolbar)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (recommended) or Node.js 18+
- Modern web browser with WebAssembly support

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/luz-editor.git
cd luz-editor

# Install dependencies
bun install
```

### Development

```bash
# Start the development server
bun run dev
```

The application will be available at `http://localhost:5173` (or the port shown in your terminal).

### Building for Production

```bash
# Build the application
bun run build

# Preview the production build
bun run preview
```

## Usage

### Creating Your First Image Processing Function

1. **Add an Image Source**
   - Click "Add" in the Sources section of the sidebar
   - Upload an image or provide a URL
   - Give it a unique identifier

2. **Create a Function**
   - Click "Add" in the Code section of the sidebar
   - Enter a filename (e.g., `grayscale-filter`)
   - Write your image processing code:

```typescript
async function main(): Promise<PhotonImage> {
    // Load a source image
    const image = await source("your-source-identifier");
    
    // Apply image processing operations
    grayscale(image);
    adjust_brightness(image, 20);
    
    // Return the processed image
    return image;
}
```

3. **View the Result**
   - The image updates automatically as you edit
   - Switch between layout modes using the toolbar
   - Use undo/redo to revert changes

### Available Photon Functions

Luz Editor provides access to 100+ image processing functions from the Photon library, including:

- **Color Adjustments**: `adjust_brightness`, `adjust_contrast`, `saturate_hsl`, `hue_rotate_hsl`
- **Filters**: `grayscale`, `sepia`, `blur`, `sharpen`, `emboss`
- **Effects**: `noise_reduction`, `edge_detection`, `pixelize`, `halftone`
- **Transforms**: `resize`, `crop`, `rotate`, `fliph`, `flipv`
- **Color Spaces**: `hsl`, `hsv`, `lch`, `hsluv`
- **And many more...**

All functions are available globally in your code - no need to import or prefix them.

### Keyboard Shortcuts

- `Esc` - Toggle toolbar visibility
- `Enter` - Save project name (when editing)
- `Escape` - Cancel editing project name

## Project Structure

```
luz-editor/
├── src/
│   ├── components/          # React components
│   │   ├── editor.tsx       # Main editor component
│   │   ├── editor-canvas.tsx
│   │   ├── editor-code-editor.tsx
│   │   ├── editor-sidebar.tsx
│   │   └── ui/              # shadcn/ui components
│   ├── contexts/            # React contexts
│   │   ├── editor-context.tsx
│   │   └── project-context.tsx
│   └── lib/                 # Core libraries
│       ├── image-processor.ts
│       ├── photon-runtime.ts
│       └── project.ts
├── scripts/                 # Build scripts
│   └── generate-photon-types.ts
└── package.json
```

## Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Photon** - WebAssembly image processing
- **Monaco Editor** - Code editor
- **shadcn/ui** - UI component library
- **Tailwind CSS** - Styling
- **Bun** - Package manager and runtime

## Development

### Generating Photon Types

The Photon function types are auto-generated from the library:

```bash
bun run generate:photon-types
```

### Linting

```bash
bun run lint
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Photon](https://github.com/silvia-odwyer/photon) - WebAssembly image processing library
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code editor

---

Made with ❤️ using React, TypeScript, and Photon
