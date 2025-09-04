// api/log-result.js
async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  await new Promise((resolve, reject) => {
    req.on("data", c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", resolve);
    req.on("error", reject);
  });
  const str = Buffer.concat(chunks).toString("utf8") || "{}";
  try { return JSON.parse(str); } catch { return {}; }
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const body = await readJson(req);
    const { parent_code, session_id, student_name, correct, wrong } = body || {};
    if (!parent_code) return res.status(400).json({ error: "parent_code missing" });

    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
    const url = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/results`;

    const payload = [{
      parent_code,
      session_id: session_id || null,
      student_name: student_name || null,
      correct: Number(correct) || 0,
      wrong: Number(wrong) || 0
    }];

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const text = await resp.text();
    if (!resp.ok) return res.status(500).json({ error: "supabase error", detail: text });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("log-result err", e);
    return res.status(500).json({ error: "internal", detail: String(e?.message || e) });
  }
}
