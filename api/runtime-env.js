// Vercel serverless function that emits the runtime-env JS with the
// project's Supabase credentials baked in. Configured via vercel.json
// to be served at /runtime-env.js so the main HTML's <script src> hits
// this endpoint and gets a live env snapshot at request time.
//
// Set these in Vercel → Project → Settings → Environment Variables:
//   SUPABASE_URL          (Production / Preview / Development)
//   SUPABASE_ANON_KEY     (Production / Preview / Development)

export default function handler(_req, res) {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_ANON_KEY || '';
  const body =
    "// Generated at request time by /api/runtime-env.js\n" +
    "window.__CAL_SUPABASE_URL      = " + JSON.stringify(url) + ";\n" +
    "window.__CAL_SUPABASE_ANON_KEY = " + JSON.stringify(key) + ";\n";

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.status(200).send(body);
}
