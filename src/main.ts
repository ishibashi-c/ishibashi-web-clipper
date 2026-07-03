import {
  ItemView,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  TFolder,
  parseYaml,
  requestUrl
} from "obsidian";

const VIEW_TYPE_CLIP_HISTORY = "ishibashi-web-clipper-history";
const VIEW_TYPE_CLIP_LIBRARY = "ishibashi-web-clipper-library";
const PROTOCOL_ACTION = "ishibashi-web-clip";
const LEGACY_PROTOCOL_ACTION = "myplugin-web-clip";

const DEFAULT_SETTINGS = {
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

interface WebClipMetadata {
  url: string;
  title: string;
  site: string;
  description: string;
  image: string;
  domain: string;
}

interface ClipDraft {
  url: string;
  title: string;
  note: string;
  targetFolder: string;
  tags: string[];
  metadata: WebClipMetadata;
}

interface ClipHistoryEntry {
  url: string;
  title: string;
  path: string;
  domain: string;
  site: string;
  created: string;
  status: string;
}

interface WebClipperSettings {
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

interface WebClipMigrationItem {
  file: TFile;
  changes: string[];
}

interface WebClipLibraryItem {
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

interface WebClipMigrationResult {
  updated: number;
  failed: number;
}

export default class IshibashiWebClipper extends Plugin {
  settings: WebClipperSettings;

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

    this.addRibbonIcon("library", this.t("ribbonOpenLibrary"), async () => {
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
    if (this.settings.workflowMode === "inbox") {
      return normalizePath(this.settings.inboxFolder || DEFAULT_SETTINGS.inboxFolder);
    }
    return normalizePath(this.settings.targetFolder || DEFAULT_SETTINGS.targetFolder);
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
  workflowMode: "inbox" | "direct";

  constructor(app: any, plugin: IshibashiWebClipper) {
    super(app);
    this.plugin = plugin;
    this.language = plugin.settings.language || "ja";
    this.workflowMode = plugin.settings.workflowMode || "inbox";
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
      .setName(translate(this.language, "settingWorkflow"))
      .setDesc(translate(this.language, "settingWorkflowDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("inbox", translate(this.language, "workflowInbox"))
          .addOption("direct", translate(this.language, "workflowDirect"))
          .setValue(this.workflowMode)
          .onChange((value: "inbox" | "direct") => {
            this.workflowMode = value;
          });
      });

    new Setting(contentEl)
      .addButton((button) => {
        button
          .setCta()
          .setButtonText(translate(this.language, "firstRunStart"))
          .onClick(async () => {
            this.plugin.settings.language = this.language;
            this.plugin.settings.workflowMode = this.workflowMode;
            if (this.workflowMode === "inbox") {
              this.plugin.settings.inboxFolder = this.language === "ja"
                ? "08_Webクリップ/10_未整理"
                : "Web Clips/Inbox";
              this.plugin.settings.confirmBeforeSave = false;
            } else {
              this.plugin.settings.targetFolder = "Web Clips";
              this.plugin.settings.confirmBeforeSave = true;
            }
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
  }

  async load() {
    this.loading = true;
    this.render();
    this.items = await this.plugin.collectWebClipLibraryItems();
    this.selectedPaths = new Set(Array.from(this.selectedPaths).filter((path) => this.items.some((item) => item.file.path === path)));
    if (this.selectedPath && !this.items.some((item) => item.file.path === this.selectedPath)) {
      this.selectedPath = "";
    }
    this.loading = false;
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
    const refresh = header.createEl("button", {
      text: this.plugin.t("libraryRefresh"),
      cls: "mod-cta"
    });
    refresh.addEventListener("click", async () => {
      await this.load();
    });

    if (this.loading) {
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
    list.style.gridTemplateColumns = `repeat(${gridColumns}, minmax(0, 1fr))`;

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
      const top = card.createDiv({ cls: "ishibashi-web-clipper-library-card-top" });
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

      const title = card.createDiv({
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
        card.createDiv({
          text: item.description,
          cls: "ishibashi-web-clipper-library-desc"
        });
      }

      const meta = card.createDiv({ cls: "ishibashi-web-clipper-library-meta" });
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
        const tags = card.createDiv({ cls: "ishibashi-web-clipper-library-tags" });
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

      const addTag = card.createEl("button", {
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
            this.plugin.settings.language = value;
            await this.plugin.saveSettings();
            this.display();
          });
      });

    new Setting(startSection)
      .setName(this.plugin.t("settingWorkflow"))
      .setDesc(this.plugin.t("settingWorkflowDesc"))
      .addDropdown((dropdown) => {
        dropdown
          .addOption("inbox", this.plugin.t("workflowInbox"))
          .addOption("direct", this.plugin.t("workflowDirect"))
          .setValue(this.plugin.settings.workflowMode)
          .onChange(async (value: "inbox" | "direct") => {
            this.plugin.settings.workflowMode = value;
            await this.plugin.saveSettings();
            this.display();
          });
      });

    const destinationSection = this.createSection(
      containerEl,
      this.plugin.t("sectionDestination"),
      this.plugin.t("sectionDestinationDesc")
    );

    if (this.plugin.settings.workflowMode === "inbox") {
      new Setting(destinationSection)
        .setName(this.plugin.t("settingInboxFolder"))
        .setDesc(this.plugin.t("settingInboxFolderDesc"))
        .addText((text) => {
          text
            .setPlaceholder("08_Webクリップ/10_未整理")
            .setValue(this.plugin.settings.inboxFolder || DEFAULT_SETTINGS.inboxFolder)
            .onChange(async (value) => {
              this.plugin.settings.inboxFolder = normalizePath(value) || DEFAULT_SETTINGS.inboxFolder;
              await this.plugin.saveSettings();
            });
        });

    }

    new Setting(destinationSection)
      .setName(this.plugin.t("settingTargetFolder"))
      .setDesc(this.plugin.t("settingTargetFolderDesc"))
      .addText((text) => {
        text
          .setPlaceholder("Web Clips")
          .setValue(this.plugin.settings.targetFolder || DEFAULT_SETTINGS.targetFolder)
          .onChange(async (value) => {
            this.plugin.settings.targetFolder = normalizePath(value) || DEFAULT_SETTINGS.targetFolder;
            await this.plugin.saveSettings();
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
          .setPlaceholder("webclip")
          .setValue((this.plugin.settings.fixedTags || DEFAULT_SETTINGS.fixedTags).join("\n"))
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

    const browserSection = this.createSection(
      containerEl,
      this.plugin.t("sectionBrowser"),
      this.plugin.t("sectionBrowserDesc")
    );
    const example = `obsidian://${PROTOCOL_ACTION}?url=https%3A%2F%2Fexample.com&title=Example`;
    browserSection.createEl("code", {
      text: example,
      cls: "ishibashi-web-clipper-code"
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
    this.addSummaryItem(grid, this.plugin.t("summaryWorkflow"), this.getWorkflowSummary());
    this.addSummaryItem(grid, this.plugin.t("summaryDestination"), this.getDestinationSummary());
    this.addSummaryItem(grid, this.plugin.t("summaryTags"), this.getTagsSummary());
    this.addSummaryItem(grid, this.plugin.t("summaryProtection"), this.getProtectionSummary());
  }

  refreshSummary() {
    const summary = this.containerEl.querySelector(".ishibashi-web-clipper-settings-summary");
    if (!summary) return;
    summary.remove();
    const h2 = this.containerEl.querySelector("h2");
    const intro = this.containerEl.querySelector(".ishibashi-web-clipper-settings-intro");
    this.createSummary(this.containerEl);
    const newSummary = this.containerEl.querySelector(".ishibashi-web-clipper-settings-summary");
    if (newSummary && (intro || h2)) {
      (intro || h2)?.insertAdjacentElement("afterend", newSummary);
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

  getWorkflowSummary(): string {
    return this.plugin.settings.workflowMode === "inbox"
      ? this.plugin.t("summaryInboxWorkflow")
      : this.plugin.t("summaryDirectWorkflow");
  }

  getDestinationSummary(): string {
    if (this.plugin.settings.workflowMode === "inbox") {
      return this.plugin.settings.inboxFolder || DEFAULT_SETTINGS.inboxFolder;
    }
    return this.plugin.settings.targetFolder || DEFAULT_SETTINGS.targetFolder;
  }

  getTagsSummary(): string {
    const tags = this.plugin.getClipTags(this.getDestinationSummary(), "note.com");
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

function mergeSettings(saved) {
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
  return settings;
}

const STRINGS = {
  ja: {
    menuSaveClip: "ウェブクリップに保存",
    ribbonOpenLibrary: "Webクリップ管理ページをサイドバーで開く",
    commandClipClipboard: "クリップボードのURLをウェブクリップに保存する",
    commandOpenHistory: "ウェブクリップ履歴を開く",
    commandOpenLibrary: "Webクリップ管理ページを開く",
    commandOpenLibrarySidebar: "Webクリップ管理ページをサイドバーで開く",
    commandShowFolder: "ウェブクリップ保存先フォルダを確認する",
    commandMigrateClips: "既存Webクリップを最新版形式に整える",
    historyTitle: "Webクリップ履歴",
    historyEmpty: "まだ保存履歴がありません。",
    noticeNoUrl: "保存するURLがありません。",
    noticeNoClipboardUrl: "クリップボードにURLが見つかりません。",
    noticeClipboardFailed: "クリップボードを読み取れませんでした。",
    noticeNoSharedUrl: "共有テキストにURLが見つかりません。",
    noticeInvalidUrl: "保存するURLが正しくありません。",
    noticeDuplicate: "同じURLのウェブクリップが既にあります。",
    noticeCreated: "ウェブクリップを作成しました",
    noticeTargetFolder: "保存先",
    firstRunDesc: "最初に言語と保存ワークフローを選んでください。後から設定で変更できます。",
    firstRunStart: "開始",
    settingsIntro: "スマホ共有、ブックマークレット、クリップボード保存で作成されるノートの保存ルールをまとめて管理します。",
    summaryHeading: "現在の保存ルール",
    summaryWorkflow: "流れ",
    summaryDestination: "保存先",
    summaryTags: "付与タグ",
    summaryProtection: "保存保護",
    summaryInboxWorkflow: "未整理に入れて後で整理",
    summaryDirectWorkflow: "指定フォルダへ直接保存",
    summaryNoTags: "タグなし",
    summaryDuplicateOn: "重複URLを防止",
    summaryDuplicateOff: "重複URLを許可",
    summaryMetadataOn: "メタデータ取得あり",
    summaryMetadataOff: "メタデータ取得なし",
    sectionStart: "最初に決めること",
    sectionStartDesc: "表示言語と、クリップを一旦集めるか直接保存するかを決めます。",
    sectionDestination: "保存先",
    sectionDestinationDesc: "未整理運用ではまず整理待ちフォルダへ入れ、直接保存運用では基本フォルダへ保存します。",
    sectionTags: "タグ",
    sectionTagsDesc: "固定タグ、保存元ドメイン、保存先フォルダ由来のタグを管理します。",
    sectionBehavior: "保存時の動き",
    sectionBehaviorDesc: "確認画面、重複防止、ファイル名、日付形式などの保存ルールです。",
    sectionTemplate: "ノート本文",
    sectionTemplateDesc: "作成されるMarkdownノートの本文テンプレートです。",
    sectionBrowser: "ブラウザから保存",
    sectionBrowserDesc: "PCブラウザのブックマークレットなどから呼び出す共有URLの形式です。",
    sectionMaintenance: "既存クリップの整理",
    sectionMaintenanceDesc: "過去に作成したWebクリップを、現在の保存ルールに合わせてfrontmatterだけ整えます。",
    settingLanguage: "言語",
    settingLanguageDesc: "設定画面、通知、確認画面の表示言語。",
    settingWorkflow: "保存ワークフロー",
    settingWorkflowDesc: "一旦整理待ちフォルダに入れるか、保存時に直接フォルダを選ぶかを選びます。",
    workflowInbox: "一旦Inbox/未整理に保存して後で整理する",
    workflowDirect: "保存時のフォルダに直接保存する",
    settingInboxFolder: "整理待ちフォルダ",
    settingInboxFolderDesc: "Inbox運用時にすべてのクリップをまず保存するフォルダ。",
    settingTargetFolder: "直接保存先フォルダ",
    settingTargetFolderDesc: "直接保存モード、または確認画面で使う基本フォルダ。",
    settingConfirm: "保存前に確認する",
    settingConfirmDesc: "タイトル、保存先、タグ、メモを保存前に編集します。",
    settingOpenAfterClip: "保存後にノートを開く",
    settingFetchMetadata: "メタデータを取得する",
    settingFetchMetadataDesc: "本文抽出は行わず、公開メタデータだけを取得します。",
    settingPreventDuplicates: "同じURLの重複保存を防ぐ",
    settingMaxFileName: "ファイル名の最大文字数",
    settingMaxFileNameDesc: "Syncで扱いやすい短めのファイル名にします。日付はfrontmatterに保存します。",
    settingFixedTags: "固定タグ",
    settingFixedTagsDesc: "作成するWebクリップに常に付けるタグ。1行に1タグ。空欄にすると固定タグを付けません。",
    settingFolderTags: "保存先フォルダからタグを付ける",
    settingFolderTagsDesc: "Auto Taggerなどでフォルダ由来タグを管理する場合はOFF推奨です。",
    settingDomainTag: "ドメインからタグを付ける",
    settingDomainTagDesc: "note.comなら note のように、保存元サイトをタグ化します。",
    settingDateFormat: "日付形式",
    settingLibraryOpen: "Webクリップ管理ページ",
    settingLibraryOpenDesc: "保存済みWebクリップを横断的に検索、分類、並べ替えできます。",
    settingLibraryOpenButton: "管理ページを開く",
    settingMigrationFolder: "移行対象フォルダ",
    settingMigrationFolderDesc: "このフォルダ配下のMarkdownだけを確認します。Vault全体は走査しません。",
    settingMigrationRun: "既存Webクリップを最新版形式に整える",
    settingMigrationRunDesc: "実行前に変更対象と変更内容をプレビューします。本文、ファイル名、保存場所は変更しません。",
    settingMigrationRunButton: "プレビューを開く",
    templateHeading: "ノート本文テンプレート",
    templateHelp: "{{date}}, {{title}}, {{url}}, {{note}}, {{description}}, {{image}}, {{site}}, {{domain}}, {{tags}} が使えます。",
    uriHeading: "共有用URL",
    confirmTitle: "ウェブクリップを保存",
    fieldTitle: "タイトル",
    fieldFolder: "保存先",
    fieldTags: "タグ",
    fieldTagsDesc: "カンマまたは改行区切り。",
    fieldMemo: "メモ",
    libraryTitle: "Webクリップ管理",
    librarySubtitle: "保存済みクリップをフォルダ、ドメイン、タグで横断的に見直します。",
    libraryRefresh: "更新",
    libraryLoading: "Webクリップを読み込んでいます。",
    libraryBrowseBy: "分類",
    libraryByFolder: "フォルダ",
    libraryByDomain: "ドメイン",
    libraryByTag: "タグ",
    libraryGroupSortCountDesc: "件数 多い順",
    libraryGroupSortCountAsc: "件数 少ない順",
    libraryGroupSortNameAsc: "名前 昇順",
    libraryGroupSortNameDesc: "名前 降順",
    libraryAllClips: "すべて",
    libraryMoreGroups: "ほか {{count}} 件",
    libraryShowing: "{{count}} 件を表示",
    librarySearchPlaceholder: "タイトル、URL、タグ、説明で検索",
    librarySortDateDesc: "日付 降順",
    librarySortDateAsc: "日付 昇順",
    librarySortTitleAsc: "タイトル 昇順",
    librarySortTitleDesc: "タイトル 降順",
    librarySortDomainAsc: "ドメイン 昇順",
    librarySortDomainDesc: "ドメイン 降順",
    libraryColumns1: "1列",
    libraryColumns2: "2列",
    libraryColumns3: "3列",
    libraryEmpty: "条件に合うWebクリップがありません。",
    libraryNoDomain: "ドメインなし",
    libraryOpenSource: "元ページ",
    libraryOpenNote: "ノートを開く",
    libraryEditClip: "編集",
    libraryEditTab: "編集",
    libraryEditTitle: "Webクリップを整理",
    libraryEditNoSelection: "編集するWebクリップを選択してください。",
    libraryChooseTags: "タグを選択",
    libraryEditFolderDesc: "移動先フォルダ。存在しない場合は作成します。",
    libraryEditTagsDesc: "タグを改行またはカンマ区切りで貼り付けできます。",
    libraryEditApply: "変更を適用",
    libraryEditFolderRequired: "移動先フォルダを入力してください。",
    libraryEditComplete: "Webクリップを更新しました。",
    libraryEditFailed: "Webクリップの更新に失敗しました。",
    librarySelectClip: "Webクリップを選択",
    libraryAddTag: "+ タグ",
    libraryAddTagDesc: "追加するタグを改行またはカンマ区切りで入力してください。",
    libraryRemoveTag: "{{tag}} を削除",
    libraryRemoveTagDesc: "削除するタグを改行またはカンマ区切りで入力してください。",
    libraryMoveFolderDesc: "移動先フォルダを入力してください。",
    libraryTagSearchPlaceholder: "既存タグを検索",
    libraryFolderSearchPlaceholder: "保存先フォルダを検索",
    libraryBulkSelected: "{{count}}件を選択中",
    libraryBulkAddTag: "タグ追加",
    libraryBulkRemoveTag: "タグ削除",
    libraryBulkMoveFolder: "フォルダ移動",
    libraryBulkClear: "選択解除",
    libraryOverview: "概要",
    libraryTotal: "総数",
    libraryFiltered: "表示中",
    libraryDomains: "ドメイン",
    libraryTags: "タグ",
    libraryFrequentTags: "よく使うタグ",
    libraryResizeSidebar: "分類ペインの幅を変更",
    libraryResizeInspector: "概要ペインの幅を変更",
    libraryUnknown: "未分類",
    migrationTitle: "既存Webクリップを最新版形式に整える",
    migrationDesc: "対象フォルダ内のWebクリップだけを確認し、旧仕様の status、欠けている作成日時、domain、現在のタグ設定との差分を整えます。",
    migrationPreview: "対象を確認",
    migrationApply: "変更を適用",
    migrationPreviewHeading: "変更プレビュー",
    migrationNoChanges: "変更が必要なWebクリップはありません。",
    migrationResult: "{{count}}件のWebクリップに変更があります。",
    migrationMore: "ほか {{count}} 件",
    migrationFolderRequired: "移行対象フォルダを入力してください。",
    migrationComplete: "{{count}}件のWebクリップを更新しました。",
    migrationCompleteWithFailures: "{{count}}件を更新しました。{{failed}}件は失敗しました。詳細は開発者コンソールを確認してください。",
    migrationChangeType: "type: webclip を追加",
    migrationChangeStatus: "旧仕様の status: unreviewed を削除",
    migrationChangeCreatedAt: "created_at を追加",
    migrationChangeDomain: "domain を追加",
    migrationChangeTags: "タグを追加",
    buttonCancel: "キャンセル",
    buttonSave: "保存"
  },
  en: {
    menuSaveClip: "Save to Web Clips",
    ribbonOpenLibrary: "Open Web Clip Library in sidebar",
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
    firstRunDesc: "Choose your language and save workflow. You can change these later in settings.",
    firstRunStart: "Start",
    settingsIntro: "Manage how notes are created from mobile sharing, bookmarklets, and clipboard saves.",
    summaryHeading: "Current save rules",
    summaryWorkflow: "Flow",
    summaryDestination: "Destination",
    summaryTags: "Tags",
    summaryProtection: "Save protection",
    summaryInboxWorkflow: "Collect in Inbox and organize later",
    summaryDirectWorkflow: "Save directly to the destination",
    summaryNoTags: "No tags",
    summaryDuplicateOn: "Duplicate URLs blocked",
    summaryDuplicateOff: "Duplicate URLs allowed",
    summaryMetadataOn: "Metadata fetch on",
    summaryMetadataOff: "Metadata fetch off",
    sectionStart: "Start here",
    sectionStartDesc: "Choose the display language and whether clips are collected first or saved directly.",
    sectionDestination: "Destination",
    sectionDestinationDesc: "Inbox workflow collects clips first. Direct workflow saves to the default destination.",
    sectionTags: "Tags",
    sectionTagsDesc: "Manage fixed tags, source-domain tags, and folder-derived tags.",
    sectionBehavior: "Save behavior",
    sectionBehaviorDesc: "Control confirmation, duplicate prevention, filenames, and date format.",
    sectionTemplate: "Note body",
    sectionTemplateDesc: "Markdown template used when creating a web clip note.",
    sectionBrowser: "Browser capture",
    sectionBrowserDesc: "URL format used by browser bookmarklets and other external launchers.",
    sectionMaintenance: "Existing clips",
    sectionMaintenanceDesc: "Update old web clip frontmatter to match the current save rules.",
    settingLanguage: "Language",
    settingLanguageDesc: "Language for settings, notices, and confirmation screens.",
    settingWorkflow: "Save workflow",
    settingWorkflowDesc: "Choose whether clips first go to an inbox folder or directly to the destination folder.",
    workflowInbox: "Save to Inbox first and organize later",
    workflowDirect: "Save directly to the destination folder",
    settingInboxFolder: "Inbox folder",
    settingInboxFolderDesc: "Folder where clips are first saved in Inbox workflow.",
    settingTargetFolder: "Direct destination folder",
    settingTargetFolderDesc: "Default folder for direct save mode or confirmation edits.",
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

function translate(language: "ja" | "en", key: string): string {
  return STRINGS[language]?.[key] || STRINGS.ja[key] || key;
}

function firstValue(value) {
  if (Array.isArray(value)) return value[0] || "";
  return String(value || "");
}

function parseSharedText(text) {
  const raw = String(text || "").trim();
  const url = extractFirstUrl(raw);
  if (!url) return { url: "", title: "", note: "" };

  const withoutUrl = raw.replace(url, "").trim();
  const lines = withoutUrl
    .split(/\r?\n/)
    .map((line) => cleanText(line))
    .filter(Boolean)
    .filter((line) => !looksLikeUrl(line));

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

function urlsMatch(left, right): boolean {
  const normalizedLeft = normalizeCacheKey(normalizeUrl(left) || left);
  const normalizedRight = normalizeCacheKey(normalizeUrl(right) || right);
  return normalizedLeft === normalizedRight
    || stripTrailingSlash(normalizedLeft) === stripTrailingSlash(normalizedRight);
}

function getCachedFrontmatter(app: any, file: TFile): Record<string, any> | null {
  const frontmatter = app.metadataCache?.getFileCache(file)?.frontmatter;
  return frontmatter && typeof frontmatter === "object" ? frontmatter : null;
}

function readFrontmatter(text): Record<string, any> | null {
  const match = String(text || "").match(/^---\s*\n([\s\S]*?)\n---(?:\n|$)/);
  if (!match) return null;
  try {
    const value = parseYaml(match[1]);
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

function isWebClipFrontmatter(frontmatter: Record<string, any> | null): boolean {
  if (!frontmatter) return false;
  return frontmatter.type === "webclip" || !!frontmatterString(frontmatter.source);
}

function isStrictWebClipFrontmatter(frontmatter: Record<string, any> | null): boolean {
  return !!frontmatter && frontmatter.type === "webclip" && !!frontmatterString(frontmatter.source);
}

function hasWebClipSource(frontmatter: Record<string, any> | null): boolean {
  if (!frontmatter) return false;
  return frontmatter.type === "webclip" || !!frontmatterString(frontmatter.source);
}

function frontmatterString(value): string {
  if (Array.isArray(value)) return cleanText(value[0] || "");
  if (value === null || value === undefined) return "";
  return cleanText(String(value));
}

function normalizeFrontmatterTags(value): string[] {
  if (Array.isArray(value)) {
    return unique(value.map(normalizeTag).filter(Boolean));
  }
  if (typeof value === "string") {
    return splitTags(value);
  }
  return [];
}

function isFileInFolder(file: TFile, folder: string): boolean {
  const normalizedFolder = normalizePath(folder);
  if (!normalizedFolder) return false;
  return file.path.startsWith(`${normalizedFolder}/`);
}

function getParentPath(file: TFile): string {
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

function cleanMetadata(metadata: Partial<WebClipMetadata>): WebClipMetadata {
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

function parseOpenGraph(html: string): Record<string, string> {
  const tags: Record<string, string> = {};
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
  return match ? (match[2] || match[3] || match[4] || "") : "";
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
  return decodeHtmlEntities(value)
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(value) {
  return decodeHtmlEntities(value)
    .replace(/\s+/g, " ")
    .trim();
}

function cleanMemo(value) {
  return decodeHtmlEntities(value)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeProtocolText(value) {
  return String(value || "").replace(/\+/g, " ");
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function looksLikeUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function normalizePath(path) {
  return String(path || "").trim().replace(/^\/+|\/+$/g, "");
}

function sanitizeFileName(value) {
  return String(value || "")
    .trim()
    .replace(/[\\\/:*?"<>|#\[\]\n\r\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function normalizeLibraryPaneWidth(value, min: number, max: number, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function normalizeGridColumns(value): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_SETTINGS.libraryGridColumns;
  return Math.max(1, Math.min(3, parsed));
}

function tagsFromFolderPath(path) {
  const mappings = {
    "08_Webクリップ": "Webクリップ"
  };

  return normalizePath(path)
    .split("/")
    .filter(Boolean)
    .map((part) => mappings[part] || part.replace(/^\d{2}_/, ""))
    .map(normalizeTag)
    .filter(Boolean)
    .filter((tag, index, tags) => tags.indexOf(tag) === index);
}

function tagFromDomain(domain: string): string {
  const host = String(domain || "").toLowerCase().replace(/^www\./, "");
  const parts = host.split(".").filter(Boolean);
  if (parts.length === 0) return "";

  const secondLevelTlds = new Set(["co", "com", "ne", "or", "go", "ac", "ed"]);
  if (parts.length >= 3 && parts[parts.length - 1].length === 2 && secondLevelTlds.has(parts[parts.length - 2])) {
    return normalizeTag(parts[parts.length - 3]);
  }

  return normalizeTag(parts.length >= 2 ? parts[parts.length - 2] : parts[0]);
}

function splitTags(value: string): string[] {
  return unique(String(value || "")
    .split(/[,\n]/)
    .map(normalizeTag)
    .filter(Boolean));
}

function normalizeTag(value) {
  return String(value || "")
    .trim()
    .replace(/^#+/, "")
    .replace(/[#[\]\n\r\t]/g, " ")
    .replace(/[\\\/]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function libraryTime(item: WebClipLibraryItem): number {
  const parsed = Date.parse(item.createdAt || item.created || "");
  return Number.isFinite(parsed) ? parsed : item.file.stat.ctime;
}

function formatLibraryDate(value: string): string {
  const parsed = Date.parse(value || "");
  if (!Number.isFinite(parsed)) return value || "";
  return window.moment(parsed).format("YYYY/MM/DD HH:mm");
}

function shortHash(value) {
  let hash = 0;
  const text = String(value || "");
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).slice(0, 6) || "clip";
}

function nowIsoString() {
  return new Date().toISOString();
}

function shouldResolveSharedRedirect(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return host === "share.google" || host.endsWith(".share.google");
  } catch {
    return false;
  }
}

async function resolveFetchFinalUrl(url: string, timeoutMs: number): Promise<string> {
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

function inferCreatedAt(createdAt: string, created: string, file: TFile): string {
  const existing = Date.parse(createdAt || "");
  if (Number.isFinite(existing)) return new Date(existing).toISOString();

  const legacy = Date.parse(created || "");
  if (Number.isFinite(legacy)) return new Date(legacy).toISOString();

  return new Date(file.stat.ctime).toISOString();
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    promise
      .then((value) => resolve(value))
      .catch((error) => reject(error))
      .finally(() => window.clearTimeout(timer));
  });
}

function stripTrailingSlash(value) {
  return String(value || "").replace(/\/$/, "");
}
