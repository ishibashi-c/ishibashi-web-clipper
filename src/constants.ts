export const VIEW_TYPE_CLIP_HISTORY = "ishibashi-web-clipper-history";
export const VIEW_TYPE_CLIP_LIBRARY = "ishibashi-web-clipper-library";
export const PROTOCOL_ACTION = "ishibashi-web-clip";
export const LEGACY_PROTOCOL_ACTION = "myplugin-web-clip";

export const DEFAULT_SETTINGS = {
  setupCompleted: false,
  language: "ja",
  workflowMode: "inbox",
  targetFolder: "Web Clips",
  inboxFolder: "08_Webクリップ/10_未整理",
  migrationTargetFolder: "08_Webクリップ/10_未整理",
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
  fixedTags: ["webclip"],
  addDomainTag: true,
  addFolderTags: false,
  preventDuplicateUrls: true,
  maxFileNameLength: 48,
  librarySidebarWidth: 280,
  libraryInspectorWidth: 280,
  libraryGridColumns: 1,
  clipHistory: []
};
