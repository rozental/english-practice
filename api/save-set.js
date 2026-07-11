// api/save-set.js
async function readJson(req) {
  // If Vercel already parsed it:
  if (req.body && typeof req.body === "object") return req.body;

  // Fallback: read raw body
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
  try { if (res && typeof res.setHeader === 'function') res.setHeader('Cache-Control', 'no-store'); } catch(_){}
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      // No Supabase configured — write to local sample.json as a fallback so the app can use it.
      try {
        const fs = require('fs');
        const path = require('path');
        const body = await readJson(req);
        const out = {
          word_bank_order: body.word_bank_order || body.word_bank || [],
          translations_he: body.translations_he || body.translations || [],
          items: body.items || []
        };
        const p = path.join(process.cwd(), 'public', 'sample.json');
        fs.writeFileSync(p, JSON.stringify(out, null, 2), 'utf8');
        return res.status(200).json({ ok: true, fallback: 'wrote sample.json' });
      } catch (fsErr) {
        console.error('save-set local write failed', fsErr);
        return res.status(500).json({ error: 'internal', detail: String(fsErr && fsErr.message ? fsErr.message : fsErr) });
      }
    }

    const body = await readJson(req);
    const { parent_code, word_bank_order, items, translations_he } = body || {};
    if (!parent_code || !Array.isArray(word_bank_order) || !Array.isArray(items)) {
      return res.status(400).json({ error: "missing fields" });
    }

    const url = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/exercises`;
    const payload = [{
      parent_code,
      word_bank: word_bank_order,
      items,
      translations: translations_he || []
    }];

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates" // UPSERT
      },
      body: JSON.stringify(payload)
    });

    const text = await resp.text();
    if (!resp.ok) {
      console.error("Supabase error", resp.status, text);
      return res.status(500).json({ error: "supabase error", detail: text });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("save-set err", e);
    return res.status(500).json({ error: "internal", detail: String(e?.message || e) });
  }
}
