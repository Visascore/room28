<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## ROOM 28 architecture
- Simulation lives in `src/game/` (types, world data, content library, pure engine, localStorage store); UI in `src/components/room28/` only reads state and calls `game.*` actions — keeps content/rules expandable without touching UI.
- Decisions/events are data in `src/game/content.ts`; options are frozen into `Life.pendingOptions` when presented so branching replays identical choices.
- Money is stored in GBP-equivalent game units and converted per country `sim.fx` at display; `facts` vs `sim` separates real-world info from game values.
- Major decisions store a pre-choice snapshot; "What if" branches create new Life records and never overwrite the original.
- Lives are cached in localStorage and mirrored to the `lives` table per signed-in player (src/game/cloud.ts); admin analytics at /admin read all rows via has_role RLS, so admin is never decided client-side alone.
- Shared multiplayer economy (wallets, cars, friendships, messages) changes only through SECURITY DEFINER RPCs in the database; tables are read-only to clients so players can't edit their own balances.
- Render player presence once in the root layout and route profile selections through the shared consent dialog; this keeps real-player discovery and request responses available across every page without duplicating connection logic.
- AI features (chapter narration, invented decisions, end-of-life reflection) run through signed-in-only server functions in `src/game/ai.functions.ts` with gateway helpers in `src/lib/ai.server.ts`; results are stored on the Life and AI money is clamped client-side, so the pure engine stays deterministic and AI can never inflate wealth.
