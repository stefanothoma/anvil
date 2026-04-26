import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar.tsx";
import { TopBar } from "./TopBar.tsx";

interface ShellProps {
  children: ReactNode;
}

/**
 * Root layout shell: sidebar + topbar + main content area.
 */
export function Shell({ children }: ShellProps): JSX.Element {
  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
