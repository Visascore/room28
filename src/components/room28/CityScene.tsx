// Live city strip: shows the active life's city with real players (same city) wandering around.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CITIES, COUNTRIES } from "@/game/world";
import { cn } from "@/lib/utils";
import { R28Button } from "@/components/ui/r28-button";
import { openPlayerProfile } from "./PlayerPresence";

type P = { id: string; display_name: string; city_id: string | null; cars: number };
type F = { other: string; status: string; incoming: boolean };

const seed = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };

export function CityScene({ cityId }: { cityId: string }) {
  const city = CITIES[cityId];
  const [people, setPeople] = useState<P[]>([]);
  const [friends, setFriends] = useState<F[]>([]);

  const load = async () => {
    const [d, f] = await Promise.all([supabase.rpc("directory", { _city: cityId }), supabase.rpc("friend_list")]);
    setPeople((d.data ?? []) as P[]); setFriends((f.data ?? []) as F[]);
  };
  useEffect(() => { void load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [cityId]);

  if (!city) return null;

  return (
    <div key={cityId} className="relative h-56 overflow-hidden border-b border-border md:h-64" style={{ animation: "rise .8s ease both" }}>
      <img src={city.image} alt={city.name} className="absolute inset-0 h-full w-full object-cover opacity-60" style={{ animation: "citypan 40s ease-in-out infinite alternate" }} />
      <div className="absolute inset-0 veil" />
      {people.map((p) => {
        const h = seed(p.id); const f = friends.find((x) => x.other === p.id);
        return (
          <R28Button key={p.id} variant="quiet" onClick={() => openPlayerProfile(p)} aria-label={`View ${p.display_name}'s profile`}
            className="group absolute flex flex-col items-center px-0 py-0"
            style={{ left: `${8 + (h % 65)}%`, top: `${50 + ((h >> 3) % 20)}%`, animation: `wander ${14 + (h % 8)}s ease-in-out ${-(h % 10)}s infinite alternate`, ["--dx" as string]: `${(h % 2 ? 1 : -1) * 20}px`, ["--dy" as string]: `${(h % 10) - 5}px` }}>
            <span className={cn("flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold glow", f?.status === "accepted" ? "border-primary bg-primary text-primary-foreground" : "border-primary bg-background text-primary")}>
              {p.display_name.slice(0, 1).toUpperCase()}
            </span>
            <span className="mt-1 max-w-28 truncate bg-background/80 px-1.5 text-[0.6rem] uppercase tracking-[0.15em]">{p.display_name}</span>
          </R28Button>
        );
      })}
      <div className="absolute left-5 top-4">
        <p className="eyebrow">You are in</p>
        <p className="font-display text-3xl">{COUNTRIES[city.country].flag} {city.name}</p>
        <p className="text-xs text-muted-foreground">{people.length ? `${people.length} real player${people.length === 1 ? "" : "s"} around — tap someone to meet them` : "No other real players here right now"}</p>
      </div>
    </div>
  );
}
