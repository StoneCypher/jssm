---
id: using-the-editor
section: getting-started
title: "Using the editor"
order: 20
teaches: []
mentions: []
indexTerms: [autocomplete, layout, theme, diagram, resize, highlight]
---

# Using the editor

## Editing and autocomplete

Write FSL in the code pane. Suggestions appear as you type after a `:`, or on Ctrl+Space. At the start of a line you get **keys** — machine attributes, config, and (inside a `{ }` block) per-state style keys. After a key's `:` you get its **values** — shapes, layouts, directions, and the full SVG color list with a swatch preview.

## The live diagram

The graph re-renders whenever the machine parses and compiles cleanly. While an edit is invalid, the last good diagram stays and the status bar shows the parser error.

## Layouts

The **View** button chooses how the panes sit: side by side or stacked with the editor on either side, just the editor or just the viewer, or **Tabbed** — one pane at a time. **Auto** follows the window shape.

## Resizing panes

Drag any divider to resize — between the graph and code, or this docs panel and the rest. Double-click a divider to reset it.

## Highlighting

Beyond the base syntax colors, the editor reads the parsed machine to mark what the tokenizer cannot: color values get a swatch chip in their own color, state names are tinted apart from other identifiers, and shape values are marked as enums.

## Theme

The sun / moon button switches between light and dark, and your choice is remembered.
