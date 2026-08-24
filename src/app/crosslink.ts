/** Cross-tab jump registry — breaks the main↔library import cycle. */

export type TabId = "lab" | "library";

let switchTab: ((tab: TabId) => void) | null = null;
const jumps = new Map<TabId, (id: string) => void>();

export function registerTabSwitcher(fn: (tab: TabId) => void): void {
  switchTab = fn;
}
export function registerJump(tab: TabId, fn: (id: string) => void): void {
  jumps.set(tab, fn);
}
export function jumpTo(tab: TabId, id: string): void {
  switchTab?.(tab);
  jumps.get(tab)?.(id);
}
