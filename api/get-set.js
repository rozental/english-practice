// api/get-set.js
export default async function handler(req, res) {
  try {
    const code = req.query?.code || new URL(req.url, "http://x").searchParams.get("code");
    if (!code) return res.status(400).json({ error: "code missing" });

    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

    // If Supabase envs are not configured, fall back to local sample file
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const fs = require('fs');
        const path = require('path');
        const p = path.join(process.cwd(), 'public', 'sample.json');
        const txt = fs.readFileSync(p, 'utf8');
        const obj = JSON.parse(txt);
        return res.status(200).json({
          word_bank_order: obj.word_bank_order || [],
          items: obj.items || [],
          translations_he: obj.translations_he || obj.translations || []
        });
      } catch (readErr) {
        console.error('get-set fallback read error', readErr);
        return res.status(500).json({ error: 'internal', detail: 'missing supabase env and sample fallback failed' });
      }
    }

    const url = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/exercises?parent_code=eq.${encodeURIComponent(code)}&select=*`;

    let resp;
    try {
      resp = await fetch(url, {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      });
    } catch (fetchErr) {
      console.error('get-set fetch failed, falling back to sample', fetchErr);
      // fallback to sample.json if Supabase is unreachable
      try {
        const fs = require('fs');
        const path = require('path');
        const p = path.join(process.cwd(), 'public', 'sample.json');
        const txt = fs.readFileSync(p, 'utf8');
        const obj = JSON.parse(txt);
        return res.status(200).json({
          word_bank_order: obj.word_bank_order || [],
          items: obj.items || [],
          translations_he: obj.translations_he || obj.translations || []
        });
      } catch (readErr) {
        console.error('get-set fallback read error', readErr);
        return res.status(500).json({ error: 'internal', detail: 'fetch failed' });
      }
    }

    const text = await resp.text();
    if (!resp.ok) return res.status(500).json({ error: "supabase error", detail: text });

    const data = JSON.parse(text);
    if (!data?.[0]) return res.status(404).json({ error: "not found" });

    return res.status(200).json({
      word_bank_order: data[0].word_bank,
      items: data[0].items,
      translations_he: data[0].translations || []
    });
  } catch (e) {
    console.error("get-set err", e);
    return res.status(500).json({ error: "internal", detail: String(e?.message || e) });
  }
}
