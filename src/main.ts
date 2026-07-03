import {
  ItemView,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  TFolder,
  requestUrl
} from "obsidian";

import {
  DEFAULT_SETTINGS,
  DEFAULT_FIXED_TAGS,
  LEGACY_PROTOCOL_ACTION,
  PROTOCOL_ACTION,
  VIEW_TYPE_CLIP_HISTORY,
  VIEW_TYPE_CLIP_LIBRARY,
  getWebClipFolderPreset
} from "./constants";
import { translate } from "./i18n";
import { mergeSettings } from "./settings";
import {
  ClipDraft,
  ClipHistoryEntry,
  WebClipLibraryItem,
  WebClipMetadata,
  WebClipMigrationItem,
  WebClipMigrationResult,
  WebClipperSettings
} from "./types";
import {
  absoluteUrl,
  cleanMemo,
  cleanMetadata,
  cleanText,
  cleanTitle,
  decodeProtocolText,
  domainFromUrl,
  fallbackMetadata,
  firstValue,
  formatLibraryDate,
  frontmatterString,
  getCachedFrontmatter,
  getParentPath,
  hasWebClipSource,
  inferCreatedAt,
  isFileInFolder,
  isStrictWebClipFrontmatter,
  isWebClipFrontmatter,
  libraryTime,
  looksLikeUrl,
  normalizeCacheKey,
  normalizeFileNameLength,
  normalizeFrontmatterTags,
  normalizeGridColumns,
  normalizeLibraryPaneWidth,
  normalizePath,
  normalizeTag,
  normalizeUrl,
  nowIsoString,
  parseOpenGraph,
  parseHtmlTitle,
  parseSharedText,
  readFrontmatter,
  resolveFetchFinalUrl,
  sanitizeFileName,
  shouldResolveSharedRedirect,
  shortHash,
  splitTags,
  stripTrailingSlash,
  tagFromDomain,
  tagsFromFolderPath,
  titleFromUrl,
  truncateFileName,
  unique,
  urlsMatch,
  withTimeout
} from "./utils";

export default class IshibashiWebClipper extends Plugin {
  settings: WebClipperSettings;
  ribbonIconEl: HTMLElement | null = null;

  async onload() {
    this.settings = mergeSettings(await this.loadData());

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
      (this.app.workspace as any).on("receive-text-menu", (menu: any, sharedText: string) => {
        menu.addItem((item) => {
          item
            .setSection("options")
            .setIcon("link")
            .setTitle(this.t("menuSaveClip"))
            .onClick(async () => {
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

  t(key: string) {
    return translate(this.settings.language, key);
  }

  async captureFromParams(params) {
    const sharedText = firstValue(params.text);
    const parsed = parseSharedText(sharedText
      ? decodeProtocolText(sharedText)
      : firstValue(params.url || params.u || ""));
    const url = firstValue(params.url || params.u) || parsed.url;
    const title = decodeProtocolText(firstValue(params.title || params.t)) || parsed.title;
    const note = decodeProtocolText(firstValue(params.note || params.n)) || parsed.note;

    if (!url) {
      new Notice(this.t("noticeNoUrl"));
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
      new Notice(this.t("noticeClipboardFailed"));
    }
  }

  async captureFromSharedText(sharedText) {
    await this.captureFromText(sharedText, this.t("noticeNoSharedUrl"));
  }

  async captureFromText(text, errorMessage) {
    const parsed = parseSharedText(text);
    if (!parsed.url) {
      new Notice(errorMessage);
      return;
    }

    await this.prepareClip(parsed);
  }

  async prepareClip(input) {
    const normalizedUrl = normalizeUrl(input.url);
    if (!normalizedUrl) {
      new Notice(this.t("noticeInvalidUrl"));
      return;
    }
    const resolvedUrl = await this.resolveSharedRedirect(normalizedUrl);

    const duplicate = this.settings.preventDuplicateUrls
      ? await this.findExistingClip(resolvedUrl)
      : null;
    if (duplicate) {
      new Notice(this.t("noticeDuplicate"));
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

    const confirmedClip = this.settings.confirmBeforeSave
      ? await this.confirmClip(clip)
      : clip;
    if (!confirmedClip) return;

    await this.createClipNote(confirmedClip);
  }

  async resolveSharedRedirect(url: string): Promise<string> {
    if (!shouldResolveSharedRedirect(url)) return url;
    try {
      const resolved = await resolveFetchFinalUrl(url, 8000);
      return resolved && normalizeCacheKey(resolved) !== normalizeCacheKey(url)
        ? resolved
        : url;
    } catch (error) {
      console.warn("Failed to resolve shared redirect URL", error);
      return url;
    }
  }

  getDefaultTargetFolder(): string {
    return normalizePath(this.settings.inboxFolder || DEFAULT_SETTINGS.inboxFolder);
  }

  getDefaultFixedTags(language: "ja" | "en" = this.settings.language): string[] {
    return DEFAULT_FIXED_TAGS[language].slice();
  }

  isLanguageDefaultFixedTags(tags: string[]): boolean {
    const normalized = tags.map(normalizeTag).filter(Boolean);
    return Object.values(DEFAULT_FIXED_TAGS).some((defaults) => {
      const defaultTags = defaults.map(normalizeTag).filter(Boolean);
      return normalized.length === defaultTags.length
        && normalized.every((tag, index) => tag === defaultTags[index]);
    });
  }

  getFolderPreset(language: "ja" | "en" = this.settings.language) {
    return getWebClipFolderPreset(language);
  }

  async applyFolderPreset(language: "ja" | "en" = this.settings.language) {
    const preset = this.getFolderPreset(language);
    for (const folder of preset.folders) {
      await this.ensureFolder(folder);
    }
    this.settings.workflowMode = "inbox";
    this.settings.inboxFolder = preset.inbox;
    this.settings.targetFolder = preset.root;
    this.settings.migrationTargetFolder = preset.inbox;
    await this.saveSettings();
  }

  async resolveMetadata(url: string, sharedTitle: string): Promise<WebClipMetadata> {
    const fallback = fallbackMetadata(url, sharedTitle);
    if (!this.settings.fetchMetadata && !this.settings.fetchPageTitle) {
      return fallback;
    }

    try {
      const response = await withTimeout(requestUrl({
        url,
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 Obsidian Ishibashi Web Clipper"
        }
      }), 10000);
      const html = response.text || "";
      const tags = parseOpenGraph(html);
      const title = cleanTitle(
        cleanTitle(sharedTitle) ||
        tags["og:title"] ||
        tags["twitter:title"] ||
        parseHtmlTitle(html) ||
        fallback.title
      );
      const description = cleanText(
        tags["og:description"] ||
        tags["twitter:description"] ||
        tags.description ||
        ""
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

  async confirmClip(clip: ClipDraft): Promise<ClipDraft | null> {
    return new Promise((resolve) => {
      const modal = new ClipConfirmModal(this.app, this, clip, resolve);
      modal.open();
    });
  }

  async createClipNote(clip: ClipDraft) {
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

    new Notice(`${this.t("noticeCreated")}: ${path}`);
    if (this.settings.openAfterClip) {
      await this.openFile(path);
    }
  }

  renderNote(clip: ClipDraft) {
    const createdAt = nowIsoString();
    const date = window.moment(createdAt).format(this.settings.dateFormat || DEFAULT_SETTINGS.dateFormat);
    const metadata = cleanMetadata(clip.metadata || {});
    const tags = unique((clip.tags || []).map(normalizeTag).filter(Boolean));
    const body = (this.settings.noteTemplate || DEFAULT_SETTINGS.noteTemplate)
      .replaceAll("{{date}}", date)
      .replaceAll("{{title}}", clip.title)
      .replaceAll("{{url}}", clip.url)
      .replaceAll("{{note}}", clip.note || "")
      .replaceAll("{{description}}", metadata.description || "")
      .replaceAll("{{image}}", metadata.image || "")
      .replaceAll("{{site}}", metadata.site || "")
      .replaceAll("{{domain}}", metadata.domain || "")
      .replaceAll("{{tags}}", tags.join(", "));

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

  getClipTags(targetFolder: string, domain = ""): string[] {
    const fixedTags = Array.isArray(this.settings.fixedTags)
      ? this.settings.fixedTags
      : DEFAULT_SETTINGS.fixedTags;
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
      if (!(await this.app.vault.adapter.exists(current))) {
        await this.app.vault.createFolder(current);
      }
    }
  }

  async nextAvailablePath(folder, title, url) {
    const maxLength = normalizeFileNameLength(this.settings.maxFileNameLength);
    const baseName = truncateFileName(sanitizeFileName(title), maxLength) || "Untitled";
    let path = `${folder}/${baseName}.md`;
    if (!(await this.app.vault.adapter.exists(path))) return path;

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

  async openClipLibrary(location: "main" | "side" = "main") {
    if (location === "side") {
      const leaf = this.app.workspace.getRightLeaf(false) || this.app.workspace.getLeaf(true);
      await leaf.setViewState({ type: VIEW_TYPE_CLIP_LIBRARY, active: true });
      this.app.workspace.revealLeaf(leaf);
      return;
    }

    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_CLIP_LIBRARY)[0];
    if (!leaf) {
      leaf = this.app.workspace.getLeaf(true);
      await leaf.setViewState({ type: VIEW_TYPE_CLIP_LIBRARY, active: true });
    }
    this.app.workspace.revealLeaf(leaf);
  }

  async collectWebClipLibraryItems(): Promise<WebClipLibraryItem[]> {
    const items: WebClipLibraryItem[] = [];
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
    new Notice(`${this.t("noticeTargetFolder")}: ${targetFolder}`);
  }

  openMigrationModal() {
    new WebClipMigrationModal(this.app, this).open();
  }

  async scanWebClipMigrations(folder: string): Promise<WebClipMigrationItem[]> {
    const targetFolder = normalizePath(folder);
    if (!targetFolder) return [];

    const files = this.app.vault.getMarkdownFiles()
      .filter((file) => isFileInFolder(file, targetFolder));
    const items: WebClipMigrationItem[] = [];

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

  getMigrationChanges(file: TFile, frontmatter: Record<string, any>): string[] {
    const changes: string[] = [];
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

  async applyWebClipMigrations(items: WebClipMigrationItem[]): Promise<WebClipMigrationResult> {
    const result = { updated: 0, failed: 0 };
    for (const item of items) {
      try {
        await (this.app.fileManager as any).processFrontMatter(item.file, (frontmatter) => {
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

  async updateWebClipOrganization(file: TFile, folder: string, tags: string[]): Promise<TFile> {
    const targetFolder = normalizePath(folder || getParentPath(file));
    await this.ensureFolder(targetFolder);

    await (this.app.fileManager as any).processFrontMatter(file, (frontmatter) => {
      frontmatter.tags = unique(tags.map(normalizeTag).filter(Boolean));
    });

    const currentFolder = getParentPath(file);
    if (targetFolder === currentFolder) return file;

    const nextPath = await this.nextAvailableMovePath(targetFolder, file);
    await this.app.fileManager.renameFile(file, nextPath);
    const moved = this.app.vault.getAbstractFileByPath(nextPath);
    return moved instanceof TFile ? moved : file;
  }

  async nextAvailableMovePath(folder: string, file: TFile): Promise<string> {
    const baseName = sanitizeFileName(file.basename) || "Untitled";
    const extension = file.extension ? `.${file.extension}` : "";
    let path = `${folder}/${baseName}${extension}`;
    if (!(await this.app.vault.adapter.exists(path))) return path;

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
    if (file instanceof TFile) {
      await this.app.workspace.getLeaf(true).openFile(file);
    }
  }
};

class FirstRunModal extends Modal {
  plugin: IshibashiWebClipper;
  language: "ja" | "en";
  createPreset: boolean;

  constructor(app: any, plugin: IshibashiWebClipper) {
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

    new Setting(contentEl)
      .setName(translate(this.language, "settingLanguage"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("ja", "日本語")
          .addOption("en", "English")
          .setValue(this.language)
          .onChange((value: "ja" | "en") => {
            this.language = value;
            this.onOpen();
          });
      });

    new Setting(contentEl)
      .setName(translate(this.language, "firstRunPreset"))
      .setDesc(translate(this.language, "firstRunPresetDesc"))
      .addToggle((toggle) => {
        toggle
          .setValue(this.createPreset)
          .onChange((value) => {
            this.createPreset = value;
          });
      });

    new Setting(contentEl)
      .addButton((button) => {
        button
          .setCta()
          .setButtonText(translate(this.language, "firstRunStart"))
          .onClick(async () => {
            const preset = this.plugin.getFolderPreset(this.language);
            this.plugin.settings.language = this.language;
            this.plugin.settings.workflowMode = "inbox";
            if (this.createPreset) {
              await this.plugin.applyFolderPreset(this.language);
            } else {
              this.plugin.settings.inboxFolder = preset.inbox;
              this.plugin.settings.targetFolder = preset.root;
              this.plugin.settings.migrationTargetFolder = preset.inbox;
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
}

class ClipConfirmModal extends Modal {
  plugin: IshibashiWebClipper;
  clip: ClipDraft;
  onSubmit: (clip: ClipDraft | null) => void;
  submitted: boolean;

  constructor(app: any, plugin: IshibashiWebClipper, clip: ClipDraft, onSubmit: (clip: ClipDraft | null) => void) {
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

    new Setting(contentEl)
      .setName(this.plugin.t("fieldTitle"))
      .addText((text) => {
        text.setValue(this.clip.title).onChange((value) => {
          this.clip.title = cleanTitle(value) || titleFromUrl(this.clip.url);
        });
      });

    new Setting(contentEl)
      .setName(this.plugin.t("fieldFolder"))
      .addText((text) => {
        text.setValue(this.clip.targetFolder).onChange((value) => {
          this.clip.targetFolder = normalizePath(value);
        });
      });

    new Setting(contentEl)
      .setName(this.plugin.t("fieldTags"))
      .setDesc(this.plugin.t("fieldTagsDesc"))
      .addTextArea((text) => {
        text
          .setValue(this.clip.tags.join("\n"))
          .onChange((value) => {
            this.clip.tags = splitTags(value);
          });
        text.inputEl.rows = 3;
      });

    new Setting(contentEl)
      .setName(this.plugin.t("fieldMemo"))
      .addTextArea((text) => {
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

    new Setting(contentEl)
      .addButton((button) => {
        button
          .setButtonText(this.plugin.t("buttonCancel"))
          .onClick(() => this.close());
      })
      .addButton((button) => {
        button
          .setCta()
          .setButtonText(this.plugin.t("buttonSave"))
          .onClick(() => {
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
}

class ClipHistoryView extends ItemView {
  plugin: IshibashiWebClipper;

  constructor(leaf: any, plugin: IshibashiWebClipper) {
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

    const history = Array.isArray(this.plugin.settings.clipHistory)
      ? this.plugin.settings.clipHistory
      : [];
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
        text: [entry.domain, entry.created, entry.status].filter(Boolean).join(" ・ "),
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
}

class WebClipLibraryView extends ItemView {
  plugin: IshibashiWebClipper;
  items: WebClipLibraryItem[];
  resizeObserver: ResizeObserver | null;
  query: string;
  filterKind: "all" | "folder" | "domain" | "tag";
  filterValue: string;
  groupBy: "folder" | "domain" | "tag";
  groupSortBy: "count-desc" | "count-asc" | "name-asc" | "name-desc";
  sortBy: "date-desc" | "date-asc" | "title-asc" | "title-desc" | "domain-asc" | "domain-desc";
  inspectorTab: "overview" | "edit";
  selectedPath: string;
  selectedPaths: Set<string>;
  loading: boolean;
  hasLoaded: boolean;
  refreshStatus: "idle" | "refreshing" | "complete";
  refreshStatusTimer: number | null;

  constructor(leaf: any, plugin: IshibashiWebClipper) {
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
    this.selectedPaths = new Set();
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
    const minimumFeedback = showRefreshFeedback
      ? new Promise((resolve) => window.setTimeout(resolve, 450))
      : Promise.resolve();
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
      new Notice(this.plugin.t("libraryRefreshComplete"));
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
    const refreshLabel = this.refreshStatus === "refreshing"
      ? this.plugin.t("libraryRefreshing")
      : this.refreshStatus === "complete"
        ? this.plugin.t("libraryRefreshComplete")
        : this.plugin.t("libraryRefresh");
    const refresh = header.createEl("button", {
      text: refreshLabel,
      cls: this.refreshStatus === "refreshing"
        ? "mod-cta ishibashi-web-clipper-library-refresh is-loading"
        : this.refreshStatus === "complete"
          ? "mod-cta ishibashi-web-clipper-library-refresh is-complete"
          : "mod-cta ishibashi-web-clipper-library-refresh"
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

  applyLayoutColumns(layout: HTMLElement) {
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

  createResizeHandle(container: HTMLElement, pane: "sidebar" | "inspector") {
    const handle = container.createDiv({
      cls: `ishibashi-web-clipper-library-resize is-${pane}`
    });
    handle.setAttr("role", "separator");
    handle.setAttr("aria-orientation", "vertical");
    handle.setAttr("tabindex", "0");
    handle.setAttr("aria-label", pane === "sidebar"
      ? this.plugin.t("libraryResizeSidebar")
      : this.plugin.t("libraryResizeInspector"));

    handle.addEventListener("pointerdown", (event: PointerEvent) => {
      this.startResize(event, pane, container);
    });
    handle.addEventListener("keydown", async (event: KeyboardEvent) => {
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

  startResize(event: PointerEvent, pane: "sidebar" | "inspector", layout: HTMLElement) {
    event.preventDefault();
    const startX = event.clientX;
    const startSidebar = this.plugin.settings.librarySidebarWidth;
    const startInspector = this.plugin.settings.libraryInspectorWidth;
    const target = event.currentTarget as HTMLElement;
    target.addClass("is-dragging");
    target.setPointerCapture(event.pointerId);

    const onMove = (moveEvent: PointerEvent) => {
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

    const onUp = async (upEvent: PointerEvent) => {
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

  renderSidebar(container: HTMLElement, filtered: WebClipLibraryItem[]) {
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
      this.groupSortBy = groupSort.value as "count-desc" | "count-asc" | "name-asc" | "name-desc";
      this.render();
    });

    this.addSegment(sidebar, [
      { label: this.plugin.t("libraryByFolder"), value: "folder" },
      { label: this.plugin.t("libraryByDomain"), value: "domain" },
      { label: this.plugin.t("libraryByTag"), value: "tag" }
    ], this.groupBy, (value) => {
      this.groupBy = value as "folder" | "domain" | "tag";
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

  renderMain(container: HTMLElement, filtered: WebClipLibraryItem[]) {
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
      this.sortBy = sort.value as "date-desc" | "date-asc" | "title-asc" | "title-desc" | "domain-asc" | "domain-desc";
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
        cls: selected
          ? "ishibashi-web-clipper-library-card is-selected"
          : "ishibashi-web-clipper-library-card"
      });
      card.draggable = true;
      card.addEventListener("dragstart", (event) => {
        event.dataTransfer?.setData("text/plain", item.file.path);
        event.dataTransfer?.setData("application/x-ishibashi-web-clip", item.file.path);
        event.dataTransfer!.effectAllowed = "move";
      });
      card.addEventListener("click", (event) => {
        const target = event.target as HTMLElement;
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
        cls: this.isSortKey("date")
          ? "ishibashi-web-clipper-library-date is-sort-key"
          : "ishibashi-web-clipper-library-date"
      });
      top.createDiv({
        text: item.domain || item.site || this.plugin.t("libraryNoDomain"),
        cls: this.isSortKey("domain")
          ? "ishibashi-web-clipper-library-domain is-sort-key"
          : "ishibashi-web-clipper-library-domain"
      });

      const title = body.createDiv({
        text: item.title || item.file.basename,
        cls: this.isSortKey("title")
          ? "ishibashi-web-clipper-library-title is-sort-key"
          : "ishibashi-web-clipper-library-title"
      });
      title.setAttr("role", "button");
      title.setAttr("tabindex", "0");
      title.addEventListener("click", async () => {
        await this.plugin.openFile(item.file.path);
      });
      title.addEventListener("keydown", async (event: KeyboardEvent) => {
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

  renderInspector(container: HTMLElement, filtered: WebClipLibraryItem[]) {
    const inspector = container.createDiv({ cls: "ishibashi-web-clipper-library-inspector" });
    this.addSegment(inspector, [
      { label: this.plugin.t("libraryOverview"), value: "overview" },
      { label: this.plugin.t("libraryEditTab"), value: "edit" }
    ], this.inspectorTab, (value) => {
      this.inspectorTab = value as "overview" | "edit";
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

  renderInspectorEdit(container: HTMLElement) {
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

  renderBulkBar(container: HTMLElement) {
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

  addSegment(
    container: HTMLElement,
    options: { label: string; value: string }[],
    active: string,
    onChange: (value: string) => void
  ) {
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

  addFilterButton(container: HTMLElement, label: string, count: number, kind: string, value: string) {
    const active = this.filterKind === kind && this.filterValue === value;
    const button = container.createEl("button", {
      cls: active ? "ishibashi-web-clipper-library-filter is-active" : "ishibashi-web-clipper-library-filter"
    });
    this.configureDropTarget(button, kind, value);
    button.createSpan({ text: label || this.plugin.t("libraryUnknown") });
    button.createSpan({ text: String(count) });
    button.addEventListener("click", () => {
      this.filterKind = kind as "all" | "folder" | "domain" | "tag";
      this.filterValue = value;
      this.render();
    });
  }

  addSortOption(select: HTMLSelectElement, value: string, label: string) {
    const option = select.createEl("option", { text: label });
    option.value = value;
  }

  addStat(container: HTMLElement, label: string, value: string) {
    const stat = container.createDiv({ cls: "ishibashi-web-clipper-library-stat" });
    stat.createDiv({ text: value, cls: "ishibashi-web-clipper-library-stat-value" });
    stat.createDiv({ text: label, cls: "ishibashi-web-clipper-library-stat-label" });
  }

  configureDropTarget(element: HTMLElement, kind: string, value: string) {
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
      const path = event.dataTransfer?.getData("application/x-ishibashi-web-clip")
        || event.dataTransfer?.getData("text/plain")
        || "";
      const item = this.items.find((entry) => entry.file.path === path);
      if (!item) return;
      if (kind === "folder") {
        await this.applyOrganization(item, value, item.tags);
      } else {
        await this.addTags(item, [value]);
      }
    });
  }

  isSortKey(key: "date" | "title" | "domain"): boolean {
    if (key === "date") return this.sortBy === "date-desc" || this.sortBy === "date-asc";
    if (key === "title") return this.sortBy === "title-asc" || this.sortBy === "title-desc";
    return this.sortBy === "domain-asc" || this.sortBy === "domain-desc";
  }

  getFilteredItems(): WebClipLibraryItem[] {
    const query = cleanText(this.query).toLowerCase();
    return this.items
      .filter((item) => {
        if (this.filterKind === "folder") return item.folder === this.filterValue;
        if (this.filterKind === "domain") return item.domain === this.filterValue;
        if (this.filterKind === "tag") return item.tags.includes(this.filterValue);
        return true;
      })
      .filter((item) => {
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
      })
      .sort((a, b) => {
        if (this.sortBy === "date-asc") return libraryTime(a) - libraryTime(b);
        if (this.sortBy === "title-asc") return a.title.localeCompare(b.title) || libraryTime(b) - libraryTime(a);
        if (this.sortBy === "title-desc") return b.title.localeCompare(a.title) || libraryTime(b) - libraryTime(a);
        if (this.sortBy === "domain-asc") return a.domain.localeCompare(b.domain) || libraryTime(b) - libraryTime(a);
        if (this.sortBy === "domain-desc") return b.domain.localeCompare(a.domain) || libraryTime(b) - libraryTime(a);
        return libraryTime(b) - libraryTime(a);
      });
  }

  getGroups(kind: "folder" | "domain" | "tag"): { label: string; value: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const item of this.items) {
      const values = kind === "tag"
        ? item.tags
        : [kind === "folder" ? item.folder : item.domain];
      for (const raw of values) {
        const value = raw || "";
        counts.set(value, (counts.get(value) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([value, count]) => ({
        value,
        label: value || this.plugin.t("libraryUnknown"),
        count
      }))
      .sort((a, b) => {
        if (this.groupSortBy === "count-asc") return a.count - b.count || a.label.localeCompare(b.label);
        if (this.groupSortBy === "name-asc") return a.label.localeCompare(b.label) || b.count - a.count;
        if (this.groupSortBy === "name-desc") return b.label.localeCompare(a.label) || b.count - a.count;
        return b.count - a.count || a.label.localeCompare(b.label);
      });
  }

  getSelectedItem(): WebClipLibraryItem | null {
    if (this.selectedPath) {
      const direct = this.items.find((item) => item.file.path === this.selectedPath);
      if (direct) return direct;
    }
    const firstPath = Array.from(this.selectedPaths)[0];
    return firstPath ? this.items.find((item) => item.file.path === firstPath) || null : null;
  }

  getSelectedItems(): WebClipLibraryItem[] {
    return this.items.filter((item) => this.selectedPaths.has(item.file.path));
  }

  async applyOrganization(item: WebClipLibraryItem, folder: string, tags: string[]) {
    const nextFolder = normalizePath(folder);
    if (!nextFolder) {
      new Notice(this.plugin.t("libraryEditFolderRequired"));
      return;
    }
    const moved = await this.plugin.updateWebClipOrganization(item.file, nextFolder, tags);
    this.selectedPath = moved.path;
    if (this.selectedPaths.delete(item.file.path)) {
      this.selectedPaths.add(moved.path);
    }
    new Notice(this.plugin.t("libraryEditComplete"));
    await this.load();
  }

  async addTags(item: WebClipLibraryItem, tags: string[]) {
    const nextTags = unique([...item.tags, ...tags.map(normalizeTag).filter(Boolean)]);
    await this.applyOrganization(item, item.folder, nextTags);
  }

  async removeTag(item: WebClipLibraryItem, tag: string) {
    const nextTags = item.tags.filter((value) => value !== tag);
    await this.applyOrganization(item, item.folder, nextTags);
  }

  async addTagsToSelected(tags: string[]) {
    const cleanTags = tags.map(normalizeTag).filter(Boolean);
    if (cleanTags.length === 0) return;
    for (const item of this.getSelectedItems()) {
      await this.plugin.updateWebClipOrganization(item.file, item.folder, unique([...item.tags, ...cleanTags]));
    }
    new Notice(this.plugin.t("libraryEditComplete"));
    await this.load();
  }

  async removeTagsFromSelected(tags: string[]) {
    const cleanTags = tags.map(normalizeTag).filter(Boolean);
    if (cleanTags.length === 0) return;
    for (const item of this.getSelectedItems()) {
      await this.plugin.updateWebClipOrganization(
        item.file,
        item.folder,
        item.tags.filter((tag) => !cleanTags.includes(tag))
      );
    }
    new Notice(this.plugin.t("libraryEditComplete"));
    await this.load();
  }

  async moveSelected(folder: string) {
    const nextFolder = normalizePath(folder);
    if (!nextFolder) {
      new Notice(this.plugin.t("libraryEditFolderRequired"));
      return;
    }
    const nextSelected = new Set<string>();
    for (const item of this.getSelectedItems()) {
      const moved = await this.plugin.updateWebClipOrganization(item.file, nextFolder, item.tags);
      nextSelected.add(moved.path);
    }
    this.selectedPaths = nextSelected;
    this.selectedPath = Array.from(nextSelected)[0] || "";
    new Notice(this.plugin.t("libraryEditComplete"));
    await this.load();
  }
}

class WebClipEditModal extends Modal {
  plugin: IshibashiWebClipper;
  item: WebClipLibraryItem;
  folder: string;
  tagsText: string;
  onSubmit: () => Promise<void>;
  submitting: boolean;

  constructor(app: any, plugin: IshibashiWebClipper, item: WebClipLibraryItem, onSubmit: () => Promise<void>) {
    super(app);
    this.plugin = plugin;
    this.item = item;
    this.folder = item.folder;
    this.tagsText = item.tags.join("\n");
    this.onSubmit = onSubmit;
    this.submitting = false;
  }

  onOpen() {
    this.render();
  }

  render() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("ishibashi-web-clipper-edit");
    contentEl.createEl("h2", { text: this.plugin.t("libraryEditTitle") });
    contentEl.createEl("p", {
      text: this.item.title || this.item.file.basename,
      cls: "ishibashi-web-clipper-modal-help"
    });

    new Setting(contentEl)
      .setName(this.plugin.t("fieldFolder"))
      .setDesc(this.plugin.t("libraryEditFolderDesc"))
      .addText((text) => {
        text
          .setValue(this.folder)
          .onChange((value) => {
            this.folder = normalizePath(value);
          });
      });

    new Setting(contentEl)
      .setName(this.plugin.t("fieldTags"))
      .setDesc(this.plugin.t("libraryEditTagsDesc"))
      .addTextArea((text) => {
        text
          .setValue(this.tagsText)
          .onChange((value) => {
            this.tagsText = value;
          });
        text.inputEl.rows = 7;
      });

    new Setting(contentEl)
      .addButton((button) => {
        button
          .setButtonText(this.plugin.t("buttonCancel"))
          .setDisabled(this.submitting)
          .onClick(() => this.close());
      })
      .addButton((button) => {
        button
          .setCta()
          .setButtonText(this.plugin.t("libraryEditApply"))
          .setDisabled(this.submitting)
          .onClick(async () => {
            await this.apply();
          });
      });
  }

  async apply() {
    if (this.submitting) return;
    const folder = normalizePath(this.folder);
    if (!folder) {
      new Notice(this.plugin.t("libraryEditFolderRequired"));
      return;
    }

    this.submitting = true;
    this.render();
    try {
      await this.plugin.updateWebClipOrganization(this.item.file, folder, splitTags(this.tagsText));
      new Notice(this.plugin.t("libraryEditComplete"));
      this.close();
      await this.onSubmit();
    } catch (error) {
      console.error(error);
      new Notice(this.plugin.t("libraryEditFailed"));
      this.submitting = false;
      this.render();
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}

class WebClipTextInputModal extends Modal {
  plugin: IshibashiWebClipper;
  title: string;
  description: string;
  value: string;
  onSubmit: (value: string) => Promise<void>;
  submitting: boolean;

  constructor(
    app: any,
    plugin: IshibashiWebClipper,
    title: string,
    description: string,
    value: string,
    onSubmit: (value: string) => Promise<void>
  ) {
    super(app);
    this.plugin = plugin;
    this.title = title;
    this.description = description;
    this.value = value;
    this.onSubmit = onSubmit;
    this.submitting = false;
  }

  onOpen() {
    this.render();
  }

  render() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("ishibashi-web-clipper-edit");
    contentEl.createEl("h2", { text: this.title });
    if (this.description) {
      contentEl.createEl("p", {
        text: this.description,
        cls: "ishibashi-web-clipper-modal-help"
      });
    }
    const input = contentEl.createEl("textarea", {
      cls: "ishibashi-web-clipper-library-edit-tags"
    });
    input.value = this.value;
    input.rows = 5;
    input.addEventListener("input", () => {
      this.value = input.value;
    });

    new Setting(contentEl)
      .addButton((button) => {
        button
          .setButtonText(this.plugin.t("buttonCancel"))
          .setDisabled(this.submitting)
          .onClick(() => this.close());
      })
      .addButton((button) => {
        button
          .setCta()
          .setButtonText(this.plugin.t("libraryEditApply"))
          .setDisabled(this.submitting)
          .onClick(async () => {
            await this.apply();
          });
      });
  }

  async apply() {
    if (this.submitting) return;
    this.submitting = true;
    this.render();
    try {
      await this.onSubmit(this.value);
      this.close();
    } catch (error) {
      console.error(error);
      new Notice(this.plugin.t("libraryEditFailed"));
      this.submitting = false;
      this.render();
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}

class WebClipTagPickerModal extends Modal {
  plugin: IshibashiWebClipper;
  items: WebClipLibraryItem[];
  title: string;
  selected: Set<string>;
  replaceMode: boolean;
  query: string;
  onSubmit: (tags: string[]) => Promise<void>;
  submitting: boolean;

  constructor(
    app: any,
    plugin: IshibashiWebClipper,
    items: WebClipLibraryItem[],
    title: string,
    selectedTags: string[],
    replaceMode: boolean,
    onSubmit: (tags: string[]) => Promise<void>
  ) {
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

    new Setting(contentEl)
      .addButton((button) => {
        button
          .setButtonText(this.plugin.t("buttonCancel"))
          .setDisabled(this.submitting)
          .onClick(() => this.close());
      })
      .addButton((button) => {
        button
          .setCta()
          .setButtonText(this.plugin.t("libraryEditApply"))
          .setDisabled(this.submitting)
          .onClick(async () => {
            await this.apply();
          });
      });
  }

  getTags(): string[] {
    const query = normalizeTag(this.query).toLowerCase();
    return unique(this.items.flatMap((item) => item.tags))
      .filter((tag) => !query || tag.toLowerCase().includes(query))
      .sort((a, b) => a.localeCompare(b));
  }

  async apply() {
    if (this.submitting) return;
    this.submitting = true;
    try {
      await this.onSubmit(Array.from(this.selected));
      this.close();
    } catch (error) {
      console.error(error);
      new Notice(this.plugin.t("libraryEditFailed"));
      this.submitting = false;
      this.render();
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}

class WebClipFolderPickerModal extends Modal {
  plugin: IshibashiWebClipper;
  items: WebClipLibraryItem[];
  title: string;
  selectedFolder: string;
  query: string;
  onSubmit: (folder: string) => Promise<void>;
  submitting: boolean;

  constructor(
    app: any,
    plugin: IshibashiWebClipper,
    items: WebClipLibraryItem[],
    title: string,
    selectedFolder: string,
    onSubmit: (folder: string) => Promise<void>
  ) {
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
        cls: folder === this.selectedFolder
          ? "ishibashi-web-clipper-picker-row is-active"
          : "ishibashi-web-clipper-picker-row"
      });
      row.addEventListener("click", async () => {
        this.selectedFolder = folder;
        await this.apply();
      });
    }

    new Setting(contentEl)
      .addButton((button) => {
        button
          .setButtonText(this.plugin.t("buttonCancel"))
          .setDisabled(this.submitting)
          .onClick(() => this.close());
      });
  }

  getFolders(): string[] {
    const query = normalizePath(this.query).toLowerCase();
    const configuredFolders = [
      this.plugin.getDefaultTargetFolder(),
      ...this.items.map((item) => item.folder).filter(Boolean)
    ];
    const roots = unique(configuredFolders.map((folder) => folder.split("/")[0]).filter(Boolean));
    const vaultFolders = this.plugin.app.vault.getAllLoadedFiles()
      .filter((file): file is TFolder => file instanceof TFolder)
      .map((folder) => folder.path)
      .filter((folder) => roots.some((root) => folder === root || folder.startsWith(`${root}/`)));
    const folders = unique([...configuredFolders, ...vaultFolders].filter(Boolean))
      .sort((a, b) => a.localeCompare(b));

    return folders
      .filter((folder) => roots.length === 0 || roots.some((root) => folder === root || folder.startsWith(`${root}/`)))
      .filter((folder) => !query || folder.toLowerCase().includes(query));
  }

  async apply() {
    if (this.submitting) return;
    this.submitting = true;
    try {
      await this.onSubmit(this.selectedFolder);
      this.close();
    } catch (error) {
      console.error(error);
      new Notice(this.plugin.t("libraryEditFailed"));
      this.submitting = false;
      this.render();
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}

class WebClipMigrationModal extends Modal {
  plugin: IshibashiWebClipper;
  folder: string;
  items: WebClipMigrationItem[];
  scanned: boolean;
  applying: boolean;

  constructor(app: any, plugin: IshibashiWebClipper) {
    super(app);
    this.plugin = plugin;
    this.folder = plugin.settings.migrationTargetFolder || plugin.getDefaultTargetFolder();
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

    new Setting(contentEl)
      .setName(this.plugin.t("settingMigrationFolder"))
      .setDesc(this.plugin.t("settingMigrationFolderDesc"))
      .addText((text) => {
        text
          .setPlaceholder(this.plugin.getDefaultTargetFolder())
          .setValue(this.folder)
          .onChange((value) => {
            this.folder = normalizePath(value);
            this.scanned = false;
            this.items = [];
          });
      });

    const actionRow = new Setting(contentEl);
    actionRow
      .addButton((button) => {
        button
          .setButtonText(this.plugin.t("migrationPreview"))
          .onClick(async () => {
            await this.preview();
          });
      })
      .addButton((button) => {
        button
          .setCta()
          .setButtonText(this.plugin.t("migrationApply"))
          .setDisabled(!this.scanned || this.items.length === 0 || this.applying)
          .onClick(async () => {
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
      new Notice(this.plugin.t("migrationFolderRequired"));
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
    new Notice(this.plugin.t(noticeKey)
      .replace("{{count}}", String(result.updated))
      .replace("{{failed}}", String(result.failed)));
    this.items = [];
    this.scanned = true;
    this.applying = false;
    this.render();
  }

  onClose() {
    this.contentEl.empty();
  }
}

class IshibashiWebClipperSettingTab extends PluginSettingTab {
  plugin: IshibashiWebClipper;

  constructor(app: any, plugin: IshibashiWebClipper) {
    super(app, plugin);
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

    new Setting(startSection)
      .setName(this.plugin.t("settingLanguage"))
      .setDesc(this.plugin.t("settingLanguageDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("ja", "日本語")
          .addOption("en", "English")
          .setValue(this.plugin.settings.language)
          .onChange(async (value: "ja" | "en") => {
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

    new Setting(destinationSection)
      .setName(this.plugin.t("settingInboxFolder"))
      .setDesc(this.plugin.t("settingInboxFolderDesc"))
      .addText((text) => {
        text
          .setPlaceholder(DEFAULT_SETTINGS.inboxFolder)
          .setValue(this.plugin.settings.inboxFolder || DEFAULT_SETTINGS.inboxFolder)
          .onChange(async (value) => {
            const folder = normalizePath(value) || DEFAULT_SETTINGS.inboxFolder;
            this.plugin.settings.inboxFolder = folder;
            this.plugin.settings.migrationTargetFolder = this.plugin.settings.migrationTargetFolder || folder;
            await this.plugin.saveSettings();
            this.refreshSummary();
          });
      });

    new Setting(destinationSection)
      .setName(this.plugin.t("settingFolderPreset"))
      .setDesc(this.plugin.t("settingFolderPresetDesc"))
      .addButton((button) => {
        button
          .setButtonText(this.plugin.t("settingFolderPresetButton"))
          .onClick(async () => {
            await this.plugin.applyFolderPreset();
            new Notice(this.plugin.t("noticeFolderPresetApplied"));
            this.display();
          });
      });

    const tagSection = this.createSection(
      containerEl,
      this.plugin.t("sectionTags"),
      this.plugin.t("sectionTagsDesc")
    );

    new Setting(tagSection)
      .setName(this.plugin.t("settingFixedTags"))
      .setDesc(this.plugin.t("settingFixedTagsDesc"))
      .addTextArea((text) => {
        text
          .setPlaceholder(this.plugin.getDefaultFixedTags().join("\n"))
          .setValue((this.plugin.settings.fixedTags || this.plugin.getDefaultFixedTags()).join("\n"))
          .onChange(async (value) => {
            this.plugin.settings.fixedTags = splitTags(value);
            await this.plugin.saveSettings();
            this.refreshSummary();
          });
        text.inputEl.rows = 3;
      });

    new Setting(tagSection)
      .setName(this.plugin.t("settingDomainTag"))
      .setDesc(this.plugin.t("settingDomainTagDesc"))
      .addToggle((toggle) => {
        toggle.setValue(!!this.plugin.settings.addDomainTag).onChange(async (value) => {
          this.plugin.settings.addDomainTag = value;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    new Setting(tagSection)
      .setName(this.plugin.t("settingFolderTags"))
      .setDesc(this.plugin.t("settingFolderTagsDesc"))
      .addToggle((toggle) => {
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

    new Setting(behaviorSection)
      .setName(this.plugin.t("settingConfirm"))
      .setDesc(this.plugin.t("settingConfirmDesc"))
      .addToggle((toggle) => {
        toggle.setValue(!!this.plugin.settings.confirmBeforeSave).onChange(async (value) => {
          this.plugin.settings.confirmBeforeSave = value;
          await this.plugin.saveSettings();
          this.refreshSummary();
        });
      });

    new Setting(behaviorSection)
      .setName(this.plugin.t("settingOpenAfterClip"))
      .addToggle((toggle) => {
        toggle.setValue(!!this.plugin.settings.openAfterClip).onChange(async (value) => {
          this.plugin.settings.openAfterClip = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(behaviorSection)
      .setName(this.plugin.t("settingFetchMetadata"))
      .setDesc(this.plugin.t("settingFetchMetadataDesc"))
      .addToggle((toggle) => {
        toggle.setValue(!!this.plugin.settings.fetchMetadata).onChange(async (value) => {
          this.plugin.settings.fetchMetadata = value;
          this.plugin.settings.fetchPageTitle = value;
          await this.plugin.saveSettings();
          this.refreshSummary();
        });
      });

    new Setting(behaviorSection)
      .setName(this.plugin.t("settingPreventDuplicates"))
      .addToggle((toggle) => {
        toggle.setValue(!!this.plugin.settings.preventDuplicateUrls).onChange(async (value) => {
          this.plugin.settings.preventDuplicateUrls = value;
          await this.plugin.saveSettings();
          this.refreshSummary();
        });
      });

    new Setting(behaviorSection)
      .setName(this.plugin.t("settingMaxFileName"))
      .setDesc(this.plugin.t("settingMaxFileNameDesc"))
      .addText((text) => {
        text
          .setPlaceholder("48")
          .setValue(String(this.plugin.settings.maxFileNameLength || DEFAULT_SETTINGS.maxFileNameLength))
          .onChange(async (value) => {
            this.plugin.settings.maxFileNameLength = normalizeFileNameLength(value);
            await this.plugin.saveSettings();
          });
      });

    new Setting(behaviorSection)
      .setName(this.plugin.t("settingDateFormat"))
      .addText((text) => {
        text
          .setPlaceholder("YYYY-MM-DD HH:mm")
          .setValue(this.plugin.settings.dateFormat)
          .onChange(async (value) => {
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
    new Setting(templateSection).addTextArea((text) => {
      text.inputEl.addClass("ishibashi-web-clipper-template");
      text
        .setValue(this.plugin.settings.noteTemplate || DEFAULT_SETTINGS.noteTemplate)
        .onChange(async (value) => {
          this.plugin.settings.noteTemplate = value || DEFAULT_SETTINGS.noteTemplate;
          await this.plugin.saveSettings();
        });
    });

    const maintenanceSection = this.createSection(
      containerEl,
      this.plugin.t("sectionMaintenance"),
      this.plugin.t("sectionMaintenanceDesc")
    );

    new Setting(maintenanceSection)
      .setName(this.plugin.t("settingLibraryOpen"))
      .setDesc(this.plugin.t("settingLibraryOpenDesc"))
      .addButton((button) => {
        button
          .setCta()
          .setButtonText(this.plugin.t("settingLibraryOpenButton"))
          .onClick(async () => {
            await this.plugin.openClipLibrary();
          });
      });

    new Setting(maintenanceSection)
      .setName(this.plugin.t("settingMigrationFolder"))
      .setDesc(this.plugin.t("settingMigrationFolderDesc"))
      .addText((text) => {
        text
          .setPlaceholder(this.plugin.getDefaultTargetFolder())
          .setValue(this.plugin.settings.migrationTargetFolder || this.plugin.getDefaultTargetFolder())
          .onChange(async (value) => {
            this.plugin.settings.migrationTargetFolder = normalizePath(value) || this.plugin.getDefaultTargetFolder();
            await this.plugin.saveSettings();
          });
      });

    new Setting(maintenanceSection)
      .setName(this.plugin.t("settingMigrationRun"))
      .setDesc(this.plugin.t("settingMigrationRunDesc"))
      .addButton((button) => {
        button
          .setButtonText(this.plugin.t("settingMigrationRunButton"))
          .onClick(() => this.plugin.openMigrationModal());
      });
  }

  createSection(containerEl: HTMLElement, title: string, description: string): HTMLElement {
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

  createSummary(containerEl: HTMLElement) {
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

  createCaptureGuide(containerEl: HTMLElement) {
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
    guide.createEl("code", {
      text: this.getBookmarkletCode(),
      cls: "ishibashi-web-clipper-code"
    });
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

  addSummaryItem(containerEl: HTMLElement, label: string, value: string) {
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

  addGuideItem(containerEl: HTMLElement, title: string, description: string) {
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

  getBookmarkletCode(): string {
    return `javascript:(()=>{const e=encodeURIComponent;const url=location.href;const title=document.title||"";const selection=window.getSelection?String(window.getSelection()).trim():"";let target=\`obsidian://${PROTOCOL_ACTION}?url=${"${e(url)}"}&title=${"${e(title)}"}\`;if(selection)target+=\`&note=${"${e(selection.slice(0,1500))}"}\`;location.href=target;})();`;
  }

  getDestinationSummary(): string {
    return this.plugin.settings.inboxFolder || DEFAULT_SETTINGS.inboxFolder;
  }

  getTagsSummary(): string {
    const tags = this.plugin.getClipTags(this.getDestinationSummary());
    return tags.length > 0 ? tags.join(", ") : this.plugin.t("summaryNoTags");
  }

  getProtectionSummary(): string {
    const duplicate = this.plugin.settings.preventDuplicateUrls
      ? this.plugin.t("summaryDuplicateOn")
      : this.plugin.t("summaryDuplicateOff");
    const metadata = this.plugin.settings.fetchMetadata
      ? this.plugin.t("summaryMetadataOn")
      : this.plugin.t("summaryMetadataOff");
    return `${duplicate} / ${metadata}`;
  }
}
