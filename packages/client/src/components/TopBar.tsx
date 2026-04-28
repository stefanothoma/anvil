import { UserButton } from "@clerk/react";

export function TopBar() {
  return (
    <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 shrink-0">
      <span className="text-sm text-gray-500">
        From idea to shipped product.
      </span>
      <UserButton />
    </header>
  );
}
