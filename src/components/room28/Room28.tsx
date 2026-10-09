import { useEffect, useState } from "react";
import roomImg from "@/assets/room.jpg";
import { R28Button as B } from "@/components/ui/r28-button";
import { useGame, game } from "@/game/store";
import type { Life, FamilyTier } from "@/game/types";
import { CITIES, COUNTRIES, CAREERS, HOUSING, FAMILY_TIERS, cityCountry } from "@/game/world";
import { decisionById } from "@/game/content";
import { AiChapter, useAiDecision, Reflection } from "./AiLayer";
import { annualExpenses, annualIncome, biggestWhatIf, compareNarrative, countriesOf, fmtMoney, lifeSummary, netWorth, stageName } from "@/game/engine";
import { cn } from "@/lib/utils";
import { useSession } from "@/game/cloud";
import { AuthPanel } from "./AuthPanel";
import { CityScene } from "./CityScene";
import { supabase } from "@/integrations/supabase/client";

type View = "landing" | "how" | "room" | "setup" | "life" | "world" | "timeline" | "relationships" | "finances" | "archive" | "whatif" | "end" | "compare" | "inspect";

export function Room28() {
  const { lives, active } = useGame();
  const [view, setView] = useState<View>("landing");
  const [inspectId, setInspectId] = useState<string>();
  const go = (v: View) => { setView(v); window.scrollTo({ top: 0 }); };

  useEffect(() => { if (active?.status === "completed" && view === "life") go("end"); }, [active?.status, view]);

  const { session, ready } = useSession();
  const inGame = !["landing", "how", "setup", "end"].includes(view);
  if (!["landing", "how"].includes(view) && ready && !session) return <div className="min-h-screen bg-background text-foreground"><AuthPanel onBack={() => go("landing")} /></div>;
  return (
    <div className="min-h-screen bg-background text-foreground">
      {inGame && <Nav view={view} go={go} hasActive={!!active && active.status === "active"} />}
      {inGame && session && active?.status === "active" && <CityScene cityId={active.cityId} />}
      {view === "landing" && <Landing go={go} />}
      {view === "how" && <How go={go} />}
      {view === "room" && <RoomView lives={lives} active={active} go={go} />}
      {view === "setup" && <Setup go={go} />}
      {view === "life" && active && <CurrentLife life={active} go={go} />}
      {view === "world" && <World life={active} />}
      {view === "timeline" && active && <Timeline life={active} />}
      {view === "relationships" && active && <Relationships life={active} />}
      {view === "finances" && active && <Finances life={active} />}
      {view === "archive" && <Archive lives={lives} go={go} onInspect={(id) => { setInspectId(id); go("inspect"); }} />}
      {view === "inspect" && inspectId && <Inspect life={lives.find((l) => l.id === inspectId)!} go={go} />}
      {view === "whatif" && <WhatIf lives={lives} go={go} />}
      {view === "compare" && <Compare lives={lives} />}
      {view === "end" && active && <End life={active} go={go} />}
      {["timeline", "relationships", "finances"].includes(view) && !active && <Empty go={go} />}
      {view === "life" && !active && <Empty go={go} />}
    </div>
  );
}

const NAV: [View, string][] = [["room", "Room"], ["life", "Current life"], ["world", "World"], ["timeline", "Timeline"], ["relationships", "Relationships"], ["finances", "Finances"], ["archive", "Life archive"], ["whatif", "What if?"]];
function Nav({ view, go, hasActive }: { view: View; go: (v: View) => void; hasActive: boolean }) {
  return (
    <nav className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 overflow-x-auto px-5 py-3">
        <button onClick={() => go("landing")} className="font-display text-xl tracking-[0.2em] text-primary shrink-0">R28</button>
        {NAV.map(([v, label]) => (
          <button key={v} onClick={() => go(v)} disabled={!hasActive && ["life", "timeline", "relationships", "finances"].includes(v)}
            className={cn("shrink-0 text-[0.65rem] uppercase tracking-[0.25em] transition-colors disabled:opacity-30", view === v ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
            {label}
          </button>
        ))}
        <a href="/dashboard" className="ml-auto shrink-0 text-[0.65rem] uppercase tracking-[0.25em] text-primary hover:text-foreground">My dashboard</a>
        <button onClick={() => { void supabase.auth.signOut(); go("landing"); }} className=" shrink-0 text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground">Sign out</button>
      </div>
    </nav>
  );
}

function Landing({ go }: { go: (v: View) => void }) {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <img src={roomImg} alt="A glowing doorway in a dark room" width={1600} height={1008} className="slowzoom absolute inset-0 h-full w-full object-cover opacity-70" />
      <div className="veil absolute inset-0" />
      <div className="relative z-10 px-6 text-center">
        <p className="eyebrow rise">A global life simulation</p>
        <h1 className="rise mt-6 text-7xl tracking-[0.18em] md:text-9xl" style={{ animationDelay: ".2s" }}>ROOM 28</h1>
        <p className="rise mt-6 text-sm font-semibold uppercase tracking-[0.35em] text-primary" style={{ animationDelay: ".5s" }}>What if you lived life differently?</p>
        <p className="rise mt-4 font-display text-2xl italic text-muted-foreground" style={{ animationDelay: ".8s" }}>Every decision creates a different life.</p>
        <div className="rise mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row" style={{ animationDelay: "1.1s" }}>
          <B onClick={() => go("room")}>Enter Room 28</B>
          <B variant="ghost" onClick={() => go("how")}>How it works</B>
        </div>
      </div>
    </section>
  );
}

function How({ go }: { go: (v: View) => void }) {
  const steps = [
    ["Enter a life", "Choose where you're born and the family you grow up in. Everything else unfolds."],
    ["Live it", "Real situations arrive at every age. Choices trade one good thing for another."],
    ["Move the world", "Study, work or follow love across countries. Each place changes the maths of your life."],
    ["Return to the room", "When a life ends, it's archived. Then ask: what if?"],
    ["Branch", "Go back to a major decision and live the other road — without erasing the first."],
  ];
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <p className="eyebrow">How it works</p>
      <h2 className="mt-4 text-5xl">There is no single perfect life.</h2>
      <ol className="mt-14 space-y-10">
        {steps.map(([t, d], i) => (
          <li key={t} className="rise flex gap-6" style={{ animationDelay: `${i * 0.12}s` }}>
            <span className="font-display text-3xl text-primary">0{i + 1}</span>
            <div><h3 className="text-2xl">{t}</h3><p className="mt-1 text-muted-foreground">{d}</p></div>
          </li>
        ))}
      </ol>
      <p className="mt-14 text-xs text-muted-foreground">Money, salaries and costs are game simulation values, not real-world statistics.</p>
      <div className="mt-10 flex gap-4"><B onClick={() => go("room")}>Enter Room 28</B><B variant="quiet" onClick={() => go("landing")}>Back</B></div>
    </section>
  );
}

function RoomView({ lives, active, go }: { lives: Life[]; active?: Life; go: (v: View) => void }) {
  const done = lives.filter((l) => l.status === "completed");
  const inProgress = lives.filter((l) => l.status === "active");
  const nextNo = String(lives.reduce((m, l) => Math.max(m, l.number), 0) + 1).padStart(2, "0");
  return (
    <section className="relative min-h-[calc(100vh-49px)] overflow-hidden">
      <img src={roomImg} alt="" width={1600} height={1008} className="absolute inset-0 h-full w-full object-cover opacity-30" />
      <div className="veil absolute inset-0" />
      <div className="relative mx-auto max-w-6xl px-6 py-20">
        <p className="eyebrow">A place outside of time</p>
        <h2 className="mt-3 text-5xl md:text-6xl">Room 28</h2>
        <div className="mt-14 flex flex-wrap items-end gap-6">
          {done.map((l) => (
            <button key={l.id} onClick={() => { game.setActive(l.id); go("archive"); }} className="group flex h-64 w-32 flex-col justify-end border border-border bg-card/40 p-3 text-left transition hover:border-primary">
              <span className="eyebrow">{l.label}</span>
              <span className="mt-1 text-[0.6rem] uppercase tracking-[0.25em] text-primary">Completed</span>
            </button>
          ))}
          {inProgress.map((l) => (
            <button key={l.id} onClick={() => { game.setActive(l.id); go("life"); }} className={cn("breathe flex h-72 w-36 flex-col justify-end border border-primary/70 bg-primary/15 p-3 text-left glow", active?.id === l.id && "bg-primary/25")}>
              <span className="eyebrow text-foreground">{l.label}</span>
              <span className="mt-1 text-[0.6rem] uppercase tracking-[0.25em] text-primary">Age {l.age} · continue</span>
            </button>
          ))}
          <button onClick={() => go("setup")} className="glow flex h-80 w-40 flex-col justify-end bg-primary p-4 text-left text-primary-foreground transition hover:bg-glow">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.3em]">Life {nextNo}</span>
            <span className="mt-1 text-[0.6rem] uppercase tracking-[0.2em] opacity-70">Open the door</span>
          </button>
        </div>
        {done.length > 0 && <p className="mt-12 max-w-md font-display text-2xl italic text-muted-foreground">You have lived {done.length} {done.length === 1 ? "life" : "lives"}.</p>}
      </div>
    </section>
  );
}

const BIRTH = ["lagos", "abuja", "london", "manchester", "toronto", "newyork", "dubai"];
function Setup({ go }: { go: (v: View) => void }) {
  const [step, setStep] = useState(0);
  const [city, setCity] = useState<string>();
  const start = (tier: FamilyTier) => { game.newLife(city!, tier); go("life"); };
  const rand = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <button onClick={() => (step ? setStep(0) : go("room"))} className="eyebrow hover:text-primary">← Back</button>
      {step === 0 ? (
        <>
          <h2 className="rise mt-6 text-5xl">Where were you born?</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BIRTH.map((id) => { const c = CITIES[id]; return (
              <button key={id} onClick={() => { setCity(id); setStep(1); }} className="group relative h-44 overflow-hidden border border-border text-left">
                <img src={c.image} alt={c.name} loading="lazy" width={1600} height={912} className="absolute inset-0 h-full w-full object-cover opacity-60 transition duration-700 group-hover:scale-105 group-hover:opacity-90" />
                <div className="veil absolute inset-0" />
                <div className="absolute bottom-4 left-4"><p className="eyebrow">{COUNTRIES[c.country].flag} {COUNTRIES[c.country].name}</p><p className="font-display text-3xl">{c.name}</p></div>
              </button>); })}
          </div>
          <B variant="ghost" className="mt-8" onClick={() => { setCity(rand(BIRTH)); setStep(1); }}>Let fate decide</B>
        </>
      ) : (
        <>
          <p className="eyebrow mt-6">{CITIES[city!].name}</p>
          <h2 className="rise mt-3 text-5xl">What kind of family did you grow up in?</h2>
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {FAMILY_TIERS.map((t) => <B key={t.id} variant="choice" onClick={() => start(t.id)}>{t.name}</B>)}
          </div>
          <B variant="ghost" className="mt-8" onClick={() => start(rand(FAMILY_TIERS).id)}>Let fate decide</B>
        </>
      )}
    </section>
  );
}

function StatBar({ k, v }: { k: string; v: number }) {
  return (
    <div>
      <div className="flex justify-between text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground"><span>{k}</span><span>{v}</span></div>
      <div className="mt-1 h-px bg-border"><div className="h-px bg-primary transition-all duration-700" style={{ width: `${v}%` }} /></div>
    </div>
  );
}

function CityHeader({ life, compact }: { life: Life; compact?: boolean }) {
  const c = CITIES[life.cityId], k = COUNTRIES[c.country];
  return (
    <div className={cn("relative overflow-hidden", compact ? "h-56" : "h-[46vh] min-h-72")}>
      <img key={c.id} src={c.image} alt={c.name} width={1600} height={912} className="slowzoom absolute inset-0 h-full w-full object-cover" />
      <div className="veil absolute inset-0" />
      <div className="absolute bottom-6 left-0 right-0 mx-auto max-w-6xl px-6">
        <p className="eyebrow">{k.flag} {k.name} · {life.label} · {life.name}</p>
        <h1 className="rise text-6xl tracking-[0.12em] md:text-8xl">{c.name.toUpperCase()}</h1>
      </div>
    </div>
  );
}

function CurrentLife({ life, go }: { life: Life; go: (v: View) => void }) {
  const d = life.pending ? decisionById(life.pending) ?? (life.pendingMeta ? { ...life.pendingMeta, id: life.pending } : undefined) : undefined;
  const thinking = useAiDecision(life);
  const lastCity = life.timeline[life.timeline.length - 1];
  const justMoved = lastCity?.kind === "move" && lastCity.age === life.age && life.lastOutcome;
  const c = CITIES[life.cityId];
  return (
    <div>
      <CityHeader life={life} />
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-12 lg:grid-cols-[1fr_280px]">
        <div key={`${life.age}-${life.pending}-${!!life.lastOutcome}`} className="rise">
          <p className="eyebrow">{stageName(life.age)}</p>
          <h2 className="mt-2 text-6xl">Age {life.age}</h2>
          {life.branchNote && life.decisions.length <= 1 && life.lastOutcome && <p className="mt-4 border-l border-primary pl-4 text-sm text-primary">{life.branchNote}</p>}
          {!life.lastOutcome && <AiChapter life={life} />}
          {life.chapter.length > 0 && !life.lastOutcome && (
            <div className="mt-6 space-y-2">{life.chapter.map((t, i) => <p key={i} className="font-display text-xl italic text-muted-foreground">{t}</p>)}</div>
          )}
          {d && life.pendingOptions && (
            <div className="mt-8">
              <p className="eyebrow text-primary">{d.title}</p>
              <p className="mt-3 font-display text-3xl leading-snug">{d.prompt}</p>
              <div className="mt-8 space-y-3">
                {life.pendingOptions.map((o, i) => (
                  <B key={i} variant="choice" onClick={() => game.choose(i)}>
                    <div><div className="font-semibold">{o.label}</div><div className="mt-1 text-xs text-muted-foreground">{o.hints.join(" · ")}</div></div>
                  </B>
                ))}
              </div>
            </div>
          )}
          {life.lastOutcome && (
            <div className="mt-8">
              <p className="eyebrow text-primary">You chose: {life.lastOutcome.title}</p>
              <p className="mt-3 font-display text-3xl leading-snug">{life.lastOutcome.text}</p>
              {justMoved && (
                <div className="mt-8 grid grid-cols-2 gap-4 border border-border p-5 text-sm md:grid-cols-3">
                  <p className="col-span-full font-display text-2xl">You have moved to {c.name}.</p>
                  {[["Neighbourhood", c.neighbourhood], ["Housing", HOUSING[life.housing].name], ["Transport", c.transport], ["Weather", c.weather], ["Opportunities", c.opportunities], ["Cost of living", `${fmtMoney(life, annualExpenses(life))}/yr (sim)`]].map(([k, v]) => (
                    <div key={k}><p className="eyebrow">{k}</p><p className="mt-1">{v}</p></div>
                  ))}
                </div>
              )}
              <B className="mt-10" onClick={() => game.advance()}>Continue</B>
            </div>
          )}
          {!d && !life.lastOutcome && thinking && <p className="mt-8 animate-pulse font-display text-2xl italic text-primary">Something is stirring in your life…</p>}
          {!d && !life.lastOutcome && <B className="mt-10" variant={thinking ? "quiet" : undefined} onClick={() => game.advance()}>Let the years pass</B>}
        </div>
        <aside className="space-y-4">
          <div className="border border-border p-5">
            <p className="eyebrow">Net worth</p>
            <p className="mt-1 font-display text-3xl">{fmtMoney(life, netWorth(life))}</p>
            <p className="mt-1 text-xs text-muted-foreground">{life.careerId ? CAREERS[life.careerId].name : life.age < 18 ? "Child" : "Not working"} · {HOUSING[life.housing].name}</p>
          </div>
          <div className="space-y-3 border border-border p-5">
            {(["happiness", "health", "education", "career", "relationships", "family", "stress", "confidence"] as const).map((k) => <StatBar key={k} k={k} v={life.stats[k]} />)}
          </div>
          <B variant="quiet" onClick={() => go("timeline")}>View timeline →</B>
        </aside>
      </div>
    </div>
  );
}

function Timeline({ life }: { life: Life }) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <p className="eyebrow">{life.label} · {life.name}</p>
      <h2 className="mt-2 text-5xl">Timeline</h2>
      <TimelineList life={life} />
    </section>
  );
}
function TimelineList({ life }: { life: Life }) {
  return (
    <ol className="relative mt-10 border-l border-border pl-8">
      {life.timeline.map((t, i) => (
        <li key={i} className="relative pb-8">
          <span className={cn("absolute -left-[37px] top-2 h-2 w-2 rounded-full", t.kind === "move" || t.kind === "birth" || t.kind === "end" ? "bg-primary" : "bg-muted-foreground")} />
          <p className="eyebrow">Age {t.age}</p>
          <p className="mt-1 font-display text-2xl">{t.title}</p>
          <p className="text-sm text-muted-foreground">{t.text}</p>
        </li>
      ))}
    </ol>
  );
}

const ROLE: Record<string, string> = { parent: "Parent", sibling: "Sibling", friend: "Friend", partner: "Partner", spouse: "Spouse", ex: "Former partner", child: "Child", colleague: "Colleague" };
function Relationships({ life }: { life: Life }) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <p className="eyebrow">{life.label}</p>
      <h2 className="mt-2 text-5xl">The people in your life</h2>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {life.rels.map((p) => (
          <div key={p.id} className="border border-border p-5">
            <div className="flex items-baseline justify-between"><p className="font-display text-2xl">{p.name}</p><p className="eyebrow">{ROLE[p.role]}</p></div>
            <div className="mt-4 space-y-3"><StatBar k="Strength" v={p.strength} /><StatBar k="Trust" v={p.trust} /></div>
            {p.history.length > 0 && <ul className="mt-4 space-y-1 text-sm text-muted-foreground">{p.history.slice(-4).map((h, i) => <li key={i}>— {h}</li>)}</ul>}
          </div>
        ))}
      </div>
    </section>
  );
}

function Finances({ life }: { life: Life }) {
  const inc = annualIncome(life), exp = annualExpenses(life);
  const rows: [string, number, string?][] = [["Income", inc, "/year"], ["Expenses", exp, "/year"], ["Cash & savings", life.money.cash], ["Investments", life.money.invest], ["Property", life.money.property], ["Debt", -life.money.debt], ["Lifetime earnings", life.lifetimeEarnings]];
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <p className="eyebrow">{life.label} · {cityCountry(life.cityId).facts.currency}</p>
      <h2 className="mt-2 text-5xl">Finances</h2>
      <p className="mt-10 eyebrow">Net worth</p>
      <p className="font-display text-7xl text-primary">{fmtMoney(life, netWorth(life))}</p>
      <dl className="mt-10 divide-y divide-border border-y border-border">
        {rows.map(([k, v, s]) => <div key={k} className="flex justify-between py-4"><dt className="text-muted-foreground">{k}</dt><dd className="font-display text-2xl">{fmtMoney(life, v)}{s}</dd></div>)}
      </dl>
      <p className="mt-6 text-xs text-muted-foreground">Game simulation values, not real-world data.</p>
    </section>
  );
}

function World({ life }: { life?: Life }) {
  const [sel, setSel] = useState<string>(life ? CITIES[life.cityId].country : "uk");
  const lived = life ? countriesOf(life) : [];
  const k = COUNTRIES[sel];
  const cities = Object.values(CITIES).filter((c) => c.country === sel);
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <p className="eyebrow">World</p>
      <h2 className="mt-2 text-5xl">Where could your life take you?</h2>
      <div className="grain relative mt-10 aspect-[2/1] w-full overflow-hidden border border-border bg-card">
        {[...Array(5)].map((_, i) => <div key={i} className="absolute left-0 right-0 border-t border-border" style={{ top: `${(i + 1) * 16.6}%` }} />)}
        {Object.values(COUNTRIES).map((c) => {
          const x = ((c.lon + 180) / 360) * 100, y = ((90 - c.lat) / 180) * 100;
          const here = life && CITIES[life.cityId].country === c.id;
          return (
            <button key={c.id} onClick={() => setSel(c.id)} className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${x}%`, top: `${y}%` }}>
              <span className={cn("mx-auto block rounded-full", here ? "breathe h-4 w-4 bg-primary glow" : lived.includes(c.id) ? "h-3 w-3 bg-primary/70" : "h-2.5 w-2.5 border border-foreground/60", sel === c.id && "ring-2 ring-primary ring-offset-4 ring-offset-card")} />
              <span className="mt-2 block whitespace-nowrap text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">{c.flag} {c.name}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex gap-6 text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground"><span>● Current</span><span>● Lived</span><span>○ Possible</span></div>
      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <div>
          <h3 className="text-4xl">{k.flag} {k.name}</h3>
          <p className="eyebrow mt-6">Country facts</p>
          <dl className="mt-2 space-y-1 text-sm">{Object.entries(k.facts).map(([a, b]) => <div key={a} className="flex justify-between border-b border-border py-2"><dt className="capitalize text-muted-foreground">{a}</dt><dd>{b}</dd></div>)}</dl>
          <p className="eyebrow mt-6">Game simulation</p>
          <dl className="mt-2 space-y-1 text-sm">
            {[["Salary level", `${Math.round(k.sim.salaryIndex * 100)} (UK = 100)`], ["Cost of living", `${Math.round(k.sim.costIndex * 100)} (UK = 100)`], ["Migration", k.sim.migration], ["Healthcare", k.sim.healthcare], ["Tax", k.sim.tax]].map(([a, b]) => <div key={a} className="flex justify-between gap-4 border-b border-border py-2"><dt className="text-muted-foreground">{a}</dt><dd className="text-right">{b}</dd></div>)}
          </dl>
        </div>
        <div className="space-y-4">
          {cities.map((c) => (
            <div key={c.id} className="relative h-48 overflow-hidden border border-border">
              <img src={c.image} alt={c.name} loading="lazy" width={1600} height={912} className="absolute inset-0 h-full w-full object-cover opacity-60" />
              <div className="veil absolute inset-0" />
              <div className="absolute bottom-4 left-4 right-4"><p className="font-display text-3xl">{c.name}</p><p className="text-sm text-muted-foreground">{c.vibe} · {c.opportunities}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function route(l: Life) { return l.citiesLived.map((c) => `${COUNTRIES[CITIES[c].country].flag} ${CITIES[c].name}`).join(" → "); }

function Archive({ lives, go, onInspect }: { lives: Life[]; go: (v: View) => void; onInspect: (id: string) => void }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <p className="eyebrow">Life archive</p>
      <h2 className="mt-2 text-5xl">Every life you have lived</h2>
      {lives.length === 0 && <p className="mt-10 text-muted-foreground">No lives yet. <button className="text-primary" onClick={() => go("setup")}>Begin Life 01 →</button></p>}
      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {lives.map((l) => (
          <button key={l.id} onClick={() => onInspect(l.id)} className="border border-border bg-card/50 p-6 text-left transition hover:border-primary">
            <p className="font-display text-3xl">{l.label}</p>
            <p className="mt-2 text-sm">{route(l)}</p>
            <div className="mt-4 space-y-1 text-sm text-muted-foreground">
              <p>Age: {l.age}</p><p>Career: {l.careerId ? CAREERS[l.careerId].name : "—"}</p><p>Children: {l.children}</p>
            </div>
            <p className={cn("mt-4 text-[0.6rem] uppercase tracking-[0.25em]", l.status === "active" ? "text-primary" : "text-muted-foreground")}>{l.status === "active" ? "In progress" : "Completed"}</p>
          </button>
        ))}
      </div>
      {lives.filter((l) => l.status === "completed").length >= 2 && <B variant="ghost" className="mt-10" onClick={() => go("compare")}>Compare two lives</B>}
    </section>
  );
}

function Inspect({ life, go }: { life: Life; go: (v: View) => void }) {
  const s = lifeSummary(life);
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <button onClick={() => go("archive")} className="eyebrow hover:text-primary">← Archive</button>
      <h2 className="mt-4 text-6xl">{life.label}</h2>
      <p className="mt-2 text-muted-foreground">{life.name} · {route(life)}</p>
      {life.branchNote && <p className="mt-4 border-l border-primary pl-4 text-sm text-primary">{life.branchNote}</p>}
      <div className="mt-8 flex gap-3">
        {life.status === "active" ? <B onClick={() => { game.setActive(life.id); go("life"); }}>Continue this life</B> : <B variant="ghost" onClick={() => go("whatif")}>Explore what if</B>}
      </div>
      {life.status === "completed" && <Summary life={life} s={s} />}
      <TimelineList life={life} />
    </section>
  );
}

function Summary({ life, s }: { life: Life; s: ReturnType<typeof lifeSummary> }) {
  return (
    <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
      {s.dims.map((d) => <div key={d.k} className="border border-border p-4"><p className="eyebrow">{d.k}</p><p className="mt-1 font-display text-2xl text-primary">{d.label}</p></div>)}
      <p className="col-span-full mt-2 font-display text-2xl italic">{s.narrative}</p>
      <p className="col-span-full text-xs text-muted-foreground">Final net worth {fmtMoney(life, netWorth(life))} · lifetime earnings {fmtMoney(life, life.lifetimeEarnings)}</p>
    </div>
  );
}

function WhatIf({ lives, go }: { lives: Life[]; go: (v: View) => void }) {
  const branchable = lives.flatMap((l) => l.decisions.map((r, i) => ({ l, r, i })).filter((x) => x.r.snapshot));
  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <p className="eyebrow">What if?</p>
      <h2 className="mt-2 text-5xl">The roads not taken</h2>
      {branchable.length === 0 && <p className="mt-10 text-muted-foreground">Major decisions you make will appear here, ready to be lived differently.</p>}
      <div className="mt-10 space-y-6">
        {branchable.slice().reverse().map(({ l, r, i }) => (
          <div key={`${l.id}-${i}`} className="border border-border p-6">
            <p className="eyebrow">{l.label} · Age {r.age} · {CITIES[r.cityId].name}</p>
            <p className="mt-2 font-display text-2xl">At age {r.age}, you chose “{r.labels[r.chosen]}”.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {r.labels.map((lab, alt) => alt !== r.chosen && (
                <B key={alt} variant="ghost" onClick={() => { game.branch(l.id, i, alt); go("life"); }}>What if: {lab}</B>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Compare({ lives }: { lives: Life[] }) {
  const done = lives.filter((l) => l.status === "completed");
  const [a, setA] = useState(done[0]?.id);
  const [b, setB] = useState(done[1]?.id);
  const A = done.find((l) => l.id === a), Bl = done.find((l) => l.id === b);
  const row = (k: string, f: (l: Life) => string | number) => <tr key={k} className="border-b border-border"><td className="py-3 text-muted-foreground">{k}</td><td>{A ? f(A) : "—"}</td><td>{Bl ? f(Bl) : "—"}</td></tr>;
  const sel = (v: string | undefined, set: (s: string) => void) => (
    <select value={v} onChange={(e) => set(e.target.value)} className="border border-border bg-card px-3 py-2 text-sm">
      {done.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
    </select>
  );
  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <p className="eyebrow">Compare</p>
      <h2 className="mt-2 text-5xl">Two lives, side by side</h2>
      {done.length < 2 ? <p className="mt-10 text-muted-foreground">Complete two lives to compare them.</p> : (
        <>
          <div className="mt-8 flex gap-4">{sel(a, setA)}{sel(b, setB)}</div>
          <table className="mt-8 w-full text-left text-sm">
            <thead><tr className="border-b border-border"><th className="py-3" /><th className="font-display text-2xl">{A?.label}</th><th className="font-display text-2xl">{Bl?.label}</th></tr></thead>
            <tbody>
              {row("Birth", (l) => CITIES[l.bornCity].name)}
              {row("Final age", (l) => l.age)}
              {row("Countries", (l) => countriesOf(l).length)}
              {row("Children", (l) => l.children)}
              {row("Career", (l) => (l.careerId ? CAREERS[l.careerId].name : "—"))}
              {row("Net worth", (l) => fmtMoney({ ...l, cityId: "london" }, netWorth(l)))}
              {row("Happiness", (l) => `${l.stats.happiness}%`)}
            </tbody>
          </table>
          {A && Bl && <p className="mt-8 font-display text-2xl italic">{compareNarrative(A, Bl)}</p>}
        </>
      )}
    </section>
  );
}

function End({ life, go }: { life: Life; go: (v: View) => void }) {
  const [shown, setShown] = useState(0);
  const beats = life.timeline.filter((t) => ["birth", "move", "end"].includes(t.kind) || /Married|child|Divorced|Retired|business|Started|failed|Lost/i.test(t.title)).slice(0, 12);
  const lines = beats.map((t) => t.kind === "birth" ? `You were born in ${CITIES[life.bornCity].name}.` : t.kind === "end" ? `You died at ${t.age}.` : `At ${t.age}: ${t.title.replace(/^.*?: /, "")}.`);
  useEffect(() => { if (shown < lines.length + 2) { const t = setTimeout(() => setShown((s) => s + 1), 900); return () => clearTimeout(t); } return undefined; }, [shown, lines.length]);
  const w = biggestWhatIf(life);
  const s = lifeSummary(life);
  const tiers = FAMILY_TIERS.map((t) => t.id);
  const surprise = () => {
    const cities = Object.keys(CITIES).filter((c) => CITIES[c].country !== CITIES[life.bornCity].country);
    const idx = tiers.indexOf(life.family.tier);
    const far = tiers.filter((_, i) => Math.abs(i - idx) >= 2);
    game.newLife(cities[Math.floor(Math.random() * cities.length)], (far.length ? far : tiers)[Math.floor(Math.random() * (far.length || tiers.length))]);
    go("life");
  };
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="rise text-6xl md:text-7xl">This life is over.</h1>
      <p className="eyebrow mt-4">{life.label} complete · {life.name} · you lived {life.age} years</p>
      <div className="mt-12 space-y-3">
        {lines.slice(0, shown).map((t, i) => <p key={i} className="rise font-display text-2xl">{t}</p>)}
      </div>
      {shown > lines.length && (
        <div className="rise">
          <div className="mt-12 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            {[["Lived in", countriesOf(life).map((c) => COUNTRIES[c].name).join(" → ")], ["Careers", life.careersHad.map((c) => CAREERS[c].name).join(" → ") || "—"], ["Children", life.children], ["Major relationships", life.rels.filter((r) => ["spouse", "partner", "ex"].includes(r.role)).length], ["Lifetime earnings", fmtMoney(life, life.lifetimeEarnings)], ["Final net worth", fmtMoney(life, netWorth(life))], ["Major choices", life.decisions.length], ["Countries", countriesOf(life).length]].map(([k, v]) => (
              <div key={k as string}><p className="eyebrow">{k}</p><p className="mt-1">{v}</p></div>
            ))}
          </div>
          <Reflection life={life} />
          <Summary life={life} s={s} />
          <p className="mt-12 font-display text-3xl">This was one life.</p>
          <p className="font-display text-3xl italic text-muted-foreground">There were countless others you could have lived.</p>
          {w && (
            <div className="mt-12 border border-primary/50 p-6 glow">
              <p className="font-display text-3xl">But what if, at {w.rec.age}, you had chosen “{w.rec.labels[w.alt]}”?</p>
              <B className="mt-6" onClick={() => { game.branch(life.id, w.index, w.alt); go("life"); }}>Find out</B>
            </div>
          )}
          <div className="mt-12 grid gap-3 sm:grid-cols-2">
            <B variant="ghost" onClick={() => { game.newLife(life.bornCity, life.family.tier); go("life"); }}>Live again</B>
            <B variant="ghost" onClick={() => go("whatif")}>Change a decision</B>
            <B variant="ghost" onClick={() => go("setup")}>Start a new life</B>
            <B variant="ghost" onClick={surprise}>Surprise me</B>
          </div>
          <B variant="quiet" className="mt-8" onClick={() => { game.setActive(undefined); go("room"); }}>Return to Room 28</B>
        </div>
      )}
    </section>
  );
}

function Empty({ go }: { go: (v: View) => void }) {
  return <section className="mx-auto max-w-3xl px-6 py-24 text-center"><p className="font-display text-3xl">No life in progress.</p><B className="mt-8" onClick={() => go("setup")}>Open a new door</B></section>;
}
