import { Routes, Route, Navigate } from "react-router-dom";
import { Shell } from "./components/Shell.tsx";
import { Dashboard } from "./pages/Dashboard.tsx";
import { NewProject } from "./pages/NewProject.tsx";
import { ProjectDetail } from "./pages/ProjectDetail.tsx";

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<Dashboard />} />
        <Route path="/projects/new" element={<NewProject />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
      </Routes>
    </Shell>
  );
}
