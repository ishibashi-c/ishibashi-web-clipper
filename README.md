# Ishibashi Web Clipper

Ishibashi Web Clipper captures shared web links as Markdown notes in Obsidian.
It is designed for mobile sharing workflows: send a URL to Obsidian, save a short note, avoid duplicate clips, and review recent clips later.

## Features

- Capture URLs from Obsidian mobile share text, clipboard, or `obsidian://` URL actions.
- Save one Markdown note per web page.
- Fetch public page metadata only: title, site name, description, image URL, and domain.
- Avoid duplicate clips by checking existing notes for the same source URL.
- Generate short title-based filenames for sync-friendly paths.
- Add a fixed tag by default: `webclip` in English, `webクリップ` in Japanese.
- Optionally add a source tag from the page domain, such as `note` from `note.com`.
- Optionally add tags from the destination folder.
- Optional confirmation modal before saving.
- Clip history view for recently saved or duplicate clips.
- Web Clip Library view for browsing saved clips across folders, domains, and tags.
- First-run setup for Japanese or English UI.
- Inbox-first workflow: save every clip to a staging folder first, then organize later.
- Optional folder preset for creating a `10_...`, `20_...`, `30_...` classification structure under `webclip` in English or `webクリップ` in Japanese.
- Migration command for updating existing web clip frontmatter in a selected folder.

## What This Plugin Does Not Do

This plugin does not extract or save full article bodies.
It only reads public metadata that pages expose for link previews, such as Open Graph and Twitter Card tags.

## Usage

### First-run setup

When the plugin is loaded for the first time, choose:

- Language: Japanese or English.
- Whether to create the optional classification folder preset. You can also create it later from settings.

Web clips are saved to the configured inbox folder first so you can organize them later.

### Share a URL from mobile

1. Share a URL or page text to Obsidian.
2. Choose `Save to Web Clips`.
3. The plugin creates a Markdown note in the configured destination folder.

### Clipboard command

Run `Save clipboard URL to Web Clips` from the command palette.

### Web Clip Library

Run `Open Web Clip Library` from the command palette, open it from the plugin settings, or click the ribbon icon to open it in the center workspace.
The library reads saved web clip frontmatter across the vault and provides:

- Folder, domain, and tag navigation.
- Sorting the navigation groups by count or name, ascending or descending.
- Search across title, URL, description, folder, and tags.
- Sorting results by date, title, or domain, ascending or descending.
- The active sort key is highlighted in each card.
- Switch the result grid between 1, 2, and 3 columns.
- Resizable browse, result, and overview panes.
- Fixed card actions for opening the source page and editing the clip.
- Overview and edit tabs in the right pane.
- Choose tags from existing tags and choose destination folders from web clip folders.
- Edit tags, remove individual tags, and move a clip to another folder from the library.
- Drag a card onto a folder or tag group to move it or add that tag.
- Select multiple clips and bulk add tags, remove tags, or move folders.
- Summary counts and frequently used tags.
- One-click opening for the Obsidian note or original source page.
- `share.google` links are resolved to their final URL before saving when possible.

### Update existing web clips

Run `Update existing web clips to the latest format` from the command palette, or open it from the plugin settings.
The command asks for a target folder and previews changes before writing.

It only checks Markdown files under the selected folder and only updates web clip frontmatter:

- Remove old `status: unreviewed`.
- Add `type: webclip` when missing.
- Add `created_at` for stable sorting when missing.
- Add `domain` from `source` when missing.
- Add tags based on the current fixed, domain, and folder tag settings.

It does not change note body text, filenames, or folder locations.

### Obsidian URI

```text
obsidian://ishibashi-web-clip?url=https%3A%2F%2Fexample.com&title=Example
```

The legacy action `obsidian://myplugin-web-clip` is also accepted for local migration.

### Desktop browser bookmarklet

Create a browser bookmark and paste this code into the bookmark URL field.
The browser usually switches to Obsidian because it opens an `obsidian://` URL.
When you use multiple vaults, set the browser target vault name in plugin settings before copying the bookmarklet code.

```javascript
javascript:(()=>{const e=encodeURIComponent;const url=location.href;const title=document.title||"";const selection=window.getSelection?String(window.getSelection()).trim():"";let target=`obsidian://ishibashi-web-clip?url=${e(url)}&title=${e(title)}`;if(selection)target+=`&note=${e(selection.slice(0,1500))}`;location.href=target;})();
```

When you click the bookmark on a web page, it sends the current page URL, page title, and selected text as a memo.

## Settings

- Language: Japanese or English.
- Inbox folder: Staging folder where new web clip notes are created first.
- Browser target vault name: Vault name embedded in the desktop browser bookmarklet.
- Classification folder preset: Creates a `10_...`, `20_...`, `30_...` folder structure under `webclip` in English or `webクリップ` in Japanese.
- Confirm before saving: Edit title, folder, tags, and memo before creating a note.
- Open note after saving: Open the created note automatically.
- Fetch metadata: Fetch public metadata. Disable this to save only the URL and inferred title.
- Prevent duplicate URLs: Open the existing note instead of creating a duplicate.
- Max filename length: Default is 48 characters.
- Fixed tags: Tags added to every clip. Default is `webclip` in English and `webクリップ` in Japanese.
- Add domain tag: Adds a source tag from the page domain, such as `note` from `note.com`.
- Add folder tags: Adds tags derived from the destination folder. Keep this off when another plugin manages folder-based tags.
- Migration target folder: Folder checked by the existing clip migration command.
- Note template: Supports `{{date}}`, `{{title}}`, `{{url}}`, `{{note}}`, `{{description}}`, `{{image}}`, `{{site}}`, `{{domain}}`, and `{{tags}}`.

## Compatibility With Auto Tagger

Ishibashi Web Clipper only adds initial tags when the note is created.
If you use a folder-based tag management plugin, keep `Add folder tags` off and let that plugin manage folder-derived tags.

---

# Ishibashi Web Clipper 日本語ガイド

Ishibashi Web Clipper は、共有されたWebリンクをObsidianのMarkdownノートとして保存するプラグインです。
スマホの共有メニューからURLを送り、短いメモを残し、重複保存を避け、あとから履歴で見返せることを重視しています。

## 主な機能

- Obsidianモバイルの共有テキスト、クリップボード、`obsidian://` URLアクションからURLを保存
- Webページごとに1つのMarkdownノートを作成
- 公開メタデータのみ取得: タイトル、サイト名、説明文、画像URL、ドメイン
- 同じURLの既存ノートを検出して重複保存を防止
- Syncしやすい短めのタイトル由来ファイル名を生成
- デフォルトで `webクリップ` タグを付与。英語UIでは `webclip` を使用
- `note.com` なら `note` のように、ページのドメイン由来タグを付与
- 必要に応じて保存先フォルダ由来タグを付与
- 保存前にタイトル、保存先、タグ、メモを確認・編集
- 最近保存したクリップや重複検出を確認できる履歴ビュー
- 保存済みクリップをフォルダ、ドメイン、タグで横断的に見直せる管理ページ
- 初回設定で日本語/英語を選択
- すべてのクリップを一旦Inbox/未整理フォルダに入れて、後から整理する運用を基本に設計
- `10_...`, `20_...`, `30_...` のような分類フォルダ構成を任意で作成できるプリセット
- 選択したフォルダ内の既存Webクリップfrontmatterを最新版形式に整える移行コマンド

## このプラグインがしないこと

このプラグインは記事本文の全文抽出や保存を行いません。
取得するのは、ページがリンクプレビュー用に公開しているOpen GraphやTwitter Cardなどのメタデータだけです。

## 使い方

### 初回設定

プラグインを初めて読み込むと、次の項目を選べます。

- 言語: 日本語 / English
- 分類フォルダプリセットを作成するかどうか。後から設定画面で追加することもできます。

Webクリップは設定した整理待ちフォルダへ保存され、後から整理できる状態になります。

### スマホの共有メニューから保存

1. ブラウザやアプリからURLまたはページテキストを共有します。
2. Obsidian側で `ウェブクリップに保存` を選びます。
3. 設定した保存先フォルダにMarkdownノートが作成されます。

### クリップボードから保存

コマンドパレットで `クリップボードのURLをウェブクリップに保存する` を実行します。

### Webクリップ管理ページ

コマンドパレットで `Webクリップ管理ページを開く` を実行するか、プラグイン設定画面から開きます。
左リボンのアイコンからも、管理ページを中央ペインに開けます。
管理ページはVault内のWebクリップfrontmatterを横断的に読み取り、次の操作ができます。

- フォルダ、ドメイン、タグで分類
- 分類リストを件数または名前で昇順/降順に並べ替え
- タイトル、URL、説明、フォルダ、タグを横断検索
- 日付、タイトル、ドメインで昇順/降順に並べ替え
- 並び替え中の項目をカード内で強調表示
- 検索結果を1列、2列、3列のグリッド表示に切り替え
- 分類、検索結果、概要のペイン幅をドラッグで変更
- カード下部の固定アクションから元ページ表示と編集を実行
- 右ペインを概要タブと編集タブで切り替え
- 既存タグからタグを選択し、Webクリップ配下フォルダから移動先を選択
- 管理ページからタグ編集、個別タグ削除、フォルダ移動を実行
- カードをフォルダまたはタグ分類へドラッグして移動またはタグ追加
- 複数クリップを選択してタグ追加、タグ削除、フォルダ移動を一括実行
- 総数、表示中件数、ドメイン数、タグ数、よく使うタグを確認
- Obsidianノートまたは元ページをワンクリックで開く
- `share.google` リンクは可能な範囲で元URLに解決して保存

### 既存Webクリップを最新版形式に整える

コマンドパレットで `既存Webクリップを最新版形式に整える` を実行するか、プラグイン設定画面から開きます。
実行時に対象フォルダを確認でき、書き込み前に変更対象と変更内容をプレビューします。

対象になるのは、選択したフォルダ配下のMarkdown内にあるWebクリップfrontmatterだけです。

- 旧仕様の `status: unreviewed` を削除
- `type: webclip` がなければ追加
- 安定した並び替え用の `created_at` がなければ追加
- `source` から `domain` を補完
- 現在の固定タグ、ドメインタグ、フォルダタグ設定に基づいて不足タグを追加

本文、ファイル名、保存フォルダは変更しません。

### Obsidian URIから保存

```text
obsidian://ishibashi-web-clip?url=https%3A%2F%2Fexample.com&title=Example
```

ローカル移行用に、旧アクション `obsidian://myplugin-web-clip` も受け付けます。

### PCブラウザのブックマークレットから保存

ブラウザで新しいブックマークを作り、URL欄に次のコードを貼り付けます。
`obsidian://` URLを開くため、通常はObsidianへ画面が切り替わります。
複数Vaultを使う場合は、コードをコピーする前にプラグイン設定でブラウザ保存先Vault名を指定してください。

```javascript
javascript:(()=>{const e=encodeURIComponent;const url=location.href;const title=document.title||"";const selection=window.getSelection?String(window.getSelection()).trim():"";let target=`obsidian://ishibashi-web-clip?url=${e(url)}&title=${e(title)}`;if(selection)target+=`&note=${e(selection.slice(0,1500))}`;location.href=target;})();
```

Webページを開いた状態でそのブックマークをクリックすると、現在のページURL、ページタイトル、選択中のテキストがObsidianに送られます。

## 設定項目

- 言語: 日本語 / English
- 整理待ちフォルダ: 新しいWebクリップノートを最初に作成するフォルダ
- ブラウザ保存先Vault名: PCブラウザ用ブックマークレットに埋め込むVault名
- 分類フォルダプリセット: 日本語UIでは `webクリップ`、英語UIでは `webclip` 配下に `10_...`, `20_...`, `30_...` の分類フォルダ構成を作成
- 保存前に確認する: タイトル、保存先、タグ、メモを保存前に編集
- 保存後にノートを開く: 作成したノートを自動で開く
- メタデータを取得する: 公開メタデータを取得。OFFにするとURLと推測タイトルだけで保存
- 同じURLの重複保存を防ぐ: 既存ノートがある場合は新規作成せず既存ノートを開く
- ファイル名の最大文字数: デフォルトは48文字
- 固定タグ: すべてのクリップに付けるタグ。デフォルトは日本語UIで `webクリップ`、英語UIで `webclip`
- ドメインからタグを付ける: `note.com` なら `note` のように保存元サイトをタグ化
- 保存先フォルダからタグを付ける: 保存先フォルダ名をもとにタグを追加
- 移行対象フォルダ: 既存Webクリップ移行コマンドで確認するフォルダ
- ノート本文テンプレート: `{{date}}`, `{{title}}`, `{{url}}`, `{{note}}`, `{{description}}`, `{{image}}`, `{{site}}`, `{{domain}}`, `{{tags}}` が使用可能

## Auto Taggerとの併用

Ishibashi Web Clipper は、ノート作成時の初期タグだけを付けます。
フォルダ移動後のタグ更新やVault全体のタグ整理は、Auto Taggerのようなフォルダベースのタグ管理プラグインに任せる設計です。

Auto Taggerを使う場合は、Web Clipper側の `保存先フォルダからタグを付ける` をOFFにしておくのがおすすめです。
