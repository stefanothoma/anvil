import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth, RedirectToSignIn } from "@clerk/react";
import { Shell } from "./components/Shell.tsx";
import { Dashboard } from "./pages/Dashboard.tsx";
import { NewProject } from "./pages/NewProject.tsx";
import { ProjectDetail } from "./pages/ProjectDetail.tsx";
import { ProjectChat } from "./pages/ProjectChat.tsx";
import { Settings } from "./pages/Settings.tsx";

function ProtectedApp() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<Dashboard />} />
        <Route path="/projects/new" element={<NewProject />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/projects/:id/chat" element={<ProjectChat />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Shell>
  );
}

export default function App() {
  return <ProtectedApp />;
}
