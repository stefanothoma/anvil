import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApiClient } from "../api/client.ts";
import type { Project } from "../api/client.ts";

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-96 text-center">
      <div className="text-4xl mb-4">🔨</div>
      <h2 className="text-lg font-semibold text-white mb-2">No projects yet</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-sm">
        Start by describing an idea or filling in your project details manually.
      </p>
      <Link
        to="/projects/new"
        className="px-5 py-2 bg-white text-gray-900 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors"
      >
        New Project
      </Link>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const updatedAt = new Date(project.updatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link
      to={`/projects/${project.id}`}
      className="block bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-lg p-5 transition-colors group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white group-hover:text-gray-100 truncate mb-1">
            {project.name}
          </h3>
          <p className="text-xs text-gray-500 line-clamp-2">{project.description}</p>
        </div>
        <span className="text-gray-700 group-hover:text-gray-400 transition-colors text-sm shrink-0">
          →
        </span>
      </div>
      <div className="flex items-center gap-3 mt-4">
        <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">
          Stage {project.stage}
        </span>
        {project.stack && (
          <span className="text-xs text-gray-600 truncate max-w-[200px]">
            {project.stack}
          </span>
        )}
        <span className="text-xs text-gray-700 ml-auto shrink-0">{updatedAt}</span>
      </div>
    </Link>
  );
}

export function Dashboard() {
  const api = useApiClient();
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.projects
      .list()
      .then(setProjectList)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Projects</h1>
          <p className="text-sm text-gray-500">
            {projectList.length === 0
              ? "No projects yet."
              : `${projectList.length} project${projectList.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Link
          to="/projects/new"
          className="px-4 py-2 bg-white text-gray-900 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors"
        >
          + New Project
        </Link>
      </div>
      {projectList.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {projectList.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
