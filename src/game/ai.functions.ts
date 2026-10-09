// AI-powered storytelling, decisions and reflections. Signed-in players only.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({ context: z.string().min(10).max(6000) });

const WORLD = `You write for ROOM 28, a grounded, literary life simulation. Respect real-world culture, economics and law of the character's country and city (minimum wage, legal working age, school systems, family expectations, migration rules). Never be melodramatic or cliché. Second person ("you"). British English. No markdown.`;

export const narrateChapter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data }) => {
    const { aiObject } = await import("@/lib/ai.server");
    const out = await aiObject(
      `${WORLD} Write the next short chapter of this life: 2-3 vivid sentences (max 70 words) grounded in the specific city, age and recent events. Mention concrete local details. Do not decide anything for the player.`,
      data.context,
      z.object({ story: z.string() }),
    );
    return { story: out.story.slice(0, 600) };
  });

const optionSchema = z.object({
  label: z.string(),
  hints: z.array(z.string()),
  outcome: z.string(),
  happiness: z.number(), health: z.number(), education: z.number(), career: z.number(),
  relationships: z.number(), stress: z.number(), confidence: z.number(),
  cash: z.number(),
});

export const inventDecision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data }) => {
    const { aiObject } = await import("@/lib/ai.server");
    const out = await aiObject(
      `${WORLD} Invent ONE fresh, personal dilemma this exact person would realistically face now, given their age, country, city, money and history. Give 3 options. For each: label (max 6 words), 2-3 hints (possible consequences, never the result), outcome (1-2 sentences, what happens), and stat changes between -12 and 12 (happiness, health, education, career, relationships, stress, confidence). cash is the money change as a plain number in the LOCAL currency of the country they live in now — realistic for local wages, their age and wealth; children and teens should have small or zero amounts. Don't mention exact cash amounts in the prompt or labels. title max 5 words; prompt 1-2 sentences.`,
      data.context,
      z.object({ title: z.string(), prompt: z.string(), options: z.array(optionSchema) }),
    );
    const c = (n: number, m: number) => Math.max(-m, Math.min(m, Math.round(Number(n) || 0)));
    return {
      title: out.title.slice(0, 60),
      prompt: out.prompt.slice(0, 300),
      options: out.options.slice(0, 3).map((o) => ({
        label: o.label.slice(0, 60),
        hints: o.hints.slice(0, 3).map((h) => h.slice(0, 40)),
        outcome: o.outcome.slice(0, 300),
        effect: {
          stats: { happiness: c(o.happiness, 12), health: c(o.health, 12), education: c(o.education, 12), career: c(o.career, 12), relationships: c(o.relationships, 12), stress: c(o.stress, 12), confidence: c(o.confidence, 12) },
          cash: c(o.cash, 1e10),
        },
      })),
    };
  });

export const reflectLife = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data }) => {
    const { aiObject } = await import("@/lib/ai.server");
    const out = await aiObject(
      `${WORLD} This life has ended. Act as a wise, warm life coach looking back. Return: headline (a striking 4-8 word title for this life, shareable), epitaph (one memorable sentence), story (a 90-120 word retrospective), lessons (3 short insights about what shaped this life), tryNext (3 specific ideas for a different life to play next: a city, family background or choice to try).`,
      data.context,
      z.object({ headline: z.string(), epitaph: z.string(), story: z.string(), lessons: z.array(z.string()), tryNext: z.array(z.string()) }),
    );
    return { ...out, lessons: out.lessons.slice(0, 3), tryNext: out.tryNext.slice(0, 3) };
  });
