# PROTOCOL — complete web career loop (1.0)

A Korean responsive esports management game derived from the expanded GDD. Uses original fictional clubs, players and draft characters. Hosted privately with platform identity; PC and mobile browsers share the same saved career.

## Playable loop
- 10 domestic clubs + 13 international clubs with complete 5-role lineups; ~140 champions using real League of Legends names (Korean) as flavour for the fictional Classic league.
- Weekly individual practice, team scrims, strategic analysis and rest; permanent stat growth and potential caps, form, burnout and lineup familiarity.
- Four tactics and three focus lanes. Manual competitive tournament draft: you pick every ban and pick for your side (blue/red, 10-ban/10-pick order) while the opponent AI responds. Picks are order- and lane-free — choose any champion, then auto-assign resolves the 5 lane slots and you swap them freely; an off-lane champion (neither its primary nor a listed `flex` lane) takes a stat penalty. The AD/AP composition of each side is shown live.
- Per-player mastery champion pool that **grows**: starting tiers scale with skill, and champions gain mastery XP from playing them in sets (bonus on win / POG) and from the "챔피언 특훈" weekly training, up to Lv4. A season meta champion set rotates each year; picking a mastered or meta champion boosts that player's on-lane stats.
- Server-authoritative seeded event simulation, accumulation of early advantage, Bo1/Bo3/Bo5, intermission lineups and tactics, caster-style play-by-play commentary (kills, first blood, objectives, teamfights), a live global-gold-difference graph, win probability explanations and POG.
- Spring/summer 18-match round robins and 8-match semi-double-elimination domestic playoffs.
- Midseason: domestic champion + 7 foreign teams, Bo5 elimination from quarterfinals.
- Worlds: top 3 domestic circuit-point clubs + 13 foreign clubs; five-round Swiss with 3 wins to qualify / 3 losses to exit, decision series Bo3, quarterfinals onward Bo5. Nonparticipants advance automatically.
- Multi-season roster evolution, rookies, aging, free agents, AI retention/recruitment, salary cap, cash ledger, contract signing and releases.
- Renewals keep current salary and apply future salary next season. Duplicate renewal protection and future-cap checks.
- Same-role cross-club trades with AI valuation, compensation, cap checks and contract transfer.
- Growth coach, analyst and psychology coach (levels 0–3), operating salaries and hiring fees, genuine simulation effects.
- Hall of fame, match history, circuit points, international tables and rosters, player stats and mastery pools.

## Persistence and recovery
Three D1 career slots keyed by authenticated owner + slot. Atomic state/revision/receipt/backup updates. Duplicate command retry does not recalculate. Conflicting device revision is rejected. Last three actions can be restored; the current state becomes a restore point. JSON export is available for inspection (import is not supported).

Existing state receives an idempotent data upgrade (schema version → 3): original results and seeds are retained; foreign club records and staff defaults are added; player `signature` pairs are replaced by role-derived `mastery` pools and a season `meta` set is backfilled; an in-progress auto draft is treated as a finished draft. Schema migration 0001 only adds a defaulted backups column; applied 0000 remains unchanged.

## Platform
Single TypeScript engine in Cloudflare Workers replaces the proposed C# runtime to fit Sites hosting. React responsive client is not an authority for scores or money. PWA manifest supports home-screen presentation; online access is required. This is not an App Store/Play Store binary.

## Intentional boundaries
- The Classic league now uses real-world identities for flavour: 10 LCK teams + 13 international orgs with best-effort ~2026 rosters (`lib/rosters.ts`), real champion names, and optional per-team logo URLs (else a brand-coloured badge). This is not licensed content, a live database, or an exact season recreation; player names/handles are approximate and editable in one file. Team ids are unchanged so existing saves keep working (they show the new team branding; player names only change for new careers).
- League view has 전체 일정 (full 18-round fixture grid with results/upcoming) and 선수 기록 (league-wide player table: OVR/POG/top mastery, sortable) tabs.
- Standings use wins, set differential, head-to-head and stable seed; separate boundary tiebreaker fixtures are not implemented.
- FA is an immediate fixed-price offer rather than a multi-club bidding process. Trades use deterministic AI valuation. Explicit, ledgered club emergency support prevents bankruptcy deadlocks in this career edition.
- Draft is one champion per role (no flex picks), fresh each set (no fearless). Sandbox editing, save-file import, cosmetic equipment, legend mode and native-store packaging are not included.
- No browser-only authoritative save, no external APIs, no real-money monetization; commentary and the gold graph are deterministic template output, not fabricated KDA telemetry.

## Verified
- `node --experimental-strip-types tests/engine.test.mjs`: three different-strength clubs, four full years each, ~1,065 manually-drafted user sets; seeded repeatability, 20 unique ban/pick selections with all five roles filled per side, finite per-event gold, non-empty commentary, schedule coverage, domestic playoff termination, 16-team Swiss qualifiers and international transitions.
- `node --experimental-strip-types tests/management.test.mjs`: idempotent old-save migration (v3, `signature`→`mastery`, meta backfill), deferred renewals, coaching/psychology effects, atomic trades and phase guards.
- SQLite existing-row migration and stale revision update rejection, TypeScript checks (`tsc --noEmit`), production Worker build.
- Browser/visual QA was not requested and was not performed.
