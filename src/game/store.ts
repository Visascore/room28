// Save system: every Life Circle persists in localStorage and is never overwritten by a branch.
import { useSyncExternalStore } from "react";
import type { Life, FamilyTier, Option } from "./types";
import { createLife, choose, advance, branch } from "./engine";

interface State { lives: Life[]; activeId?: string }
const KEY = "room28.v1";
let state: State = { lives: [] };
let loaded = false;
const subs = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { const raw = localStorage.getItem(KEY); if (raw) state = JSON.parse(raw); } catch { /* ignore */ }
}
const changeSubs = new Set<(lives: Life[]) => void>();
export const onLivesChanged = (f: (lives: Life[]) => void) => { changeSubs.add(f); return () => changeSubs.delete(f); };
export function hydrate(lives: Life[]) { loaded = true; state = { lives }; try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* */ } subs.forEach((f) => f()); }
export const currentLives = () => { load(); return state.lives; };
function set(next: State) {
  const changed = next.lives.filter((l) => !state.lives.includes(l));
  state = next;
  if (changed.length) changeSubs.forEach((f) => f(changed));
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota */ }
  subs.forEach((f) => f());
}
const EMPTY: State = { lives: [] };
export function useGame() {
  const s = useSyncExternalStore(
    (f) => { load(); subs.add(f); f(); return () => subs.delete(f); },
    () => { load(); return state; },
    () => EMPTY,
  );
  const active = s.lives.find((l) => l.id === s.activeId);
  return { ...s, active };
}

const nextNumber = () => state.lives.reduce((m, l) => Math.max(m, l.number), 0) + 1;
const replace = (l: Life) => set({ ...state, lives: state.lives.map((x) => (x.id === l.id ? l : x)) });

export const game = {
  newLife(bornCity: string, tier: FamilyTier) {
    const l = createLife({ bornCity, tier, number: nextNumber() });
    set({ lives: [...state.lives, l], activeId: l.id });
    return l;
  },
  choose(i: number) { const a = state.lives.find((l) => l.id === state.activeId); if (a) replace(choose(a, i)); },
  advance() { const a = state.lives.find((l) => l.id === state.activeId); if (a) replace(advance(a)); },
  setActive(id?: string) { set({ ...state, activeId: id }); },
  branch(parentId: string, recordIndex: number, altIndex: number) {
    const p = state.lives.find((l) => l.id === parentId)!;
    const root = p.label.replace(/[A-Z]$/, "");
    const used = state.lives.filter((l) => l.label.startsWith(root)).length; // 1 → B
    const suffix = String.fromCharCode(65 + used);
    if (!/[A-Z]$/.test(p.label)) replace({ ...p, label: p.label + "A" });
    const b = branch(p, recordIndex, altIndex, p.number, suffix);
    set({ lives: [...state.lives, b], activeId: b.id });
    return b;
  },
  // AI hooks: only apply to the life they were requested for, and never overwrite an existing choice.
  aiDecision(id: string, age: number, d: { title: string; prompt: string; options: Option[] }) {
    const l = state.lives.find((x) => x.id === id);
    if (!l || l.age !== age || l.pending || l.lastOutcome || l.status !== "active" || !d.options.length) return;
    replace({ ...l, pending: `ai-${age}-${Date.now()}`, pendingOptions: d.options, pendingMeta: { title: d.title, prompt: d.prompt } });
  },
  setStory(id: string, key: string, text: string) { const l = state.lives.find((x) => x.id === id); if (l) replace({ ...l, story: { key, text } }); },
  setReflection(id: string, r: NonNullable<Life["reflection"]>) { const l = state.lives.find((x) => x.id === id); if (l) replace({ ...l, reflection: r }); },
  reset() { set({ lives: [] }); },
};
