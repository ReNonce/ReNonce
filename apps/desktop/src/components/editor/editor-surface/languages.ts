/**
 * @title Editor languages
 * @notice Picks the CodeMirror grammar for a file path: the official language
 * packages, the community packages for the frameworks they ship, and the
 * classic stream modes — everything CodeMirror can highlight.
 * @dev Every grammar loads through a dynamic import, so opening a file pulls in
 * one parser instead of seating the whole catalogue in the startup bundle.
 * Descriptions are matched by file name first (dotfiles, Makefile, lock files)
 * and by extension second, both passes also trying a lower-cased name so
 * `.TSX`/`Makefile` resolve the same as `app.tsx`/`makefile`. A file nothing
 * matches stays plain text. The entries below come before the bundled list on
 * purpose: they refine its defaults (JSX inside `.js`, the wider JSON/XML/C
 * extension sets, `codeLanguages` in Markdown) and add what it does not carry.
 */
import { LanguageDescription, LanguageSupport, StreamLanguage } from "@codemirror/language";
import { languages as dataLanguages } from "@codemirror/language-data";
import type { StreamParser } from "@codemirror/language";

/** Grammar for one entry, fetched the first time a file needs it. */
type LanguageLoader = () => Promise<LanguageSupport>;

/** Wraps a classic stream mode into the loader shape the descriptions use. */
function mode(load: () => Promise<StreamParser<unknown>>): LanguageLoader {
  return () => load().then((parser) => new LanguageSupport(StreamLanguage.define(parser)));
}

/** Entries consulted before the bundled list, ordered most specific first. */
const PREFERRED_LANGUAGES: LanguageDescription[] = [
  LanguageDescription.of({
    name: "JavaScript",
    extensions: ["js", "jsx", "mjs", "cjs"],
    load: () => import("@codemirror/lang-javascript").then((m) => m.javascript({ jsx: true })),
  }),
  LanguageDescription.of({
    name: "JSON",
    extensions: ["json", "jsonc", "json5", "jsonl", "ndjson", "map", "abi", "webmanifest", "ipynb", "tfstate"],
    filename: /^\.(?:babelrc|eslintrc|prettierrc|stylelintrc|swcrc|hintrc|jshintrc|commitlintrc|lintstagedrc)$/,
    load: () => import("@codemirror/lang-json").then((m) => m.json()),
  }),
  LanguageDescription.of({
    name: "Markdown",
    extensions: ["md", "markdown", "mkd", "mdx"],
    load: () =>
      import("@codemirror/lang-markdown").then((m) =>
        m.markdown({ codeLanguages: [...PREFERRED_LANGUAGES, ...dataLanguages] }),
      ),
  }),
  LanguageDescription.of({
    name: "Python",
    extensions: ["py", "pyw", "pyi", "vy"],
    load: () => import("@codemirror/lang-python").then((m) => m.python()),
  }),
  LanguageDescription.of({
    name: "Go",
    extensions: ["go"],
    filename: /^go\.mod$/,
    load: () => import("@codemirror/lang-go").then((m) => m.go()),
  }),
  LanguageDescription.of({
    name: "C++",
    extensions: ["cpp", "c++", "cc", "cxx", "hpp", "hxx", "hh", "ipp", "tpp", "inl", "cu", "cuh", "metal"],
    load: () => import("@codemirror/lang-cpp").then((m) => m.cpp()),
  }),
  LanguageDescription.of({
    name: "C#",
    extensions: ["cs"],
    load: () => import("@replit/codemirror-lang-csharp").then((m) => m.csharp()),
  }),
  LanguageDescription.of({
    name: "Svelte",
    extensions: ["svelte"],
    load: () => import("@replit/codemirror-lang-svelte").then((m) => m.svelte()),
  }),
  LanguageDescription.of({
    name: "HTML templates",
    extensions: ["astro", "ejs", "mustache"],
    load: () => import("@codemirror/lang-html").then((m) => m.html()),
  }),
  LanguageDescription.of({
    name: "Jinja",
    extensions: ["jinja", "jinja2", "j2", "njk", "twig"],
    load: () => import("@codemirror/lang-jinja").then((m) => m.jinja()),
  }),
  LanguageDescription.of({
    name: "XML",
    extensions: [
      "xml",
      "xsl",
      "xslt",
      "xsd",
      "svg",
      "rss",
      "wsdl",
      "plist",
      "xaml",
      "csproj",
      "vbproj",
      "fsproj",
      "props",
      "targets",
      "atom",
      "kml",
      "gpx",
      "xul",
      "ent",
    ],
    load: () => import("@codemirror/lang-xml").then((m) => m.xml()),
  }),
  LanguageDescription.of({
    name: "TOML",
    extensions: ["toml", "lock"],
    filename: /^(?:Cargo|poetry|Pipfile|composer|Gemfile)\.lock$/,
    load: mode(() => import("@codemirror/legacy-modes/mode/toml").then((m) => m.toml)),
  }),
  LanguageDescription.of({
    name: "Properties",
    extensions: ["properties", "ini", "cfg", "conf", "env", "desktop", "service"],
    load: mode(() => import("@codemirror/legacy-modes/mode/properties").then((m) => m.properties)),
  }),
  LanguageDescription.of({
    name: "Dotfiles",
    filename: /^\.(?:.*ignore|gitattributes|gitmodules|gitconfig|editorconfig|npmrc|yarnrc|env(?:\..+)?)$/i,
    load: mode(() => import("@codemirror/legacy-modes/mode/properties").then((m) => m.properties)),
  }),
  LanguageDescription.of({
    name: "Shell",
    extensions: ["sh", "bash", "zsh", "ksh", "fish", "ash", "dash"],
    filename: /^\.(?:bashrc|bash_profile|bash_login|bash_logout|bash_aliases|bash_functions|zshrc|zprofile|zlogin|zlogout|kshrc|profile)$/i,
    load: mode(() => import("@codemirror/legacy-modes/mode/shell").then((m) => m.shell)),
  }),
  LanguageDescription.of({
    name: "Dockerfile",
    extensions: ["dockerfile"],
    filename: /^(?:Dockerfile|Containerfile)(?:\..*)?$/i,
    load: mode(() => import("@codemirror/legacy-modes/mode/dockerfile").then((m) => m.dockerFile)),
  }),
  LanguageDescription.of({
    name: "Makefile",
    extensions: ["mk", "mak"],
    filename: /^(?:GNUmakefile|[Mm]akefile)(?:\..*)?$/,
    load: () => import("codemirror-lang-makefile").then((m) => m.makefile()),
  }),
  LanguageDescription.of({
    name: "Nix",
    extensions: ["nix"],
    load: () => import("@replit/codemirror-lang-nix").then((m) => m.nix()),
  }),
  LanguageDescription.of({
    name: "Terraform",
    extensions: ["tf", "tfvars", "hcl", "nomad"],
    load: () => import("codemirror-lang-hcl").then((m) => m.hcl()),
  }),
  LanguageDescription.of({
    name: "Zig",
    extensions: ["zig"],
    load: () => import("codemirror-lang-zig").then((m) => m.zig()),
  }),
  LanguageDescription.of({
    name: "Elixir",
    extensions: ["ex", "exs", "eex", "heex"],
    load: () => import("codemirror-lang-elixir").then((m) => m.elixir()),
  }),
  LanguageDescription.of({
    name: "Solidity",
    extensions: ["sol"],
    load: () => import("@replit/codemirror-lang-solidity").then((m) => m.solidity),
  }),
  LanguageDescription.of({
    name: "Assembly",
    extensions: ["asm"],
    load: mode(() => import("@codemirror/legacy-modes/mode/gas").then((m) => m.gas)),
  }),
  LanguageDescription.of({
    name: "Erlang",
    extensions: ["erl", "hrl"],
    load: mode(() => import("@codemirror/legacy-modes/mode/erlang").then((m) => m.erlang)),
  }),
];

/** Every grammar the editor knows, most specific match first. */
const LANGUAGES: LanguageDescription[] = [...PREFERRED_LANGUAGES, ...dataLanguages];

/**
 * Language support for a file path, or `null` when nothing matches (plain text).
 * @dev The file name is offered twice — as written and lower-cased — because
 * the catalogue matches extensions case-sensitively while file-name patterns
 * are written for the real spelling. A grammar that fails to load (a missing
 * chunk) is reported by the returned promise and leaves the file as plain text.
 */
export async function languageFor(path: string): Promise<LanguageSupport | null> {
  const filename = path.split(/[\\/]/).pop() ?? "";
  const description =
    LanguageDescription.matchFilename(LANGUAGES, filename) ??
    LanguageDescription.matchFilename(LANGUAGES, filename.toLowerCase());
  if (description === null) {
    return null;
  }
  return description.load();
}
