import { Editor } from "@/components/editor";
import { ProjectProvider } from "@/contexts/project-context";

export function App() {
  return (
    <ProjectProvider>
      <Editor />
    </ProjectProvider>
  );
}

export default App;