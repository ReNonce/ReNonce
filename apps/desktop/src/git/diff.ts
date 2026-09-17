/**
 * @title Diff parser
 * @notice Turns unified diff text into per-file, per-line rows the diff view can
 * render with line numbers and colors.
 * @dev Pure and dependency-free, so it is cheap to unit-test. Only what `git
 * show` emits is handled: file headers, hunk headers, context, additions, and
 * removals — index/mode noise is dropped because the view shows its own file
 * header.
 */

/** What a single diff line means. */
export type DiffLineKind = "hunk" | "add" | "remove" | "context" | "note";

/** One rendered row of a file's patch. */
export interface DiffLine {
  kind: DiffLineKind;
  /** Line text without the diff prefix. */
  text: string;
  /** Line number on the old side, or null when the line is new. */
  oldNumber: number | null;
  /** Line number on the new side, or null when the line was removed. */
  newNumber: number | null;
}

/** How a file changed in the commit. */
export type DiffFileStatus = "added" | "deleted" | "renamed" | "modified";

/** One file of a commit. */
export interface DiffFile {
  /** Path relative to the repository (the `b/` side). */
  path: string;
  status: DiffFileStatus;
  additions: number;
  deletions: number;
  lines: DiffLine[];
}

/** `@@ -old,count +new,count @@` with both counts optional. */
const HUNK_HEADER = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

/** Path of the new side from a `diff --git a/x b/y` header. */
function pathFromHeader(line: string): string {
  const marker = line.indexOf(" b/");
  if (marker !== -1) {
    return line.slice(marker + 3);
  }
  return line.split(" ").slice(2).join(" ");
}

/**
 * @notice Parses a unified diff into files with numbered lines.
 * @param patch Unified diff text, e.g. the `diff` field of a commit detail.
 * @return Files in the order git printed them.
 */
export function parseDiff(patch: string): DiffFile[] {
  const files: DiffFile[] = [];
  let file: DiffFile | null = null;
  let oldLine = 0;
  let newLine = 0;
  const rows = patch.split("\n");
  if (rows[rows.length - 1] === "") {
    rows.pop();
  }

  for (const raw of rows) {
    if (raw.startsWith("diff --git ")) {
      file = {
        path: pathFromHeader(raw),
        status: "modified",
        additions: 0,
        deletions: 0,
        lines: [],
      };
      files.push(file);
      continue;
    }
    if (file === null) {
      continue;
    }
    if (raw.startsWith("new file mode")) {
      file.status = "added";
      continue;
    }
    if (raw.startsWith("deleted file mode")) {
      file.status = "deleted";
      continue;
    }
    if (raw.startsWith("rename from ") || raw.startsWith("rename to ")) {
      file.status = "renamed";
      continue;
    }
    // Headers and bookkeeping lines the view replaces with its own chrome.
    if (
      raw.startsWith("index ") ||
      raw.startsWith("--- ") ||
      raw.startsWith("+++ ") ||
      raw.startsWith("similarity index") ||
      raw.startsWith("old mode") ||
      raw.startsWith("new mode")
    ) {
      continue;
    }

    const hunk = HUNK_HEADER.exec(raw);
    if (hunk !== null) {
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      file.lines.push({ kind: "hunk", text: raw, oldNumber: null, newNumber: null });
      continue;
    }
    if (raw.startsWith("+")) {
      file.additions += 1;
      file.lines.push({ kind: "add", text: raw.slice(1), oldNumber: null, newNumber: newLine });
      newLine += 1;
      continue;
    }
    if (raw.startsWith("-")) {
      file.deletions += 1;
      file.lines.push({ kind: "remove", text: raw.slice(1), oldNumber: oldLine, newNumber: null });
      oldLine += 1;
      continue;
    }
    if (raw.startsWith("\\")) {
      file.lines.push({ kind: "note", text: raw, oldNumber: null, newNumber: null });
      continue;
    }
    file.lines.push({ kind: "context", text: raw.slice(1), oldNumber: oldLine, newNumber: newLine });
    oldLine += 1;
    newLine += 1;
  }

  return files;
}
