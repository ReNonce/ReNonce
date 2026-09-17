/**
 * @title Editor syntax style
 * @notice Highlight style shared by every grammar the editor loads.
 * @dev Colors read the theme's ANSI CSS variables, so switching themes recolors
 * code without rebuilding the view. The mapping follows what a terminal usually
 * shows: keywords magenta, strings green, numbers and literals yellow, comments
 * italic bright-black, types cyan, functions and properties blue, tags orange.
 * Tags a grammar emits but this list does not name stay in the foreground color,
 * which is where plain identifiers belong.
 */
import { HighlightStyle } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

export const SYNTAX_STYLE = HighlightStyle.define([
  {
    tag: [t.keyword, t.modifier, t.self, t.controlKeyword, t.definitionKeyword, t.moduleKeyword, t.operatorKeyword],
    color: "var(--ansi-5)",
  },
  { tag: [t.string, t.special(t.string), t.regexp, t.escape, t.character, t.attributeValue], color: "var(--ansi-2)" },
  { tag: [t.number, t.bool, t.null, t.atom, t.unit, t.color], color: "var(--ansi-3)" },
  {
    tag: [t.comment, t.lineComment, t.blockComment, t.docComment, t.documentMeta],
    color: "var(--ansi-8)",
    fontStyle: "italic",
  },
  { tag: [t.typeName, t.className, t.namespace], color: "var(--ansi-6)" },
  {
    tag: [
      t.function(t.variableName),
      t.function(t.propertyName),
      t.definition(t.variableName),
      t.definition(t.propertyName),
      t.labelName,
    ],
    color: "var(--ansi-4)",
  },
  { tag: [t.propertyName, t.attributeName], color: "var(--ansi-4)" },
  { tag: [t.tagName], color: "var(--ansi-1)" },
  {
    tag: [t.operator, t.punctuation, t.separator, t.bracket, t.processingInstruction, t.contentSeparator],
    color: "var(--ansi-7)",
  },
  { tag: [t.heading], color: "var(--ansi-4)", fontWeight: "600" },
  { tag: [t.strong], fontWeight: "600" },
  { tag: [t.emphasis], fontStyle: "italic" },
  { tag: [t.strikethrough], textDecoration: "line-through" },
  { tag: [t.monospace], color: "var(--ansi-2)" },
  { tag: [t.link, t.url], color: "var(--ansi-4)", textDecoration: "underline" },
  { tag: [t.invalid], color: "var(--ansi-1)", textDecoration: "underline wavy" },
]);
