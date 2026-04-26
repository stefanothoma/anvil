import { Link } from "react-router-dom";

/**
 * Projects dashboard — placeholder until Phase 2 wires up real data.
 */
export function Dashboard(): JSX.Element {
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

      {/* Empty state */}
      <div className="border border-dashed border-gray-700 rounded-lg p-12 text-center">
        <p className="text-gray-400 text-sm">No projects yet.</p>
        <p className="text-gray-600 text-xs mt-1">
          Start by describing what you want to build.
        </p>
      </div>
    </div>
  );
}
