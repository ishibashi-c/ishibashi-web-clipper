export const VIEW_TYPE_CLIP_HISTORY = "ishibashi-web-clipper-history";
export const VIEW_TYPE_CLIP_LIBRARY = "ishibashi-web-clipper-library";
export const PROTOCOL_ACTION = "ishibashi-web-clip";
export const LEGACY_PROTOCOL_ACTION = "myplugin-web-clip";

export const DEFAULT_SETTINGS = {
  setupCompleted: false,
  language: "ja",
  workflowMode: "inbox",
  targetFolder: "webクリップ",
  inboxFolder: "webクリップ/10_未整理",
  migrationTargetFolder: "webクリップ",
  browserVaultName: "",
  dateFormat: "YYYY-MM-DD HH:mm",
  noteTemplate: [
    "## Link",
    "",
    "{{url}}",
    "",
    "## Summary",
    "",
    "{{description}}",
    "",
    "## Memo",
    "",
    "{{note}}"
  ].join("\n"),
  fetchMetadata: true,
  fetchPageTitle: true,
  confirmBeforeSave: false,
  openAfterClip: false,
  fixedTags: ["webクリップ"],
  addDomainTag: true,
  addFolderTags: false,
  preventDuplicateUrls: true,
  maxFileNameLength: 48,
  librarySidebarWidth: 280,
  libraryInspectorWidth: 280,
  libraryGridColumns: 1,
  clipHistory: []
};

export const DEFAULT_FIXED_TAGS = {
  ja: ["webクリップ"],
  en: ["webclip"]
};

export function getWebClipFolderPreset(language: "ja" | "en") {
  const root = language === "ja" ? "webクリップ" : "webclip";
  const names = language === "ja"
    ? ["10_未整理", "20_技術", "30_ビジネス", "40_社会", "50_文化", "60_生活", "70_学習", "80_ツール", "90_その他"]
    : ["10_Inbox", "20_Tech", "30_Business", "40_Society", "50_Culture", "60_Life", "70_Learning", "80_Tools", "90_Other"];

  return {
    root,
    inbox: `${root}/${names[0]}`,
    folders: names.map((name) => `${root}/${name}`)
  };
}
