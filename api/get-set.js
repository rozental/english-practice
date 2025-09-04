export default async function handler(req, res) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  if (!code) return res.status(400).json({ error: 'code missing' });

  const url = `${process.env.SUPABASE_URL}/rest/v1/exercises?parent_code=eq.${encodeURIComponent(code)}&select=*`;
  const resp = await fetch(url, {
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  if (!resp.ok) {
    const txt = await resp.text();
    return res.status(500).json({ error: 'supabase err', detail: txt });
  }
  const data = await resp.json();
  if (!data?.[0]) return res.status(404).json({ error: 'not found' });

  return res.status(200).json({
    word_bank_order: data[0].word_bank,
    items: data[0].items,
    translations_he: data[0].translations || []
  });
}
