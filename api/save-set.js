export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { parent_code, word_bank_order, items, translations_he } = await req.json?.() || await req.body?.then(r=>JSON.parse(r)) || req.body || {};
  if (!parent_code || !Array.isArray(word_bank_order) || !Array.isArray(items)) {
    return res.status(400).json({ error: 'missing fields' });
  }

  const url = `${process.env.SUPABASE_URL}/rest/v1/exercises`;
  const payload = [{
    parent_code,
    word_bank: word_bank_order,
    items,
    translations: translations_he || []
  }];

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates' // upsert
    },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const txt = await resp.text();
    return res.status(500).json({ error: 'supabase err', detail: txt });
  }
  return res.status(200).json({ ok: true });
}
