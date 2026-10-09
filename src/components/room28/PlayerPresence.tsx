import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Users, UserPlus, Check, X, Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGame } from "@/game/store";
import { CITIES } from "@/game/world";
import { R28Button as B } from "@/components/ui/r28-button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export type RealPlayer = { id: string; display_name: string; city_id: string | null; cars?: number; last_seen?: string };
type Friendship = { friendship_id: string; other: string; display_name: string; city_id: string | null; status: string; incoming: boolean };
export function openPlayerProfile(player: RealPlayer) {
  window.dispatchEvent(new CustomEvent("room28:profile", { detail: player }));
}

export function PlayerPresence() {
  const [uid, setUid] = useState<string>();
  const [people, setPeople] = useState<RealPlayer[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [contacts, setContacts] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<RealPlayer>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [loaded, setLoaded] = useState(false);
  const { active, lives } = useGame();
  const cityId = active?.cityId ?? lives.filter(l => l.status === "active").at(-1)?.cityId;

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUid(data.user?.id));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) {
        setUid(session?.user.id); setSelected(undefined); setPeople([]); setFriends([]); setContacts({});
      }
    });
    const show = (event: Event) => { setSelected((event as CustomEvent<RealPlayer>).detail); setError(undefined); };
    window.addEventListener("room28:profile", show);
    return () => { data.subscription.unsubscribe(); window.removeEventListener("room28:profile", show); };
  }, []);

  const load = useCallback(async () => {
    if (!uid) return;
    const [directory, relationships, shared] = await Promise.all([
      supabase.rpc("directory"), supabase.rpc("friend_list"), supabase.rpc("friend_contacts"),
    ]);
    const failure = directory.error ?? relationships.error ?? shared.error;
    if (failure) { setError(failure.message); return; }
    setPeople(directory.data ?? []); setFriends(relationships.data ?? []);
    setContacts(Object.fromEntries((shared.data ?? []).map(c => [c.other, c.contact]))); setLoaded(true);
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    void load();
    const heartbeat = () => { void supabase.from("players").update({ last_seen: new Date().toISOString(), ...(cityId ? { city_id: cityId } : {}) }).eq("id", uid); };
    heartbeat();
    const timer = setInterval(() => { if (document.visibilityState === "visible") { heartbeat(); void load(); } }, 15000);
    return () => clearInterval(timer);
  }, [uid, cityId, load]);

  if (!uid) return null;
  const incoming = friends.filter(f => f.incoming && f.status === "pending");
  const relationship = friends.find(f => f.other === selected?.id);
  const nearby = people.filter(p => p.city_id === cityId && cityId);
  const visible = nearby.length ? nearby : people;
  const act = async (remove = false) => {
    if (!selected || busy) return;
    setBusy(true); setError(undefined);
    try {
      const result = remove && relationship
        ? await supabase.from("friendships").delete().eq("id", relationship.friendship_id)
        : await supabase.rpc("befriend", { _other: selected.id, ...(cityId ? { _met_in: CITIES[cityId]?.name } : {}) });
      if (result.error) throw result.error;
      await load();
      if (remove) setSelected(undefined);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update the connection. Please try again."); }
    finally { setBusy(false); }
  };
  return <>
    <section aria-label="Real players" className="border-b border-border bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-primary" />{nearby.length ? `Players in ${CITIES[cityId ?? ""]?.name}` : "Real players"}</p>
          <Link to="/dashboard" className="text-xs text-primary">My profile & friends →</Link>
        </div>
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {visible.map(p => <B key={p.id} variant="ghost" onClick={() => { setSelected(p); setError(undefined); }} className="min-w-44 max-w-56 shrink-0 justify-start px-3 py-2 normal-case tracking-normal text-left">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">{p.display_name.slice(0, 1).toUpperCase()}</span>
            <span className="min-w-0"><span className="block truncate">{p.display_name}</span><span className="block text-xs font-normal text-muted-foreground">{CITIES[p.city_id ?? ""]?.name ?? "No city yet"} · {p.last_seen && Date.now() - Date.parse(p.last_seen) < 60000 ? "Active now" : "Away"}</span></span>
          </B>)}
          {!visible.length && <p className="text-sm text-muted-foreground">{loaded ? "No other players yet." : "Loading players…"}</p>}
        </div>
        {incoming.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3"><p className="mr-2 text-xs text-primary">Connection requests · {incoming.length}</p>{incoming.map(f => <B key={f.friendship_id} variant="quiet" className="normal-case tracking-normal" onClick={() => { setSelected(people.find(p => p.id === f.other) ?? { id: f.other, display_name: f.display_name, city_id: f.city_id }); setError(undefined); }}>{f.display_name} wants to connect →</B>)}</div>}
        {error && !selected && <p role="alert" className="mt-2 text-sm text-destructive">{error} <B variant="quiet" onClick={() => void load()}>Retry</B></p>}
      </div>
    </section>
    <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(undefined); }}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
        <DialogTitle className="break-words pr-6 font-display text-3xl">{selected?.display_name}</DialogTitle>
        <DialogDescription>{CITIES[selected?.city_id ?? ""]?.name ?? "No city yet"} · Real player</DialogDescription>
        {selected?.cars !== undefined && <p className="flex items-center gap-2 text-sm"><Car className="h-4 w-4" />{selected.cars} cars</p>}
        {relationship?.status === "accepted" ? <><p className="flex items-center gap-2 text-primary"><Check className="h-4 w-4" />You’re friends</p><p className="break-words text-sm">{contacts[selected?.id ?? ""] ? `Shared contact: ${contacts[selected?.id ?? ""]}` : "No contact details shared yet."}</p><Link to="/dashboard" onClick={() => setSelected(undefined)} className="text-primary">Open friends & messages →</Link></>
          : relationship && !relationship.incoming ? <><p className="text-sm">Request sent. Waiting for {selected?.display_name} to accept.</p><B disabled={busy} variant="quiet" onClick={() => void act(true)}>Cancel request</B></>
          : <><p className="text-base">{relationship?.incoming ? `${selected?.display_name} wants to connect. Would you like to accept?` : `Would you like to connect with ${selected?.display_name}?`}</p><p className="text-xs text-muted-foreground">Contact details you choose to share become visible only after both of you agree.</p><div className="flex flex-wrap gap-3"><B disabled={busy} onClick={() => void act()} className="px-4 py-3 tracking-normal"><UserPlus className="h-4 w-4" />{busy ? "Please wait…" : relationship?.incoming ? "Accept connection" : "Send connection request"}</B><B disabled={busy} variant="quiet" className="tracking-normal" onClick={() => relationship?.incoming ? void act(true) : setSelected(undefined)}><X className="h-4 w-4" />{relationship?.incoming ? "Decline" : "Not now"}</B></div></>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  </>;
}