import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { R28Button as B } from "@/components/ui/r28-button";

export function AuthPanel({ onBack, title = "Sign in to enter" }: { onBack?: () => void; title?: string }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(undefined);
    const res = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (res.error) return setMsg(res.error.message);
    if (mode === "up" && !res.data.session) setMsg("Check your email to confirm your account, then sign in.");
  };
  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) setMsg(r.error.message ?? "Google sign-in failed");
  };
  const input = "w-full border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary";
  return (
    <section className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      {onBack && <button onClick={onBack} className="eyebrow mb-8 text-left hover:text-primary">← Back</button>}
      <p className="eyebrow">Room 28</p>
      <h2 className="mt-2 text-5xl">{title}</h2>
      <p className="mt-3 text-sm text-muted-foreground">Your lives are saved to your account.</p>
      <B variant="ghost" className="mt-8 w-full" onClick={google}>Continue with Google</B>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <input className={input} type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={input} type="password" required minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <B type="submit" className="w-full" disabled={busy}>{mode === "in" ? "Sign in" : "Create account"}</B>
      </form>
      {msg && <p className="mt-4 text-sm text-primary">{msg}</p>}
      <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-6 text-sm text-muted-foreground hover:text-primary">
        {mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </section>
  );
}
