/**
 * Workbench layout controller for the FSL sketch.
 *
 * Drives seven view modes from a single `data-layout` attribute on `#workbench`
 * (CSS does the actual arranging) and owns everything CSS can't: the drag
 * splitter's lifecycle (recreated per axis on each change), the tabbed mode's
 * active-pane state, the View dropdown menu, and persistence.
 *
 * Modes:
 *   - `lr` / `rl` — side by side, editor left / right (horizontal splitter)
 *   - `tb` / `bt` — stacked, editor top / bottom (vertical splitter)
 *   - `editor` / `viewer` — a single pane
 *   - `tabs` — one pane at a time with a tab strip
 *
 * The stored *preference* may also be `auto`, which resolves to a concrete mode
 * from the screen's aspect ratio (portrait → `bt`, else `rl`) and re-resolves
 * live as the window crosses square. The View button always shows the icon of
 * the *effective* mode; the menu check marks the preference (so `auto` is
 * distinguishable from a manual choice that happens to match).
 */

import { makeSplitter } from "./splitter.mjs";

const LAYOUT_KEY = "fsl-sketch-layout";

/** Per-mode geometry: split axis (or null) and which pane leads the splitter. */
const MODES = {
  lr: { axis: "x", lead: "editor", other: "viz" },
  rl: { axis: "x", lead: "viz",    other: "editor" },
  tb: { axis: "y", lead: "editor", other: "viz" },
  bt: { axis: "y", lead: "viz",    other: "editor" },
  editor: { axis: null },
  viewer: { axis: null },
  tabs:   { axis: null },
};

/** Human label per concrete mode, for the View button's tooltip. */
const LABEL = {
  lr: "editor left", rl: "editor right", tb: "editor top", bt: "editor bottom",
  editor: "just editor", viewer: "just viewer", tabs: "tabbed",
};

/** Inner SVG (rects, 22×14 viewBox) for each mode's icon — shared by menu + button. */
const ICON = {
  lr: '<rect class="ed" x="0" y="0" width="10" height="14" rx="1"/><rect class="gr" x="12" y="0" width="10" height="14" rx="1"/>',
  rl: '<rect class="gr" x="0" y="0" width="10" height="14" rx="1"/><rect class="ed" x="12" y="0" width="10" height="14" rx="1"/>',
  tb: '<rect class="ed" x="0" y="0" width="22" height="6" rx="1"/><rect class="gr" x="0" y="8" width="22" height="6" rx="1"/>',
  bt: '<rect class="gr" x="0" y="0" width="22" height="6" rx="1"/><rect class="ed" x="0" y="8" width="22" height="6" rx="1"/>',
  editor: '<rect class="ed" x="0" y="0" width="22" height="14" rx="1"/>',
  viewer: '<rect class="gr" x="0" y="0" width="22" height="14" rx="1"/>',
  tabs: '<rect class="ed" x="0" y="0" width="9" height="3.5" rx="0.5"/><rect class="gr" x="10" y="0" width="9" height="3.5" rx="0.5"/><rect class="gr" x="0" y="4.5" width="22" height="9.5" rx="1"/>',
};

/**
 * Wire up the layout control. Reads the saved preference (or `auto` on first
 * visit), applies it, and connects the View menu + tab strip.
 *
 * @param opts.onChange Optional callback run after each effective-layout change,
 *                      e.g. to re-measure the editor once its container resizes.
 * @returns `{ setPreference(pref) }` for programmatic control.
 */
export function setupLayoutControl({ onChange } = {}) {
  const workbench = document.getElementById("workbench");
  const viz       = document.getElementById("viz");
  const editor    = document.getElementById("editor");
  const gutter    = document.getElementById("gutter");
  const menu       = document.getElementById("view-menu");
  const menuBtn    = document.getElementById("btn-view");
  const viewIcon   = menuBtn.querySelector(".view-icon");
  const tabButtons = [...document.querySelectorAll("#tabbar .tab")];

  const portrait = window.matchMedia("(max-aspect-ratio: 1/1)");
  let teardownSplitter = null;
  let activeTab = "viz";
  let preference = "auto";

  const paneEl = (name) => (name === "viz" ? viz : editor);
  const resolve = (pref) => (pref === "auto" ? (portrait.matches ? "bt" : "rl") : (MODES[pref] ? pref : "rl"));

  function setActiveTab(pane) {
    activeTab = pane;
    viz.toggleAttribute("data-tab-hidden", pane !== "viz");
    editor.toggleAttribute("data-tab-hidden", pane !== "editor");
    tabButtons.forEach(b => b.setAttribute("aria-selected", String(b.dataset.pane === pane)));
    if (onChange) { onChange(activeTab); }
  }

  /** Apply a concrete mode's geometry (no persistence; preference is unchanged). */
  function applyEffective(mode) {
    const geom = MODES[mode];

    viz.style.flex = "";
    editor.style.flex = "";
    if (teardownSplitter) { teardownSplitter(); teardownSplitter = null; }
    if (mode !== "tabs") {
      viz.removeAttribute("data-tab-hidden");
      editor.removeAttribute("data-tab-hidden");
    }

    workbench.dataset.layout = mode;

    if (geom.axis) {
      teardownSplitter = makeSplitter({
        container: workbench, leadPane: paneEl(geom.lead), otherPane: paneEl(geom.other),
        gutter, axis: geom.axis,
      });
    }
    if (mode === "tabs") { setActiveTab(activeTab); }

    viewIcon.innerHTML = ICON[mode];
    menuBtn.title = `View layout: ${preference === "auto" ? "auto · " : ""}${LABEL[mode]}`;
    if (onChange) { onChange(mode); }
  }

  /** Set the stored preference (`auto` or a concrete mode) and apply it. */
  function setPreference(pref) {
    preference = (pref === "auto" || MODES[pref]) ? pref : "auto";
    localStorage.setItem(LAYOUT_KEY, preference);
    menu.querySelectorAll("[data-layout]").forEach(item =>
      item.setAttribute("aria-checked", String(item.dataset.layout === preference)));
    applyEffective(resolve(preference));
  }

  // Re-resolve `auto` live when the window crosses square.
  portrait.addEventListener("change", () => { if (preference === "auto") { applyEffective(resolve("auto")); } });

  // ---- View dropdown menu (mouse + keyboard) ----
  const items = () => [...menu.querySelectorAll(".menu-item")];
  const focusItem = (i) => { const list = items(); const n = list.length; list[((i % n) + n) % n].focus(); };

  function openMenu(open) {
    if (open) {
      const r = menuBtn.getBoundingClientRect();
      menu.style.top = `${r.bottom + 5}px`;
      menu.style.right = `${window.innerWidth - r.right}px`;
      menu.style.left = "auto";
      menu.removeAttribute("hidden");
      menuBtn.setAttribute("aria-expanded", "true");
      (menu.querySelector('[aria-checked="true"]') || items()[0]).focus();
    } else {
      menu.setAttribute("hidden", "");
      menuBtn.setAttribute("aria-expanded", "false");
    }
  }

  menuBtn.addEventListener("click", (e) => { e.stopPropagation(); openMenu(menu.hasAttribute("hidden")); });
  menu.addEventListener("click", (e) => {
    const item = e.target.closest("[data-layout]");
    if (!item) { return; }
    setPreference(item.dataset.layout);
    openMenu(false);
    menuBtn.focus();
  });
  menu.addEventListener("keydown", (e) => {
    const cur = items().indexOf(document.activeElement);
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); focusItem(cur + 1); break;
      case "ArrowUp":   e.preventDefault(); focusItem(cur - 1); break;
      case "Home":      e.preventDefault(); focusItem(0); break;
      case "End":       e.preventDefault(); focusItem(items().length - 1); break;
      case "Escape":    e.preventDefault(); openMenu(false); menuBtn.focus(); break;
      default: break;
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hasAttribute("hidden")) { openMenu(false); menuBtn.focus(); } });
  document.addEventListener("pointerdown", (e) => {
    if (!menu.hasAttribute("hidden") && !menu.contains(e.target) && !menuBtn.contains(e.target)) { openMenu(false); }
  });
  tabButtons.forEach(b => b.addEventListener("click", () => setActiveTab(b.dataset.pane)));

  // ---- initial preference: saved, else auto ----
  const stored = localStorage.getItem(LAYOUT_KEY);
  setPreference(stored && (stored === "auto" || MODES[stored]) ? stored : "auto");

  return { setPreference };
}
