# Optional display typography

The public package includes the title composition component and CSS, but no proprietary font binary.

Without additional configuration, technology decks use local KaiTi/serif fallback. If you have the appropriate permission to use and embed the full WOFF, pass `--display-font /path/to/font.woff` to the scaffolder, or set `RESEARCH_HTML_PRESENTATION_FONT` to that path. No font is downloaded automatically. A private installed copy may keep `shangwei-full.woff` in this directory; it must remain untracked.

Existing screenshot previews retain their original typography. The MIT license does not grant font rights. See the repository's THIRD_PARTY_NOTICES.md.
