# Changelog

## 1.0.10

Final safety and retirement release.

- Removes all automatic requests to clipped URLs.
- Removes HTML, Open Graph, Twitter Card, and redirect fetching.
- Treats mobile share and clipboard capture as URL-only input.
- Forces a confirmation screen for mobile share and clipboard capture.
- Records `content_source: user-provided` and `network_access: false` in new notes.
- Notifies existing users to migrate to Ishibashi Web Clipper V2.
- Permanently disables the former metadata-fetch setting.
