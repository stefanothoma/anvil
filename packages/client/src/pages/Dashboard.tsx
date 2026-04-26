import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { projects, type Project } from "../api/client.ts";

/**
 * Projects dashboard — lists all projects from the server.
 */
export function Dashboard(): JSX.Element {
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    projects
      .list()
      .then(setProjectList)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load projects");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Projects</h1>
        <Link
          to="/projects/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-md transition-colors"
        >
          New Project
        </Link>
      </div>

      {loading && (
        <p className="text-gray-500 text-sm">Loading...</p>
      )}

      {error && (
        <div className="border border-red-800 bg-red-950 rounded-md p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && projectList.length === 0 && (
        <div className="border border-dashed border-gray-700 rounded-lg p-12 text-center">
          <p className="text-gray-400 text-sm">No projects yet.</p>
          <p className="text-gray-600 text-xs mt-1">
            Start by describing what you want to build.
          </p>
        </div>
      )}

      {!loading && !error && projectList.length > 0 && (
        <div className="space-y-3">
          {projectList.map((project) => (
            <div
              key={project.id}
              className="bg-gray-900 border border-gray-800 rounded-lg p-4"
            >
              <h2 className="text-white font-medium">{project.name}</h2>
              <p className="text-gray-400 text-sm mt-1">{project.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
