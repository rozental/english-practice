const exampleJson = `{
  "word_bank_order": ["apple", "banana", "cat", "dog"],
  "translations_he": ["תפוח", "בננה", "חתול", "כלב"],
  "items": [
    {
      "id": "1",
      "hebrew_sentence": "החיה הזו אומרת מיאו",
      "english_sentence": "This animal says meow",
      "correct_option_index": 2
    }
  ]
}`;

function App() {
  return <MainRouter />;
}

function MainRouter() {
  const [route, setRoute] = React.useState(getRoute());
  React.useEffect(() => {
    window.onpopstate = () => setRoute(getRoute());
  }, []);
  function navigate(r) {
    window.history.pushState({}, '', r);
    setRoute(getRoute());
  }
  if (route.page === "parent") return <ParentPage navigate={navigate} />;
  if (route.page === "reports") return <ReportsPage navigate={navigate} />;
  if (route.page === "child") return <ChildPage />;
  return <LandingPage navigate={navigate} />;
}

function getRoute() {
  const path = window.location.pathname;
  if (path.startsWith("/parent")) return { page: "parent" };
  if (path.startsWith("/reports")) return { page: "reports" };
  if (path.startsWith("/child") || window.location.search.includes('code=')) return { page: "child" };
  return { page: "landing" };
}

function LandingPage({ navigate }) {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6 bg-white rounded-2xl shadow mt-10 text-center">
      <h1 className="text-2xl font-bold mb-4">ברוכים הבאים לתרגול אנגלית</h1>
      <div className="flex flex-col gap-4 items-center">
        <button className="bg-blue-600 text-white px-6 py-3 rounded text-lg w-64" onClick={() => navigate('/parent')}>הורה: יצירת סט שאלות</button>
        <button className="bg-green-600 text-white px-6 py-3 rounded text-lg w-64" onClick={() => navigate('/reports')}>דו"חות וסטטיסטיקות</button>
        <button className="bg-purple-600 text-white px-6 py-3 rounded text-lg w-64" onClick={() => navigate('/child')}>ילד: מעבר לתרגול</button>
      </div>
      <div className="text-sm text-gray-500 mt-8">
        אתר זה מאפשר להורים ולמורים ליצור סטים של שאלות באנגלית ולשלוח קישור לילדים לתרגול.<br />
        כדי להתחיל, בחרו באפשרות הרצויה.
      </div>
    </div>
  );
}

function ParentPage({ navigate }) {
  const [json, setJson] = React.useState('');
  const [code, setCode] = React.useState('');
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setResult(null);
    let obj;
    try {
      obj = JSON.parse(json);
    } catch (e) {
      setError('JSON לא תקין: ' + e.message);
      return;
    }
    if (!code.trim()) {
      setError('יש להזין קוד (למשל: tal)');
      return;
    }
    setSaving(true);
    try {
      const resp = await fetch('/api/save-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_code: code.trim(), ...obj })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'שגיאה בשמירה');
      setResult(`https://english-practice-drab.vercel.app/?code=${encodeURIComponent(code.trim())}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6 bg-white rounded-2xl shadow mt-10">
      <button className="text-blue-600 underline mb-4" onClick={() => navigate('/')}>← חזרה לדף הבית</button>
      <h2 className="text-xl font-bold mb-2">הורה: יצירת סט שאלות</h2>
      <form onSubmit={handleSave} className="space-y-4">
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="קוד ייחודי (למשל: tal)"
          value={code}
          onChange={e => setCode(e.target.value)}
        />
        <textarea
          className="border rounded px-3 py-2 w-full h-40 font-mono"
          placeholder="הדביקו כאן JSON של שאלות..."
          value={json}
          onChange={e => setJson(e.target.value)}
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded" type="submit" disabled={saving}>{saving ? 'שומר...' : 'שמור והפק קישור'}</button>
      </form>
      {error && <div className="bg-red-100 border border-red-400 text-red-800 rounded p-4 mt-4">{error}</div>}
      {result && (
        <div className="bg-green-100 border border-green-400 text-green-800 rounded p-4 mt-4">
          סט נשמר! שלחו קישור זה לילד:
          <div className="mt-2 font-mono break-all">
            <a className="underline" href={result} target="_blank" rel="noopener noreferrer">{result}</a>
          </div>
        </div>
      )}
      <div className="text-sm text-gray-500 mt-4">
        פורמט JSON לדוגמה:
        <pre className="bg-gray-100 p-2 rounded mt-2 text-xs text-left overflow-x-auto">{exampleJson}</pre>
      </div>
    </div>
  );
}

function ReportsPage({ navigate }) {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6 bg-white rounded-2xl shadow mt-10">
      <button className="text-blue-600 underline mb-4" onClick={() => navigate('/')}>← חזרה לדף הבית</button>
      <h2 className="text-xl font-bold mb-2">דו"חות וסטטיסטיקות</h2>
      <div className="text-gray-500">בקרוב...</div>
    </div>
  );
}

function ChildPage() {
  const [status, setStatus] = React.useState("loading");
  const [msg, setMsg] = React.useState("טוען...");
  const [wordBank, setWordBank] = React.useState([]);
  const [items, setItems] = React.useState([]);
  const [translations, setTranslations] = React.useState([]);
  const [answers, setAnswers] = React.useState({});
  const [stats, setStats] = React.useState({ correct: 0, wrong: 0 });
  // Session tracking
  const sessionIdRef = React.useRef(null);
  const sessionStartRef = React.useRef(null);
  const parentCodeRef = React.useRef(null);

  // Generate session id
  function genSessionId() {
    return (
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 10)
    );
  }

  React.useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const code = p.get("code");
    if (!code) {
      setStatus("error");
      setMsg("Missing ?code= in URL. Example: ?code=tal");
      return;
    }
    parentCodeRef.current = code;
    sessionIdRef.current = genSessionId();
    sessionStartRef.current = Date.now();
    // Log session start
    fetch("/api/log-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parent_code: code,
        session_id: sessionIdRef.current,
        start_time: sessionStartRef.current,
        correct: 0,
        wrong: 0
      })
    });
    setStatus("loading");
    setMsg("טוען מהשרת...");
    const ts = Date.now();
    fetch(`/api/get-set?code=${encodeURIComponent(code)}&t=${ts}`)
      .then(async r => {
        const text = await r.text();
        if (!r.ok) throw new Error(text || ("HTTP " + r.status));
        let obj;
        try {
          obj = JSON.parse(text);
        } catch (e) {
          throw new Error("JSON parse failed: " + e.message);
        }
        const wb = Array.isArray(obj.word_bank_order) ? obj.word_bank_order : [];
        const it = Array.isArray(obj.items) ? obj.items : [];
        const tr = Array.isArray(obj.translations_he) ? obj.translations_he : [];
        setWordBank(wb);
        setItems(it);
        setTranslations(tr);
        if (wb.length === 0 || it.length === 0) {
          setStatus("empty");
          setMsg("התרגיל מהשרת ריק (אין מילים או אין שאלות).");
        } else {
          setStatus("ready");
          setMsg("");
        }
      })
      .catch(e => {
        console.error("load error", e);
        setStatus("error");
        setMsg(e?.message || String(e));
      });
  }, []);

  function logProgress(newCorrect, newWrong) {
    fetch("/api/log-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parent_code: parentCodeRef.current,
        session_id: sessionIdRef.current,
        correct: newCorrect,
        wrong: newWrong,
        start_time: sessionStartRef.current
      })
    });
  }

  function onPick(id, optionIdx) {
    const cleanId = id.replace(/^he-|^en-/, "");
    const item = items.find(x => x.id === cleanId);
    if (!item) return;
    const isRight = optionIdx === (item.correct_option_index ?? 0);
    setAnswers(prev => {
      const row = prev[id] || { correct: false, wrongs: [] };
      if (row.correct) return prev;
      const next = { ...row };
      if (isRight) next.correct = true;
      else if (!next.wrongs.includes(optionIdx)) next.wrongs = [...next.wrongs, optionIdx];
      return { ...prev, [id]: next };
    });
    setStats(s => {
      const n = { ...s };
      if (isRight) n.correct++;
      else n.wrong++;
      // Log progress after updating stats
      setTimeout(() => logProgress(n.correct, n.wrong), 0);
      return n;
    });
  }

  const shuffledEn = React.useMemo(() => {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [items]);

  if (status !== "ready") {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border">
          <div className="font-semibold mb-1">סטטוס: {status}</div>
          <div className="text-sm text-gray-700 break-words">{msg}</div>
        </div>
        {status === "error" && (
          <div className="bg-red-100 border border-red-400 text-red-800 rounded p-4 mt-4">
            שגיאה בטעינת התרגול.<br />
            {msg}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <div className="bg-white p-4 rounded-2xl shadow-sm">
        <h2 className="text-lg font-semibold mb-2">מחסן מילים</h2>
        <div className="flex flex-wrap gap-2">
          {wordBank.map((w, i) => (
            <span key={i} className="px-2 py-1 rounded-xl bg-gray-100 text-sm">
              {w}{translations[i] ? ` — ${translations[i]}` : ""}
            </span>
          ))}
        </div>
        <div className="mt-2 text-sm text-gray-600">נכונות: {stats.correct} · שגיאות: {stats.wrong}</div>
      </div>
      <section className="space-y-3">
        <h3 className="font-semibold">עברית → אנגלית</h3>
        {items.map((it, idx) => (
          <QuestionRow
            key={`he-${it.id}`}
            id={`he-${it.id}`}
            index={idx + 1}
            total={items.length}
            sentence={it.hebrew_sentence || it.english_sentence}
            correctIndex={it.correct_option_index ?? 0}
            wordBank={wordBank}
            answers={answers}
            onPick={onPick}
          />
        ))}
      </section>
      <section className="space-y-3">
        <h3 className="font-semibold">אנגלית → אנגלית (מעורבב)</h3>
        {shuffledEn.map((it, idx) => (
          <QuestionRow
            key={`en-${it.id}`}
            id={`en-${it.id}`}
            index={idx + 1}
            total={shuffledEn.length}
            sentence={it.english_sentence}
            correctIndex={it.correct_option_index ?? 0}
            wordBank={wordBank}
            answers={answers}
            onPick={onPick}
          />
        ))}
      </section>
    </div>
  );
}

function QuestionRow({ id, index, total, sentence, correctIndex, wordBank, answers, onPick }) {
  const row = answers[id] || { correct: false, wrongs: [] };
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm">
      <div className="text-sm text-gray-500 mb-1">[{index}/{total}]</div>
      <div className="mb-3 text-lg">{sentence}</div>
      <div className="grid grid-cols-2 gap-2">
        {wordBank.map((w, idx) => {
          let extra = "border hover:shadow active:translate-y-[1px]";
          if (row.correct && idx === correctIndex) extra += " bg-green-100 border-green-400";
          else if (row.wrongs.includes(idx)) extra += " bg-red-100 border-red-300";
          return (
            <button
              key={idx}
              className={`px-3 py-3 rounded-xl ${extra}`}
              onClick={() => onPick(id, idx)}
              disabled={row.correct}
            >
              {w}
            </button>
          );
        })}
      </div>
    </div>
  );
}