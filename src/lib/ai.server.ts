// Server-only Lovable AI helpers. Never import from client code.
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output } from "ai";
import type { z } from "zod";

const MODEL = "openai/gpt-6-astra";

function provider() {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured.");
  let runId: string | undefined;
  return createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (runId) headers.set("X-Lovable-AIG-Run-ID", runId);
      const res = await fetch(input, { ...init, headers });
      runId ??= res.headers.get("X-Lovable-AIG-Run-ID") ?? undefined;
      if (res.status === 402) throw new Error("AI credits have run out for now. The story continues without AI.");
      if (res.status === 429) throw new Error("The storyteller is busy. Try again in a moment.");
      return res;
    },
  });
}

const opts = {
  openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] },
} as const;

export async function aiObject<T extends z.ZodTypeAny>(system: string, prompt: string, schema: T): Promise<z.infer<T>> {
  const result = streamText({
    model: provider().responses(MODEL),
    system,
    prompt,
    output: Output.object({ schema }),
    maxRetries: 0,
    providerOptions: opts as never,
  });
  return (await result.output) as z.infer<T>;
}
