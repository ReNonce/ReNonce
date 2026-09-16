/**
 * @title Path helpers
 * @notice Small, cross-platform path utilities shared by the UI.
 */

/**
 * @notice Last segment of a path, e.g. "/home/me/app" -> "app".
 * @dev Handles both separators so Windows paths work too.
 * @param path Absolute or relative path.
 * @return The final segment, or the input when it has none.
 */
export function folderName(path: string): string {
  const parts = path.split(/[\\/]/).filter((part) => part.length > 0);
  return parts[parts.length - 1] ?? path;
}
