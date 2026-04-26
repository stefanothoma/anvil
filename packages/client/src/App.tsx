import { Routes, Route, Navigate } from "react-router-dom";
import { Shell } from "./components/Shell.tsx";
import { Dashboard } from "./pages/Dashboard.tsx";
import { NewProject } from "./pages/NewProject.tsx";

export default function App(): JSX.Element {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<Dashboard />} />
        <Route path="/projects/new" element={<NewProject />} />
      </Routes>
    </Shell>
  );
}
