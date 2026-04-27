import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

/**
 * Abstraction over filesystem access for repo path operations.
 * Swap LocalFileSystemProvider for a GitHubProvider or RemoteProvider
 * without touching any calling code.
 */
export interface FileSystemProvider {
  readFile(path: string): string;
  exists(path: string): boolean;
  listFiles(dir: string): string[];
}

/**
 * Default implementation — reads directly from the local filesystem.
 * Used in all v1 scenarios (local-only tool).
 */
export class LocalFileSystemProvider implements FileSystemProvider {
  private readonly root: string;

  constructor(root: string) {
    this.root = root;
  }

  readFile(relativePath: string): string {
    return readFileSync(join(this.root, relativePath), "utf-8");
  }

  exists(relativePath: string): boolean {
    return existsSync(join(this.root, relativePath));
  }

  listFiles(relativeDir: string): string[] {
    try {
      return readdirSync(join(this.root, relativeDir));
    } catch {
      return [];
    }
  }
}
