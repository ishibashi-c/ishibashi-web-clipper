import { App, FrontMatterCache, TFile, parseYaml, requestUrl } from "obsidian";
import { DEFAULT_SETTINGS } from "./constants";
import { WebClipLibraryItem, WebClipMetadata } from "./types";

type FrontmatterData = Record<string, unknown>;

function isRecord(value: unknown): value is FrontmatterData {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function firstValue(value: unknown): string {
  if (Array.isArray(value)) return value[0] || "";
  return String(value || "");
}

export function parseSharedText(text: unknown): { url: string; title: string; note: string } {
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

export function extractFirstUrl(text: unknown): string {
  const match = String(text || "").match(/https?:\/\/[^\s<>"'`]+/i);
  return match ? stripTrailingUrlPunctuation(match[0]) : "";
}

export function stripTrailingUrlPunctuation(url: unknown): string {
  return String(url || "").replace(/[),.。、，）]+$/g, "");
}

export function normalizeUrl(url: unknown): string {
  try {
    const parsed = new URL(stripTrailingUrlPunctuation(url));
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

export function normalizeCacheKey(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url;
  }
}

export function urlsMatch(left, right): boolean {
  const normalizedLeft = normalizeCacheKey(normalizeUrl(left) || left);
  const normalizedRight = normalizeCacheKey(normalizeUrl(right) || right);
  return normalizedLeft === normalizedRight
    || stripTrailingSlash(normalizedLeft) === stripTrailingSlash(normalizedRight);
}

export function getCachedFrontmatter(app: App, file: TFile): FrontMatterCache | null {
  const frontmatter = app.metadataCache?.getFileCache(file)?.frontmatter;
  return frontmatter && typeof frontmatter === "object" ? frontmatter : null;
}

export function readFrontmatter(text: string): FrontmatterData | null {
  const match = String(text || "").match(/^---\s*\n([\s\S]*?)\n---(?:\n|$)/);
  if (!match) return null;
  try {
    const value = parseYaml(match[1]) as unknown;
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

export function isWebClipFrontmatter(frontmatter: FrontmatterData | null): boolean {
  if (!frontmatter) return false;
  return frontmatter.type === "webclip" || !!frontmatterString(frontmatter.source);
}

export function isStrictWebClipFrontmatter(frontmatter: FrontmatterData | null): boolean {
  return !!frontmatter && frontmatter.type === "webclip" && !!frontmatterString(frontmatter.source);
}

export function hasWebClipSource(frontmatter: FrontmatterData | null): boolean {
  if (!frontmatter) return false;
  return frontmatter.type === "webclip" || !!frontmatterString(frontmatter.source);
}

export function frontmatterString(value: unknown): string {
  if (Array.isArray(value)) return cleanText(value[0] || "");
  if (value === null || value === undefined) return "";
  return cleanText(String(value));
}

export function normalizeFrontmatterTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return unique(value.map(normalizeTag).filter(Boolean));
  }
  if (typeof value === "string") {
    return splitTags(value);
  }
  return [];
}

export function isFileInFolder(file: TFile, folder: string): boolean {
  const normalizedFolder = normalizePath(folder);
  if (!normalizedFolder) return false;
  return file.path.startsWith(`${normalizedFolder}/`);
}

export function getParentPath(file: TFile): string {
  const index = file.path.lastIndexOf("/");
  return index >= 0 ? file.path.slice(0, index) : "";
}

export function fallbackMetadata(url: string, sharedTitle: string): WebClipMetadata {
  return cleanMetadata({
    url,
    title: cleanTitle(sharedTitle) || titleFromUrl(url),
    site: readableHost(url),
    description: "",
    image: ""
  });
}

export function cleanMetadata(metadata: Partial<WebClipMetadata>): WebClipMetadata {
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

export function parseOpenGraph(html: string): Record<string, string> {
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

export function getHtmlAttribute(tag: string, name: string): string {
  const re = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = tag.match(re);
  return match ? (match[2] || match[3] || match[4] || "") : "";
}

export function parseHtmlTitle(html: string): string {
  const match = String(html || "").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtmlEntities(match[1]) : "";
}

export function absoluteUrl(value: string, baseUrl: string): string {
  if (!value) return "";
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

export function titleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = decodeURIComponent(parsed.pathname.replace(/^\/+|\/+$/g, ""));
    return cleanTitle(path || parsed.hostname.replace(/^www\./, ""));
  } catch {
    return "Untitled";
  }
}

export function readableHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function domainFromUrl(url: string): string {
  return readableHost(url).toLowerCase();
}

export function cleanTitle(value: unknown): string {
  return decodeHtmlEntities(value)
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanText(value: unknown): string {
  return decodeHtmlEntities(value)
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanMemo(value: unknown): string {
  return decodeHtmlEntities(value)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function decodeProtocolText(value: unknown): string {
  return String(value || "").replace(/\+/g, " ");
}

export function decodeHtmlEntities(value: unknown): string {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/");
}

export function looksLikeUrl(value: unknown): boolean {
  return /^https?:\/\//i.test(String(value || "").trim());
}

export function normalizePath(path: unknown): string {
  return String(path || "").trim().replace(/^\/+|\/+$/g, "");
}

export function sanitizeFileName(value: unknown): string {
  return String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|#\]\n\r\t]/g, " ")
    .replace(/\[/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateFileName(value: unknown, maxLength: number): string {
  const chars = Array.from(String(value || ""));
  if (chars.length <= maxLength) return chars.join("");
  return chars.slice(0, maxLength).join("").trim();
}

export function normalizeFileNameLength(value: unknown): number {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_SETTINGS.maxFileNameLength;
  return Math.max(20, Math.min(80, parsed));
}

export function normalizeLibraryPaneWidth(value, min: number, max: number, fallback: number): number {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export function normalizeGridColumns(value): number {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_SETTINGS.libraryGridColumns;
  return Math.max(1, Math.min(3, parsed));
}

export function tagsFromFolderPath(path: string): string[] {
  return normalizePath(path)
    .split("/")
    .filter(Boolean)
    .map((part) => part.replace(/^\d{2}_/, ""))
    .map(normalizeTag)
    .filter(Boolean)
    .filter((tag, index, tags) => tags.indexOf(tag) === index);
}

export function tagFromDomain(domain: string): string {
  const host = String(domain || "").toLowerCase().replace(/^www\./, "");
  const parts = host.split(".").filter(Boolean);
  if (parts.length === 0) return "";

  const secondLevelTlds = new Set(["co", "com", "ne", "or", "go", "ac", "ed"]);
  if (parts.length >= 3 && parts[parts.length - 1].length === 2 && secondLevelTlds.has(parts[parts.length - 2])) {
    return normalizeTag(parts[parts.length - 3]);
  }

  return normalizeTag(parts.length >= 2 ? parts[parts.length - 2] : parts[0]);
}

export function splitTags(value: string): string[] {
  return unique(String(value || "")
    .split(/[,\n]/)
    .map(normalizeTag)
    .filter(Boolean));
}

export function normalizeTag(value: unknown): string {
  return String(value || "")
    .trim()
    .replace(/^#+/, "")
    .replace(/[#[\]\n\r\t]/g, " ")
    .replace(/\\/g, "-")
    .replace(/\//g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

export function libraryTime(item: WebClipLibraryItem): number {
  const parsed = Date.parse(item.createdAt || item.created || "");
  return Number.isFinite(parsed) ? parsed : item.file.stat.ctime;
}

export function formatLibraryDate(value: string): string {
  const parsed = Date.parse(value || "");
  if (!Number.isFinite(parsed)) return value || "";
  return window.moment(parsed).format("YYYY/MM/DD HH:mm");
}

export function shortHash(value: unknown): string {
  let hash = 0;
  const text = String(value || "");
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).slice(0, 6) || "clip";
}

export function nowIsoString() {
  return new Date().toISOString();
}

export function shouldResolveSharedRedirect(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return host === "share.google" || host.endsWith(".share.google");
  } catch {
    return false;
  }
}

export async function resolveFetchFinalUrl(url: string, timeoutMs: number): Promise<string> {
  const response = await withTimeout(requestUrl({ url, method: "GET", throw: false }), timeoutMs);
  const location = response.headers.location || response.headers.Location || "";
  return location ? normalizeUrl(absoluteUrl(location, url)) : "";
}

export function inferCreatedAt(createdAt: string, created: string, file: TFile): string {
  const existing = Date.parse(createdAt || "");
  if (Number.isFinite(existing)) return new Date(existing).toISOString();

  const legacy = Date.parse(created || "");
  if (Number.isFinite(legacy)) return new Date(legacy).toISOString();

  return new Date(file.stat.ctime).toISOString();
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    promise
      .then((value) => resolve(value))
      .catch((error: unknown) => reject(error instanceof Error ? error : new Error(String(error))))
      .finally(() => window.clearTimeout(timer));
  });
}

export function stripTrailingSlash(value: unknown): string {
  return String(value || "").replace(/\/$/, "");
}
