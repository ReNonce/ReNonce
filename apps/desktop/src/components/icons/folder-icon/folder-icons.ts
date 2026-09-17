/**
 * @title Folder icons
 * @notice Explorer icon for a folder by name: `src` gets the code folder,
 * `.github` the GitHub one, `.husky` the dog, and an unknown name the plain
 * folder.
 * @dev Names and artwork are Catppuccin Icons (MIT — the licence ships beside
 * the files in `public/assets/icons/folder_icons/`), ported from the manifest
 * terax-ai pairs with `@iconify-json/catppuccin`. Every entry ships closed and
 * `_open` artwork, so the tree swaps variants when a folder expands. Lookup is
 * exact and lower-cased; anything unmatched falls back to `default`.
 */

/** Icon name (file under `public/assets/icons/folder_icons/`) to folder names. */
const FOLDER_ICONS: Record<string, readonly string[]> = {
  admin: ["admin", "admins", "manager", "managers", "moderator", "moderators"],
  android: ["android"],
  animation: ["animation", "anim", "anims", "animations", "animated"],
  api: ["api", "apis", "restapi"],
  app: ["app", "apps"],
  assets: ["assets", "asset"],
  audio: ["audio", "aud", "auds", "audios", "music", "sound", "sounds"],
  audit: ["audit", "audits"],
  aws: ["aws", ".aws"],
  azure_devops: ["azure-devops", ".azure-devops", ".azuredevops"],
  azure_pipelines: ["azure-pipelines", ".azure-pipelines"],
  benchmark: ["benchmark", "benchmarks", "bench", "benches", "performance", "measure", "measures", "measurement"],
  caddy: ["caddy", ".caddy", ".caddyfiles", "caddyfiles"],
  cargo: ["cargo", ".cargo"],
  circle_ci: ["circle-ci", ".circleci"],
  client: ["client", "clients", "frontend", "frontends", "pwa"],
  cloud: ["cloud"],
  command: ["command", "commands", "cmd", "cli", "clis"],
  components: ["components", "widget", "widgets", "fragments"],
  composables: ["composables", "composable"],
  config: ["config", "cfg", "cfgs", "conf", "confs", ".config", "configs", "configuration", "configurations", "setting", ".setting", "settings", ".settings", "META-INF", "option", "options"],
  connection: ["connection", "connections", "integration", "integrations"],
  constant: ["constant", "constants"],
  content: ["content", "contents"],
  controllers: ["controllers", "controller", "service", "services", "provider", "providers", "handler", "handlers"],
  core: ["core"],
  coverage: ["coverage", ".nyc-output", ".nyc_output", "e2e", "it", "integration-test", "integration-tests", "__integration-test__", "__integration-tests__"],
  cursor: ["cursor", ".cursor"],
  cypress: ["cypress", ".cypress"],
  database: ["database", "db", "databases", "sql", "data", "_data"],
  debug: ["debug", "debugging"],
  devcontainer: ["devcontainer", ".devcontainer"],
  direnv: ["direnv", ".direnv"],
  dist: ["dist", "dist-newstyle", "out", "build", "release", "bin", ".output"],
  docker: ["docker", "dockerfiles", ".docker"],
  docs: ["docs", "_post", "_posts", "doc", "document", "documents", "documentation", "post", "posts", "article", "articles"],
  download: ["download", "downloads"],
  drizzle_orm: ["drizzle-orm", "drizzle"],
  examples: ["examples", "demo", "demos", "example", "sample", "samples", "sample-data"],
  fastlane: ["fastlane", ".fastlane"],
  firebase: ["firebase", ".firebase"],
  fonts: ["fonts", "font"],
  forgejo: ["forgejo", ".forgejo"],
  functions: ["functions", "func", "funcs", "function", "lambda", "lambdas", "logic", "math", "maths", "calc", "calcs", "calculation", "calculations"],
  fvm: ["fvm", ".fvm"],
  git: ["git", ".git", "patches", "githooks", ".githooks", "submodules", ".submodules"],
  github: ["github", ".github"],
  gitlab: ["gitlab", ".gitlab"],
  gradle: ["gradle", ".gradle"],
  graphql: ["graphql", "gql"],
  hooks: ["hooks", "hook", "trigger", "triggers"],
  husky: ["husky", ".husky"],
  images: ["images", "_images", "_image", "_imgs", "_img", "image", "imgs", "img", "icons", "icon", "icos", "ico", "figures", "figure", "figs", "fig", "screenshot", "screenshots", "screengrab", "screengrabs", "pic", "pics", "picture", "pictures", "photo", "photos", "photograph", "photographs"],
  include: ["include", "includes"],
  intellij: ["intellij", ".idea"],
  javascript: ["javascript", "js"],
  kubernetes: ["kubernetes", ".kubernetes", "k8s", ".k8s"],
  layouts: ["layouts", "layout", "_layouts"],
  lib: ["lib", "libs", "library", "libraries", ".lib", ".libs", ".library", ".libraries"],
  linux: ["linux"],
  locales: ["locales", "i18n", "internationalization", "lang", "langs", "language", "languages", "locale", "l10n", "localization", "translation", "translate", "translations", ".tx"],
  luau: ["luau", "luau_packages"],
  lune: ["lune", "lune_packages"],
  macos: ["macos", "mac"],
  messages: ["messages", "message"],
  middleware: ["middleware", "middlewares"],
  mocks: ["mocks", "_draft", "_drafts", "mock", "fixture", "fixtures", "draft", "drafts", "concept", "concepts", "sketch", "sketches"],
  moonrepo: ["moonrepo", ".moon"],
  next: ["next", ".next"],
  nix: ["nix"],
  node: ["node", "node_modules"],
  nuxt: ["nuxt", ".nuxt"],
  packages: ["packages", "package", "pkg", "pkgs", "crate", "crates"],
  pesde: ["pesde", ".pesde"],
  plugins: ["plugins", "plugin", "_plugins", "mod", "mods", "modding", "extension", "extensions", "addon", "addons", "module", "modules"],
  pre_commit: ["pre-commit", "pre-commit-channel"],
  prisma: ["prisma"],
  private: ["private"],
  proto: ["proto", "protobuf", "protobufs", "protos"],
  public: ["public", "_site", "www", "wwwroot", "web", "website", "site", "browser", "browsers"],
  queue: ["queue", "queues", "bull", "mq"],
  redux: ["redux"],
  renovate: ["renovate", ".renovate"],
  roblox: ["roblox", "roblox_packages", "roblox_server_packages"],
  routes: ["routes", "router", "routers"],
  sass: ["sass", "_sass", "scss", "_scss"],
  scripts: ["scripts", "script", "scripting"],
  security: ["security"],
  server: ["server", "servers", "backend"],
  shared: ["shared", "share"],
  src: ["src", "srcs", "source", "sources", "code"],
  storybook: ["storybook", ".storybook", "stories", "__stories__"],
  styles: ["styles", "css", "stylesheet", "stylesheets", "style"],
  svg: ["svg", "svgs"],
  tauri: ["tauri", "src-tauri"],
  temp: ["temp", ".temp", "tmp", ".tmp", "cached", "cache", ".cache"],
  templates: ["templates", "template"],
  tests: ["tests", "test", "testing", "__tests__", "__snapshots__", "__mocks__", "__fixtures__", "__test__", "spec", "specs"],
  themes: ["themes", "theme"],
  turbo: ["turbo", ".turbo"],
  types: ["types", "typings", "@types"],
  upload: ["upload", "uploads"],
  utils: ["utils", "util", "utility", "utilities"],
  vercel: ["vercel", ".vercel", "now", ".now"],
  video: ["video", "vid", "vids", "videos", "movie", "movies"],
  views: ["views", "view", "screen", "screens", "page", "pages", "public_html", "html"],
  vscode: ["vscode", ".vscode", ".vscode-test"],
  windows: ["windows"],
  workflows: ["workflows", "workflow", "ci", ".ci"],
  wxt: ["wxt", ".wxt"],
  xcode: ["xcode", "xcodeproj", "xcworkspace", "xcshareddata", "xcschemes"],
  xmake: ["xmake", ".xmake"],
  yarn: ["yarn", ".yarn"],
};

/** Folder name (lower-cased) to icon name. */
const ICON_BY_NAME = new Map<string, string>(
  Object.entries(FOLDER_ICONS).flatMap(([icon, names]) =>
    names.map((name) => [name.toLowerCase(), icon] as const),
  ),
);

/**
 * @notice Icon path for a folder in the explorer.
 * @param name Folder basename, e.g. "src" or ".github".
 * @param expanded Whether the folder is open (uses the `_open` artwork).
 * @return Path under `public/`, e.g. `/assets/icons/folder_icons/folder_src_open.svg`.
 */
export function folderIconSrc(name: string, expanded = false): string {
  const icon = ICON_BY_NAME.get(name.toLowerCase()) ?? "default";
  return `/assets/icons/folder_icons/folder_${icon}${expanded ? "_open" : ""}.svg`;
}
