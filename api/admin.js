// api/admin.js
export const config = { runtime: "edge" };

export default async function handler(req) {
res.setHeader('Cache-Control', 'no-store');
  // CORS basic (לא חובה בוורסל, אבל עוזר לכלים חיצוניים)
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-parent-code",
  };
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "GET") {
    return json({ error: "GET only" }, 405, corsHeaders);
  }

  const parentCode = process.env.PARENT_CODE;
  if (!parentCode) {
    return json({ error: "Missing PARENT_CODE" }, 500, corsHeaders);
  }

  const auth = req.headers.get("x-parent-code");
  if (auth !== parentCode) {
    return json({ error: "Unauthorized" }, 401, corsHeaders);
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "Missing Supabase env" }, 500, corsHeaders);
  }

  const url = new URL(req.url);
  const student = url.searchParams.get("student"); // אופציונלי: סינון לפי שם
  const limit = url.searchParams.get("limit");     // אופציונלי: ?limit=50
  const from  = url.searchParams.get("from");      // אופציונלי: מסנן זמן מ- (ISO)
  const to    = url.searchParams.get("to");        // אופציונלי: מסנן זמן עד (ISO)

  // בונים שאילתת PostgREST
  let qs = `select=*&order=started_at.desc`;
  if (student) {
    qs += `&student_name=eq.${encodeURIComponent(student)}`;
  }
  if (from) {
    qs += `&started_at=gte.${encodeURIComponent(from)}`;
  }
  if (to) {
    qs += `&started_at=lte.${encodeURIComponent(to)}`;
  }
  if (limit && /^[0-9]+$/.test(limit)) {
    qs += `&limit=${limit}`;
  }

  const resp = await fetch(`${SUPABASE_URL}/rest/v1/practice_results?${qs}`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Accept: "application/json",
    },
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    return json({ error: "Supabase select failed", detail: t }, 500, corsHeaders);
  }

  const rows = await resp.json();

  // סיכומים פשוטים
  const totals = rows.reduce(
    (acc, r) => {
      acc.sessions += 1;
      acc.correct += r.correct || 0;
      acc.wrong += r.wrong || 0;
      return acc;
    },
    { sessions: 0, correct: 0, wrong: 0 }
  );

  return json({ totals, rows }, 200, corsHeaders);
}

// עוזר להחזרת JSON מסודר
function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}
