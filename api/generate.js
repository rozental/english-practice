// api/generate.js
export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method !== "POST") {
    return json({ error: "POST only" }, 405);
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { words, sessionId } = body;
  if (!Array.isArray(words) || words.length === 0) {
    return json({ error: "words[] required" }, 400);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json({ error: "Missing OPENAI_API_KEY" }, 500);
  }

  // הנחיה ל-OpenAI להחזיר JSON בלבד
  const systemPrompt = `You are a strict JSON generator. Output only valid JSON matching schema.`;
  const userPrompt = {
    task: "generate cloze practice",
    words,
    constraints: {
      items: 10,
      same_options_order_for_all_questions: true,
      blank_marker: "____",
      words_are_in_english: true,
      hebrew_sentences_have_english_blank: true,
      english_sentences_have_english_blank: true,
      no_translation_of_options: true,
    },
    output_schema: {
      word_bank_order: ["string", "..."],
      items: [
        {
          id: "string",
          hebrew_sentence: "string with ____",
          english_sentence: "string with ____",
          correct_option_index: 0,
        },
      ],
    },
  };

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(userPrompt) },
      ],
      response_format: { type: "json_object" },
      max_output_tokens: 1200,
      temperature: 0.4,
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    return json({ error: "OpenAI error", detail: t }, 500);
  }

  const data = await resp.json();

  let payload;
  try {
    // new Responses API: פלט בטקסט
    const text =
      data.output_text ||
      data.choices?.[0]?.message?.content ||
      data.content?.[0]?.text ||
      "";
    payload = JSON.parse(text);
  } catch (e) {
    return json({ error: "Invalid JSON from model" }, 500);
  }

  if (sessionId) payload.sessionId = sessionId;

  return json(payload, 200);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
