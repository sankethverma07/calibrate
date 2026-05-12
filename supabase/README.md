# Supabase integration

Cross-device sync for Calibrate. Optional — Calibrate runs fully local without these credentials.

## Setup (5 minutes)

1. **Create a project** at [supabase.com](https://supabase.com) → New project. Region close to you, free tier is fine.

2. **Run the schema migration:**

   - Open the SQL editor in the Supabase dashboard
   - Paste the contents of [`schema.sql`](./schema.sql)
   - Run

   (Or via CLI: `supabase link --project-ref <ref>` then `supabase db push`.)

3. **Grab your credentials** — Settings → API:
   - Project URL → `VITE_SUPABASE_URL`
   - `anon` `public` key → `VITE_SUPABASE_ANON_KEY`

4. **Configure Calibrate** — copy `.env.example` to `.env` in the repo root and paste the values in.

5. **Enable email auth** — Authentication → Providers → Email. Magic links are default and work for Calibrate.

6. **Restart Calibrate.** When you sign in (via the UI you'll wire next), `sync.js` automatically queues localStorage writes for cloud mirroring, and `pull()` is called on session restore.

## What gets synced

| localStorage key             | Supabase table   | What it holds                                  |
|------------------------------|------------------|------------------------------------------------|
| `calibrate.profile.v1`       | `profiles`       | Achievements, longest streak, total focus min  |
| `calibrate.songMoods.v1`     | `song_moods`     | Per-song mood-sample tallies + manual tags     |
| `calibrate.customEq.v1`      | `custom_eqs`     | 8-band overrides per built-in mood             |
| `calibrate.namedPresets.v1`  | `named_presets`  | User-created named presets                     |

The minute-resolution `mood_buckets` time series is opt-in. The default sync **does not** upload it — too noisy and too privacy-sensitive for casual use. You can enable it explicitly with `window.__calSync.queueUpload('calibrate.profile.v1.buckets')` once you've decided on a retention policy.

## Row-level security

All five tables enforce `auth.uid() = user_id` on every read and write. A signed-in user can only see their own rows. The `anon` key shipped in client code is safe by design — RLS is the gate.

## Cost expectations

- Free tier covers ~50,000 monthly active users for auth and 500 MB of storage.
- Calibrate's per-user footprint is tiny (typically < 100 KB).
- The bottleneck if this scales is `mood_buckets` if you opt into time-series sync.

## Local dev

```bash
npm install -g supabase
supabase login
supabase init       # one-time
supabase start      # spins up local Postgres on :54322
```

Point `VITE_SUPABASE_URL` at `http://localhost:54321` and use the printed anon key for local-only testing.
