// api/get-set.js
export default async function handler(req, res) {
  try {
    const code = req.query?.code || new URL(req.url, "http://x").searchParams.get("code");
    if (!code) return res.status(400).json({ error: "code missing" });

    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
    const url = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/exercises?parent_code=eq.${encodeURIComponent(code)}&select=*`;

    const resp = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
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
