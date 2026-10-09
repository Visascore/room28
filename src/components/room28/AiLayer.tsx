// AI layer: narrates chapters, invents personal decisions, and writes an end-of-life reflection card.
import { useEffect, useRef, useState } from "react";
import { Sparkles, Share2, Copy } from "lucide-react";
import type { Life } from "@/game/types";
import { game } from "@/game/store";
import { aiContext } from "@/game/engine";
import { narrateChapter, inventDecision, reflectLife } from "@/game/ai.functions";
import { CITIES, cityCountry, moneyScale } from "@/game/world";
import { R28Button as B } from "@/components/ui/r28-button";

const storyKey = (l: Life) => `${l.age}-${l.pending ?? ""}`;
const inflight = new Set<string>();

export function AiChapter({ life }: { life: Life }) {
  const key = storyKey(life);
  const has = life.story?.key === key;
  useEffect(() => {
    if (has || life.status !== "active") return;
    const k = `${life.id}:story:${key}`;
    if (inflight.has(k)) return; inflight.add(k);
    narrateChapter({ data: { context: aiContext(life, "Write the chapter for this moment.") } })
      .then((r) => game.setStory(life.id, key, r.story))
      .catch(() => { /* the written chapter still shows */ });
  }, [key, has, life.id]);
  if (!has) return null;
  return (
    <p className="rise mt-6 border-l-2 border-primary pl-5 font-display text-2xl leading-snug">
      <Sparkles className="mr-2 inline h-4 w-4 text-primary" />{life.story!.text}
    </p>
  );
}

// When the library has no decision for this moment, ask the AI to invent one tailored to this life.
export function useAiDecision(life: Life) {
  const [busy, setBusy] = useState(false);
  const needed = life.status === "active" && !life.pending && !life.lastOutcome && life.age >= 5;
  useEffect(() => {
    if (!needed) return;
    const k = `${life.id}:dec:${life.age}`;
    if (inflight.has(k)) return; inflight.add(k);
    setBusy(true);
    inventDecision({ data: { context: aiContext(life) } })
      .then((d) => {
        // AI gives local currency; convert to game units (applyEffect re-scales by local prices) and cap swings.
        const fx = cityCountry(life.cityId).sim.fx, k = moneyScale(life.cityId);
        const options = d.options.map((o) => ({ ...o, effect: { ...o.effect, cash: Math.max(-15000, Math.min(15000, Math.round(o.effect.cash / fx / k))) } }));
        game.aiDecision(life.id, life.age, { ...d, options });
      })
      .catch(() => { /* years can still pass */ })
      .finally(() => setBusy(false));
  }, [needed, life.id, life.age]);
  return needed && busy;
}

export function Reflection({ life }: { life: Life }) {
  const r = life.reflection;
  const [err, setErr] = useState<string>();
  const [copied, setCopied] = useState(false);
  const started = useRef(false);
  useEffect(() => {
    if (r || started.current) return; started.current = true;
    reflectLife({ data: { context: aiContext(life, `This life ended at ${life.age}. Decisions taken: ${life.decisions.map((d) => `${d.age}: ${d.title} → ${d.labels[d.chosen]}`).join("; ")}`) } })
      .then((x) => game.setReflection(life.id, x))
      .catch((e) => setErr(e instanceof Error ? e.message : "The reflection couldn't be written."));
  }, [r, life.id]);

  if (!r) return <p className="mt-12 animate-pulse font-display text-2xl italic text-muted-foreground">{err ?? "Looking back on your life…"}</p>;
  const text = `“${r.headline}” — my life in ROOM 28. Born in ${CITIES[life.bornCity].name}, lived to ${life.age}. ${r.epitaph} What life would you live?`;
  const url = typeof window !== "undefined" ? window.location.origin : "";
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: r.headline, text, url }); } catch { /* cancelled */ } }
    else { await navigator.clipboard.writeText(`${text} ${url}`); setCopied(true); }
  };
  return (
    <div className="rise mt-14 space-y-8">
      <div className="relative overflow-hidden border border-primary/50 p-8 glow">
        <img src={CITIES[life.cityId].image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        <div className="absolute inset-0 veil" />
        <div className="relative">
          <p className="eyebrow text-primary">ROOM 28 · {life.label} · {CITIES[life.bornCity].name} → {CITIES[life.cityId].name}</p>
          <h2 className="mt-4 text-5xl leading-tight">{r.headline}</h2>
          <p className="mt-4 font-display text-2xl italic">{r.epitaph}</p>
          <p className="mt-6 text-xs uppercase tracking-[0.25em] text-muted-foreground">{life.name} · lived {life.age} years</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <B onClick={() => void share()}><Share2 className="h-4 w-4" />Share this life</B>
        <B variant="ghost" onClick={() => { void navigator.clipboard.writeText(`${text} ${url}`); setCopied(true); }}><Copy className="h-4 w-4" />{copied ? "Copied" : "Copy text"}</B>
      </div>
      <p className="font-display text-xl leading-relaxed">{r.story}</p>
      <div className="grid gap-8 md:grid-cols-2">
        <div><p className="eyebrow">What shaped you</p><ul className="mt-3 space-y-2 text-sm">{r.lessons.map((x, i) => <li key={i}>— {x}</li>)}</ul></div>
        <div><p className="eyebrow text-primary">Try next time</p><ul className="mt-3 space-y-2 text-sm">{r.tryNext.map((x, i) => <li key={i}>— {x}</li>)}</ul></div>
      </div>
    </div>
  );
}
