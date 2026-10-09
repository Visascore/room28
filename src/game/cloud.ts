// Account sync: mirrors Life Circles to the player's account so they follow them across devices.
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Life } from "./types";
import { hydrate, onLivesChanged, currentLives } from "./store";
import { netWorth, countriesOf } from "./engine";

const row = (l: Life, userId: string) => ({
  id: l.id, user_id: userId, label: l.label, status: l.status, born_city: l.bornCity, city_id: l.cityId,
  age: l.age, career: l.careerId ?? null, net_worth: Math.round(netWorth(l)), countries: countriesOf(l).length,
  decisions: l.decisions.length, is_branch: !!l.parentId, data: l as unknown as never, updated_at: new Date().toISOString(),
});

let syncedUser: string | null = null;
let unsub: (() => void) | null = null;

async function startSync(session: Session) {
  const uid = session.user.id;
  if (syncedUser === uid) return;
  syncedUser = uid;
  await supabase.from("players").upsert({ id: uid, email: session.user.email ?? null, last_seen: new Date().toISOString() });
  const { data } = await supabase.from("lives").select("data").eq("user_id", uid).order("created_at");
  const cloud = (data ?? []).map((r) => r.data as unknown as Life);
  const ids = new Set(cloud.map((l) => l.id));
  const localOnly = currentLives().filter((l) => !ids.has(l.id));
  if (localOnly.length) await supabase.from("lives").upsert(localOnly.map((l) => row(l, uid)));
  hydrate([...cloud, ...localOnly]);
  unsub?.();
  const latest = [...cloud, ...localOnly].filter((l) => l.status === "active").pop();
  if (latest) void supabase.from("players").update({ city_id: latest.cityId }).eq("id", uid);
  unsub = onLivesChanged((changed) => {
    void supabase.from("lives").upsert(changed.map((l) => row(l, uid)));
    const a = changed.filter((l) => l.status === "active").pop();
    if (a) void supabase.from("players").update({ city_id: a.cityId, last_seen: new Date().toISOString() }).eq("id", uid);
  });
}
function stopSync() { syncedUser = null; unsub?.(); unsub = null; hydrate([]); }

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (s) void startSync(s);
      else if (event === "SIGNED_OUT") stopSync();
    });
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); if (data.session) void startSync(data.session); setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);
  return { session, ready };
}
