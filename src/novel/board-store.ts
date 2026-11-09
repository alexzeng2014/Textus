/** Whether the board - storylines, timeline and plot grids - is over the
 *  window. A module-level answer rather than React state because the panels
 *  that open it sit in the sidebar and the board is drawn by the window's
 *  shell, with several layers between them. */

import { useSyncExternalStore } from "react";

let open = false;
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

export function openBoard(): void {
  if (open) return;
  open = true;
  emit();
}

export function closeBoard(): void {
  if (!open) return;
  open = false;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const read = () => open;

export function useBoardOpen(): boolean {
  return useSyncExternalStore(subscribe, read, read);
}
