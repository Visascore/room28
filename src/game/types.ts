// Core simulation types. UI never mutates these directly — only the engine does.
export type StatKey =
  | "happiness" | "health" | "education" | "career" | "relationships"
  | "family" | "stress" | "confidence" | "social" | "reputation";
export type Stats = Record<StatKey, number>;

export type FamilyTier = "low" | "lowermiddle" | "middle" | "uppermiddle" | "wealthy" | "ultra";

export interface Person {
  id: string;
  name: string;
  role: "parent" | "sibling" | "friend" | "partner" | "spouse" | "ex" | "child" | "colleague";
  strength: number; // 0-100
  trust: number; // 0-100
  history: string[];
}

export interface Effect {
  stats?: Partial<Stats>;
  cash?: number; // GBP-equivalent game units
  debt?: number;
  invest?: number;
  property?: number;
  career?: string | "auto";
  careerLevel?: number;
  move?: string; // city id
  housing?: string;
  partner?: "add" | "marry" | "leave";
  child?: number;
  rel?: { role: Person["role"]; delta: number; memory?: string };
  flag?: string;
  unflag?: string;
  log?: string; // timeline headline
  risk?: { chance: number; boost?: StatKey; win: Effect & { text: string }; lose: Effect & { text: string } };
}

export interface Option {
  label: string;
  hints: string[]; // potential consequences — never the final outcome
  outcome: string;
  effect: Effect;
}

export interface Decision {
  id: string;
  minAge: number;
  maxAge: number;
  title: string;
  prompt: string;
  major?: boolean; // eligible for "What if?"
  when?: (l: Life) => boolean;
  options: (l: Life) => Option[];
}

export interface LifeEvent {
  id: string;
  minAge: number;
  maxAge: number;
  weight: (l: Life) => number; // probability weight per chapter
  text: (l: Life) => string;
  title: string;
  effect: Effect;
  once?: boolean;
}

export interface TimelineEntry { age: number; title: string; text: string; kind: "birth" | "decision" | "event" | "move" | "end" }

export interface DecisionRecord {
  decisionId: string;
  age: number;
  title: string;
  prompt: string;
  chosen: number;
  labels: string[];
  cityId: string;
  snapshot?: Life; // state just before the choice (for branching)
}

export interface Life {
  id: string;
  number: number;
  label: string; // "LIFE 01", "LIFE 01B"
  parentId?: string;
  branchNote?: string;
  status: "active" | "completed";
  name: string;
  bornCity: string;
  cityId: string;
  citiesLived: string[];
  family: { tier: FamilyTier; siblings: number; stability: string; environment: string; expectations: string };
  age: number;
  stats: Stats;
  money: { cash: number; debt: number; invest: number; property: number };
  lifetimeEarnings: number;
  careerId?: string;
  careerLevel: number;
  careersHad: string[];
  housing: string;
  rels: Person[];
  children: number;
  timeline: TimelineEntry[];
  decisions: DecisionRecord[];
  flags: string[];
  used: string[];
  pending?: string; // decision id awaiting choice
  pendingOptions?: Option[]; // frozen at presentation so choices are reproducible
  pendingMeta?: { title: string; prompt: string }; // AI-invented decision (not in content library)
  story?: { key: string; text: string }; // AI narration for the current screen
  reflection?: { headline: string; epitaph: string; story: string; lessons: string[]; tryNext: string[] };
  lastOutcome?: { title: string; text: string };
  chapter: string[]; // narrative since last step
  createdAt: number;
}
