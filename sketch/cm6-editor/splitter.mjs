/**
 * Draggable splitter between two flex panes, on either axis.
 *
 * Wires a gutter element so dragging it resizes the lead pane (and lets the
 * other pane take the remainder). Works horizontally (`axis: "x"`, a vertical
 * gutter) or vertically (`axis: "y"`, a horizontal gutter). Uses Pointer Events
 * with pointer capture on the gutter, so a drag keeps tracking even when the
 * cursor leaves the thin gutter or the window. Double-clicking the gutter
 * restores the default split. The ratio is clamped so neither pane collapses.
 *
 * The panes must live in a flex `container` whose `flex-direction` matches the
 * axis; this sets the lead pane's `flex` to a fixed basis and the other to
 * `1 1 0`.
 */

/**
 * Attach drag-to-resize behavior to a gutter between two panes.
 *
 * @param opts.container Flex element wrapping both panes + gutter.
 * @param opts.leadPane  Pane resized directly (gets a fixed flex-basis).
 * @param opts.otherPane Pane that absorbs the remaining space.
 * @param opts.gutter    The draggable divider element.
 * @param opts.axis      `"x"` (horizontal split) or `"y"` (vertical split). Default `"x"`.
 * @param opts.invert    Measure the lead pane from the far edge (right/bottom),
 *                       for a pane docked at the end of the container. Default false.
 * @param opts.min       Minimum lead-pane fraction (default 0.15).
 * @param opts.max       Maximum lead-pane fraction (default 0.85).
 * @param opts.resetTo   Fraction restored on double-click (default 0.5).
 * @param opts.onResize  Optional callback invoked with the clamped lead fraction
 *                       on each resize (including reset), e.g. to persist it.
 * @returns A teardown function that removes the listeners.
 *
 * @example
 *   const off = makeSplitter({ container, leadPane, otherPane, gutter, axis: "y" });
 *   // ...later, when switching layouts:
 *   off();
 */
export function makeSplitter({ container, leadPane, otherPane, gutter, axis = "x", invert = false, min = 0.15, max = 0.85, resetTo = 0.5, onResize }) {
  const horizontal = axis === "x";
  let dragging = false;

  const applyRatio = (ratio) => {
    const clamped = Math.min(max, Math.max(min, ratio));
    leadPane.style.flex  = `0 0 ${(clamped * 100).toFixed(3)}%`;
    otherPane.style.flex = "1 1 0";
    if (onResize) { onResize(clamped); }
  };

  const reset = () => applyRatio(resetTo);

  const onMove = (event) => {
    if (!dragging) { return; }
    const rect  = container.getBoundingClientRect();
    const ratio = horizontal
      ? (invert ? (rect.right - event.clientX) : (event.clientX - rect.left)) / rect.width
      : (invert ? (rect.bottom - event.clientY) : (event.clientY - rect.top)) / rect.height;
    applyRatio(ratio);
  };

  const stop = () => {
    if (!dragging) { return; }
    dragging = false;
    gutter.classList.remove("dragging");
    document.body.style.userSelect = "";
    document.body.style.cursor     = "";
  };

  const start = (event) => {
    dragging = true;
    gutter.classList.add("dragging");
    gutter.setPointerCapture?.(event.pointerId);
    document.body.style.userSelect = "none";
    document.body.style.cursor     = horizontal ? "col-resize" : "row-resize";
    event.preventDefault();
  };

  gutter.addEventListener("pointerdown",   start);
  gutter.addEventListener("pointermove",   onMove);
  gutter.addEventListener("pointerup",     stop);
  gutter.addEventListener("pointercancel", stop);
  gutter.addEventListener("dblclick",      reset);

  return () => {
    gutter.removeEventListener("pointerdown",   start);
    gutter.removeEventListener("pointermove",   onMove);
    gutter.removeEventListener("pointerup",     stop);
    gutter.removeEventListener("pointercancel", stop);
    gutter.removeEventListener("dblclick",      reset);
  };
}
