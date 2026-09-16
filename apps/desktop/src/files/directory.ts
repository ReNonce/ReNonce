/**
 * @title Directory listing
 * @notice Frontend access to the backend `read_dir` command for the explorer.
 * @dev Outside the desktop shell (plain `npm run dev`) there is no backend, so
 * the call resolves to an empty list instead of throwing — the explorer then
 * just shows the empty state.
 */
import { invoke, isTauri } from "@tauri-apps/api/core";

export interface DirEntry {
  /** Entry name without its parent path. */
  name: string;
  /** Absolute path of the entry. */
  path: string;
  /** Whether the entry is a directory. */
  isDir: boolean;
}

/**
 * @notice Lists a directory's direct children.
 * @param path Absolute directory path.
 * @return Sorted entries (folders first); empty outside the desktop shell.
 */
export async function listDirectory(path: string): Promise<DirEntry[]> {
  if (!isTauri()) {
    return [];
  }
  return invoke<DirEntry[]>("read_dir", { path });
}

/**
 * @notice Creates a folder or an empty file.
 * @dev Fails when the path already exists, so the caller can surface the error.
 * @param path Absolute path of the new entry.
 * @param isDir True for a folder, false for a file.
 */
export async function createEntry(path: string, isDir: boolean): Promise<void> {
  if (!isTauri()) {
    return;
  }
  await invoke(isDir ? "create_folder" : "create_file", { path });
}

/**
 * @notice Moves an entry, for explorer drag and drop.
 * @param from Absolute path of the entry to move.
 * @param to Absolute destination path, including the entry name.
 */
export async function moveEntry(from: string, to: string): Promise<void> {
  if (!isTauri()) {
    return;
  }
  await invoke("move_entry", { from, to });
}

/**
 * @notice Deletes a file, or a folder with everything inside it.
 * @param path Absolute path to delete.
 */
export async function deleteEntry(path: string): Promise<void> {
  if (!isTauri()) {
    return;
  }
  await invoke("delete_entry", { path });
}

/**
 * @notice Moves an entry to the operating system's trash.
 * @param path Absolute path to trash.
 */
export async function trashEntry(path: string): Promise<void> {
  if (!isTauri()) {
    return;
  }
  await invoke("trash_entry", { path });
}

/**
 * @notice Copies a file, or a folder with everything inside it.
 * @param from Absolute source path.
 * @param to Absolute destination path, which must not exist yet.
 */
export async function copyEntry(from: string, to: string): Promise<void> {
  if (!isTauri()) {
    return;
  }
  await invoke("copy_entry", { from, to });
}

/**
 * @notice Finds entries under a folder whose name contains `query`.
 * @dev The walk happens in Rust with visit and result caps, so huge trees stay
 * responsive; an empty query short-circuits to no results.
 * @param root Absolute folder to search.
 * @param query Substring to match, case-insensitive.
 * @param limit Maximum results to return.
 * @return Matching entries; empty outside the desktop shell.
 */
export async function searchFiles(
  root: string,
  query: string,
  limit = 100,
): Promise<DirEntry[]> {
  if (!isTauri() || query.trim().length === 0) {
    return [];
  }
  return invoke<DirEntry[]>("search_files", { root, query, limit });
}
