export const VIEW_TYPE_CLIP_HISTORY = "ishibashi-web-clipper-history";
export const VIEW_TYPE_CLIP_LIBRARY = "ishibashi-web-clipper-library";
export const PROTOCOL_ACTION = "ishibashi-web-clip";
export const LEGACY_PROTOCOL_ACTION = "myplugin-web-clip";

export const DEFAULT_SETTINGS = {
  setupCompleted: false,
  language: "ja",
  workflowMode: "inbox",
  targetFolder: "Web Clips",
  inboxFolder: "Web Clips/10_未整理",
  migrationTargetFolder: "Web Clips/10_未整理",
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

export const WEB_CLIP_FOLDER_PRESET = {
  root: "Web Clips",
  inbox: "Web Clips/10_未整理",
  folders: [
    "Web Clips/10_未整理",
    "Web Clips/20_技術",
    "Web Clips/30_経済",
    "Web Clips/40_エンタメ",
    "Web Clips/50_社会",
    "Web Clips/60_文化",
    "Web Clips/70_大学",
    "Web Clips/80_生活",
    "Web Clips/90_その他"
  ]
};
