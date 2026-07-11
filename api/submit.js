// api/submit.js
export const config = { runtime: "edge" };

export default async function handler(req) {
  // CORS בסיסי (אופציונלי)
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "POST only" }, 405, corsHeaders);
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return json({ error: "Invalid JSON body" }, 400, corsHeaders);
  }

  const {
    sessionId,
    studentName,
    words,     // array of strings
    correct,   // number
    wrong,     // number
    details,   // any JSON (e.g., answers array)
  } = body || {};

  if (!sessionId) {
    return json({ error: "sessionId is required" }, 400, corsHeaders);
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "Missing Supabase env" }, 500, corsHeaders);
  }

  // בניית שורת ההכנסה
  const row = {
    session_id: String(sessionId),
    student_name: studentName ? String(studentName) : null,
    words: Array.isArray(words) ? words : null,
    correct: Number.isFinite(correct) ? correct : 0,
    wrong: Number.isFinite(wrong) ? wrong : 0,
    details: details ?? null,
    finished_at: new Date().toISOString(),
  };

  const resp = await fetch(`${SUPABASE_URL}/rest/v1/practice_results`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    return json({ error: "Supabase insert failed", detail: t }, 500, corsHeaders);
  }

  const inserted = await resp.json().catch(() => null);
  return json({ ok: true, row: inserted?.[0] ?? null }, 200, corsHeaders);
}

// helper
function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}
