import { TFile } from "obsidian";

export interface WebClipMetadata {
  url: string;
  title: string;
  site: string;
  description: string;
  image: string;
  domain: string;
}

export interface ClipDraft {
  url: string;
  title: string;
  note: string;
  targetFolder: string;
  tags: string[];
  metadata: WebClipMetadata;
}

export interface ClipHistoryEntry {
  url: string;
  title: string;
  path: string;
  domain: string;
  site: string;
  created: string;
  status: string;
}

export interface WebClipperSettings {
  setupCompleted: boolean;
  language: "ja" | "en";
  workflowMode: "inbox" | "direct";
  targetFolder: string;
  inboxFolder: string;
  migrationTargetFolder: string;
  dateFormat: string;
  noteTemplate: string;
  fetchMetadata: boolean;
  fetchPageTitle: boolean;
  confirmBeforeSave: boolean;
  openAfterClip: boolean;
  fixedTags: string[];
  addDomainTag: boolean;
  addFolderTags: boolean;
  preventDuplicateUrls: boolean;
  maxFileNameLength: number;
  librarySidebarWidth: number;
  libraryInspectorWidth: number;
  libraryGridColumns: number;
  clipHistory: ClipHistoryEntry[];
}

export interface WebClipMigrationItem {
  file: TFile;
  changes: string[];
}

export interface WebClipLibraryItem {
  file: TFile;
  title: string;
  source: string;
  domain: string;
  site: string;
  created: string;
  createdAt: string;
  description: string;
  folder: string;
  tags: string[];
}

export interface WebClipMigrationResult {
  updated: number;
  failed: number;
}
