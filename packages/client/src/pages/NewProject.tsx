import { Link } from "react-router-dom";

/**
 * New project entry point — placeholder until Phase 2 builds the wizard.
 */
export function NewProject(): JSX.Element {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link
          to="/projects"
          className="text-gray-500 hover:text-white text-sm transition-colors"
        >
          ← Projects
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">New Project</h1>
      <p className="text-gray-400 text-sm">
        Project setup wizard coming in Phase 2.
      </p>
    </div>
  );
}
