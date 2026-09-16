/**
 * @title File contents
 * @notice Read and write a file for the editor tab.
 * @dev Outside the desktop shell both calls resolve without touching disk, so
 * the UI stays usable in a plain browser.
 */
import { invoke, isTauri } from "@tauri-apps/api/core";

/**
 * @notice Reads a text file.
 * @param path Absolute file path.
 * @return The file's contents; empty outside the desktop shell.
 */
export async function readFile(path: string): Promise<string> {
  if (!isTauri()) {
    return "";
  }
  return invoke<string>("read_file", { path });
}

/**
 * @notice Writes a text file.
 * @param path Absolute file path.
 * @param contents New contents.
 */
export async function writeFile(path: string, contents: string): Promise<void> {
  if (!isTauri()) {
    return;
  }
  await invoke("write_file", { path, contents });
}
