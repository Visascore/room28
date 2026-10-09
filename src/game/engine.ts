// Simulation engine: deterministic rules + probability. Pure functions over Life.
import type { Life, Effect, Stats, StatKey, Person, FamilyTier, DecisionRecord } from "./types";
import { CITIES, COUNTRIES, CAREERS, HOUSING, FAMILY_TIERS, NAMES, cityCountry, moneyScale } from "./world";
import { DECISIONS, EVENTS, decisionById } from "./content";

const STAGES = [5, 8, 11, 14, 16, 18, 19, 21, 23, 25, 27, 29, 31, 33, 35, 38, 41, 44, 47, 50, 53, 56, 59, 62, 65, 68, 71, 74, 77, 80, 83, 86, 89, 92, 95];
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const uid = () => Math.random().toString(36).slice(2, 10);
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

export const stageName = (age: number) =>
  age < 12 ? "Childhood" : age < 18 ? "Teenager" : age < 23 ? "University / early work" : age < 35 ? "Young adulthood" : age < 55 ? "Mid adulthood" : age < 66 ? "Later adulthood" : "Retirement";

export function fmtMoney(l: Life, gbp: number) {
  const c = cityCountry(l.cityId);
  const v = gbp * c.sim.fx;
  const abs = Math.abs(v);
  const s = abs >= 1e9 ? (abs / 1e9).toFixed(1) + "bn" : abs >= 1e6 ? (abs / 1e6).toFixed(1) + "m" : abs >= 1e4 ? Math.round(abs / 1000) + "k" : Math.round(abs).toLocaleString("en-GB");
  return (v < 0 ? "−" : "") + c.sim.symbol + s;
}

export function netWorth(l: Life) {
  return l.money.cash + l.money.invest + l.money.property - l.money.debt;
}
export function annualIncome(l: Life) {
  const country = cityCountry(l.cityId);
  if (!l.careerId || l.age < country.sim.workAge) return 0;
  const c = CAREERS[l.careerId];
  const retired = l.flags.includes("retired") || l.age >= country.sim.pensionAge + 5;
  const floor = country.sim.minWage / country.sim.fx; // legal minimum wage, in game units
  let base = Math.max(floor, c.base * country.sim.salaryIndex * (1 + Math.max(-0.5, l.careerLevel) * 0.09) * (0.8 + l.stats.career / 250));
  if (l.age < 18) base *= 0.5; // teenagers work part-time
  return Math.round(retired ? base * 0.35 : base);
}
export function annualExpenses(l: Life) {
  if (l.age < 18) return 0;
  const k = cityCountry(l.cityId).sim.costIndex;
  const housing = HOUSING[l.housing]?.cost ?? 0;
  const essentials = (housing + 8500 + l.children * 6000) * k;
  // lifestyle creep: people spend a share of whatever they earn above essentials
  const net = annualIncome(l) * (1 - cityCountry(l.cityId).sim.taxRate);
  const creep = Math.max(0, net - essentials) * (0.55 - Math.min(0.25, l.stats.education / 400));
  return Math.round(essentials + creep + (l.money.debt > 0 ? l.money.debt * 0.06 : 0));
}
export const annualTax = (l: Life) => Math.round(annualIncome(l) * cityCountry(l.cityId).sim.taxRate);
const marketYear = () => (Math.random() + Math.random() + Math.random()) / 3 * 0.32 - 0.11; // ~ -11%..+21%, mean ~5%

function makePerson(role: Person["role"], country: string, strength = 60, memory?: string): Person {
  const n = NAMES[country] ?? NAMES["uk"];
  return { id: uid(), name: `${pick(n.first)}${role === "parent" || role === "sibling" || role === "child" ? "" : " " + pick(n.last)}`, role, strength, trust: strength, history: memory ? [memory] : [] };
}

export function createLife(opts: { bornCity: string; tier: FamilyTier; number: number; label?: string }): Life {
  const city = CITIES[opts.bornCity];
  const tier = FAMILY_TIERS.find((t) => t.id === opts.tier)!;
  const names = NAMES[city.country];
  const siblings = Math.floor(Math.random() * 4);
  const stability = pick(["Stable", "Stable", "Mostly stable", "Unstable"]);
  const environment = pick(["Highly academic family", "Entrepreneurial family", "Strict family", "Independent family", "Large extended family", "Creative family"]);
  const expectations = pick(["Expect you to become a professional", "Want you to be happy", "Expect you to support the family", "Expect you to take over the family trade"]);
  const r = () => 45 + Math.random() * 15;
  const stats: Stats = {
    happiness: r(), health: 70 + Math.random() * 20, education: 45 + tier.edu + Math.random() * 10, career: 40, relationships: r(),
    family: stability === "Unstable" ? 40 : 60 + Math.random() * 15, stress: 20, confidence: r(), social: r(), reputation: 40,
  };
  if (environment === "Highly academic family") stats.education += 6;
  (Object.keys(stats) as StatKey[]).forEach((k) => (stats[k] = clamp(stats[k])));
  const rels: Person[] = [makePerson("parent", city.country, 75), makePerson("parent", city.country, 70)];
  for (let i = 0; i < siblings; i++) rels.push(makePerson("sibling", city.country, 60));
  rels.push(makePerson("friend", city.country, 40, "Neighbours since you were small"));
  const label = opts.label ?? `LIFE ${String(opts.number).padStart(2, "0")}`;
  const l: Life = {
    id: uid(), number: opts.number, label, status: "active", name: `${pick(names.first)} ${pick(names.last)}`,
    bornCity: city.id, cityId: city.id, citiesLived: [city.id],
    family: { tier: opts.tier, siblings, stability, environment, expectations },
    age: 0, stats, money: { cash: tier.cash * 0.1 * moneyScale(opts.bornCity), debt: 0, invest: 0, property: 0 }, lifetimeEarnings: 0,
    careerLevel: 0, careersHad: [], housing: "family", rels, children: 0,
    timeline: [{ age: 0, title: `Born in ${city.name}`, text: `${tier.name} · ${environment} · ${siblings} sibling${siblings === 1 ? "" : "s"}`, kind: "birth" }],
    decisions: [], flags: [], used: [], chapter: [], createdAt: Date.now(),
  };
  return advance(l);
}

function bump(l: Life, s?: Partial<Stats>) {
  if (!s) return;
  (Object.keys(s) as StatKey[]).forEach((k) => (l.stats[k] = clamp(l.stats[k] + (s[k] ?? 0))));
}

function relChange(l: Life, role: Person["role"], delta: number, memory?: string) {
  let targets = l.rels.filter((r) => r.role === role);
  if (!targets.length && (role === "friend" || role === "colleague") && delta > 0) {
    const p = makePerson(role, CITIES[l.cityId].country, 30);
    l.rels.push(p);
    targets = [p];
  }
  const t = role === "friend" ? [targets.sort((a, b) => b.strength - a.strength)[0]] : targets;
  t.forEach((p) => {
    p.strength = clamp(p.strength + delta);
    p.trust = clamp(p.trust + delta * 0.7);
    if (memory) p.history.push(`Age ${l.age}: ${memory}`);
  });
}

export function applyEffect(l: Life, e: Effect): string | undefined {
  bump(l, e.stats);
  const k = moneyScale(l.cityId); // UK-priced content -> local economy
  if (e.cash) l.money.cash += e.cash * k;
  if (e.debt) l.money.debt = Math.max(0, l.money.debt + e.debt * k);
  if (e.invest) l.money.invest += e.invest * k;
  if (e.property) l.money.property = Math.max(0, l.money.property + e.property * k);
  if (e.flag && !l.flags.includes(e.flag)) l.flags.push(e.flag);
  if (e.unflag) l.flags = l.flags.filter((f) => f !== e.unflag);
  if (e.housing) l.housing = e.housing;
  if (e.career) {
    let id = e.career;
    if (id === "auto") {
      const ok = Object.values(CAREERS).filter((c) => c.minEdu <= l.stats.education && c.id !== "entrepreneur");
      id = ok.sort((a, b) => b.base - a.base)[Math.floor(Math.random() * Math.min(3, ok.length))]?.id ?? "retail";
    }
    if (id !== l.careerId) { l.careerId = id; l.careerLevel = Math.min(l.careerLevel, 1); if (!l.careersHad.includes(id)) l.careersHad.push(id); }
  }
  if (e.careerLevel) l.careerLevel = Math.max(-2, l.careerLevel + e.careerLevel);
  if (e.child) {
    for (let i = 0; i < e.child; i++) l.rels.push(makePerson("child", CITIES[l.cityId].country, 85, `Born when you were ${l.age}`));
    l.children += e.child;
  }
  if (e.partner === "add") {
    const p = makePerson("partner", CITIES[l.cityId].country, 70, `Met at age ${l.age}`);
    l.rels.push(p);
  } else if (e.partner === "marry") {
    const p = l.rels.find((r) => r.role === "partner");
    if (p) { p.role = "spouse"; p.history.push(`Age ${l.age}: Married`); p.strength = clamp(p.strength + 10); }
  } else if (e.partner === "leave") {
    l.rels.filter((r) => r.role === "partner" || r.role === "spouse").forEach((p) => { p.role = "ex"; p.strength = clamp(p.strength - 40); p.history.push(`Age ${l.age}: Separated`); });
  }
  if (e.rel) relChange(l, e.rel.role === "spouse" && !l.rels.some((r) => r.role === "spouse") ? "partner" : e.rel.role, e.rel.delta, e.rel.memory);
  if (e.move && e.move !== l.cityId) {
    const from = CITIES[l.cityId];
    l.cityId = e.move;
    if (!l.citiesLived.includes(e.move)) l.citiesLived.push(e.move);
    if (l.housing === "family" && l.age >= 18) l.housing = "studio";
    if (from.country !== CITIES[e.move].country) relChange(l, "parent", -6);
    if (!e.log) l.timeline.push({ age: l.age, title: `Moved to ${CITIES[e.move].name}`, text: `${COUNTRIES[CITIES[e.move].country].flag} ${COUNTRIES[CITIES[e.move].country].name}`, kind: "move" });
  }
  if (e.risk) {
    const boost = e.risk.boost ? (l.stats[e.risk.boost] - 50) / 250 : 0;
    const res = Math.random() < e.risk.chance + boost ? e.risk.win : e.risk.lose;
    applyEffect(l, res);
    return res.text;
  }
  return undefined;
}

function stripSnapshots(ds: DecisionRecord[]) { return ds.map(({ snapshot, ...r }) => r); }

export function choose(prev: Life, index: number): Life {
  const l = clone(prev);
  const d = decisionById(l.pending!) ?? { id: l.pending!, title: l.pendingMeta?.title ?? "A choice", prompt: l.pendingMeta?.prompt ?? "", major: false };
  const opts = l.pendingOptions!;
  const opt = opts[index];
  const snap = clone(prev);
  snap.decisions = stripSnapshots(snap.decisions);
  const rec: DecisionRecord = { decisionId: d.id, age: l.age, title: d.title, prompt: d.prompt, chosen: index, labels: opts.map((o) => o.label), cityId: l.cityId, snapshot: d.major ? snap : undefined };
  const riskText = applyEffect(l, opt.effect);
  const text = riskText ?? opt.outcome;
  l.decisions.push(rec);
  l.timeline.push({ age: l.age, title: opt.effect.log ?? `${d.title}: ${opt.label}`, text, kind: opt.effect.move ? "move" : "decision" });
  l.lastOutcome = { title: opt.label, text };
  l.pending = undefined; l.pendingOptions = undefined; l.pendingMeta = undefined;
  return l;
}

function deathChance(l: Life) {
  if (l.age < 60) return l.stats.health < 10 ? 0.15 : 0.002;
  const base = (l.age - 58) / 70;
  return Math.min(0.95, base * (1.6 - l.stats.health / 100) + (l.stats.stress > 80 ? 0.05 : 0));
}

function yearTick(l: Life) {
  const inc = annualIncome(l);
  const exp = annualExpenses(l);
  const tax = annualTax(l);
  l.money.cash += inc - tax - exp;
  l.lifetimeEarnings += inc;
  l.money.invest *= 1 + marketYear() - 0.01; // fees
  l.money.property *= 1 + marketYear() * 0.35 + 0.01;
  if (l.money.property > 0) l.money.cash -= l.money.property * 0.012; // upkeep & property tax
  const infl = cityCountry(l.cityId).sim.inflation; // real-terms erosion beyond the fixed exchange rate
  if (l.money.cash > 0) l.money.cash *= 1 - infl;
  if (infl > 0.01) l.money.invest *= 1 - infl / 2;
  if (l.money.debt > 0) { const pay = Math.min(l.money.debt, Math.max(0, inc * 0.08)); l.money.debt -= pay; l.money.cash -= pay; }
  if (l.money.cash < -5000) { l.money.debt += -l.money.cash; l.money.cash = 0; l.stats.stress = clamp(l.stats.stress + 3); }
  if (l.money.debt > 40000 && l.money.debt > Math.max(1, inc) * 3) {
    if (!l.flags.includes("bankrupt")) l.flags.push("bankrupt"); l.money.debt = 0; l.money.property = 0; l.money.cash = 0;
    l.stats.stress = clamp(l.stats.stress + 15); l.stats.reputation = clamp(l.stats.reputation - 10);
    l.timeline.push({ age: l.age, title: "Declared bankrupt", text: "The debts became impossible. You lose almost everything and start again.", kind: "event" });
  }
  // drift
  if (l.age > 45) l.stats.health = clamp(l.stats.health - (l.age > 70 ? 1.8 : 0.8));
  if (l.stats.stress > 65) l.stats.health = clamp(l.stats.health - 0.6);
  l.stats.stress = clamp(l.stats.stress + (exp > inc && l.age >= 18 ? 1 : -0.8));
  if (l.careerId) l.stats.career = clamp(l.stats.career + (CAREERS[l.careerId].satisfaction - 50) / 40);
  l.stats.happiness = clamp(l.stats.happiness + (l.stats.relationships - 50) / 60 + (50 - l.stats.stress) / 80 + (HOUSING[l.housing]?.happiness ?? 0) / 20);
  l.rels.forEach((r) => { if (r.role !== "child" && r.role !== "spouse") r.strength = clamp(r.strength - 0.4); });
  const avgRel = l.rels.length ? l.rels.reduce((a, r) => a + r.strength, 0) / l.rels.length : 30;
  l.stats.relationships = clamp(l.stats.relationships * 0.9 + avgRel * 0.1);
}

export function advance(prev: Life): Life {
  const l = clone(prev);
  l.lastOutcome = undefined;
  l.chapter = [];
  const next = STAGES.find((a) => a > l.age) ?? l.age + 3;
  for (let y = l.age + 1; y <= next; y++) {
    l.age = y;
    yearTick(l);
    if (y >= 55 && Math.random() < deathChance(l) / 3) return complete(l);
  }
  if (l.age >= 96) return complete(l);
  // events — circumstances shape probability
  const evs = EVENTS.filter((e) => l.age >= e.minAge && l.age <= e.maxAge && !(e.once && l.used.includes(e.id)));
  let fired = 0;
  for (const e of evs.sort(() => Math.random() - 0.5)) {
    if (fired >= 2) break;
    if (Math.random() < e.weight(l)) {
      const text = e.text(l);
      if (e.id === "market_crash") l.money.invest *= 0.65;
      if (e.id === "parent_loss") { const p = l.rels.find((r) => r.role === "parent"); if (p) l.rels = l.rels.filter((r) => r.id !== p.id); }
      if (e.id === "friend_loss") { const p = l.rels.filter((r) => r.role === "friend").pop(); if (p) l.rels = l.rels.filter((r) => r.id !== p.id); }
      applyEffect(l, e.effect);
      l.used.push(e.id);
      l.chapter.push(text);
      l.timeline.push({ age: l.age, title: e.effect.log ?? e.title, text, kind: "event" });
      fired++;
    }
  }
  // pick a decision
  const ds = DECISIONS.filter((d) => l.age >= d.minAge && l.age <= d.maxAge + 2 && !l.used.includes(d.id) && (!d.when || d.when(l)));
  const urgent = ds.filter((d) => l.age >= d.minAge && l.age <= d.maxAge);
  const d = (urgent.length ? urgent : ds).sort((a, b) => a.maxAge - b.maxAge)[0];
  if (d) {
    const opts = d.options(l);
    if (opts.length) { l.pending = d.id; l.pendingOptions = opts; l.used.push(d.id); }
  }
  return l;
}

function complete(l: Life): Life {
  l.status = "completed";
  l.pending = undefined; l.pendingOptions = undefined;
  l.timeline.push({ age: l.age, title: `Died at ${l.age}`, text: `In ${CITIES[l.cityId].name}, peacefully.`, kind: "end" });
  return l;
}

export function branch(parent: Life, recordIndex: number, altIndex: number, number: number, suffix: string): Life {
  const rec = parent.decisions[recordIndex];
  if (!rec.snapshot) throw new Error("No snapshot");
  const base = clone(rec.snapshot);
  base.id = uid();
  base.parentId = parent.id;
  base.label = `${parent.label.replace(/[A-Z]$/, "")}${suffix}`;
  base.number = number;
  base.status = "active";
  base.decisions = parent.decisions.slice(0, recordIndex);
  base.branchNote = `At age ${rec.age}, instead of “${rec.labels[rec.chosen]}”, you chose “${rec.labels[altIndex]}”.`;
  base.createdAt = Date.now();
  return choose(base, altIndex);
}

export function biggestWhatIf(l: Life) {
  const idx = [...l.decisions.keys()].reverse().find((i) => l.decisions[i].snapshot && l.decisions[i].labels.length > 1);
  if (idx === undefined) return undefined;
  const r = l.decisions[idx];
  const alt = r.labels.findIndex((_, i) => i !== r.chosen);
  return { index: idx, alt, rec: r };
}

const level = (n: number) => (n >= 80 ? "Very high" : n >= 62 ? "High" : n >= 42 ? "Medium" : n >= 25 ? "Low" : "Very low");
export function lifeSummary(l: Life) {
  const nw = netWorth(l);
  const finScore = Math.max(0, Math.min(100, 30 + Math.log10(Math.max(1, nw)) * 10 - (nw < 0 ? 30 : 0)));
  const countries = new Set(l.citiesLived.map((c) => CITIES[c].country)).size;
  const adventure = Math.min(100, countries * 22 + (l.flags.includes("adventurer") ? 25 : 0) + l.citiesLived.length * 6);
  const moves = l.timeline.filter((t) => t.kind === "move").length;
  const stability = Math.max(0, 85 - moves * 12 - (l.stats.stress - 40));
  const dims = [
    { k: "Financial success", v: finScore },
    { k: "Relationships", v: l.stats.relationships },
    { k: "Career fulfilment", v: l.careerId ? (CAREERS[l.careerId].satisfaction + l.stats.career) / 2 : 30 },
    { k: "Family connection", v: l.stats.family },
    { k: "Adventure", v: adventure },
    { k: "Stability", v: stability },
  ].map((d) => ({ ...d, label: level(d.v) }));
  const hi = dims.filter((d) => d.v >= 62).map((d) => d.k.toLowerCase());
  const lo = dims.filter((d) => d.v < 42).map((d) => d.k.toLowerCase());
  const narrative = `Your life was ${hi.length ? "rich in " + hi.join(", ") : "quiet and unremarkable on paper"}${lo.length ? `, but ${lo.join(" and ")} ${lo.length > 1 ? "were" : "was"} the price` : ", and remarkably balanced"}.`;
  return { dims, narrative };
}

export function compareNarrative(a: Life, b: Life) {
  const sa = lifeSummary(a).dims, sb = lifeSummary(b).dims;
  const better = (x: typeof sa, y: typeof sb) => x.filter((d, i) => d.v - y[i].v > 8).map((d) => d.k.toLowerCase());
  const ab = better(sa, sb), ba = better(sb, sa);
  if (!ab.length && !ba.length) return `${a.label} and ${b.label} were different roads to surprisingly similar places.`;
  return `${a.label} gave you more ${ab.join(", ") || "of the same"}, while ${b.label} gave you more ${ba.join(", ") || "of the same"}.`;
}

export function countriesOf(l: Life) {
  return Array.from(new Set(l.citiesLived.map((c) => CITIES[c].country)));
}

// Compact plain-text description of a life, sent to the AI storyteller.
export function aiContext(l: Life, extra = "") {
  const c = CITIES[l.cityId]; const k = cityCountry(l.cityId);
  const st = Object.entries(l.stats).map(([a, v]) => `${a} ${Math.round(v)}`).join(", ");
  const recent = l.timeline.slice(-10).map((t) => `age ${t.age}: ${t.title} — ${t.text}`).join("\n");
  return [
    `Name: ${l.name}. Age ${l.age} (${stageName(l.age)}). Born in ${CITIES[l.bornCity].name}; now in ${c.name}, ${k.name} (${c.neighbourhood}; ${c.vibe}).`,
    `Family: ${FAMILY_TIERS.find((t) => t.id === l.family.tier)?.name}, ${l.family.siblings} siblings, ${l.family.environment}, expectations: ${l.family.expectations}.`,
    `Work: ${l.careerId ? CAREERS[l.careerId].name : l.age < k.sim.workAge ? "too young to work legally" : "not working"}. Housing: ${HOUSING[l.housing]?.name}. Children: ${l.children}.`,
    `Money: net worth ${fmtMoney(l, netWorth(l))}, yearly income ${fmtMoney(l, annualIncome(l))}. Legal minimum wage ${k.sim.symbol}${k.sim.minWage.toLocaleString("en-GB")}/yr, working age ${k.sim.workAge}.`,
    `People: ${l.rels.slice(0, 8).map((r) => `${r.name} (${r.role}, closeness ${Math.round(r.strength)})`).join(", ") || "few close ties"}.`,
    `Stats (0-100): ${st}.`,
    `Recent life:\n${recent}`,
    extra,
  ].join("\n").slice(0, 5800);
}
