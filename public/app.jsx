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
  if (route.page === "reports") return <AllReportsPage navigate={navigate} />;
  if (route.page === "child-progress") return <ChildProgressPage navigate={navigate} />;
  if (route.page === "child") return <ChildPage />;
  return <LandingPage navigate={navigate} />;
}

function getRoute() {
  const path = window.location.pathname;
  const search = window.location.search;
  if (path.startsWith("/parent")) return { page: "parent" };
  if (path.startsWith("/reports")) return { page: "reports" };
  if (search.includes('view=child-progress')) return { page: "child-progress" };
  if (path.startsWith("/child") || search.includes('code=')) return { page: "child" };
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
  const [blindMode, setBlindMode] = React.useState(false);

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
      let url = `https://english-practice-drab.vercel.app/?code=${encodeURIComponent(code.trim())}`;
      if (blindMode) url += '&blind=1';
      setResult(url);
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
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="blindMode"
            checked={blindMode}
            onChange={e => setBlindMode(e.target.checked)}
          />
          <label htmlFor="blindMode" className="text-sm">
            מצב עיוור: הילד לא יראה אם התשובה נכונה או לא
          </label>
        </div>
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

function ReportsPage() {
  const [sessions, setSessions] = React.useState([]);
  const [msg, setMsg] = React.useState("טוען דוחות...");
  const [words, setWords] = React.useState([]);

  React.useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const code = p.get("code");
    if (!code) {
      setMsg("Missing ?code= in URL. Example: ?code=tal");
      return;
    }
    // Fetch latest 5 sessions
    fetch(`/api/log-result?code=${encodeURIComponent(code)}&limit=5`)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) throw new Error("Bad data");
        setSessions(data);
        setMsg("");
        // Try to get practiced words from the latest session
        if (data[0]?.words) setWords(data[0].words);
        else setWords([]);
      })
      .catch(e => {
        setMsg("שגיאה בטעינת דוחות: " + (e?.message || e));
      });
  }, []);

  return (
    <div>
      <button className="text-blue-600 underline mb-4" onClick={() => navigate('/')}>← חזרה לדף הבית</button>
      <h2 className="text-xl font-bold mb-2">דו"חות וסטטיסטיקות</h2>
      {msg && <div>{msg}</div>}
      {sessions.length > 0 && (
        <table border="1" cellPadding="6" style={{marginTop:8}}>
          <thead>
            <tr>
              <th>התחלה</th>
              <th>משך (שניות)</th>
              <th>נכונים</th>
              <th>טעויות</th>
              <th>מילים בתרגול</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, i) => (
              <tr key={s.session_id || i}>
                <td>{s.start_time ? new Date(s.start_time).toLocaleString() : "-"}</td>
                <td>{s.start_time && s.end_time ? Math.round((s.end_time - s.start_time)/1000) : "-"}</td>
                <td>{s.correct ?? 0}</td>
                <td>{s.wrong ?? 0}</td>
                <td>{Array.isArray(s.words) ? s.words.join(", ") : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function AllReportsPage() {
  const [sessions, setSessions] = React.useState([]);
  const [msg, setMsg] = React.useState("טוען דוחות...");

  React.useEffect(() => {
    fetch(`/api/log-result?all=1`)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) throw new Error("Bad data");
        setSessions(data);
        setMsg("");
      })
      .catch(e => {
        setMsg("שגיאה בטעינת דוחות: " + (e?.message || e));
      });
  }, []);

  // Group by parent_code
  const grouped = {};
  sessions.forEach(s => {
    if (!grouped[s.parent_code]) grouped[s.parent_code] = [];
    grouped[s.parent_code].push(s);
  });

  return (
    <div>
      <h2>כל הדוחות (כל הקודים)</h2>
      {msg && <div>{msg}</div>}
      {Object.keys(grouped).length > 0 && (
        Object.entries(grouped).map(([code, sess]) => (
          <div key={code} style={{marginBottom:24}}>
            <h3>קוד: {code}</h3>
            <table border="1" cellPadding="6">
              <thead>
                <tr>
                  <th>התחלה</th>
                  <th>משך (שניות)</th>
                  <th>נכונים</th>
                  <th>טעויות</th>
                  <th>מילים בתרגול</th>
                </tr>
              </thead>
              <tbody>
                {sess.map((s, i) => (
                  <tr key={s.session_id || i}>
                    <td>{s.start_time ? new Date(s.start_time).toLocaleString() : "-"}</td>
                    <td>{s.start_time && s.end_time ? Math.round((s.end_time - s.start_time)/1000) : "-"}</td>
                    <td>{s.correct ?? 0}</td>
                    <td>{s.wrong ?? 0}</td>
                    <td>{Array.isArray(s.words) ? s.words.join(", ") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
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
  const [blindMode, setBlindMode] = React.useState(false);
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
    const blind = p.get("blind") === "1";
    setBlindMode(blind);
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

  const onPick = React.useCallback((id, optionIdx) => {
    const cleanId = id.replace(/^he-|^en-/, "");
    const item = items.find(x => x.id === cleanId);
    if (!item) return;
    const isRight = optionIdx === (item.correct_option_index ?? 0);
    setAnswers(prev => {
      const row = prev[id] || { correct: false, wrongs: [], selected: null };
      if (blindMode) {
        // In blind mode, always allow updates
        const next = { ...row };
        next.selected = optionIdx;
        if (isRight) next.correct = true;
        return { ...prev, [id]: next };
      } else {
        // Normal mode: only update if not already correct
        if (row.correct) return prev;
        const next = { ...row };
        if (isRight) next.correct = true;
        else if (!next.wrongs.includes(optionIdx)) next.wrongs = [...next.wrongs, optionIdx];
        return { ...prev, [id]: next };
      }
    });
    if (isRight) {
      setStats(s => {
        const n = { ...s };
        n.correct++;
        setTimeout(() => logProgress(n.correct, n.wrong), 0);
        return n;
      });
    } else {
      setStats(s => {
        const n = { ...s };
        n.wrong++;
        setTimeout(() => logProgress(n.correct, n.wrong), 0);
        return n;
      });
    }
  }, [blindMode, items]);

  function generateShareUrl() {
    const data = {
      wordBank,
      items,
      answers,
      stats,
      blindMode
    };
    const encoded = btoa(JSON.stringify(data));
    return `${window.location.origin}/?view=child-progress&data=${encoded}`;
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
      <div className="text-center">
        <button 
          onClick={() => {
            const url = generateShareUrl();
            navigator.clipboard.writeText(url);
            alert('קישור הועתק ללוח (clipboard)!');
          }}
          className="bg-purple-600 text-white px-6 py-2 rounded text-sm"
        >
          שתף התקדמות עם הורה
        </button>
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
            blindMode={blindMode}
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
            blindMode={blindMode}
          />
        ))}
      </section>
      <div className="text-center mt-8 mb-4">
        <button 
          onClick={() => {
            const url = generateShareUrl();
            navigator.clipboard.writeText(url);
            alert('קישור הועתק ללוח (clipboard)!');
          }}
          className="bg-purple-600 text-white px-6 py-2 rounded text-sm"
        >
          שתף התקדמות עם הורה
        </button>
      </div>
    </div>
  );
}

function ChildProgressPage({ navigate }) {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const encoded = p.get("data");
    if (!encoded) {
      setError("Missing data parameter");
      return;
    }
    try {
      const decoded = JSON.parse(atob(encoded));
      setData(decoded);
    } catch (e) {
      setError("Failed to decode data: " + e.message);
    }
  }, []);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow mt-10">
        <button className="text-blue-600 underline mb-4" onClick={() => navigate('/')}>← חזרה לדף הבית</button>
        <div className="bg-red-100 border border-red-400 text-red-800 rounded p-4">
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow mt-10">
        <div>טוען...</div>
      </div>
    );
  }

  const { wordBank, items, answers, stats, blindMode } = data;

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow mt-10 space-y-6">
      <button className="text-blue-600 underline mb-4" onClick={() => navigate('/')}>← חזרה לדף הבית</button>
      <h2 className="text-xl font-bold">התקדמות הילד</h2>
      
      <div className="bg-gray-50 p-4 rounded-lg border">
        <h3 className="font-semibold mb-3">סיכום</h3>
        <table border="1" cellPadding="4" className="w-full">
          <tbody>
            <tr className="bg-green-100">
              <td className="font-semibold">תשובות נכונות</td>
              <td className="text-lg font-bold text-green-700">{stats.correct}</td>
            </tr>
            <tr className="bg-red-100">
              <td className="font-semibold">תשובות לא נכונות</td>
              <td className="text-lg font-bold text-red-700">{stats.wrong}</td>
            </tr>
            <tr className="bg-blue-100">
              <td className="font-semibold">סה"כ שאלות</td>
              <td className="text-lg font-bold text-blue-700">{(stats.correct + stats.wrong) || items.length * 2}</td>
            </tr>
            <tr className="bg-yellow-100">
              <td className="font-semibold">אחוז הצלחה</td>
              <td className="text-lg font-bold text-yellow-700">
                {stats.correct + stats.wrong > 0 
                  ? Math.round((stats.correct / (stats.correct + stats.wrong)) * 100) 
                  : 0}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="font-semibold mb-3">פרטי התשובות</h3>
        <div className="space-y-3">
          {items.map((item, idx) => {
            const heId = `he-${item.id}`;
            const enId = `en-${item.id}`;
            const heAnswer = answers[heId];
            const enAnswer = answers[enId];
            const heCorrect = heAnswer?.correct;
            const enCorrect = enAnswer?.correct;
            const correctWord = wordBank[item.correct_option_index];

            return (
              <div key={item.id} className="bg-gray-50 p-4 rounded-lg border">
                <div className="font-semibold text-sm text-gray-600 mb-2">{idx + 1}. {item.id}</div>
                
                <div className="mb-3">
                  <div className="text-sm text-gray-700 mb-1"><strong>עברית:</strong> {item.hebrew_sentence}</div>
                  <div className={`text-sm px-2 py-1 rounded inline-block ${heCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {heCorrect ? '✓ נכון' : '✗ לא נכון'}
                  </div>
                  {heAnswer && <div className="text-xs text-gray-600 mt-1">תשובה: <strong>{wordBank[heAnswer.selected] || wordBank[heAnswer.wrongs?.[0]] || '-'}</strong></div>}
                </div>

                <div>
                  <div className="text-sm text-gray-700 mb-1"><strong>אנגלית:</strong> {item.english_sentence}</div>
                  <div className={`text-sm px-2 py-1 rounded inline-block ${enCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {enCorrect ? '✓ נכון' : '✗ לא נכון'}
                  </div>
                  {enAnswer && <div className="text-xs text-gray-600 mt-1">תשובה: <strong>{wordBank[enAnswer.selected] || wordBank[enAnswer.wrongs?.[0]] || '-'}</strong></div>}
                </div>

                <div className="text-xs text-gray-600 mt-2">
                  <strong>תשובה נכונה:</strong> {correctWord}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function QuestionRow({ id, index, total, sentence, correctIndex, wordBank, answers, onPick, blindMode }) {
  const row = answers[id] || { correct: false, wrongs: [], selected: null };
  
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm">
      <div className="text-sm text-gray-500 mb-1">[{index}/{total}]</div>
      <div className="mb-3 text-lg">{sentence}</div>
      <div className="grid grid-cols-2 gap-2">
        {wordBank.map((w, idx) => {
          let extra = "border hover:shadow active:translate-y-[1px]";
          if (blindMode) {
            // In blind mode, only show gray for the currently selected answer
            if (row.selected === idx) extra += " bg-gray-200 border-gray-400";
          } else {
            // Normal mode: show green for correct, red for wrong attempts
            if (row.correct && idx === correctIndex) extra += " bg-green-100 border-green-400";
            else if (row.wrongs.includes(idx)) extra += " bg-red-100 border-red-300";
          }
          return (
            <button
              key={idx}
              className={`px-3 py-3 rounded-xl ${extra}`}
              onClick={() => onPick(id, idx)}
              disabled={!blindMode && row.correct}
            >
              {w}
            </button>
          );
        })}
      </div>
    </div>
  );
}