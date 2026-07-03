var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => IshibashiWebClipper
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// src/constants.ts
var VIEW_TYPE_CLIP_HISTORY = "ishibashi-web-clipper-history";
var VIEW_TYPE_CLIP_LIBRARY = "ishibashi-web-clipper-library";
var PROTOCOL_ACTION = "ishibashi-web-clip";
var LEGACY_PROTOCOL_ACTION = "myplugin-web-clip";
var DEFAULT_SETTINGS = {
  setupCompleted: false,
  language: "ja",
  workflowMode: "inbox",
  targetFolder: "web\u30AF\u30EA\u30C3\u30D7",
  inboxFolder: "web\u30AF\u30EA\u30C3\u30D7/10_\u672A\u6574\u7406",
  migrationTargetFolder: "web\u30AF\u30EA\u30C3\u30D7",
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
  fixedTags: ["web\u30AF\u30EA\u30C3\u30D7"],
  addDomainTag: true,
  addFolderTags: false,
  preventDuplicateUrls: true,
  maxFileNameLength: 48,
  librarySidebarWidth: 280,
  libraryInspectorWidth: 280,
  libraryGridColumns: 1,
  clipHistory: []
};
var DEFAULT_FIXED_TAGS = {
  ja: ["web\u30AF\u30EA\u30C3\u30D7"],
  en: ["webclip"]
};
function getWebClipFolderPreset(language) {
  const root = language === "ja" ? "web\u30AF\u30EA\u30C3\u30D7" : "webclip";
  const names = language === "ja" ? ["10_\u672A\u6574\u7406", "20_\u6280\u8853", "30_\u30D3\u30B8\u30CD\u30B9", "40_\u793E\u4F1A", "50_\u6587\u5316", "60_\u751F\u6D3B", "70_\u5B66\u7FD2", "80_\u30C4\u30FC\u30EB", "90_\u305D\u306E\u4ED6"] : ["10_Inbox", "20_Tech", "30_Business", "40_Society", "50_Culture", "60_Life", "70_Learning", "80_Tools", "90_Other"];
  return {
    root,
    inbox: `${root}/${names[0]}`,
    folders: names.map((name) => `${root}/${name}`)
  };
}

// src/i18n.ts
var STRINGS = {
  ja: {
    menuSaveClip: "\u30A6\u30A7\u30D6\u30AF\u30EA\u30C3\u30D7\u306B\u4FDD\u5B58",
    ribbonOpenLibrary: "Web\u30AF\u30EA\u30C3\u30D7\u7BA1\u7406\u30DA\u30FC\u30B8\u3092\u958B\u304F",
    commandClipClipboard: "\u30AF\u30EA\u30C3\u30D7\u30DC\u30FC\u30C9\u306EURL\u3092\u30A6\u30A7\u30D6\u30AF\u30EA\u30C3\u30D7\u306B\u4FDD\u5B58\u3059\u308B",
    commandOpenHistory: "\u30A6\u30A7\u30D6\u30AF\u30EA\u30C3\u30D7\u5C65\u6B74\u3092\u958B\u304F",
    commandOpenLibrary: "Web\u30AF\u30EA\u30C3\u30D7\u7BA1\u7406\u30DA\u30FC\u30B8\u3092\u958B\u304F",
    commandOpenLibrarySidebar: "Web\u30AF\u30EA\u30C3\u30D7\u7BA1\u7406\u30DA\u30FC\u30B8\u3092\u30B5\u30A4\u30C9\u30D0\u30FC\u3067\u958B\u304F",
    commandShowFolder: "\u30A6\u30A7\u30D6\u30AF\u30EA\u30C3\u30D7\u4FDD\u5B58\u5148\u30D5\u30A9\u30EB\u30C0\u3092\u78BA\u8A8D\u3059\u308B",
    commandMigrateClips: "\u65E2\u5B58Web\u30AF\u30EA\u30C3\u30D7\u3092\u6700\u65B0\u7248\u5F62\u5F0F\u306B\u6574\u3048\u308B",
    historyTitle: "Web\u30AF\u30EA\u30C3\u30D7\u5C65\u6B74",
    historyEmpty: "\u307E\u3060\u4FDD\u5B58\u5C65\u6B74\u304C\u3042\u308A\u307E\u305B\u3093\u3002",
    noticeNoUrl: "\u4FDD\u5B58\u3059\u308BURL\u304C\u3042\u308A\u307E\u305B\u3093\u3002",
    noticeNoClipboardUrl: "\u30AF\u30EA\u30C3\u30D7\u30DC\u30FC\u30C9\u306BURL\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002",
    noticeClipboardFailed: "\u30AF\u30EA\u30C3\u30D7\u30DC\u30FC\u30C9\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002",
    noticeNoSharedUrl: "\u5171\u6709\u30C6\u30AD\u30B9\u30C8\u306BURL\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002",
    noticeInvalidUrl: "\u4FDD\u5B58\u3059\u308BURL\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002",
    noticeDuplicate: "\u540C\u3058URL\u306E\u30A6\u30A7\u30D6\u30AF\u30EA\u30C3\u30D7\u304C\u65E2\u306B\u3042\u308A\u307E\u3059\u3002",
    noticeCreated: "\u30A6\u30A7\u30D6\u30AF\u30EA\u30C3\u30D7\u3092\u4F5C\u6210\u3057\u307E\u3057\u305F",
    noticeTargetFolder: "\u4FDD\u5B58\u5148",
    noticeFolderPresetApplied: "\u30D5\u30A9\u30EB\u30C0\u30D7\u30EA\u30BB\u30C3\u30C8\u3092\u4F5C\u6210\u3057\u307E\u3057\u305F\u3002",
    firstRunDesc: "\u6700\u521D\u306B\u8868\u793A\u8A00\u8A9E\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002Web\u30AF\u30EA\u30C3\u30D7\u306F\u672A\u6574\u7406\u30D5\u30A9\u30EB\u30C0\u306B\u4FDD\u5B58\u3055\u308C\u3001\u5F8C\u304B\u3089\u6574\u7406\u3067\u304D\u307E\u3059\u3002",
    firstRunPreset: "\u5206\u985E\u30D5\u30A9\u30EB\u30C0\u30D7\u30EA\u30BB\u30C3\u30C8\u3092\u4F5C\u6210\u3059\u308B",
    firstRunPresetDesc: "web\u30AF\u30EA\u30C3\u30D7\u914D\u4E0B\u306B 10_\u672A\u6574\u7406\u300120_\u6280\u8853\u300130_\u30D3\u30B8\u30CD\u30B9... \u306E\u30D5\u30A9\u30EB\u30C0\u69CB\u6210\u3092\u4F5C\u6210\u3057\u307E\u3059\u3002\u5F8C\u304B\u3089\u8A2D\u5B9A\u753B\u9762\u3067\u8FFD\u52A0\u3059\u308B\u3053\u3068\u3082\u3067\u304D\u307E\u3059\u3002",
    firstRunStart: "\u958B\u59CB",
    settingsIntro: "\u30B9\u30DE\u30DB\u5171\u6709\u3001\u30D6\u30C3\u30AF\u30DE\u30FC\u30AF\u30EC\u30C3\u30C8\u3001\u30AF\u30EA\u30C3\u30D7\u30DC\u30FC\u30C9\u4FDD\u5B58\u3067\u4F5C\u6210\u3055\u308C\u308B\u30CE\u30FC\u30C8\u306E\u4FDD\u5B58\u30EB\u30FC\u30EB\u3092\u307E\u3068\u3081\u3066\u7BA1\u7406\u3057\u307E\u3059\u3002",
    summaryHeading: "\u73FE\u5728\u306E\u4FDD\u5B58\u30EB\u30FC\u30EB",
    summaryDestination: "\u4FDD\u5B58\u5148",
    summaryTags: "\u4ED8\u4E0E\u30BF\u30B0",
    summaryProtection: "\u4FDD\u5B58\u4FDD\u8B77",
    summaryNoTags: "\u30BF\u30B0\u306A\u3057",
    summaryDuplicateOn: "\u91CD\u8907URL\u3092\u9632\u6B62",
    summaryDuplicateOff: "\u91CD\u8907URL\u3092\u8A31\u53EF",
    summaryMetadataOn: "\u30E1\u30BF\u30C7\u30FC\u30BF\u53D6\u5F97\u3042\u308A",
    summaryMetadataOff: "\u30E1\u30BF\u30C7\u30FC\u30BF\u53D6\u5F97\u306A\u3057",
    sectionStart: "\u6700\u521D\u306B\u6C7A\u3081\u308B\u3053\u3068",
    sectionStartDesc: "\u8868\u793A\u8A00\u8A9E\u3092\u9078\u3073\u307E\u3059\u3002\u4FDD\u5B58\u306E\u6D41\u308C\u306F\u3001\u672A\u6574\u7406\u30D5\u30A9\u30EB\u30C0\u306B\u96C6\u3081\u3066\u5F8C\u304B\u3089\u6574\u7406\u3059\u308B\u5F62\u3067\u3059\u3002",
    sectionDestination: "\u4FDD\u5B58\u5148",
    sectionDestinationDesc: "\u65B0\u3057\u3044Web\u30AF\u30EA\u30C3\u30D7\u3092\u307E\u305A\u4FDD\u5B58\u3059\u308B\u672A\u6574\u7406\u30D5\u30A9\u30EB\u30C0\u3092\u6307\u5B9A\u3057\u307E\u3059\u3002\u5FC5\u8981\u306A\u3089\u5206\u985E\u7528\u30D5\u30A9\u30EB\u30C0\u306E\u30D7\u30EA\u30BB\u30C3\u30C8\u3082\u4F5C\u6210\u3067\u304D\u307E\u3059\u3002",
    sectionTags: "\u30BF\u30B0",
    sectionTagsDesc: "\u56FA\u5B9A\u30BF\u30B0\u3001\u4FDD\u5B58\u5143\u30C9\u30E1\u30A4\u30F3\u3001\u4FDD\u5B58\u5148\u30D5\u30A9\u30EB\u30C0\u7531\u6765\u306E\u30BF\u30B0\u3092\u7BA1\u7406\u3057\u307E\u3059\u3002",
    sectionBehavior: "\u4FDD\u5B58\u6642\u306E\u52D5\u304D",
    sectionBehaviorDesc: "\u78BA\u8A8D\u753B\u9762\u3001\u91CD\u8907\u9632\u6B62\u3001\u30D5\u30A1\u30A4\u30EB\u540D\u3001\u65E5\u4ED8\u5F62\u5F0F\u306A\u3069\u306E\u4FDD\u5B58\u30EB\u30FC\u30EB\u3067\u3059\u3002",
    sectionTemplate: "\u30CE\u30FC\u30C8\u672C\u6587",
    sectionTemplateDesc: "\u4F5C\u6210\u3055\u308C\u308BMarkdown\u30CE\u30FC\u30C8\u306E\u672C\u6587\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8\u3067\u3059\u3002",
    sectionBrowser: "\u30D6\u30E9\u30A6\u30B6\u304B\u3089\u4FDD\u5B58",
    sectionBrowserDesc: "\u30D6\u30C3\u30AF\u30DE\u30FC\u30AF\u30EC\u30C3\u30C8\u306F\u3001\u30D6\u30E9\u30A6\u30B6\u306E\u30D6\u30C3\u30AF\u30DE\u30FC\u30AF\u306BJavaScript\u30B3\u30FC\u30C9\u3092\u4FDD\u5B58\u3057\u3066\u3001\u8868\u793A\u4E2D\u306E\u30DA\u30FC\u30B8\u3092Obsidian\u3078\u9001\u308B\u4ED5\u7D44\u307F\u3067\u3059\u3002",
    sectionMaintenance: "\u65E2\u5B58\u30AF\u30EA\u30C3\u30D7\u306E\u6574\u7406",
    sectionMaintenanceDesc: "\u904E\u53BB\u306B\u4F5C\u6210\u3057\u305FWeb\u30AF\u30EA\u30C3\u30D7\u3092\u3001\u73FE\u5728\u306E\u4FDD\u5B58\u30EB\u30FC\u30EB\u306B\u5408\u308F\u305B\u3066frontmatter\u3060\u3051\u6574\u3048\u307E\u3059\u3002",
    settingLanguage: "\u8A00\u8A9E",
    settingLanguageDesc: "\u8A2D\u5B9A\u753B\u9762\u3001\u901A\u77E5\u3001\u78BA\u8A8D\u753B\u9762\u306E\u8868\u793A\u8A00\u8A9E\u3002",
    workflowInbox: "\u4E00\u65E6Inbox/\u672A\u6574\u7406\u306B\u4FDD\u5B58\u3057\u3066\u5F8C\u3067\u6574\u7406\u3059\u308B",
    settingInboxFolder: "\u6574\u7406\u5F85\u3061\u30D5\u30A9\u30EB\u30C0",
    settingInboxFolderDesc: "\u3059\u3079\u3066\u306E\u30AF\u30EA\u30C3\u30D7\u3092\u307E\u305A\u4FDD\u5B58\u3059\u308B\u30D5\u30A9\u30EB\u30C0\u3002",
    settingBrowserVaultName: "\u30D6\u30E9\u30A6\u30B6\u4FDD\u5B58\u5148Vault\u540D",
    settingBrowserVaultNameDesc: "PC\u30D6\u30E9\u30A6\u30B6\u306E\u30D6\u30C3\u30AF\u30DE\u30FC\u30AF\u30EC\u30C3\u30C8\u304B\u3089\u4FDD\u5B58\u3059\u308BVault\u540D\u3002\u8907\u6570Vault\u3092\u4F7F\u3046\u5834\u5408\u306F\u5FC5\u305A\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    settingFolderPreset: "\u5206\u985E\u30D5\u30A9\u30EB\u30C0\u30D7\u30EA\u30BB\u30C3\u30C8",
    settingFolderPresetDesc: "web\u30AF\u30EA\u30C3\u30D7\u914D\u4E0B\u306B 10_\u672A\u6574\u7406\u300120_\u6280\u8853\u300130_\u30D3\u30B8\u30CD\u30B9\u300140_\u793E\u4F1A... \u306E\u30D5\u30A9\u30EB\u30C0\u69CB\u6210\u3092\u4F5C\u6210\u3057\u307E\u3059\u3002\u65E2\u5B58\u30D5\u30A9\u30EB\u30C0\u306F\u4E0A\u66F8\u304D\u3057\u307E\u305B\u3093\u3002",
    settingFolderPresetButton: "\u30D7\u30EA\u30BB\u30C3\u30C8\u3092\u4F5C\u6210",
    captureGuideHeading: "Web\u3092\u30AF\u30EA\u30C3\u30D7\u3059\u308B\u65B9\u6CD5",
    captureGuideMobileTitle: "\u30B9\u30DE\u30DB\u30D6\u30E9\u30A6\u30B6",
    captureGuideMobileDesc: "\u30D6\u30E9\u30A6\u30B6\u3084\u30A2\u30D7\u30EA\u306E\u5171\u6709\u30E1\u30CB\u30E5\u30FC\u304B\u3089Obsidian\u3078\u5171\u6709\u3057\u3001\u30A6\u30A7\u30D6\u30AF\u30EA\u30C3\u30D7\u306B\u4FDD\u5B58\u3092\u9078\u3073\u307E\u3059\u3002",
    captureGuideDesktopTitle: "\u30D1\u30BD\u30B3\u30F3\u30D6\u30E9\u30A6\u30B6",
    captureGuideDesktopDesc: "\u4E0B\u306EJavaScript\u30B3\u30FC\u30C9\u3092\u30D6\u30C3\u30AF\u30DE\u30FC\u30AF\u306EURL\u6B04\u306B\u767B\u9332\u3057\u3001\u4FDD\u5B58\u3057\u305F\u3044\u30DA\u30FC\u30B8\u4E0A\u3067\u5B9F\u884C\u3057\u307E\u3059\u3002\u30B3\u30FC\u30C9\u306B\u306F\u4FDD\u5B58\u5148Vault\u540D\u304C\u542B\u307E\u308C\u307E\u3059\u3002",
    bookmarkletStepsTitle: "\u8A2D\u5B9A\u624B\u9806",
    bookmarkletStep1: "\u30D6\u30E9\u30A6\u30B6\u306E\u30D6\u30C3\u30AF\u30DE\u30FC\u30AF\u30D0\u30FC\u3092\u8868\u793A\u3057\u307E\u3059\u3002",
    bookmarkletStep2: "\u4EFB\u610F\u306EWeb\u30DA\u30FC\u30B8\u3092\u30D6\u30C3\u30AF\u30DE\u30FC\u30AF\u3059\u308B\u304B\u3001\u65B0\u3057\u3044\u30D6\u30C3\u30AF\u30DE\u30FC\u30AF\u3092\u8FFD\u52A0\u3057\u307E\u3059\u3002",
    bookmarkletStep3: "\u30D6\u30C3\u30AF\u30DE\u30FC\u30AF\u306E\u7DE8\u96C6\u753B\u9762\u3092\u958B\u304D\u3001\u540D\u524D\u3092\u5206\u304B\u308A\u3084\u3059\u304F\u5909\u66F4\u3057\u307E\u3059\u3002",
    bookmarkletStep4: "URL\u6B04\u306B\u4E0B\u306EJavaScript\u30B3\u30FC\u30C9\u3092\u8CBC\u308A\u4ED8\u3051\u3066\u4FDD\u5B58\u3057\u307E\u3059\u3002",
    bookmarkletCodeLabel: "\u30D6\u30C3\u30AF\u30DE\u30FC\u30AF\u306EURL\u6B04\u306B\u8CBC\u308A\u4ED8\u3051\u308B\u30B3\u30FC\u30C9",
    bookmarkletCopy: "\u30B3\u30FC\u30C9\u3092\u30B3\u30D4\u30FC",
    bookmarkletCopied: "\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F",
    settingConfirm: "\u4FDD\u5B58\u524D\u306B\u78BA\u8A8D\u3059\u308B",
    settingConfirmDesc: "\u30BF\u30A4\u30C8\u30EB\u3001\u4FDD\u5B58\u5148\u3001\u30BF\u30B0\u3001\u30E1\u30E2\u3092\u4FDD\u5B58\u524D\u306B\u7DE8\u96C6\u3057\u307E\u3059\u3002",
    settingOpenAfterClip: "\u4FDD\u5B58\u5F8C\u306B\u30CE\u30FC\u30C8\u3092\u958B\u304F",
    settingFetchMetadata: "\u30E1\u30BF\u30C7\u30FC\u30BF\u3092\u53D6\u5F97\u3059\u308B",
    settingFetchMetadataDesc: "\u672C\u6587\u62BD\u51FA\u306F\u884C\u308F\u305A\u3001\u516C\u958B\u30E1\u30BF\u30C7\u30FC\u30BF\u3060\u3051\u3092\u53D6\u5F97\u3057\u307E\u3059\u3002",
    settingPreventDuplicates: "\u540C\u3058URL\u306E\u91CD\u8907\u4FDD\u5B58\u3092\u9632\u3050",
    settingMaxFileName: "\u30D5\u30A1\u30A4\u30EB\u540D\u306E\u6700\u5927\u6587\u5B57\u6570",
    settingMaxFileNameDesc: "Sync\u3067\u6271\u3044\u3084\u3059\u3044\u77ED\u3081\u306E\u30D5\u30A1\u30A4\u30EB\u540D\u306B\u3057\u307E\u3059\u3002\u65E5\u4ED8\u306Ffrontmatter\u306B\u4FDD\u5B58\u3057\u307E\u3059\u3002",
    settingFixedTags: "\u56FA\u5B9A\u30BF\u30B0",
    settingFixedTagsDesc: "\u4F5C\u6210\u3059\u308BWeb\u30AF\u30EA\u30C3\u30D7\u306B\u5E38\u306B\u4ED8\u3051\u308B\u30BF\u30B0\u30021\u884C\u306B1\u30BF\u30B0\u3002\u7A7A\u6B04\u306B\u3059\u308B\u3068\u56FA\u5B9A\u30BF\u30B0\u3092\u4ED8\u3051\u307E\u305B\u3093\u3002",
    settingFolderTags: "\u4FDD\u5B58\u5148\u30D5\u30A9\u30EB\u30C0\u304B\u3089\u30BF\u30B0\u3092\u4ED8\u3051\u308B",
    settingFolderTagsDesc: "Auto Tagger\u306A\u3069\u3067\u30D5\u30A9\u30EB\u30C0\u7531\u6765\u30BF\u30B0\u3092\u7BA1\u7406\u3059\u308B\u5834\u5408\u306FOFF\u63A8\u5968\u3067\u3059\u3002",
    settingDomainTag: "\u30C9\u30E1\u30A4\u30F3\u304B\u3089\u30BF\u30B0\u3092\u4ED8\u3051\u308B",
    settingDomainTagDesc: "note.com\u306A\u3089 note \u306E\u3088\u3046\u306B\u3001\u4FDD\u5B58\u5143\u30B5\u30A4\u30C8\u3092\u30BF\u30B0\u5316\u3057\u307E\u3059\u3002",
    settingDateFormat: "\u65E5\u4ED8\u5F62\u5F0F",
    settingLibraryOpen: "Web\u30AF\u30EA\u30C3\u30D7\u7BA1\u7406\u30DA\u30FC\u30B8",
    settingLibraryOpenDesc: "\u4FDD\u5B58\u6E08\u307FWeb\u30AF\u30EA\u30C3\u30D7\u3092\u6A2A\u65AD\u7684\u306B\u691C\u7D22\u3001\u5206\u985E\u3001\u4E26\u3079\u66FF\u3048\u3067\u304D\u307E\u3059\u3002",
    settingLibraryOpenButton: "\u7BA1\u7406\u30DA\u30FC\u30B8\u3092\u958B\u304F",
    settingMigrationFolder: "\u79FB\u884C\u5BFE\u8C61\u30D5\u30A9\u30EB\u30C0",
    settingMigrationFolderDesc: "\u3053\u306E\u30D5\u30A9\u30EB\u30C0\u914D\u4E0B\u306EMarkdown\u3060\u3051\u3092\u78BA\u8A8D\u3057\u307E\u3059\u3002Vault\u5168\u4F53\u306F\u8D70\u67FB\u3057\u307E\u305B\u3093\u3002",
    settingMigrationRun: "\u65E2\u5B58Web\u30AF\u30EA\u30C3\u30D7\u3092\u6700\u65B0\u7248\u5F62\u5F0F\u306B\u6574\u3048\u308B",
    settingMigrationRunDesc: "\u5B9F\u884C\u524D\u306B\u5909\u66F4\u5BFE\u8C61\u3068\u5909\u66F4\u5185\u5BB9\u3092\u30D7\u30EC\u30D3\u30E5\u30FC\u3057\u307E\u3059\u3002\u672C\u6587\u3001\u30D5\u30A1\u30A4\u30EB\u540D\u3001\u4FDD\u5B58\u5834\u6240\u306F\u5909\u66F4\u3057\u307E\u305B\u3093\u3002",
    settingMigrationRunButton: "\u30D7\u30EC\u30D3\u30E5\u30FC\u3092\u958B\u304F",
    templateHeading: "\u30CE\u30FC\u30C8\u672C\u6587\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8",
    templateHelp: "{{date}}, {{title}}, {{url}}, {{note}}, {{description}}, {{image}}, {{site}}, {{domain}}, {{tags}} \u304C\u4F7F\u3048\u307E\u3059\u3002",
    uriHeading: "\u5171\u6709\u7528URL",
    confirmTitle: "\u30A6\u30A7\u30D6\u30AF\u30EA\u30C3\u30D7\u3092\u4FDD\u5B58",
    fieldTitle: "\u30BF\u30A4\u30C8\u30EB",
    fieldFolder: "\u4FDD\u5B58\u5148",
    fieldTags: "\u30BF\u30B0",
    fieldTagsDesc: "\u30AB\u30F3\u30DE\u307E\u305F\u306F\u6539\u884C\u533A\u5207\u308A\u3002",
    fieldMemo: "\u30E1\u30E2",
    libraryTitle: "Web\u30AF\u30EA\u30C3\u30D7\u7BA1\u7406",
    librarySubtitle: "\u4FDD\u5B58\u6E08\u307F\u30AF\u30EA\u30C3\u30D7\u3092\u30D5\u30A9\u30EB\u30C0\u3001\u30C9\u30E1\u30A4\u30F3\u3001\u30BF\u30B0\u3067\u6A2A\u65AD\u7684\u306B\u898B\u76F4\u3057\u307E\u3059\u3002",
    libraryRefresh: "\u66F4\u65B0",
    libraryRefreshing: "\u66F4\u65B0\u4E2D...",
    libraryRefreshComplete: "\u66F4\u65B0\u5B8C\u4E86\u3057\u307E\u3057\u305F",
    libraryLoading: "Web\u30AF\u30EA\u30C3\u30D7\u3092\u8AAD\u307F\u8FBC\u3093\u3067\u3044\u307E\u3059\u3002",
    libraryBrowseBy: "\u5206\u985E",
    libraryByFolder: "\u30D5\u30A9\u30EB\u30C0",
    libraryByDomain: "\u30C9\u30E1\u30A4\u30F3",
    libraryByTag: "\u30BF\u30B0",
    libraryGroupSortCountDesc: "\u4EF6\u6570 \u591A\u3044\u9806",
    libraryGroupSortCountAsc: "\u4EF6\u6570 \u5C11\u306A\u3044\u9806",
    libraryGroupSortNameAsc: "\u540D\u524D \u6607\u9806",
    libraryGroupSortNameDesc: "\u540D\u524D \u964D\u9806",
    libraryAllClips: "\u3059\u3079\u3066",
    libraryMoreGroups: "\u307B\u304B {{count}} \u4EF6",
    libraryShowing: "{{count}} \u4EF6\u3092\u8868\u793A",
    librarySearchPlaceholder: "\u30BF\u30A4\u30C8\u30EB\u3001URL\u3001\u30BF\u30B0\u3001\u8AAC\u660E\u3067\u691C\u7D22",
    librarySortDateDesc: "\u65E5\u4ED8 \u964D\u9806",
    librarySortDateAsc: "\u65E5\u4ED8 \u6607\u9806",
    librarySortTitleAsc: "\u30BF\u30A4\u30C8\u30EB \u6607\u9806",
    librarySortTitleDesc: "\u30BF\u30A4\u30C8\u30EB \u964D\u9806",
    librarySortDomainAsc: "\u30C9\u30E1\u30A4\u30F3 \u6607\u9806",
    librarySortDomainDesc: "\u30C9\u30E1\u30A4\u30F3 \u964D\u9806",
    libraryColumns1: "1\u5217",
    libraryColumns2: "2\u5217",
    libraryColumns3: "3\u5217",
    libraryEmpty: "\u6761\u4EF6\u306B\u5408\u3046Web\u30AF\u30EA\u30C3\u30D7\u304C\u3042\u308A\u307E\u305B\u3093\u3002",
    libraryNoDomain: "\u30C9\u30E1\u30A4\u30F3\u306A\u3057",
    libraryOpenSource: "\u5143\u30DA\u30FC\u30B8",
    libraryOpenNote: "\u30CE\u30FC\u30C8\u3092\u958B\u304F",
    libraryEditClip: "\u7DE8\u96C6",
    libraryEditTab: "\u7DE8\u96C6",
    libraryEditTitle: "Web\u30AF\u30EA\u30C3\u30D7\u3092\u6574\u7406",
    libraryEditNoSelection: "\u7DE8\u96C6\u3059\u308BWeb\u30AF\u30EA\u30C3\u30D7\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    libraryChooseTags: "\u30BF\u30B0\u3092\u9078\u629E",
    libraryEditFolderDesc: "\u79FB\u52D5\u5148\u30D5\u30A9\u30EB\u30C0\u3002\u5B58\u5728\u3057\u306A\u3044\u5834\u5408\u306F\u4F5C\u6210\u3057\u307E\u3059\u3002",
    libraryEditTagsDesc: "\u30BF\u30B0\u3092\u6539\u884C\u307E\u305F\u306F\u30AB\u30F3\u30DE\u533A\u5207\u308A\u3067\u8CBC\u308A\u4ED8\u3051\u3067\u304D\u307E\u3059\u3002",
    libraryEditApply: "\u5909\u66F4\u3092\u9069\u7528",
    libraryEditFolderRequired: "\u79FB\u52D5\u5148\u30D5\u30A9\u30EB\u30C0\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    libraryEditComplete: "Web\u30AF\u30EA\u30C3\u30D7\u3092\u66F4\u65B0\u3057\u307E\u3057\u305F\u3002",
    libraryEditFailed: "Web\u30AF\u30EA\u30C3\u30D7\u306E\u66F4\u65B0\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002",
    librarySelectClip: "Web\u30AF\u30EA\u30C3\u30D7\u3092\u9078\u629E",
    libraryAddTag: "+ \u30BF\u30B0",
    libraryAddTagDesc: "\u8FFD\u52A0\u3059\u308B\u30BF\u30B0\u3092\u6539\u884C\u307E\u305F\u306F\u30AB\u30F3\u30DE\u533A\u5207\u308A\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    libraryRemoveTag: "{{tag}} \u3092\u524A\u9664",
    libraryRemoveTagDesc: "\u524A\u9664\u3059\u308B\u30BF\u30B0\u3092\u6539\u884C\u307E\u305F\u306F\u30AB\u30F3\u30DE\u533A\u5207\u308A\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    libraryMoveFolderDesc: "\u79FB\u52D5\u5148\u30D5\u30A9\u30EB\u30C0\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    libraryTagSearchPlaceholder: "\u65E2\u5B58\u30BF\u30B0\u3092\u691C\u7D22",
    libraryFolderSearchPlaceholder: "\u4FDD\u5B58\u5148\u30D5\u30A9\u30EB\u30C0\u3092\u691C\u7D22",
    libraryBulkSelected: "{{count}}\u4EF6\u3092\u9078\u629E\u4E2D",
    libraryBulkAddTag: "\u30BF\u30B0\u8FFD\u52A0",
    libraryBulkRemoveTag: "\u30BF\u30B0\u524A\u9664",
    libraryBulkMoveFolder: "\u30D5\u30A9\u30EB\u30C0\u79FB\u52D5",
    libraryBulkClear: "\u9078\u629E\u89E3\u9664",
    libraryOverview: "\u6982\u8981",
    libraryTotal: "\u7DCF\u6570",
    libraryFiltered: "\u8868\u793A\u4E2D",
    libraryDomains: "\u30C9\u30E1\u30A4\u30F3",
    libraryTags: "\u30BF\u30B0",
    libraryFrequentTags: "\u3088\u304F\u4F7F\u3046\u30BF\u30B0",
    libraryResizeSidebar: "\u5206\u985E\u30DA\u30A4\u30F3\u306E\u5E45\u3092\u5909\u66F4",
    libraryResizeInspector: "\u6982\u8981\u30DA\u30A4\u30F3\u306E\u5E45\u3092\u5909\u66F4",
    libraryUnknown: "\u672A\u5206\u985E",
    migrationTitle: "\u65E2\u5B58Web\u30AF\u30EA\u30C3\u30D7\u3092\u6700\u65B0\u7248\u5F62\u5F0F\u306B\u6574\u3048\u308B",
    migrationDesc: "\u5BFE\u8C61\u30D5\u30A9\u30EB\u30C0\u5185\u306EWeb\u30AF\u30EA\u30C3\u30D7\u3060\u3051\u3092\u78BA\u8A8D\u3057\u3001\u65E7\u4ED5\u69D8\u306E status\u3001\u6B20\u3051\u3066\u3044\u308B\u4F5C\u6210\u65E5\u6642\u3001domain\u3001\u73FE\u5728\u306E\u30BF\u30B0\u8A2D\u5B9A\u3068\u306E\u5DEE\u5206\u3092\u6574\u3048\u307E\u3059\u3002",
    migrationPreview: "\u5BFE\u8C61\u3092\u78BA\u8A8D",
    migrationApply: "\u5909\u66F4\u3092\u9069\u7528",
    migrationPreviewHeading: "\u5909\u66F4\u30D7\u30EC\u30D3\u30E5\u30FC",
    migrationNoChanges: "\u5909\u66F4\u304C\u5FC5\u8981\u306AWeb\u30AF\u30EA\u30C3\u30D7\u306F\u3042\u308A\u307E\u305B\u3093\u3002",
    migrationResult: "{{count}}\u4EF6\u306EWeb\u30AF\u30EA\u30C3\u30D7\u306B\u5909\u66F4\u304C\u3042\u308A\u307E\u3059\u3002",
    migrationMore: "\u307B\u304B {{count}} \u4EF6",
    migrationFolderRequired: "\u79FB\u884C\u5BFE\u8C61\u30D5\u30A9\u30EB\u30C0\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    migrationComplete: "{{count}}\u4EF6\u306EWeb\u30AF\u30EA\u30C3\u30D7\u3092\u66F4\u65B0\u3057\u307E\u3057\u305F\u3002",
    migrationCompleteWithFailures: "{{count}}\u4EF6\u3092\u66F4\u65B0\u3057\u307E\u3057\u305F\u3002{{failed}}\u4EF6\u306F\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u8A73\u7D30\u306F\u958B\u767A\u8005\u30B3\u30F3\u30BD\u30FC\u30EB\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
    migrationChangeType: "type: webclip \u3092\u8FFD\u52A0",
    migrationChangeStatus: "\u65E7\u4ED5\u69D8\u306E status: unreviewed \u3092\u524A\u9664",
    migrationChangeCreatedAt: "created_at \u3092\u8FFD\u52A0",
    migrationChangeDomain: "domain \u3092\u8FFD\u52A0",
    migrationChangeTags: "\u30BF\u30B0\u3092\u8FFD\u52A0",
    buttonCancel: "\u30AD\u30E3\u30F3\u30BB\u30EB",
    buttonSave: "\u4FDD\u5B58"
  },
  en: {
    menuSaveClip: "Save to Web Clips",
    ribbonOpenLibrary: "Open Web Clip Library",
    commandClipClipboard: "Save clipboard URL to Web Clips",
    commandOpenHistory: "Open Web Clip History",
    commandOpenLibrary: "Open Web Clip Library",
    commandOpenLibrarySidebar: "Open Web Clip Library in sidebar",
    commandShowFolder: "Show Web Clip destination folder",
    commandMigrateClips: "Update existing web clips to the latest format",
    historyTitle: "Web Clip History",
    historyEmpty: "No clip history yet.",
    noticeNoUrl: "No URL to save.",
    noticeNoClipboardUrl: "No URL found in the clipboard.",
    noticeClipboardFailed: "Could not read the clipboard.",
    noticeNoSharedUrl: "No URL found in the shared text.",
    noticeInvalidUrl: "The URL is not valid.",
    noticeDuplicate: "A web clip with the same URL already exists.",
    noticeCreated: "Created web clip",
    noticeTargetFolder: "Destination",
    noticeFolderPresetApplied: "Created the folder preset.",
    firstRunDesc: "Choose your display language. Web clips are collected in an inbox folder so you can organize them later.",
    firstRunPreset: "Create the classification folder preset",
    firstRunPresetDesc: "Creates a folder structure under webclip, such as 10_Inbox, 20_Tech, and 30_Business. You can also add it later from settings.",
    firstRunStart: "Start",
    settingsIntro: "Manage how notes are created from mobile sharing, bookmarklets, and clipboard saves.",
    summaryHeading: "Current save rules",
    summaryDestination: "Destination",
    summaryTags: "Tags",
    summaryProtection: "Save protection",
    summaryNoTags: "No tags",
    summaryDuplicateOn: "Duplicate URLs blocked",
    summaryDuplicateOff: "Duplicate URLs allowed",
    summaryMetadataOn: "Metadata fetch on",
    summaryMetadataOff: "Metadata fetch off",
    sectionStart: "Start here",
    sectionStartDesc: "Choose the display language. Clips are collected in an inbox folder first and organized later.",
    sectionDestination: "Destination",
    sectionDestinationDesc: "Choose the inbox folder for new web clips. You can also create an optional classification folder preset.",
    sectionTags: "Tags",
    sectionTagsDesc: "Manage fixed tags, source-domain tags, and folder-derived tags.",
    sectionBehavior: "Save behavior",
    sectionBehaviorDesc: "Control confirmation, duplicate prevention, filenames, and date format.",
    sectionTemplate: "Note body",
    sectionTemplateDesc: "Markdown template used when creating a web clip note.",
    sectionBrowser: "Browser capture",
    sectionBrowserDesc: "A bookmarklet saves JavaScript code as a browser bookmark and sends the current page to Obsidian.",
    sectionMaintenance: "Existing clips",
    sectionMaintenanceDesc: "Update old web clip frontmatter to match the current save rules.",
    settingLanguage: "Language",
    settingLanguageDesc: "Language for settings, notices, and confirmation screens.",
    workflowInbox: "Save to Inbox first and organize later",
    settingInboxFolder: "Inbox folder",
    settingInboxFolderDesc: "Folder where all new clips are first saved.",
    settingBrowserVaultName: "Browser target vault name",
    settingBrowserVaultNameDesc: "Vault name used by the desktop browser bookmarklet. Set this when you use multiple vaults.",
    settingFolderPreset: "Classification folder preset",
    settingFolderPresetDesc: "Creates folders under webclip such as 10_Inbox, 20_Tech, 30_Business, 40_Society, and more. Existing folders are not overwritten.",
    settingFolderPresetButton: "Create preset",
    captureGuideHeading: "How to clip the web",
    captureGuideMobileTitle: "Mobile browser",
    captureGuideMobileDesc: "Use the browser or app share menu, share to Obsidian, then choose Save to Web Clips.",
    captureGuideDesktopTitle: "Desktop browser",
    captureGuideDesktopDesc: "Paste the JavaScript code below into a bookmark URL, then run it on the page you want to save. The code includes the target vault name.",
    bookmarkletStepsTitle: "Setup steps",
    bookmarkletStep1: "Show your browser bookmarks bar.",
    bookmarkletStep2: "Bookmark any web page, or add a new bookmark.",
    bookmarkletStep3: "Open the bookmark edit screen and give it a clear name.",
    bookmarkletStep4: "Paste the JavaScript code below into the URL field and save it.",
    bookmarkletCodeLabel: "Code to paste into the bookmark URL field",
    bookmarkletCopy: "Copy code",
    bookmarkletCopied: "Copied",
    settingConfirm: "Confirm before saving",
    settingConfirmDesc: "Edit title, folder, tags, and memo before creating a note.",
    settingOpenAfterClip: "Open note after saving",
    settingFetchMetadata: "Fetch metadata",
    settingFetchMetadataDesc: "Fetch public metadata only. Article body extraction is not performed.",
    settingPreventDuplicates: "Prevent duplicate URLs",
    settingMaxFileName: "Max filename length",
    settingMaxFileNameDesc: "Use shorter sync-friendly filenames. Dates are stored in frontmatter.",
    settingFixedTags: "Fixed tags",
    settingFixedTagsDesc: "Tags added to every web clip. One tag per line. Leave empty to disable fixed tags.",
    settingFolderTags: "Add tags from destination folder",
    settingFolderTagsDesc: "Recommended off when another plugin manages folder-based tags.",
    settingDomainTag: "Add tag from domain",
    settingDomainTagDesc: "Adds a source tag such as note from note.com.",
    settingDateFormat: "Date format",
    settingLibraryOpen: "Web Clip Library",
    settingLibraryOpenDesc: "Search, group, and sort saved web clips across folders.",
    settingLibraryOpenButton: "Open library",
    settingMigrationFolder: "Migration target folder",
    settingMigrationFolderDesc: "Only Markdown files under this folder are checked. The whole vault is not scanned.",
    settingMigrationRun: "Update existing web clips to the latest format",
    settingMigrationRunDesc: "Preview changed files and changes before applying. Body text, filenames, and folders are not changed.",
    settingMigrationRunButton: "Open preview",
    templateHeading: "Note body template",
    templateHelp: "Available variables: {{date}}, {{title}}, {{url}}, {{note}}, {{description}}, {{image}}, {{site}}, {{domain}}, {{tags}}.",
    uriHeading: "Share URL",
    confirmTitle: "Save Web Clip",
    fieldTitle: "Title",
    fieldFolder: "Folder",
    fieldTags: "Tags",
    fieldTagsDesc: "Comma or newline separated.",
    fieldMemo: "Memo",
    libraryTitle: "Web Clip Library",
    librarySubtitle: "Review saved clips across folders, domains, and tags.",
    libraryRefresh: "Refresh",
    libraryRefreshing: "Refreshing...",
    libraryRefreshComplete: "Refresh complete",
    libraryLoading: "Loading web clips.",
    libraryBrowseBy: "Browse by",
    libraryByFolder: "Folder",
    libraryByDomain: "Domain",
    libraryByTag: "Tag",
    libraryGroupSortCountDesc: "Count desc",
    libraryGroupSortCountAsc: "Count asc",
    libraryGroupSortNameAsc: "Name asc",
    libraryGroupSortNameDesc: "Name desc",
    libraryAllClips: "All clips",
    libraryMoreGroups: "{{count}} more",
    libraryShowing: "Showing {{count}}",
    librarySearchPlaceholder: "Search title, URL, tags, or description",
    librarySortDateDesc: "Date desc",
    librarySortDateAsc: "Date asc",
    librarySortTitleAsc: "Title asc",
    librarySortTitleDesc: "Title desc",
    librarySortDomainAsc: "Domain asc",
    librarySortDomainDesc: "Domain desc",
    libraryColumns1: "1 column",
    libraryColumns2: "2 columns",
    libraryColumns3: "3 columns",
    libraryEmpty: "No web clips match the current filters.",
    libraryNoDomain: "No domain",
    libraryOpenSource: "Source",
    libraryOpenNote: "Open note",
    libraryEditClip: "Edit",
    libraryEditTab: "Edit",
    libraryEditTitle: "Organize web clip",
    libraryEditNoSelection: "Select a web clip to edit.",
    libraryChooseTags: "Choose tags",
    libraryEditFolderDesc: "Destination folder. It will be created if it does not exist.",
    libraryEditTagsDesc: "Paste tags separated by newlines or commas.",
    libraryEditApply: "Apply changes",
    libraryEditFolderRequired: "Enter a destination folder.",
    libraryEditComplete: "Updated web clip.",
    libraryEditFailed: "Failed to update web clip.",
    librarySelectClip: "Select web clip",
    libraryAddTag: "+ Tag",
    libraryAddTagDesc: "Enter tags to add, separated by newlines or commas.",
    libraryRemoveTag: "Remove {{tag}}",
    libraryRemoveTagDesc: "Enter tags to remove, separated by newlines or commas.",
    libraryMoveFolderDesc: "Enter the destination folder.",
    libraryTagSearchPlaceholder: "Search existing tags",
    libraryFolderSearchPlaceholder: "Search destination folders",
    libraryBulkSelected: "{{count}} selected",
    libraryBulkAddTag: "Add tag",
    libraryBulkRemoveTag: "Remove tag",
    libraryBulkMoveFolder: "Move folder",
    libraryBulkClear: "Clear selection",
    libraryOverview: "Overview",
    libraryTotal: "Total",
    libraryFiltered: "Visible",
    libraryDomains: "Domains",
    libraryTags: "Tags",
    libraryFrequentTags: "Frequent tags",
    libraryResizeSidebar: "Resize browse pane",
    libraryResizeInspector: "Resize overview pane",
    libraryUnknown: "Uncategorized",
    migrationTitle: "Update existing web clips to the latest format",
    migrationDesc: "Checks web clips in the target folder and updates old status, missing creation timestamps, missing domain, and tags based on current settings.",
    migrationPreview: "Preview",
    migrationApply: "Apply changes",
    migrationPreviewHeading: "Change preview",
    migrationNoChanges: "No web clips need changes.",
    migrationResult: "{{count}} web clips have changes.",
    migrationMore: "{{count}} more",
    migrationFolderRequired: "Enter a migration target folder.",
    migrationComplete: "Updated {{count}} web clips.",
    migrationCompleteWithFailures: "Updated {{count}} web clips. {{failed}} failed. Check the developer console for details.",
    migrationChangeType: "Add type: webclip",
    migrationChangeStatus: "Remove old status: unreviewed",
    migrationChangeCreatedAt: "Add created_at",
    migrationChangeDomain: "Add domain",
    migrationChangeTags: "Add tags",
    buttonCancel: "Cancel",
    buttonSave: "Save"
  }
};
function translate(language, key) {
  return STRINGS[language]?.[key] || STRINGS.ja[key] || key;
}

// src/utils.ts
var import_obsidian = require("obsidian");
function firstValue(value) {
  if (Array.isArray(value)) return value[0] || "";
  return String(value || "");
}
function parseSharedText(text) {
  const raw = String(text || "").trim();
  const url = extractFirstUrl(raw);
  if (!url) return { url: "", title: "", note: "" };
  const withoutUrl = raw.replace(url, "").trim();
  const lines = withoutUrl.split(/\r?\n/).map((line) => cleanText(line)).filter(Boolean).filter((line) => !looksLikeUrl(line));
  if (lines.length === 0) {
    return { url, title: "", note: "" };
  }
  if (lines.length === 1 && lines[0].length <= 120) {
    return { url, title: lines[0], note: "" };
  }
  const firstLineLooksLikeTitle = lines[0].length <= 120 && !/[。！？.!?]$/.test(lines[0]);
  return {
    url,
    title: firstLineLooksLikeTitle ? lines[0] : "",
    note: firstLineLooksLikeTitle ? lines.slice(1).join("\n") : lines.join("\n")
  };
}
function extractFirstUrl(text) {
  const match = String(text || "").match(/https?:\/\/[^\s<>"'`]+/i);
  return match ? stripTrailingUrlPunctuation(match[0]) : "";
}
function stripTrailingUrlPunctuation(url) {
  return String(url || "").replace(/[),.。、，）]+$/g, "");
}
function normalizeUrl(url) {
  try {
    const parsed = new URL(stripTrailingUrlPunctuation(url));
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}
function normalizeCacheKey(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url;
  }
}
function urlsMatch(left, right) {
  const normalizedLeft = normalizeCacheKey(normalizeUrl(left) || left);
  const normalizedRight = normalizeCacheKey(normalizeUrl(right) || right);
  return normalizedLeft === normalizedRight || stripTrailingSlash(normalizedLeft) === stripTrailingSlash(normalizedRight);
}
function getCachedFrontmatter(app, file) {
  const frontmatter = app.metadataCache?.getFileCache(file)?.frontmatter;
  return frontmatter && typeof frontmatter === "object" ? frontmatter : null;
}
function readFrontmatter(text) {
  const match = String(text || "").match(/^---\s*\n([\s\S]*?)\n---(?:\n|$)/);
  if (!match) return null;
  try {
    const value = (0, import_obsidian.parseYaml)(match[1]);
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}
function isWebClipFrontmatter(frontmatter) {
  if (!frontmatter) return false;
  return frontmatter.type === "webclip" || !!frontmatterString(frontmatter.source);
}
function isStrictWebClipFrontmatter(frontmatter) {
  return !!frontmatter && frontmatter.type === "webclip" && !!frontmatterString(frontmatter.source);
}
function hasWebClipSource(frontmatter) {
  if (!frontmatter) return false;
  return frontmatter.type === "webclip" || !!frontmatterString(frontmatter.source);
}
function frontmatterString(value) {
  if (Array.isArray(value)) return cleanText(value[0] || "");
  if (value === null || value === void 0) return "";
  return cleanText(String(value));
}
function normalizeFrontmatterTags(value) {
  if (Array.isArray(value)) {
    return unique(value.map(normalizeTag).filter(Boolean));
  }
  if (typeof value === "string") {
    return splitTags(value);
  }
  return [];
}
function isFileInFolder(file, folder) {
  const normalizedFolder = normalizePath(folder);
  if (!normalizedFolder) return false;
  return file.path.startsWith(`${normalizedFolder}/`);
}
function getParentPath(file) {
  const index = file.path.lastIndexOf("/");
  return index >= 0 ? file.path.slice(0, index) : "";
}
function fallbackMetadata(url, sharedTitle) {
  return cleanMetadata({
    url,
    title: cleanTitle(sharedTitle) || titleFromUrl(url),
    site: readableHost(url),
    description: "",
    image: ""
  });
}
function cleanMetadata(metadata) {
  const url = metadata.url || "";
  return {
    url,
    title: cleanTitle(metadata.title || titleFromUrl(url)),
    site: cleanText(metadata.site || readableHost(url)),
    description: cleanText(metadata.description || ""),
    image: metadata.image || "",
    domain: domainFromUrl(url)
  };
}
function parseOpenGraph(html) {
  const tags = {};
  const metaRe = /<meta\s+[^>]*>/gi;
  let match;
  while ((match = metaRe.exec(String(html || ""))) !== null) {
    const tag = match[0];
    const key = getHtmlAttribute(tag, "property") || getHtmlAttribute(tag, "name");
    const content = getHtmlAttribute(tag, "content");
    if (key && content) tags[key.toLowerCase()] = decodeHtmlEntities(content);
  }
  return tags;
}
function getHtmlAttribute(tag, name) {
  const re = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = tag.match(re);
  return match ? match[2] || match[3] || match[4] || "" : "";
}
function parseHtmlTitle(html) {
  const match = String(html || "").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtmlEntities(match[1]) : "";
}
function absoluteUrl(value, baseUrl) {
  if (!value) return "";
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}
function titleFromUrl(url) {
  try {
    const parsed = new URL(url);
    const path = decodeURIComponent(parsed.pathname.replace(/^\/+|\/+$/g, ""));
    return cleanTitle(path || parsed.hostname.replace(/^www\./, ""));
  } catch {
    return "Untitled";
  }
}
function readableHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
function domainFromUrl(url) {
  return readableHost(url).toLowerCase();
}
function cleanTitle(value) {
  return decodeHtmlEntities(value).replace(/\s+/g, " ").trim();
}
function cleanText(value) {
  return decodeHtmlEntities(value).replace(/\s+/g, " ").trim();
}
function cleanMemo(value) {
  return decodeHtmlEntities(value).replace(/\r\n?/g, "\n").split("\n").map((line) => line.replace(/[ \t]+/g, " ").trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
function decodeProtocolText(value) {
  return String(value || "").replace(/\+/g, " ");
}
function decodeHtmlEntities(value) {
  return String(value || "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x2F;/g, "/");
}
function looksLikeUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}
function normalizePath(path) {
  return String(path || "").trim().replace(/^\/+|\/+$/g, "");
}
function sanitizeFileName(value) {
  return String(value || "").trim().replace(/[\\\/:*?"<>|#\[\]\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
}
function truncateFileName(value, maxLength) {
  const chars = Array.from(String(value || ""));
  if (chars.length <= maxLength) return chars.join("");
  return chars.slice(0, maxLength).join("").trim();
}
function normalizeFileNameLength(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_SETTINGS.maxFileNameLength;
  return Math.max(20, Math.min(80, parsed));
}
function normalizeLibraryPaneWidth(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}
function normalizeGridColumns(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_SETTINGS.libraryGridColumns;
  return Math.max(1, Math.min(3, parsed));
}
function tagsFromFolderPath(path) {
  return normalizePath(path).split("/").filter(Boolean).map((part) => part.replace(/^\d{2}_/, "")).map(normalizeTag).filter(Boolean).filter((tag, index, tags) => tags.indexOf(tag) === index);
}
function tagFromDomain(domain) {
  const host = String(domain || "").toLowerCase().replace(/^www\./, "");
  const parts = host.split(".").filter(Boolean);
  if (parts.length === 0) return "";
  const secondLevelTlds = /* @__PURE__ */ new Set(["co", "com", "ne", "or", "go", "ac", "ed"]);
  if (parts.length >= 3 && parts[parts.length - 1].length === 2 && secondLevelTlds.has(parts[parts.length - 2])) {
    return normalizeTag(parts[parts.length - 3]);
  }
  return normalizeTag(parts.length >= 2 ? parts[parts.length - 2] : parts[0]);
}
function splitTags(value) {
  return unique(String(value || "").split(/[,\n]/).map(normalizeTag).filter(Boolean));
}
function normalizeTag(value) {
  return String(value || "").trim().replace(/^#+/, "").replace(/[#[\]\n\r\t]/g, " ").replace(/[\\\/]/g, "-").replace(/\s+/g, " ").trim();
}
function unique(values) {
  return Array.from(new Set(values));
}
function libraryTime(item) {
  const parsed = Date.parse(item.createdAt || item.created || "");
  return Number.isFinite(parsed) ? parsed : item.file.stat.ctime;
}
function formatLibraryDate(value) {
  const parsed = Date.parse(value || "");
  if (!Number.isFinite(parsed)) return value || "";
  return window.moment(parsed).format("YYYY/MM/DD HH:mm");
}
function shortHash(value) {
  let hash = 0;
  const text = String(value || "");
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).slice(0, 6) || "clip";
}
function nowIsoString() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function shouldResolveSharedRedirect(url) {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return host === "share.google" || host.endsWith(".share.google");
  } catch {
    return false;
  }
}
async function resolveFetchFinalUrl(url, timeoutMs) {
  if (typeof fetch !== "function") return "";
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal
    });
    return normalizeUrl(response.url || "");
  } finally {
    window.clearTimeout(timer);
  }
}
function inferCreatedAt(createdAt, created, file) {
  const existing = Date.parse(createdAt || "");
  if (Number.isFinite(existing)) return new Date(existing).toISOString();
  const legacy = Date.parse(created || "");
  if (Number.isFinite(legacy)) return new Date(legacy).toISOString();
  return new Date(file.stat.ctime).toISOString();
}
function withTimeout(promise, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    promise.then((value) => resolve(value)).catch((error) => reject(error)).finally(() => window.clearTimeout(timer));
  });
}
function stripTrailingSlash(value) {
  return String(value || "").replace(/\/$/, "");
}

// src/settings.ts
function mergeSettings(saved) {
  const settings = Object.assign({}, DEFAULT_SETTINGS, saved || {});
  settings.setupCompleted = !!settings.setupCompleted;
  settings.language = settings.language === "en" ? "en" : "ja";
  settings.workflowMode = "inbox";
  settings.targetFolder = normalizePath(settings.targetFolder || DEFAULT_SETTINGS.targetFolder);
  settings.inboxFolder = normalizePath(settings.inboxFolder || DEFAULT_SETTINGS.inboxFolder);
  const languagePreset = getWebClipFolderPreset(settings.language);
  if (settings.inboxFolder === "08_Web\u30AF\u30EA\u30C3\u30D7/10_\u672A\u6574\u7406" || settings.inboxFolder === "Web Clips/10_\u672A\u6574\u7406") {
    settings.inboxFolder = languagePreset.inbox;
    settings.targetFolder = languagePreset.root;
  }
  settings.migrationTargetFolder = normalizePath(settings.migrationTargetFolder || languagePreset.root || DEFAULT_SETTINGS.migrationTargetFolder);
  if (settings.migrationTargetFolder === "08_Web\u30AF\u30EA\u30C3\u30D7/10_\u672A\u6574\u7406" || settings.migrationTargetFolder === "Web Clips/10_\u672A\u6574\u7406" || settings.migrationTargetFolder === languagePreset.inbox) {
    settings.migrationTargetFolder = languagePreset.root || DEFAULT_SETTINGS.migrationTargetFolder;
  }
  settings.browserVaultName = String(settings.browserVaultName || "");
  settings.fetchMetadata = settings.fetchMetadata ?? settings.fetchPageTitle ?? DEFAULT_SETTINGS.fetchMetadata;
  settings.fixedTags = Array.isArray(settings.fixedTags) ? settings.fixedTags : DEFAULT_FIXED_TAGS[settings.language];
  if (settings.fixedTags.length === 1 && settings.fixedTags[0] === "webclip" && settings.language === "ja") {
    settings.fixedTags = DEFAULT_FIXED_TAGS.ja;
  }
  settings.addDomainTag = settings.addDomainTag ?? DEFAULT_SETTINGS.addDomainTag;
  settings.addFolderTags = !!settings.addFolderTags;
  settings.preventDuplicateUrls = settings.preventDuplicateUrls ?? DEFAULT_SETTINGS.preventDuplicateUrls;
  settings.maxFileNameLength = normalizeFileNameLength(settings.maxFileNameLength);
  settings.librarySidebarWidth = normalizeLibraryPaneWidth(settings.librarySidebarWidth, 220, 420, DEFAULT_SETTINGS.librarySidebarWidth);
  settings.libraryInspectorWidth = normalizeLibraryPaneWidth(settings.libraryInspectorWidth, 220, 420, DEFAULT_SETTINGS.libraryInspectorWidth);
  settings.libraryGridColumns = normalizeGridColumns(settings.libraryGridColumns);
  settings.clipHistory = Array.isArray(settings.clipHistory) ? settings.clipHistory.slice(0, 100) : [];
  return settings;
}

// src/main.ts
var IshibashiWebClipper = class extends import_obsidian2.Plugin {
  constructor() {
    super(...arguments);
    this.ribbonIconEl = null;
  }
  async onload() {
    this.settings = mergeSettings(await this.loadData());
    if (!this.settings.browserVaultName) {
      this.settings.browserVaultName = this.getVaultName();
      await this.saveSettings();
    }
    this.registerObsidianProtocolHandler(PROTOCOL_ACTION, async (params) => {
      await this.captureFromParams(params);
    });
    this.registerObsidianProtocolHandler(LEGACY_PROTOCOL_ACTION, async (params) => {
      await this.captureFromParams(params);
    });
    this.registerView(
      VIEW_TYPE_CLIP_HISTORY,
      (leaf) => new ClipHistoryView(leaf, this)
    );
    this.registerView(
      VIEW_TYPE_CLIP_LIBRARY,
      (leaf) => new WebClipLibraryView(leaf, this)
    );
    this.registerEvent(
      this.app.workspace.on("receive-text-menu", (menu, sharedText) => {
        menu.addItem((item) => {
          item.setSection("options").setIcon("link").setTitle(this.t("menuSaveClip")).onClick(async () => {
            await this.captureFromSharedText(sharedText);
          });
        });
      })
    );
    this.ribbonIconEl = this.addRibbonIcon("library", this.t("ribbonOpenLibrary"), async () => {
      await this.openClipLibrary();
    });
    this.addCommand({
      id: "clip-from-clipboard",
      name: this.t("commandClipClipboard"),
      callback: () => this.captureFromClipboard()
    });
    this.addCommand({
      id: "open-web-clip-history",
      name: this.t("commandOpenHistory"),
      callback: () => this.openClipHistory()
    });
    this.addCommand({
      id: "open-web-clip-library",
      name: this.t("commandOpenLibrary"),
      callback: () => this.openClipLibrary()
    });
    this.addCommand({
      id: "open-web-clip-library-sidebar",
      name: this.t("commandOpenLibrarySidebar"),
      callback: () => this.openClipLibrary("side")
    });
    this.addCommand({
      id: "open-web-clip-folder",
      name: this.t("commandShowFolder"),
      callback: () => this.openTargetFolder()
    });
    this.addCommand({
      id: "migrate-existing-web-clips",
      name: this.t("commandMigrateClips"),
      callback: () => this.openMigrationModal()
    });
    this.addSettingTab(new IshibashiWebClipperSettingTab(this.app, this));
    if (!this.settings.setupCompleted) {
      this.app.workspace.onLayoutReady(() => {
        new FirstRunModal(this.app, this).open();
      });
    }
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  updateRibbonLabel() {
    if (!this.ribbonIconEl) return;
    const label = this.t("ribbonOpenLibrary");
    this.ribbonIconEl.setAttr("aria-label", label);
    this.ribbonIconEl.setAttr("title", label);
  }
  t(key) {
    return translate(this.settings.language, key);
  }
  getVaultName() {
    return this.app.vault.getName?.() || "";
  }
  async captureFromParams(params) {
    const sharedText = firstValue(params.text);
    const parsed = parseSharedText(sharedText ? decodeProtocolText(sharedText) : firstValue(params.url || params.u || ""));
    const url = firstValue(params.url || params.u) || parsed.url;
    const title = decodeProtocolText(firstValue(params.title || params.t)) || parsed.title;
    const note = decodeProtocolText(firstValue(params.note || params.n)) || parsed.note;
    if (!url) {
      new import_obsidian2.Notice(this.t("noticeNoUrl"));
      return;
    }
    await this.prepareClip({ url, title, note });
  }
  async captureFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      await this.captureFromText(text, this.t("noticeNoClipboardUrl"));
    } catch (error) {
      console.error(error);
      new import_obsidian2.Notice(this.t("noticeClipboardFailed"));
    }
  }
  async captureFromSharedText(sharedText) {
    await this.captureFromText(sharedText, this.t("noticeNoSharedUrl"));
  }
  async captureFromText(text, errorMessage) {
    const parsed = parseSharedText(text);
    if (!parsed.url) {
      new import_obsidian2.Notice(errorMessage);
      return;
    }
    await this.prepareClip(parsed);
  }
  async prepareClip(input) {
    const normalizedUrl = normalizeUrl(input.url);
    if (!normalizedUrl) {
      new import_obsidian2.Notice(this.t("noticeInvalidUrl"));
      return;
    }
    const resolvedUrl = await this.resolveSharedRedirect(normalizedUrl);
    const duplicate = this.settings.preventDuplicateUrls ? await this.findExistingClip(resolvedUrl) : null;
    if (duplicate) {
      new import_obsidian2.Notice(this.t("noticeDuplicate"));
      await this.openFile(duplicate.path);
      await this.recordHistory({
        url: resolvedUrl,
        title: duplicate.basename || titleFromUrl(resolvedUrl),
        path: duplicate.path,
        status: "duplicate"
      });
      return;
    }
    const metadata = await this.resolveMetadata(resolvedUrl, input.title);
    const targetFolder = this.getDefaultTargetFolder();
    const clip = {
      url: resolvedUrl,
      title: metadata.title,
      note: cleanMemo(input.note),
      targetFolder,
      tags: this.getClipTags(targetFolder, metadata.domain),
      metadata
    };
    const confirmedClip = this.settings.confirmBeforeSave ? await this.confirmClip(clip) : clip;
    if (!confirmedClip) return;
    await this.createClipNote(confirmedClip);
  }
  async resolveSharedRedirect(url) {
    if (!shouldResolveSharedRedirect(url)) return url;
    try {
      const resolved = await resolveFetchFinalUrl(url, 8e3);
      return resolved && normalizeCacheKey(resolved) !== normalizeCacheKey(url) ? resolved : url;
    } catch (error) {
      console.warn("Failed to resolve shared redirect URL", error);
      return url;
    }
  }
  getDefaultTargetFolder() {
    return normalizePath(this.settings.inboxFolder || DEFAULT_SETTINGS.inboxFolder);
  }
  getDefaultMigrationFolder() {
    return normalizePath(this.settings.migrationTargetFolder || this.getFolderPreset().root);
  }
  getDefaultFixedTags(language = this.settings.language) {
    return DEFAULT_FIXED_TAGS[language].slice();
  }
  isLanguageDefaultFixedTags(tags) {
    const normalized = tags.map(normalizeTag).filter(Boolean);
    return Object.values(DEFAULT_FIXED_TAGS).some((defaults) => {
      const defaultTags = defaults.map(normalizeTag).filter(Boolean);
      return normalized.length === defaultTags.length && normalized.every((tag, index) => tag === defaultTags[index]);
    });
  }
  getFolderPreset(language = this.settings.language) {
    return getWebClipFolderPreset(language);
  }
  async applyFolderPreset(language = this.settings.language) {
    const preset = this.getFolderPreset(language);
    for (const folder of preset.folders) {
      await this.ensureFolder(folder);
    }
    this.settings.workflowMode = "inbox";
    this.settings.inboxFolder = preset.inbox;
    this.settings.targetFolder = preset.root;
    this.settings.migrationTargetFolder = preset.root;
    await this.saveSettings();
  }
  async resolveMetadata(url, sharedTitle) {
    const fallback = fallbackMetadata(url, sharedTitle);
    if (!this.settings.fetchMetadata && !this.settings.fetchPageTitle) {
      return fallback;
    }
    try {
      const response = await withTimeout((0, import_obsidian2.requestUrl)({
        url,
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 Obsidian Ishibashi Web Clipper"
        }
      }), 1e4);
      const html = response.text || "";
      const tags = parseOpenGraph(html);
      const title = cleanTitle(
        cleanTitle(sharedTitle) || tags["og:title"] || tags["twitter:title"] || parseHtmlTitle(html) || fallback.title
      );
      const description = cleanText(
        tags["og:description"] || tags["twitter:description"] || tags.description || ""
      );
      const image = absoluteUrl(tags["og:image"] || tags["twitter:image"] || "", url);
      const site = cleanText(tags["og:site_name"] || fallback.site);
      return cleanMetadata({
        url,
        title,
        site,
        description,
        image
      });
    } catch (error) {
      console.warn("Failed to fetch web clip metadata", error);
      return fallback;
    }
  }
  async confirmClip(clip) {
    return new Promise((resolve) => {
      const modal = new ClipConfirmModal(this.app, this, clip, resolve);
      modal.open();
    });
  }
  async createClipNote(clip) {
    const targetFolder = normalizePath(clip.targetFolder || this.settings.targetFolder || DEFAULT_SETTINGS.targetFolder);
    await this.ensureFolder(targetFolder);
    const path = await this.nextAvailablePath(targetFolder, clip.title, clip.url);
    const content = this.renderNote(Object.assign({}, clip, { targetFolder }));
    await this.app.vault.create(path, content);
    await this.recordHistory({
      url: clip.url,
      title: clip.title,
      path,
      domain: clip.metadata.domain,
      site: clip.metadata.site,
      created: nowIsoString(),
      status: "saved"
    });
    new import_obsidian2.Notice(`${this.t("noticeCreated")}: ${path}`);
    if (this.settings.openAfterClip) {
      await this.openFile(path);
    }
  }
  renderNote(clip) {
    const createdAt = nowIsoString();
    const date = window.moment(createdAt).format(this.settings.dateFormat || DEFAULT_SETTINGS.dateFormat);
    const metadata = cleanMetadata(clip.metadata || {});
    const tags = unique((clip.tags || []).map(normalizeTag).filter(Boolean));
    const body = (this.settings.noteTemplate || DEFAULT_SETTINGS.noteTemplate).replaceAll("{{date}}", date).replaceAll("{{title}}", clip.title).replaceAll("{{url}}", clip.url).replaceAll("{{note}}", clip.note || "").replaceAll("{{description}}", metadata.description || "").replaceAll("{{image}}", metadata.image || "").replaceAll("{{site}}", metadata.site || "").replaceAll("{{domain}}", metadata.domain || "").replaceAll("{{tags}}", tags.join(", "));
    const frontmatter = [
      "---",
      "type: webclip",
      `title: ${JSON.stringify(clip.title)}`,
      `source: ${JSON.stringify(clip.url)}`,
      `created: ${JSON.stringify(date)}`,
      `created_at: ${JSON.stringify(createdAt)}`,
      `domain: ${JSON.stringify(metadata.domain || domainFromUrl(clip.url))}`,
      `site: ${JSON.stringify(metadata.site || "")}`
    ];
    if (metadata.description) {
      frontmatter.push(`description: ${JSON.stringify(metadata.description)}`);
    }
    if (metadata.image) {
      frontmatter.push(`image: ${JSON.stringify(metadata.image)}`);
    }
    if (tags.length > 0) {
      frontmatter.push("tags:", ...tags.map((tag) => `  - ${JSON.stringify(tag)}`));
    }
    return [
      ...frontmatter,
      "---",
      "",
      body.trim(),
      ""
    ].join("\n");
  }
  getClipTags(targetFolder, domain = "") {
    const fixedTags = Array.isArray(this.settings.fixedTags) ? this.settings.fixedTags : DEFAULT_SETTINGS.fixedTags;
    const tags = fixedTags.map(normalizeTag).filter(Boolean);
    if (this.settings.addDomainTag) {
      const domainTag = tagFromDomain(domain);
      if (domainTag) tags.push(domainTag);
    }
    if (this.settings.addFolderTags) {
      tags.push(...tagsFromFolderPath(targetFolder));
    }
    return unique(tags);
  }
  async findExistingClip(url) {
    const normalized = normalizeCacheKey(url);
    const files = this.app.vault.getMarkdownFiles();
    for (const file of files) {
      const frontmatter = getCachedFrontmatter(this.app, file);
      if (!hasWebClipSource(frontmatter)) continue;
      if (urlsMatch(frontmatterString(frontmatter?.source), normalized)) return file;
    }
    return null;
  }
  async recordHistory(entry) {
    const normalizedUrl = normalizeUrl(entry.url || "");
    if (!normalizedUrl) return;
    const nextEntry = {
      url: normalizedUrl,
      title: cleanText(entry.title || titleFromUrl(normalizedUrl)),
      path: entry.path || "",
      domain: entry.domain || domainFromUrl(normalizedUrl),
      site: entry.site || "",
      created: entry.created || nowIsoString(),
      status: entry.status || "saved"
    };
    const history = Array.isArray(this.settings.clipHistory) ? this.settings.clipHistory : [];
    this.settings.clipHistory = [
      nextEntry,
      ...history.filter((item) => normalizeUrl(item.url) !== normalizedUrl || item.path !== nextEntry.path)
    ].slice(0, 100);
    await this.saveSettings();
  }
  async ensureFolder(path) {
    const parts = normalizePath(path).split("/").filter(Boolean);
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!await this.app.vault.adapter.exists(current)) {
        await this.app.vault.createFolder(current);
      }
    }
  }
  async nextAvailablePath(folder, title, url) {
    const maxLength = normalizeFileNameLength(this.settings.maxFileNameLength);
    const baseName = truncateFileName(sanitizeFileName(title), maxLength) || "Untitled";
    let path = `${folder}/${baseName}.md`;
    if (!await this.app.vault.adapter.exists(path)) return path;
    const hash = shortHash(url || title);
    const hashedBase = truncateFileName(baseName, Math.max(8, maxLength - hash.length - 1));
    path = `${folder}/${hashedBase}-${hash}.md`;
    let index = 2;
    while (await this.app.vault.adapter.exists(path)) {
      const suffix = `${hash}-${index}`;
      const indexedBase = truncateFileName(baseName, Math.max(8, maxLength - suffix.length - 1));
      path = `${folder}/${indexedBase}-${suffix}.md`;
      index += 1;
    }
    return path;
  }
  async openClipHistory() {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_CLIP_HISTORY)[0];
    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false) || this.app.workspace.getLeaf(true);
      await leaf.setViewState({ type: VIEW_TYPE_CLIP_HISTORY, active: true });
    }
    this.app.workspace.revealLeaf(leaf);
  }
  async openClipLibrary(location = "main") {
    if (location === "side") {
      const leaf2 = this.app.workspace.getRightLeaf(false) || this.app.workspace.getLeaf(true);
      await leaf2.setViewState({ type: VIEW_TYPE_CLIP_LIBRARY, active: true });
      this.app.workspace.revealLeaf(leaf2);
      return;
    }
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_CLIP_LIBRARY)[0];
    if (!leaf) {
      leaf = this.app.workspace.getLeaf(true);
      await leaf.setViewState({ type: VIEW_TYPE_CLIP_LIBRARY, active: true });
    }
    this.app.workspace.revealLeaf(leaf);
  }
  async collectWebClipLibraryItems() {
    const items = [];
    const files = this.app.vault.getMarkdownFiles();
    for (const file of files) {
      const frontmatter = getCachedFrontmatter(this.app, file);
      if (!isStrictWebClipFrontmatter(frontmatter)) continue;
      const source = frontmatterString(frontmatter?.source);
      const domain = frontmatterString(frontmatter?.domain) || domainFromUrl(source);
      const createdAt = inferCreatedAt(frontmatterString(frontmatter?.created_at), frontmatterString(frontmatter?.created), file);
      const created = frontmatterString(frontmatter?.created) || formatLibraryDate(createdAt);
      const title = frontmatterString(frontmatter?.title) || file.basename;
      items.push({
        file,
        title,
        source,
        domain,
        site: frontmatterString(frontmatter?.site),
        created,
        createdAt,
        description: frontmatterString(frontmatter?.description),
        folder: getParentPath(file),
        tags: normalizeFrontmatterTags(frontmatter?.tags)
      });
    }
    return items;
  }
  async openTargetFolder() {
    const targetFolder = this.getDefaultTargetFolder();
    await this.ensureFolder(targetFolder);
    new import_obsidian2.Notice(`${this.t("noticeTargetFolder")}: ${targetFolder}`);
  }
  openMigrationModal() {
    new WebClipMigrationModal(this.app, this).open();
  }
  async scanWebClipMigrations(folder) {
    const targetFolder = normalizePath(folder);
    if (!targetFolder) return [];
    const files = this.app.vault.getMarkdownFiles().filter((file) => isFileInFolder(file, targetFolder));
    const items = [];
    for (const file of files) {
      const frontmatter = getCachedFrontmatter(this.app, file) || readFrontmatter(await this.app.vault.cachedRead(file));
      if (!isWebClipFrontmatter(frontmatter)) continue;
      const changes = this.getMigrationChanges(file, frontmatter);
      if (changes.length > 0) {
        items.push({ file, changes });
      }
    }
    return items;
  }
  getMigrationChanges(file, frontmatter) {
    const changes = [];
    const source = frontmatterString(frontmatter.source);
    const domain = domainFromUrl(source);
    const currentTags = normalizeFrontmatterTags(frontmatter.tags);
    const targetFolder = getParentPath(file);
    const nextTags = this.getClipTags(targetFolder, domain);
    if (frontmatter.type !== "webclip") {
      changes.push(this.t("migrationChangeType"));
    }
    if (frontmatter.status === "unreviewed") {
      changes.push(this.t("migrationChangeStatus"));
    }
    if (!frontmatterString(frontmatter.created_at)) {
      changes.push(this.t("migrationChangeCreatedAt"));
    }
    if (!frontmatterString(frontmatter.domain) && domain) {
      changes.push(`${this.t("migrationChangeDomain")}: ${domain}`);
    }
    const missingTags = nextTags.filter((tag) => !currentTags.includes(tag));
    if (missingTags.length > 0) {
      changes.push(`${this.t("migrationChangeTags")}: ${missingTags.join(", ")}`);
    }
    return changes;
  }
  async applyWebClipMigrations(items) {
    const result = { updated: 0, failed: 0 };
    for (const item of items) {
      try {
        await this.app.fileManager.processFrontMatter(item.file, (frontmatter) => {
          const source = frontmatterString(frontmatter.source);
          const domain = domainFromUrl(source);
          const targetFolder = getParentPath(item.file);
          const currentTags = normalizeFrontmatterTags(frontmatter.tags);
          const nextTags = this.getClipTags(targetFolder, domain);
          frontmatter.type = "webclip";
          if (frontmatter.status === "unreviewed") {
            delete frontmatter.status;
          }
          if (!frontmatterString(frontmatter.created_at)) {
            frontmatter.created_at = inferCreatedAt("", frontmatterString(frontmatter.created), item.file);
          }
          if (!frontmatterString(frontmatter.domain) && domain) {
            frontmatter.domain = domain;
          }
          const mergedTags = unique([...currentTags, ...nextTags]);
          if (mergedTags.length > 0) {
            frontmatter.tags = mergedTags;
          }
        });
        result.updated += 1;
      } catch (error) {
        result.failed += 1;
        console.warn("Failed to migrate web clip", item.file.path, error);
      }
    }
    return result;
  }
  async updateWebClipOrganization(file, folder, tags) {
    const targetFolder = normalizePath(folder || getParentPath(file));
    await this.ensureFolder(targetFolder);
    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      frontmatter.tags = unique(tags.map(normalizeTag).filter(Boolean));
    });
    const currentFolder = getParentPath(file);
    if (targetFolder === currentFolder) return file;
    const nextPath = await this.nextAvailableMovePath(targetFolder, file);
    await this.app.fileManager.renameFile(file, nextPath);
    const moved = this.app.vault.getAbstractFileByPath(nextPath);
    return moved instanceof import_obsidian2.TFile ? moved : file;
  }
  async nextAvailableMovePath(folder, file) {
    const baseName = sanitizeFileName(file.basename) || "Untitled";
    const extension = file.extension ? `.${file.extension}` : "";
    let path = `${folder}/${baseName}${extension}`;
    if (!await this.app.vault.adapter.exists(path)) return path;
    let index = 2;
    while (await this.app.vault.adapter.exists(path)) {
      path = `${folder}/${baseName}-${index}${extension}`;
      index += 1;
    }
    return path;
  }
  async openFile(path) {
    if (!path) return;
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof import_obsidian2.TFile) {
      await this.app.workspace.getLeaf(true).openFile(file);
    }
  }
};
var FirstRunModal = class extends import_obsidian2.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    this.language = plugin.settings.language || "ja";
    this.createPreset = false;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("ishibashi-web-clipper-first-run");
    contentEl.createEl("h2", { text: "Ishibashi Web Clipper" });
    contentEl.createEl("p", {
      text: translate(this.language, "firstRunDesc")
    });
    new import_obsidian2.Setting(contentEl).setName(translate(this.language, "settingLanguage")).addDropdown((dropdown) => {
      dropdown.addOption("ja", "\u65E5\u672C\u8A9E").addOption("en", "English").setValue(this.language).onChange((value) => {
        this.language = value;
        this.onOpen();
      });
    });
    new import_obsidian2.Setting(contentEl).setName(translate(this.language, "firstRunPreset")).setDesc(translate(this.language, "firstRunPresetDesc")).addToggle((toggle) => {
      toggle.setValue(this.createPreset).onChange((value) => {
        this.createPreset = value;
      });
    });
    new import_obsidian2.Setting(contentEl).addButton((button) => {
      button.setCta().setButtonText(translate(this.language, "firstRunStart")).onClick(async () => {
        const preset = this.plugin.getFolderPreset(this.language);
        this.plugin.settings.language = this.language;
        this.plugin.settings.workflowMode = "inbox";
        if (this.createPreset) {
          await this.plugin.applyFolderPreset(this.language);
        } else {
          this.plugin.settings.inboxFolder = preset.inbox;
          this.plugin.settings.targetFolder = preset.root;
          this.plugin.settings.migrationTargetFolder = preset.root;
        }
        this.plugin.settings.confirmBeforeSave = false;
        this.plugin.settings.fixedTags = this.plugin.getDefaultFixedTags(this.language);
        this.plugin.settings.setupCompleted = true;
        await this.plugin.saveSettings();
        this.close();
      });
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};
var ClipConfirmModal = class extends import_obsidian2.Modal {
  constructor(app, plugin, clip, onSubmit) {
    super(app);
    this.plugin = plugin;
    this.clip = {
      url: clip.url,
      title: clip.title,
      note: clip.note || "",
      targetFolder: clip.targetFolder,
      tags: clip.tags || [],
      metadata: clip.metadata
    };
    this.onSubmit = onSubmit;
    this.submitted = false;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("ishibashi-web-clipper-confirm");
    contentEl.createEl("h2", { text: this.plugin.t("confirmTitle") });
    new import_obsidian2.Setting(contentEl).setName(this.plugin.t("fieldTitle")).addText((text) => {
      text.setValue(this.clip.title).onChange((value) => {
        this.clip.title = cleanTitle(value) || titleFromUrl(this.clip.url);
      });
    });
    new import_obsidian2.Setting(contentEl).setName(this.plugin.t("fieldFolder")).addText((text) => {
      text.setValue(this.clip.targetFolder).onChange((value) => {
        this.clip.targetFolder = normalizePath(value);
      });
    });
    new import_obsidian2.Setting(contentEl).setName(this.plugin.t("fieldTags")).setDesc(this.plugin.t("fieldTagsDesc")).addTextArea((text) => {
      text.setValue(this.clip.tags.join("\n")).onChange((value) => {
        this.clip.tags = splitTags(value);
      });
      text.inputEl.rows = 3;
    });
    new import_obsidian2.Setting(contentEl).setName(this.plugin.t("fieldMemo")).addTextArea((text) => {
      text.setValue(this.clip.note).onChange((value) => {
        this.clip.note = value;
      });
      text.inputEl.rows = 5;
    });
    const meta = contentEl.createDiv({ cls: "ishibashi-web-clipper-modal-meta" });
    meta.createEl("div", { text: this.clip.url });
    if (this.clip.metadata.description) {
      meta.createEl("div", { text: this.clip.metadata.description });
    }
    new import_obsidian2.Setting(contentEl).addButton((button) => {
      button.setButtonText(this.plugin.t("buttonCancel")).onClick(() => this.close());
    }).addButton((button) => {
      button.setCta().setButtonText(this.plugin.t("buttonSave")).onClick(() => {
        this.submitted = true;
        this.close();
        this.onSubmit(this.clip);
      });
    });
  }
  onClose() {
    this.contentEl.empty();
    if (!this.submitted) this.onSubmit(null);
  }
};
var ClipHistoryView = class extends import_obsidian2.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW_TYPE_CLIP_HISTORY;
  }
  getDisplayText() {
    return this.plugin.t("historyTitle");
  }
  getIcon() {
    return "history";
  }
  async onOpen() {
    this.render();
  }
  render() {
    const container = this.contentEl;
    container.empty();
    container.addClass("ishibashi-web-clipper-history");
    container.createEl("h2", { text: this.plugin.t("historyTitle") });
    const history = Array.isArray(this.plugin.settings.clipHistory) ? this.plugin.settings.clipHistory : [];
    if (history.length === 0) {
      container.createEl("p", { text: this.plugin.t("historyEmpty") });
      return;
    }
    for (const entry of history) {
      const row = container.createDiv({ cls: "ishibashi-web-clipper-history-item" });
      const title = row.createEl("button", {
        text: entry.title || entry.url,
        cls: "ishibashi-web-clipper-history-title"
      });
      title.addEventListener("click", async () => {
        await this.plugin.openFile(entry.path);
      });
      row.createDiv({
        text: [entry.domain, entry.created, entry.status].filter(Boolean).join(" \u30FB "),
        cls: "ishibashi-web-clipper-history-meta"
      });
      if (entry.path) {
        row.createDiv({
          text: entry.path,
          cls: "ishibashi-web-clipper-history-path"
        });
      }
    }
  }
};
var WebClipLibraryView = class extends import_obsidian2.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.items = [];
    this.resizeObserver = null;
    this.query = "";
    this.filterKind = "all";
    this.filterValue = "";
    this.groupBy = "folder";
    this.groupSortBy = "count-desc";
    this.sortBy = "date-desc";
    this.inspectorTab = "overview";
    this.selectedPath = "";
    this.selectedPaths = /* @__PURE__ */ new Set();
    this.loading = false;
    this.hasLoaded = false;
    this.refreshStatus = "idle";
    this.refreshStatusTimer = null;
  }
  getViewType() {
    return VIEW_TYPE_CLIP_LIBRARY;
  }
  getDisplayText() {
    return this.plugin.t("libraryTitle");
  }
  getIcon() {
    return "library";
  }
  async onOpen() {
    this.resizeObserver = new ResizeObserver(() => this.updateCompactClass());
    this.resizeObserver.observe(this.contentEl);
    await this.load();
  }
  async onClose() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.refreshStatusTimer !== null) {
      window.clearTimeout(this.refreshStatusTimer);
      this.refreshStatusTimer = null;
    }
  }
  async load(showRefreshFeedback = false) {
    if (this.refreshStatusTimer !== null) {
      window.clearTimeout(this.refreshStatusTimer);
      this.refreshStatusTimer = null;
    }
    if (showRefreshFeedback) {
      this.refreshStatus = "refreshing";
    }
    this.loading = true;
    this.render();
    const minimumFeedback = showRefreshFeedback ? new Promise((resolve) => window.setTimeout(resolve, 450)) : Promise.resolve();
    const items = await this.plugin.collectWebClipLibraryItems();
    await minimumFeedback;
    this.items = items;
    this.selectedPaths = new Set(Array.from(this.selectedPaths).filter((path) => this.items.some((item) => item.file.path === path)));
    if (this.selectedPath && !this.items.some((item) => item.file.path === this.selectedPath)) {
      this.selectedPath = "";
    }
    this.hasLoaded = true;
    this.loading = false;
    if (showRefreshFeedback) {
      this.refreshStatus = "complete";
      new import_obsidian2.Notice(this.plugin.t("libraryRefreshComplete"));
      this.refreshStatusTimer = window.setTimeout(() => {
        this.refreshStatus = "idle";
        this.refreshStatusTimer = null;
        this.render();
      }, 1800);
    }
    this.render();
  }
  render() {
    const container = this.contentEl;
    container.empty();
    container.addClass("ishibashi-web-clipper-library");
    this.updateCompactClass();
    const header = container.createDiv({ cls: "ishibashi-web-clipper-library-header" });
    const heading = header.createDiv();
    heading.createEl("h2", { text: this.plugin.t("libraryTitle") });
    heading.createDiv({
      text: this.plugin.t("librarySubtitle"),
      cls: "ishibashi-web-clipper-library-subtitle"
    });
    const refreshLabel = this.refreshStatus === "refreshing" ? this.plugin.t("libraryRefreshing") : this.refreshStatus === "complete" ? this.plugin.t("libraryRefreshComplete") : this.plugin.t("libraryRefresh");
    const refresh = header.createEl("button", {
      text: refreshLabel,
      cls: this.refreshStatus === "refreshing" ? "mod-cta ishibashi-web-clipper-library-refresh is-loading" : this.refreshStatus === "complete" ? "mod-cta ishibashi-web-clipper-library-refresh is-complete" : "mod-cta ishibashi-web-clipper-library-refresh"
    });
    refresh.disabled = this.loading;
    refresh.setAttr("aria-busy", this.loading ? "true" : "false");
    refresh.addEventListener("click", async () => {
      await this.load(true);
    });
    if (this.loading && !this.hasLoaded) {
      container.createDiv({
        text: this.plugin.t("libraryLoading"),
        cls: "ishibashi-web-clipper-library-empty"
      });
      return;
    }
    const filtered = this.getFilteredItems();
    const layout = container.createDiv({ cls: "ishibashi-web-clipper-library-layout" });
    this.applyLayoutColumns(layout);
    this.renderSidebar(layout, filtered);
    this.createResizeHandle(layout, "sidebar");
    this.renderMain(layout, filtered);
    this.createResizeHandle(layout, "inspector");
    this.renderInspector(layout, filtered);
  }
  applyLayoutColumns(layout) {
    if (this.contentEl.hasClass("is-compact")) {
      layout.style.gridTemplateColumns = "";
      return;
    }
    const sidebarWidth = normalizeLibraryPaneWidth(this.plugin.settings.librarySidebarWidth, 220, 420, DEFAULT_SETTINGS.librarySidebarWidth);
    const inspectorWidth = normalizeLibraryPaneWidth(this.plugin.settings.libraryInspectorWidth, 220, 420, DEFAULT_SETTINGS.libraryInspectorWidth);
    layout.style.gridTemplateColumns = `${sidebarWidth}px 10px minmax(420px, 1fr) 10px ${inspectorWidth}px`;
  }
  updateCompactClass() {
    const shouldCompact = this.contentEl.clientWidth > 0 && this.contentEl.clientWidth < 860;
    this.contentEl.toggleClass("is-compact", shouldCompact);
  }
  createResizeHandle(container, pane) {
    const handle = container.createDiv({
      cls: `ishibashi-web-clipper-library-resize is-${pane}`
    });
    handle.setAttr("role", "separator");
    handle.setAttr("aria-orientation", "vertical");
    handle.setAttr("tabindex", "0");
    handle.setAttr("aria-label", pane === "sidebar" ? this.plugin.t("libraryResizeSidebar") : this.plugin.t("libraryResizeInspector"));
    handle.addEventListener("pointerdown", (event) => {
      this.startResize(event, pane, container);
    });
    handle.addEventListener("keydown", async (event) => {
      const step = event.shiftKey ? 40 : 16;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      if (pane === "sidebar") {
        this.plugin.settings.librarySidebarWidth = normalizeLibraryPaneWidth(
          this.plugin.settings.librarySidebarWidth + direction * step,
          220,
          420,
          DEFAULT_SETTINGS.librarySidebarWidth
        );
      } else {
        this.plugin.settings.libraryInspectorWidth = normalizeLibraryPaneWidth(
          this.plugin.settings.libraryInspectorWidth - direction * step,
          220,
          420,
          DEFAULT_SETTINGS.libraryInspectorWidth
        );
      }
      this.applyLayoutColumns(container);
      await this.plugin.saveSettings();
    });
  }
  startResize(event, pane, layout) {
    event.preventDefault();
    const startX = event.clientX;
    const startSidebar = this.plugin.settings.librarySidebarWidth;
    const startInspector = this.plugin.settings.libraryInspectorWidth;
    const target = event.currentTarget;
    target.addClass("is-dragging");
    target.setPointerCapture(event.pointerId);
    const onMove = (moveEvent) => {
      const delta = moveEvent.clientX - startX;
      if (pane === "sidebar") {
        this.plugin.settings.librarySidebarWidth = normalizeLibraryPaneWidth(
          startSidebar + delta,
          220,
          420,
          DEFAULT_SETTINGS.librarySidebarWidth
        );
      } else {
        this.plugin.settings.libraryInspectorWidth = normalizeLibraryPaneWidth(
          startInspector - delta,
          220,
          420,
          DEFAULT_SETTINGS.libraryInspectorWidth
        );
      }
      this.applyLayoutColumns(layout);
    };
    const onUp = async (upEvent) => {
      target.removeClass("is-dragging");
      target.releasePointerCapture(upEvent.pointerId);
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onUp);
      await this.plugin.saveSettings();
    };
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onUp);
  }
  renderSidebar(container, filtered) {
    const sidebar = container.createDiv({ cls: "ishibashi-web-clipper-library-sidebar" });
    const sidebarHeader = sidebar.createDiv({ cls: "ishibashi-web-clipper-library-sidebar-head" });
    sidebarHeader.createDiv({
      text: this.plugin.t("libraryBrowseBy"),
      cls: "ishibashi-web-clipper-library-label"
    });
    const groupSort = sidebarHeader.createEl("select", {
      cls: "ishibashi-web-clipper-library-group-sort"
    });
    this.addSortOption(groupSort, "count-desc", this.plugin.t("libraryGroupSortCountDesc"));
    this.addSortOption(groupSort, "count-asc", this.plugin.t("libraryGroupSortCountAsc"));
    this.addSortOption(groupSort, "name-asc", this.plugin.t("libraryGroupSortNameAsc"));
    this.addSortOption(groupSort, "name-desc", this.plugin.t("libraryGroupSortNameDesc"));
    groupSort.value = this.groupSortBy;
    groupSort.addEventListener("change", () => {
      this.groupSortBy = groupSort.value;
      this.render();
    });
    this.addSegment(sidebar, [
      { label: this.plugin.t("libraryByFolder"), value: "folder" },
      { label: this.plugin.t("libraryByDomain"), value: "domain" },
      { label: this.plugin.t("libraryByTag"), value: "tag" }
    ], this.groupBy, (value) => {
      this.groupBy = value;
      this.filterKind = "all";
      this.filterValue = "";
      this.render();
    });
    this.addFilterButton(sidebar, this.plugin.t("libraryAllClips"), this.items.length, "all", "");
    const groups = this.getGroups(this.groupBy);
    for (const group of groups.slice(0, 80)) {
      this.addFilterButton(sidebar, group.label, group.count, this.groupBy, group.value);
    }
    if (groups.length > 80) {
      sidebar.createDiv({
        text: this.plugin.t("libraryMoreGroups").replace("{{count}}", String(groups.length - 80)),
        cls: "ishibashi-web-clipper-library-muted"
      });
    }
    sidebar.createDiv({
      text: this.plugin.t("libraryShowing").replace("{{count}}", String(filtered.length)),
      cls: "ishibashi-web-clipper-library-count"
    });
  }
  renderMain(container, filtered) {
    const main = container.createDiv({ cls: "ishibashi-web-clipper-library-main" });
    const controls = main.createDiv({ cls: "ishibashi-web-clipper-library-controls" });
    const search = controls.createEl("input", {
      type: "search",
      placeholder: this.plugin.t("librarySearchPlaceholder"),
      cls: "ishibashi-web-clipper-library-search"
    });
    search.value = this.query;
    search.addEventListener("input", () => {
      this.query = search.value;
      this.render();
    });
    const sort = controls.createEl("select", { cls: "ishibashi-web-clipper-library-sort" });
    this.addSortOption(sort, "date-desc", this.plugin.t("librarySortDateDesc"));
    this.addSortOption(sort, "date-asc", this.plugin.t("librarySortDateAsc"));
    this.addSortOption(sort, "title-asc", this.plugin.t("librarySortTitleAsc"));
    this.addSortOption(sort, "title-desc", this.plugin.t("librarySortTitleDesc"));
    this.addSortOption(sort, "domain-asc", this.plugin.t("librarySortDomainAsc"));
    this.addSortOption(sort, "domain-desc", this.plugin.t("librarySortDomainDesc"));
    sort.value = this.sortBy;
    sort.addEventListener("change", () => {
      this.sortBy = sort.value;
      this.render();
    });
    const columns = controls.createEl("select", { cls: "ishibashi-web-clipper-library-columns" });
    this.addSortOption(columns, "1", this.plugin.t("libraryColumns1"));
    this.addSortOption(columns, "2", this.plugin.t("libraryColumns2"));
    this.addSortOption(columns, "3", this.plugin.t("libraryColumns3"));
    columns.value = String(normalizeGridColumns(this.plugin.settings.libraryGridColumns));
    columns.addEventListener("change", async () => {
      this.plugin.settings.libraryGridColumns = normalizeGridColumns(columns.value);
      await this.plugin.saveSettings();
      this.render();
    });
    const gridColumns = normalizeGridColumns(this.plugin.settings.libraryGridColumns);
    const list = main.createDiv({
      cls: `ishibashi-web-clipper-library-list is-columns-${gridColumns}`
    });
    list.style.setProperty("--iwc-library-columns", String(gridColumns));
    if (this.selectedPaths.size > 0) {
      this.renderBulkBar(list);
    }
    if (filtered.length === 0) {
      list.createDiv({
        text: this.plugin.t("libraryEmpty"),
        cls: "ishibashi-web-clipper-library-empty"
      });
      return;
    }
    for (const item of filtered) {
      const selected = this.selectedPath === item.file.path;
      const checked = this.selectedPaths.has(item.file.path);
      const card = list.createDiv({
        cls: selected ? "ishibashi-web-clipper-library-card is-selected" : "ishibashi-web-clipper-library-card"
      });
      card.draggable = true;
      card.addEventListener("dragstart", (event) => {
        event.dataTransfer?.setData("text/plain", item.file.path);
        event.dataTransfer?.setData("application/x-ishibashi-web-clip", item.file.path);
        event.dataTransfer.effectAllowed = "move";
      });
      card.addEventListener("click", (event) => {
        const target = event.target;
        if (target.closest("button") || target.closest("input")) return;
        this.selectedPath = item.file.path;
        this.render();
      });
      const body = card.createDiv({ cls: "ishibashi-web-clipper-library-card-body" });
      const top = body.createDiv({ cls: "ishibashi-web-clipper-library-card-top" });
      const check = top.createEl("input", {
        type: "checkbox",
        cls: "ishibashi-web-clipper-library-select"
      });
      check.checked = checked;
      check.setAttr("aria-label", this.plugin.t("librarySelectClip"));
      check.addEventListener("change", () => {
        if (check.checked) {
          this.selectedPaths.add(item.file.path);
          this.selectedPath = item.file.path;
        } else {
          this.selectedPaths.delete(item.file.path);
        }
        this.render();
      });
      top.createDiv({
        text: formatLibraryDate(item.createdAt || item.created),
        cls: this.isSortKey("date") ? "ishibashi-web-clipper-library-date is-sort-key" : "ishibashi-web-clipper-library-date"
      });
      top.createDiv({
        text: item.domain || item.site || this.plugin.t("libraryNoDomain"),
        cls: this.isSortKey("domain") ? "ishibashi-web-clipper-library-domain is-sort-key" : "ishibashi-web-clipper-library-domain"
      });
      const title = body.createDiv({
        text: item.title || item.file.basename,
        cls: this.isSortKey("title") ? "ishibashi-web-clipper-library-title is-sort-key" : "ishibashi-web-clipper-library-title"
      });
      title.setAttr("role", "button");
      title.setAttr("tabindex", "0");
      title.addEventListener("click", async () => {
        await this.plugin.openFile(item.file.path);
      });
      title.addEventListener("keydown", async (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        await this.plugin.openFile(item.file.path);
      });
      if (item.description) {
        body.createDiv({
          text: item.description,
          cls: "ishibashi-web-clipper-library-desc"
        });
      }
      const meta = body.createDiv({ cls: "ishibashi-web-clipper-library-meta" });
      const folder = meta.createEl("button", {
        text: item.folder || "/",
        cls: "ishibashi-web-clipper-library-folder"
      });
      folder.addEventListener("click", () => {
        this.selectedPath = item.file.path;
        this.inspectorTab = "edit";
        this.render();
      });
      if (item.tags.length > 0) {
        const tags = body.createDiv({ cls: "ishibashi-web-clipper-library-tags" });
        for (const tag of item.tags.slice(0, 8)) {
          const wrap = tags.createSpan({ cls: "ishibashi-web-clipper-library-tag-wrap" });
          const button = wrap.createEl("button", {
            text: `#${tag}`,
            cls: "ishibashi-web-clipper-library-tag"
          });
          button.addEventListener("click", () => {
            this.filterKind = "tag";
            this.filterValue = tag;
            this.groupBy = "tag";
            this.render();
          });
          const remove = wrap.createEl("button", {
            text: "x",
            cls: "ishibashi-web-clipper-library-tag-remove"
          });
          remove.setAttr("aria-label", this.plugin.t("libraryRemoveTag").replace("{{tag}}", tag));
          remove.addEventListener("click", async () => {
            await this.removeTag(item, tag);
          });
        }
      }
      const addTag = body.createEl("button", {
        text: this.plugin.t("libraryAddTag"),
        cls: "ishibashi-web-clipper-library-add-tag"
      });
      addTag.addEventListener("click", () => {
        new WebClipTagPickerModal(
          this.app,
          this.plugin,
          this.items,
          this.plugin.t("libraryAddTag"),
          [],
          false,
          async (tags) => {
            await this.addTags(item, tags);
          }
        ).open();
      });
      const footer = card.createDiv({ cls: "ishibashi-web-clipper-library-card-footer" });
      if (item.source) {
        const source = footer.createEl("button", {
          text: this.plugin.t("libraryOpenSource"),
          cls: "ishibashi-web-clipper-library-action"
        });
        source.addEventListener("click", () => {
          const sourceUrl = normalizeUrl(item.source);
          if (sourceUrl) window.open(sourceUrl, "_blank", "noopener");
        });
      }
      const edit = footer.createEl("button", {
        text: this.plugin.t("libraryEditClip"),
        cls: "ishibashi-web-clipper-library-action"
      });
      edit.addEventListener("click", () => {
        this.selectedPath = item.file.path;
        this.inspectorTab = "edit";
        this.render();
      });
    }
  }
  renderInspector(container, filtered) {
    const inspector = container.createDiv({ cls: "ishibashi-web-clipper-library-inspector" });
    this.addSegment(inspector, [
      { label: this.plugin.t("libraryOverview"), value: "overview" },
      { label: this.plugin.t("libraryEditTab"), value: "edit" }
    ], this.inspectorTab, (value) => {
      this.inspectorTab = value;
      this.render();
    });
    if (this.inspectorTab === "edit") {
      this.renderInspectorEdit(inspector);
      return;
    }
    inspector.createDiv({
      text: this.plugin.t("libraryOverview"),
      cls: "ishibashi-web-clipper-library-label"
    });
    const stats = inspector.createDiv({ cls: "ishibashi-web-clipper-library-stats" });
    this.addStat(stats, this.plugin.t("libraryTotal"), String(this.items.length));
    this.addStat(stats, this.plugin.t("libraryFiltered"), String(filtered.length));
    this.addStat(stats, this.plugin.t("libraryDomains"), String(this.getGroups("domain").length));
    this.addStat(stats, this.plugin.t("libraryTags"), String(this.getGroups("tag").length));
    inspector.createDiv({
      text: this.plugin.t("libraryFrequentTags"),
      cls: "ishibashi-web-clipper-library-label"
    });
    const tags = inspector.createDiv({ cls: "ishibashi-web-clipper-library-tag-cloud" });
    for (const group of this.getGroups("tag").slice(0, 24)) {
      const button = tags.createEl("button", {
        text: `#${group.label}`,
        cls: "ishibashi-web-clipper-library-tag"
      });
      button.addEventListener("click", () => {
        this.filterKind = "tag";
        this.filterValue = group.value;
        this.groupBy = "tag";
        this.render();
      });
    }
  }
  renderInspectorEdit(container) {
    const item = this.getSelectedItem();
    container.createDiv({
      text: this.plugin.t("libraryEditTab"),
      cls: "ishibashi-web-clipper-library-label"
    });
    if (!item) {
      container.createDiv({
        text: this.plugin.t("libraryEditNoSelection"),
        cls: "ishibashi-web-clipper-library-empty"
      });
      return;
    }
    container.createDiv({
      text: item.title || item.file.basename,
      cls: "ishibashi-web-clipper-library-edit-title"
    });
    let selectedFolder = item.folder;
    let selectedTags = [...item.tags];
    const folderButton = container.createEl("button", {
      text: selectedFolder || "/",
      cls: "ishibashi-web-clipper-library-edit-picker"
    });
    folderButton.setAttr("aria-label", this.plugin.t("fieldFolder"));
    const tagPreview = container.createDiv({ cls: "ishibashi-web-clipper-library-edit-preview" });
    const renderTagPreview = () => {
      tagPreview.empty();
      if (selectedTags.length === 0) {
        tagPreview.createSpan({
          text: this.plugin.t("summaryNoTags"),
          cls: "ishibashi-web-clipper-library-muted"
        });
        return;
      }
      for (const tag of selectedTags) {
        tagPreview.createSpan({
          text: `#${tag}`,
          cls: "ishibashi-web-clipper-library-tag"
        });
      }
    };
    renderTagPreview();
    folderButton.addEventListener("click", () => {
      new WebClipFolderPickerModal(
        this.app,
        this.plugin,
        this.items,
        this.plugin.t("libraryBulkMoveFolder"),
        selectedFolder,
        async (folder) => {
          selectedFolder = folder;
          folderButton.setText(folder || "/");
        }
      ).open();
    });
    const tagButton = container.createEl("button", {
      text: this.plugin.t("libraryChooseTags"),
      cls: "ishibashi-web-clipper-library-edit-picker"
    });
    tagButton.addEventListener("click", () => {
      new WebClipTagPickerModal(
        this.app,
        this.plugin,
        this.items,
        this.plugin.t("libraryChooseTags"),
        selectedTags,
        true,
        async (tags) => {
          selectedTags = tags;
          renderTagPreview();
        }
      ).open();
    });
    const actions = container.createDiv({ cls: "ishibashi-web-clipper-library-edit-actions" });
    const apply = actions.createEl("button", {
      text: this.plugin.t("libraryEditApply"),
      cls: "mod-cta"
    });
    apply.addEventListener("click", async () => {
      await this.applyOrganization(item, selectedFolder, selectedTags);
    });
    const open = actions.createEl("button", {
      text: this.plugin.t("libraryOpenNote")
    });
    open.addEventListener("click", async () => {
      await this.plugin.openFile(item.file.path);
    });
  }
  renderBulkBar(container) {
    const bar = container.createDiv({ cls: "ishibashi-web-clipper-library-bulk" });
    bar.createDiv({
      text: this.plugin.t("libraryBulkSelected").replace("{{count}}", String(this.selectedPaths.size)),
      cls: "ishibashi-web-clipper-library-bulk-count"
    });
    const addTag = bar.createEl("button", { text: this.plugin.t("libraryBulkAddTag") });
    addTag.addEventListener("click", () => {
      new WebClipTagPickerModal(
        this.app,
        this.plugin,
        this.items,
        this.plugin.t("libraryBulkAddTag"),
        [],
        false,
        async (tags) => {
          await this.addTagsToSelected(tags);
        }
      ).open();
    });
    const removeTag = bar.createEl("button", { text: this.plugin.t("libraryBulkRemoveTag") });
    removeTag.addEventListener("click", () => {
      new WebClipTagPickerModal(
        this.app,
        this.plugin,
        this.items,
        this.plugin.t("libraryBulkRemoveTag"),
        [],
        false,
        async (tags) => {
          await this.removeTagsFromSelected(tags);
        }
      ).open();
    });
    const move = bar.createEl("button", { text: this.plugin.t("libraryBulkMoveFolder") });
    move.addEventListener("click", () => {
      new WebClipFolderPickerModal(
        this.app,
        this.plugin,
        this.items,
        this.plugin.t("libraryBulkMoveFolder"),
        this.getSelectedItem()?.folder || this.plugin.getDefaultTargetFolder(),
        async (folder) => {
          await this.moveSelected(folder);
        }
      ).open();
    });
    const clear = bar.createEl("button", { text: this.plugin.t("libraryBulkClear") });
    clear.addEventListener("click", () => {
      this.selectedPaths.clear();
      this.render();
    });
  }
  addSegment(container, options, active, onChange) {
    const segment = container.createDiv({ cls: "ishibashi-web-clipper-library-segment" });
    segment.style.gridTemplateColumns = `repeat(${options.length}, minmax(0, 1fr))`;
    for (const option of options) {
      const button = segment.createEl("button", {
        text: option.label,
        cls: option.value === active ? "is-active" : ""
      });
      button.addEventListener("click", () => onChange(option.value));
    }
  }
  addFilterButton(container, label, count, kind, value) {
    const active = this.filterKind === kind && this.filterValue === value;
    const button = container.createEl("button", {
      cls: active ? "ishibashi-web-clipper-library-filter is-active" : "ishibashi-web-clipper-library-filter"
    });
    this.configureDropTarget(button, kind, value);
    button.createSpan({ text: label || this.plugin.t("libraryUnknown") });
    button.createSpan({ text: String(count) });
    button.addEventListener("click", () => {
      this.filterKind = kind;
      this.filterValue = value;
      this.render();
    });
  }
  addSortOption(select, value, label) {
    const option = select.createEl("option", { text: label });
    option.value = value;
  }
  addStat(container, label, value) {
    const stat = container.createDiv({ cls: "ishibashi-web-clipper-library-stat" });
    stat.createDiv({ text: value, cls: "ishibashi-web-clipper-library-stat-value" });
    stat.createDiv({ text: label, cls: "ishibashi-web-clipper-library-stat-label" });
  }
  configureDropTarget(element, kind, value) {
    if (kind !== "folder" && kind !== "tag") return;
    element.addEventListener("dragover", (event) => {
      event.preventDefault();
      element.addClass("is-drop-target");
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    });
    element.addEventListener("dragleave", () => {
      element.removeClass("is-drop-target");
    });
    element.addEventListener("drop", async (event) => {
      event.preventDefault();
      element.removeClass("is-drop-target");
      const path = event.dataTransfer?.getData("application/x-ishibashi-web-clip") || event.dataTransfer?.getData("text/plain") || "";
      const item = this.items.find((entry) => entry.file.path === path);
      if (!item) return;
      if (kind === "folder") {
        await this.applyOrganization(item, value, item.tags);
      } else {
        await this.addTags(item, [value]);
      }
    });
  }
  isSortKey(key) {
    if (key === "date") return this.sortBy === "date-desc" || this.sortBy === "date-asc";
    if (key === "title") return this.sortBy === "title-asc" || this.sortBy === "title-desc";
    return this.sortBy === "domain-asc" || this.sortBy === "domain-desc";
  }
  getFilteredItems() {
    const query = cleanText(this.query).toLowerCase();
    return this.items.filter((item) => {
      if (this.filterKind === "folder") return item.folder === this.filterValue;
      if (this.filterKind === "domain") return item.domain === this.filterValue;
      if (this.filterKind === "tag") return item.tags.includes(this.filterValue);
      return true;
    }).filter((item) => {
      if (!query) return true;
      return [
        item.title,
        item.source,
        item.domain,
        item.site,
        item.description,
        item.folder,
        item.tags.join(" ")
      ].join(" ").toLowerCase().includes(query);
    }).sort((a, b) => {
      if (this.sortBy === "date-asc") return libraryTime(a) - libraryTime(b);
      if (this.sortBy === "title-asc") return a.title.localeCompare(b.title) || libraryTime(b) - libraryTime(a);
      if (this.sortBy === "title-desc") return b.title.localeCompare(a.title) || libraryTime(b) - libraryTime(a);
      if (this.sortBy === "domain-asc") return a.domain.localeCompare(b.domain) || libraryTime(b) - libraryTime(a);
      if (this.sortBy === "domain-desc") return b.domain.localeCompare(a.domain) || libraryTime(b) - libraryTime(a);
      return libraryTime(b) - libraryTime(a);
    });
  }
  getGroups(kind) {
    const counts = /* @__PURE__ */ new Map();
    for (const item of this.items) {
      const values = kind === "tag" ? item.tags : [kind === "folder" ? item.folder : item.domain];
      for (const raw of values) {
        const value = raw || "";
        counts.set(value, (counts.get(value) || 0) + 1);
      }
    }
    return Array.from(counts.entries()).map(([value, count]) => ({
      value,
      label: value || this.plugin.t("libraryUnknown"),
      count
    })).sort((a, b) => {
      if (this.groupSortBy === "count-asc") return a.count - b.count || a.label.localeCompare(b.label);
      if (this.groupSortBy === "name-asc") return a.label.localeCompare(b.label) || b.count - a.count;
      if (this.groupSortBy === "name-desc") return b.label.localeCompare(a.label) || b.count - a.count;
      return b.count - a.count || a.label.localeCompare(b.label);
    });
  }
  getSelectedItem() {
    if (this.selectedPath) {
      const direct = this.items.find((item) => item.file.path === this.selectedPath);
      if (direct) return direct;
    }
    const firstPath = Array.from(this.selectedPaths)[0];
    return firstPath ? this.items.find((item) => item.file.path === firstPath) || null : null;
  }
  getSelectedItems() {
    return this.items.filter((item) => this.selectedPaths.has(item.file.path));
  }
  async applyOrganization(item, folder, tags) {
    const nextFolder = normalizePath(folder);
    if (!nextFolder) {
      new import_obsidian2.Notice(this.plugin.t("libraryEditFolderRequired"));
      return;
    }
    const moved = await this.plugin.updateWebClipOrganization(item.file, nextFolder, tags);
    this.selectedPath = moved.path;
    if (this.selectedPaths.delete(item.file.path)) {
      this.selectedPaths.add(moved.path);
    }
    new import_obsidian2.Notice(this.plugin.t("libraryEditComplete"));
    await this.load();
  }
  async addTags(item, tags) {
    const nextTags = unique([...item.tags, ...tags.map(normalizeTag).filter(Boolean)]);
    await this.applyOrganization(item, item.folder, nextTags);
  }
  async removeTag(item, tag) {
    const nextTags = item.tags.filter((value) => value !== tag);
    await this.applyOrganization(item, item.folder, nextTags);
  }
  async addTagsToSelected(tags) {
    const cleanTags = tags.map(normalizeTag).filter(Boolean);
    if (cleanTags.length === 0) return;
    for (const item of this.getSelectedItems()) {
      await this.plugin.updateWebClipOrganization(item.file, item.folder, unique([...item.tags, ...cleanTags]));
    }
    new import_obsidian2.Notice(this.plugin.t("libraryEditComplete"));
    await this.load();
  }
  async removeTagsFromSelected(tags) {
    const cleanTags = tags.map(normalizeTag).filter(Boolean);
    if (cleanTags.length === 0) return;
    for (const item of this.getSelectedItems()) {
      await this.plugin.updateWebClipOrganization(
        item.file,
        item.folder,
        item.tags.filter((tag) => !cleanTags.includes(tag))
      );
    }
    new import_obsidian2.Notice(this.plugin.t("libraryEditComplete"));
    await this.load();
  }
  async moveSelected(folder) {
    const nextFolder = normalizePath(folder);
    if (!nextFolder) {
      new import_obsidian2.Notice(this.plugin.t("libraryEditFolderRequired"));
      return;
    }
    const nextSelected = /* @__PURE__ */ new Set();
    for (const item of this.getSelectedItems()) {
      const moved = await this.plugin.updateWebClipOrganization(item.file, nextFolder, item.tags);
      nextSelected.add(moved.path);
    }
    this.selectedPaths = nextSelected;
    this.selectedPath = Array.from(nextSelected)[0] || "";
    new import_obsidian2.Notice(this.plugin.t("libraryEditComplete"));
    await this.load();
  }
};
var WebClipTagPickerModal = class extends import_obsidian2.Modal {
  constructor(app, plugin, items, title, selectedTags, replaceMode, onSubmit) {
    super(app);
    this.plugin = plugin;
    this.items = items;
    this.title = title;
    this.selected = new Set(selectedTags.map(normalizeTag).filter(Boolean));
    this.replaceMode = replaceMode;
    this.query = "";
    this.onSubmit = onSubmit;
    this.submitting = false;
  }
  onOpen() {
    this.render();
  }
  render() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("ishibashi-web-clipper-picker");
    contentEl.createEl("h2", { text: this.title });
    const search = contentEl.createEl("input", {
      type: "search",
      placeholder: this.plugin.t("libraryTagSearchPlaceholder"),
      cls: "ishibashi-web-clipper-library-edit-input"
    });
    search.value = this.query;
    search.addEventListener("input", () => {
      this.query = search.value;
      this.render();
    });
    const list = contentEl.createDiv({ cls: "ishibashi-web-clipper-picker-list" });
    for (const tag of this.getTags()) {
      const row = list.createEl("label", { cls: "ishibashi-web-clipper-picker-row" });
      const checkbox = row.createEl("input", { type: "checkbox" });
      checkbox.checked = this.selected.has(tag);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          this.selected.add(tag);
        } else {
          this.selected.delete(tag);
        }
      });
      row.createSpan({ text: `#${tag}` });
    }
    new import_obsidian2.Setting(contentEl).addButton((button) => {
      button.setButtonText(this.plugin.t("buttonCancel")).setDisabled(this.submitting).onClick(() => this.close());
    }).addButton((button) => {
      button.setCta().setButtonText(this.plugin.t("libraryEditApply")).setDisabled(this.submitting).onClick(async () => {
        await this.apply();
      });
    });
  }
  getTags() {
    const query = normalizeTag(this.query).toLowerCase();
    return unique(this.items.flatMap((item) => item.tags)).filter((tag) => !query || tag.toLowerCase().includes(query)).sort((a, b) => a.localeCompare(b));
  }
  async apply() {
    if (this.submitting) return;
    this.submitting = true;
    try {
      await this.onSubmit(Array.from(this.selected));
      this.close();
    } catch (error) {
      console.error(error);
      new import_obsidian2.Notice(this.plugin.t("libraryEditFailed"));
      this.submitting = false;
      this.render();
    }
  }
  onClose() {
    this.contentEl.empty();
  }
};
var WebClipFolderPickerModal = class extends import_obsidian2.Modal {
  constructor(app, plugin, items, title, selectedFolder, onSubmit) {
    super(app);
    this.plugin = plugin;
    this.items = items;
    this.title = title;
    this.selectedFolder = normalizePath(selectedFolder);
    this.query = "";
    this.onSubmit = onSubmit;
    this.submitting = false;
  }
  onOpen() {
    this.render();
  }
  render() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("ishibashi-web-clipper-picker");
    contentEl.createEl("h2", { text: this.title });
    const search = contentEl.createEl("input", {
      type: "search",
      placeholder: this.plugin.t("libraryFolderSearchPlaceholder"),
      cls: "ishibashi-web-clipper-library-edit-input"
    });
    search.value = this.query;
    search.addEventListener("input", () => {
      this.query = search.value;
      this.render();
    });
    const list = contentEl.createDiv({ cls: "ishibashi-web-clipper-picker-list" });
    for (const folder of this.getFolders()) {
      const row = list.createEl("button", {
        text: folder || "/",
        cls: folder === this.selectedFolder ? "ishibashi-web-clipper-picker-row is-active" : "ishibashi-web-clipper-picker-row"
      });
      row.addEventListener("click", async () => {
        this.selectedFolder = folder;
        await this.apply();
      });
    }
    new import_obsidian2.Setting(contentEl).addButton((button) => {
      button.setButtonText(this.plugin.t("buttonCancel")).setDisabled(this.submitting).onClick(() => this.close());
    });
  }
  getFolders() {
    const query = normalizePath(this.query).toLowerCase();
    const configuredFolders = [
      this.plugin.getDefaultTargetFolder(),
      ...this.items.map((item) => item.folder).filter(Boolean)
    ];
    const roots = unique(configuredFolders.map((folder) => folder.split("/")[0]).filter(Boolean));
    const vaultFolders = this.plugin.app.vault.getAllLoadedFiles().filter((file) => file instanceof import_obsidian2.TFolder).map((folder) => folder.path).filter((folder) => roots.some((root) => folder === root || folder.startsWith(`${root}/`)));
    const folders = unique([...configuredFolders, ...vaultFolders].filter(Boolean)).sort((a, b) => a.localeCompare(b));
    return folders.filter((folder) => roots.length === 0 || roots.some((root) => folder === root || folder.startsWith(`${root}/`))).filter((folder) => !query || folder.toLowerCase().includes(query));
  }
  async apply() {
    if (this.submitting) return;
    this.submitting = true;
    try {
      await this.onSubmit(this.selectedFolder);
      this.close();
    } catch (error) {
      console.error(error);
      new import_obsidian2.Notice(this.plugin.t("libraryEditFailed"));
      this.submitting = false;
      this.render();
    }
  }
  onClose() {
    this.contentEl.empty();
  }
};
var WebClipMigrationModal = class extends import_obsidian2.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    this.folder = plugin.getDefaultMigrationFolder();
    this.items = [];
    this.scanned = false;
    this.applying = false;
  }
  onOpen() {
    this.render();
  }
  render() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("ishibashi-web-clipper-migration");
    contentEl.createEl("h2", { text: this.plugin.t("migrationTitle") });
    contentEl.createEl("p", {
      text: this.plugin.t("migrationDesc"),
      cls: "ishibashi-web-clipper-modal-help"
    });
    new import_obsidian2.Setting(contentEl).setName(this.plugin.t("settingMigrationFolder")).setDesc(this.plugin.t("settingMigrationFolderDesc")).addText((text) => {
      text.setPlaceholder(this.plugin.getDefaultTargetFolder()).setValue(this.folder).onChange((value) => {
        this.folder = normalizePath(value);
        this.scanned = false;
        this.items = [];
      });
    });
    const actionRow = new import_obsidian2.Setting(contentEl);
    actionRow.addButton((button) => {
      button.setButtonText(this.plugin.t("migrationPreview")).onClick(async () => {
        await this.preview();
      });
    }).addButton((button) => {
      button.setCta().setButtonText(this.plugin.t("migrationApply")).setDisabled(!this.scanned || this.items.length === 0 || this.applying).onClick(async () => {
        await this.apply();
      });
    });
    if (!this.scanned) return;
    contentEl.createEl("h3", {
      text: this.plugin.t("migrationPreviewHeading")
    });
    if (this.items.length === 0) {
      contentEl.createEl("p", {
        text: this.plugin.t("migrationNoChanges"),
        cls: "ishibashi-web-clipper-modal-help"
      });
      return;
    }
    contentEl.createEl("p", {
      text: this.plugin.t("migrationResult").replace("{{count}}", String(this.items.length)),
      cls: "ishibashi-web-clipper-modal-help"
    });
    const list = contentEl.createDiv({ cls: "ishibashi-web-clipper-migration-list" });
    for (const item of this.items.slice(0, 30)) {
      const row = list.createDiv({ cls: "ishibashi-web-clipper-migration-item" });
      row.createDiv({
        text: item.file.path,
        cls: "ishibashi-web-clipper-migration-path"
      });
      row.createDiv({
        text: item.changes.join(" / "),
        cls: "ishibashi-web-clipper-migration-changes"
      });
    }
    if (this.items.length > 30) {
      list.createDiv({
        text: this.plugin.t("migrationMore").replace("{{count}}", String(this.items.length - 30)),
        cls: "ishibashi-web-clipper-migration-changes"
      });
    }
  }
  async preview() {
    this.folder = normalizePath(this.folder);
    if (!this.folder) {
      new import_obsidian2.Notice(this.plugin.t("migrationFolderRequired"));
      return;
    }
    this.plugin.settings.migrationTargetFolder = this.folder;
    await this.plugin.saveSettings();
    this.items = await this.plugin.scanWebClipMigrations(this.folder);
    this.scanned = true;
    this.render();
  }
  async apply() {
    if (!this.scanned || this.items.length === 0 || this.applying) return;
    this.applying = true;
    this.render();
    const result = await this.plugin.applyWebClipMigrations(this.items);
    const noticeKey = result.failed > 0 ? "migrationCompleteWithFailures" : "migrationComplete";
    new import_obsidian2.Notice(this.plugin.t(noticeKey).replace("{{count}}", String(result.updated)).replace("{{failed}}", String(result.failed)));
    this.items = [];
    this.scanned = true;
    this.applying = false;
    this.render();
  }
  onClose() {
    this.contentEl.empty();
  }
};
var IshibashiWebClipperSettingTab = class extends import_obsidian2.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.bookmarkletCodeEl = null;
    this.bookmarkletPlainEl = null;
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("ishibashi-web-clipper-settings");
    containerEl.createEl("h2", { text: "Ishibashi Web Clipper" });
    containerEl.createEl("p", {
      text: this.plugin.t("settingsIntro"),
      cls: "ishibashi-web-clipper-settings-intro"
    });
    this.createSummary(containerEl);
    this.createCaptureGuide(containerEl);
    const startSection = this.createSection(
      containerEl,
      this.plugin.t("sectionStart"),
      this.plugin.t("sectionStartDesc")
    );
    new import_obsidian2.Setting(startSection).setName(this.plugin.t("settingLanguage")).setDesc(this.plugin.t("settingLanguageDesc")).addDropdown((dropdown) => {
      dropdown.addOption("ja", "\u65E5\u672C\u8A9E").addOption("en", "English").setValue(this.plugin.settings.language).onChange(async (value) => {
        const shouldUpdateFixedTags = this.plugin.isLanguageDefaultFixedTags(this.plugin.settings.fixedTags || []);
        this.plugin.settings.language = value;
        if (shouldUpdateFixedTags) {
          this.plugin.settings.fixedTags = this.plugin.getDefaultFixedTags(value);
        }
        await this.plugin.saveSettings();
        this.plugin.updateRibbonLabel();
        this.display();
      });
    });
    const destinationSection = this.createSection(
      containerEl,
      this.plugin.t("sectionDestination"),
      this.plugin.t("sectionDestinationDesc")
    );
    new import_obsidian2.Setting(destinationSection).setName(this.plugin.t("settingInboxFolder")).setDesc(this.plugin.t("settingInboxFolderDesc")).addText((text) => {
      text.setPlaceholder(DEFAULT_SETTINGS.inboxFolder).setValue(this.plugin.settings.inboxFolder || DEFAULT_SETTINGS.inboxFolder).onChange(async (value) => {
        const folder = normalizePath(value) || DEFAULT_SETTINGS.inboxFolder;
        this.plugin.settings.inboxFolder = folder;
        this.plugin.settings.migrationTargetFolder = this.plugin.settings.migrationTargetFolder || folder;
        await this.plugin.saveSettings();
        this.refreshSummary();
      });
    });
    new import_obsidian2.Setting(destinationSection).setName(this.plugin.t("settingBrowserVaultName")).setDesc(this.plugin.t("settingBrowserVaultNameDesc")).addText((text) => {
      text.setPlaceholder(this.plugin.getVaultName()).setValue(this.plugin.settings.browserVaultName || this.plugin.getVaultName()).onChange(async (value) => {
        this.plugin.settings.browserVaultName = value.trim();
        await this.plugin.saveSettings();
        this.refreshBookmarkletCode();
      });
    });
    new import_obsidian2.Setting(destinationSection).setName(this.plugin.t("settingFolderPreset")).setDesc(this.plugin.t("settingFolderPresetDesc")).addButton((button) => {
      button.setButtonText(this.plugin.t("settingFolderPresetButton")).onClick(async () => {
        await this.plugin.applyFolderPreset();
        new import_obsidian2.Notice(this.plugin.t("noticeFolderPresetApplied"));
        this.display();
      });
    });
    const tagSection = this.createSection(
      containerEl,
      this.plugin.t("sectionTags"),
      this.plugin.t("sectionTagsDesc")
    );
    new import_obsidian2.Setting(tagSection).setName(this.plugin.t("settingFixedTags")).setDesc(this.plugin.t("settingFixedTagsDesc")).addTextArea((text) => {
      text.setPlaceholder(this.plugin.getDefaultFixedTags().join("\n")).setValue((this.plugin.settings.fixedTags || this.plugin.getDefaultFixedTags()).join("\n")).onChange(async (value) => {
        this.plugin.settings.fixedTags = splitTags(value);
        await this.plugin.saveSettings();
        this.refreshSummary();
      });
      text.inputEl.rows = 3;
    });
    new import_obsidian2.Setting(tagSection).setName(this.plugin.t("settingDomainTag")).setDesc(this.plugin.t("settingDomainTagDesc")).addToggle((toggle) => {
      toggle.setValue(!!this.plugin.settings.addDomainTag).onChange(async (value) => {
        this.plugin.settings.addDomainTag = value;
        await this.plugin.saveSettings();
        this.display();
      });
    });
    new import_obsidian2.Setting(tagSection).setName(this.plugin.t("settingFolderTags")).setDesc(this.plugin.t("settingFolderTagsDesc")).addToggle((toggle) => {
      toggle.setValue(!!this.plugin.settings.addFolderTags).onChange(async (value) => {
        this.plugin.settings.addFolderTags = value;
        await this.plugin.saveSettings();
        this.display();
      });
    });
    const behaviorSection = this.createSection(
      containerEl,
      this.plugin.t("sectionBehavior"),
      this.plugin.t("sectionBehaviorDesc")
    );
    new import_obsidian2.Setting(behaviorSection).setName(this.plugin.t("settingConfirm")).setDesc(this.plugin.t("settingConfirmDesc")).addToggle((toggle) => {
      toggle.setValue(!!this.plugin.settings.confirmBeforeSave).onChange(async (value) => {
        this.plugin.settings.confirmBeforeSave = value;
        await this.plugin.saveSettings();
        this.refreshSummary();
      });
    });
    new import_obsidian2.Setting(behaviorSection).setName(this.plugin.t("settingOpenAfterClip")).addToggle((toggle) => {
      toggle.setValue(!!this.plugin.settings.openAfterClip).onChange(async (value) => {
        this.plugin.settings.openAfterClip = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian2.Setting(behaviorSection).setName(this.plugin.t("settingFetchMetadata")).setDesc(this.plugin.t("settingFetchMetadataDesc")).addToggle((toggle) => {
      toggle.setValue(!!this.plugin.settings.fetchMetadata).onChange(async (value) => {
        this.plugin.settings.fetchMetadata = value;
        this.plugin.settings.fetchPageTitle = value;
        await this.plugin.saveSettings();
        this.refreshSummary();
      });
    });
    new import_obsidian2.Setting(behaviorSection).setName(this.plugin.t("settingPreventDuplicates")).addToggle((toggle) => {
      toggle.setValue(!!this.plugin.settings.preventDuplicateUrls).onChange(async (value) => {
        this.plugin.settings.preventDuplicateUrls = value;
        await this.plugin.saveSettings();
        this.refreshSummary();
      });
    });
    new import_obsidian2.Setting(behaviorSection).setName(this.plugin.t("settingMaxFileName")).setDesc(this.plugin.t("settingMaxFileNameDesc")).addText((text) => {
      text.setPlaceholder("48").setValue(String(this.plugin.settings.maxFileNameLength || DEFAULT_SETTINGS.maxFileNameLength)).onChange(async (value) => {
        this.plugin.settings.maxFileNameLength = normalizeFileNameLength(value);
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian2.Setting(behaviorSection).setName(this.plugin.t("settingDateFormat")).addText((text) => {
      text.setPlaceholder("YYYY-MM-DD HH:mm").setValue(this.plugin.settings.dateFormat).onChange(async (value) => {
        this.plugin.settings.dateFormat = value || DEFAULT_SETTINGS.dateFormat;
        await this.plugin.saveSettings();
      });
    });
    const templateSection = this.createSection(
      containerEl,
      this.plugin.t("sectionTemplate"),
      this.plugin.t("sectionTemplateDesc")
    );
    templateSection.createEl("p", {
      text: this.plugin.t("templateHelp"),
      cls: "ishibashi-web-clipper-section-note"
    });
    new import_obsidian2.Setting(templateSection).addTextArea((text) => {
      text.inputEl.addClass("ishibashi-web-clipper-template");
      text.setValue(this.plugin.settings.noteTemplate || DEFAULT_SETTINGS.noteTemplate).onChange(async (value) => {
        this.plugin.settings.noteTemplate = value || DEFAULT_SETTINGS.noteTemplate;
        await this.plugin.saveSettings();
      });
    });
    const maintenanceSection = this.createSection(
      containerEl,
      this.plugin.t("sectionMaintenance"),
      this.plugin.t("sectionMaintenanceDesc")
    );
    new import_obsidian2.Setting(maintenanceSection).setName(this.plugin.t("settingLibraryOpen")).setDesc(this.plugin.t("settingLibraryOpenDesc")).addButton((button) => {
      button.setCta().setButtonText(this.plugin.t("settingLibraryOpenButton")).onClick(async () => {
        await this.plugin.openClipLibrary();
      });
    });
    new import_obsidian2.Setting(maintenanceSection).setName(this.plugin.t("settingMigrationFolder")).setDesc(this.plugin.t("settingMigrationFolderDesc")).addText((text) => {
      text.setPlaceholder(this.plugin.getFolderPreset().root).setValue(this.plugin.getDefaultMigrationFolder()).onChange(async (value) => {
        this.plugin.settings.migrationTargetFolder = normalizePath(value) || this.plugin.getFolderPreset().root;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian2.Setting(maintenanceSection).setName(this.plugin.t("settingMigrationRun")).setDesc(this.plugin.t("settingMigrationRunDesc")).addButton((button) => {
      button.setButtonText(this.plugin.t("settingMigrationRunButton")).onClick(() => this.plugin.openMigrationModal());
    });
  }
  createSection(containerEl, title, description) {
    const section = containerEl.createDiv({ cls: "ishibashi-web-clipper-settings-section" });
    section.createEl("h3", {
      text: title,
      cls: "ishibashi-web-clipper-settings-section-title"
    });
    section.createEl("p", {
      text: description,
      cls: "ishibashi-web-clipper-settings-section-desc"
    });
    return section;
  }
  createSummary(containerEl) {
    const summary = containerEl.createDiv({ cls: "ishibashi-web-clipper-settings-summary" });
    summary.createEl("h3", {
      text: this.plugin.t("summaryHeading"),
      cls: "ishibashi-web-clipper-settings-summary-title"
    });
    const grid = summary.createDiv({ cls: "ishibashi-web-clipper-settings-summary-grid" });
    this.addSummaryItem(grid, this.plugin.t("summaryDestination"), this.getDestinationSummary());
    this.addSummaryItem(grid, this.plugin.t("summaryTags"), this.getTagsSummary());
    this.addSummaryItem(grid, this.plugin.t("summaryProtection"), this.getProtectionSummary());
  }
  createCaptureGuide(containerEl) {
    const guide = containerEl.createDiv({ cls: "ishibashi-web-clipper-settings-guide" });
    guide.createEl("h3", {
      text: this.plugin.t("captureGuideHeading"),
      cls: "ishibashi-web-clipper-settings-summary-title"
    });
    const grid = guide.createDiv({ cls: "ishibashi-web-clipper-settings-guide-grid" });
    this.addGuideItem(
      grid,
      this.plugin.t("captureGuideMobileTitle"),
      this.plugin.t("captureGuideMobileDesc")
    );
    this.addGuideItem(
      grid,
      this.plugin.t("captureGuideDesktopTitle"),
      this.plugin.t("captureGuideDesktopDesc")
    );
    guide.createEl("h4", {
      text: this.plugin.t("bookmarkletStepsTitle"),
      cls: "ishibashi-web-clipper-subheading"
    });
    const steps = guide.createEl("ol", {
      cls: "ishibashi-web-clipper-steps"
    });
    [
      "bookmarkletStep1",
      "bookmarkletStep2",
      "bookmarkletStep3",
      "bookmarkletStep4"
    ].forEach((key) => {
      steps.createEl("li", { text: this.plugin.t(key) });
    });
    guide.createEl("p", {
      text: this.plugin.t("bookmarkletCodeLabel"),
      cls: "ishibashi-web-clipper-section-note"
    });
    const codeRow = guide.createDiv({ cls: "ishibashi-web-clipper-code-row" });
    const code = this.getBookmarkletCode();
    this.bookmarkletCodeEl = codeRow.createEl("code", {
      text: code,
      cls: "ishibashi-web-clipper-code"
    });
    const copy = codeRow.createEl("button", {
      text: this.plugin.t("bookmarkletCopy"),
      cls: "ishibashi-web-clipper-copy-button"
    });
    copy.addEventListener("click", async () => {
      await navigator.clipboard.writeText(this.getBookmarkletCode());
      new import_obsidian2.Notice(this.plugin.t("bookmarkletCopied"));
    });
    this.bookmarkletPlainEl = guide.createEl("textarea", {
      text: this.getBookmarkletCode(),
      cls: "ishibashi-web-clipper-code-textarea"
    });
    this.bookmarkletPlainEl.readOnly = true;
  }
  refreshSummary() {
    const summary = this.containerEl.querySelector(".ishibashi-web-clipper-settings-summary");
    if (!summary) return;
    summary.remove();
    const h2 = this.containerEl.querySelector("h2");
    const intro = this.containerEl.querySelector(".ishibashi-web-clipper-settings-intro");
    const guide = this.containerEl.querySelector(".ishibashi-web-clipper-settings-guide");
    this.createSummary(this.containerEl);
    const newSummary = this.containerEl.querySelector(".ishibashi-web-clipper-settings-summary");
    if (newSummary && (intro || h2)) {
      (intro || h2)?.insertAdjacentElement("afterend", newSummary);
    }
    if (guide && newSummary) {
      newSummary.insertAdjacentElement("afterend", guide);
    }
  }
  addSummaryItem(containerEl, label, value) {
    const item = containerEl.createDiv({ cls: "ishibashi-web-clipper-settings-summary-item" });
    item.createDiv({
      text: label,
      cls: "ishibashi-web-clipper-settings-summary-label"
    });
    item.createDiv({
      text: value,
      cls: "ishibashi-web-clipper-settings-summary-value"
    });
  }
  addGuideItem(containerEl, title, description) {
    const item = containerEl.createDiv({ cls: "ishibashi-web-clipper-settings-guide-item" });
    item.createDiv({
      text: title,
      cls: "ishibashi-web-clipper-settings-summary-label"
    });
    item.createDiv({
      text: description,
      cls: "ishibashi-web-clipper-settings-summary-value"
    });
  }
  refreshBookmarkletCode() {
    const code = this.getBookmarkletCode();
    if (this.bookmarkletCodeEl) this.bookmarkletCodeEl.setText(code);
    if (this.bookmarkletPlainEl) this.bookmarkletPlainEl.value = code;
  }
  getBookmarkletCode() {
    const vault = (this.plugin.settings.browserVaultName || this.plugin.getVaultName()).trim();
    const vaultPart = vault ? `vault=${encodeURIComponent(vault)}&` : "";
    return `javascript:(()=>{const e=encodeURIComponent;const url=location.href;const title=document.title||"";const selection=window.getSelection?String(window.getSelection()).trim():"";let target=\`obsidian://${PROTOCOL_ACTION}?${vaultPart}url=${"${e(url)}"}&title=${"${e(title)}"}\`;if(selection)target+=\`&note=${"${e(selection.slice(0,1500))}"}\`;location.href=target;})();`;
  }
  getDestinationSummary() {
    return this.plugin.settings.inboxFolder || DEFAULT_SETTINGS.inboxFolder;
  }
  getTagsSummary() {
    const tags = this.plugin.getClipTags(this.getDestinationSummary());
    return tags.length > 0 ? tags.join(", ") : this.plugin.t("summaryNoTags");
  }
  getProtectionSummary() {
    const duplicate = this.plugin.settings.preventDuplicateUrls ? this.plugin.t("summaryDuplicateOn") : this.plugin.t("summaryDuplicateOff");
    const metadata = this.plugin.settings.fetchMetadata ? this.plugin.t("summaryMetadataOn") : this.plugin.t("summaryMetadataOff");
    return `${duplicate} / ${metadata}`;
  }
};
