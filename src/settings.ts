import { DEFAULT_SETTINGS } from "./constants";
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
  settings.workflowMode = settings.workflowMode === "direct" ? "direct" : "inbox";
  settings.targetFolder = normalizePath(settings.targetFolder || DEFAULT_SETTINGS.targetFolder);
  settings.inboxFolder = normalizePath(settings.inboxFolder || DEFAULT_SETTINGS.inboxFolder);
  settings.migrationTargetFolder = normalizePath(settings.migrationTargetFolder || settings.inboxFolder || DEFAULT_SETTINGS.migrationTargetFolder);
  settings.fetchMetadata = settings.fetchMetadata ?? settings.fetchPageTitle ?? DEFAULT_SETTINGS.fetchMetadata;
  settings.fixedTags = Array.isArray(settings.fixedTags) ? settings.fixedTags : DEFAULT_SETTINGS.fixedTags;
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
