import { DEFAULT_FIXED_TAGS, DEFAULT_SETTINGS, getWebClipFolderPreset } from "./constants";
import { WebClipperSettings } from "./types";
import {
  normalizeFileNameLength,
  normalizeGridColumns,
  normalizeLibraryPaneWidth,
  normalizePath
} from "./utils";

export function mergeSettings(saved): WebClipperSettings {
  const settings = Object.assign({}, DEFAULT_SETTINGS, saved || {});
  settings.setupCompleted = !!settings.setupCompleted;
  settings.language = settings.language === "en" ? "en" : "ja";
  settings.workflowMode = "inbox";
  settings.targetFolder = normalizePath(settings.targetFolder || DEFAULT_SETTINGS.targetFolder);
  settings.inboxFolder = normalizePath(settings.inboxFolder || DEFAULT_SETTINGS.inboxFolder);
  const languagePreset = getWebClipFolderPreset(settings.language);
  if (settings.inboxFolder === "08_Webクリップ/10_未整理" || settings.inboxFolder === "Web Clips/10_未整理") {
    settings.inboxFolder = languagePreset.inbox;
    settings.targetFolder = languagePreset.root;
  }
  settings.migrationTargetFolder = normalizePath(settings.migrationTargetFolder || languagePreset.root || DEFAULT_SETTINGS.migrationTargetFolder);
  if (settings.migrationTargetFolder === "08_Webクリップ/10_未整理"
    || settings.migrationTargetFolder === "Web Clips/10_未整理"
    || settings.migrationTargetFolder === languagePreset.inbox) {
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
  return settings as WebClipperSettings;
}
