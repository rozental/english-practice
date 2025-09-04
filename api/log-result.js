export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const body = await req.json?.() || await req.body?.then(r=>JSON.parse(r)) || req.body || {};
  const { parent_code, session_id, student_name, correct, wrong } = body;
  if (!parent_code) return res.status(400).json({ error: 'parent_code missing' });

  const url = `${process.env.SUPABASE_URL}/rest/v1/results`;
  const payload = [{
    parent_code, session_id, student_name, correct: correct|0, wrong: wrong|0
  }];

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const txt = await resp.text();
    return res.status(500).json({ error: 'supabase err', detail: txt });
  }
  return res.status(200).json({ ok: true });
}
