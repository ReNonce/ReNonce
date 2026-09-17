/**
 * @title Path helpers
 * @notice Small, cross-platform path utilities shared by the UI.
 */

export interface PathSegment {
  /** Label shown in the breadcrumb ("/" for the filesystem root). */
  name: string;
  /** Absolute path this level opens. */
  path: string;
}

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

/**
 * @notice Splits a path into its levels, each with the absolute path it opens.
 * @dev Starts at the filesystem root ("/" on POSIX, the drive on Windows) so
 * every returned path can be handed straight to the workspace.
 * @param fullPath Absolute path to split.
 * @return Segments from the root down to the path itself.
 */
export function pathSegments(fullPath: string): PathSegment[] {
  const separator = fullPath.includes("\\") ? "\\" : "/";
  const parts = fullPath.split(/[\\/]/).filter((part) => part.length > 0);
  if (parts.length === 0) {
    return [{ name: "/", path: "/" }];
  }
  const isPosix = fullPath.startsWith("/");
  const root: PathSegment = isPosix
    ? { name: "/", path: "/" }
    : { name: parts[0], path: `${parts[0]}${separator}` };
  const rest = isPosix ? parts : parts.slice(1);
  const segments: PathSegment[] = [root];
  let current = root.path;
  for (const part of rest) {
    current = current.endsWith(separator) ? `${current}${part}` : `${current}${separator}${part}`;
    segments.push({ name: part, path: current });
  }
  return segments;
}

/**
 * @notice Level directly above a folder, for closing one breadcrumb level.
 * @param path Absolute folder path.
 * @return The parent path, or null when the path is already the filesystem root.
 */
export function parentLevel(path: string): string | null {
  const segments = pathSegments(path);
  const parent = segments.length >= 2 ? segments[segments.length - 2] : undefined;
  return parent === undefined ? null : parent.path;
}
