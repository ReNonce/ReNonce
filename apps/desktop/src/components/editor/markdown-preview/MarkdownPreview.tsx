/**
 * @title Markdown preview
 * @notice Renders a markdown document as HTML, styled from the app's tokens.
 * @dev The source is a local file, but a crafted document could still carry
 * scripts — and this shell has full filesystem access — so the HTML is always
 * run through DOMPurify before it reaches the DOM. Rendering is synchronous
 * (`async: false`), which keeps the component a pure function of its input.
 */
import { useMemo } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import "./MarkdownPreview.css";

export interface MarkdownPreviewProps {
  /** Markdown source. */
  contents: string;
}

export function MarkdownPreview({ contents }: MarkdownPreviewProps) {
  const html = useMemo(
    () => DOMPurify.sanitize(marked.parse(contents, { async: false }) as string),
    [contents],
  );

  return (
    <div className="markdown-preview">
      <article className="markdown-preview__body" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
