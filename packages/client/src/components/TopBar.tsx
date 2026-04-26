/**
 * Top bar — currently minimal. Will show active project and stage in Phase 2.
 */
export function TopBar(): JSX.Element {
  return (
    <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-6 shrink-0">
      <span className="text-sm text-gray-500">
        From idea to shipped product.
      </span>
    </header>
  );
}
