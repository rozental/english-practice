// app.jsx — גרסה מינימלית ובטוחה: מציגה תמיד סטטוס, טוענת סט לפי ?code=,
// מציגה את כל השאלות בעמוד אחד עם סימון ירוק/אדום קליקבילי.

function App(){
  return <Router/>;
function App(){
  return <ChildOnly/>;
}

function Router() {
  const p = new URLSearchParams(window.location.search);
  const code = p.get("code");
  if (!code) {
    return <LandingPage/>;
  }
  return <ChildOnly/>;
}

function LandingPage() {
  const [input, setInput] = React.useState("");
  function goToCode(e) {
    e.preventDefault();
    if (input.trim()) {
      window.location.search = `?code=${encodeURIComponent(input.trim())}`;
    }
  }
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6 bg-white rounded-2xl shadow mt-10">
      <h1 className="text-2xl font-bold mb-2">ברוכים הבאים לתרגול אנגלית</h1>
      <p className="text-gray-700 mb-4">הכניסו קוד תרגול שקיבלתם מהמורה או מההורה כדי להתחיל.</p>
      <form onSubmit={goToCode} className="flex gap-2">
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="הכניסו קוד תרגול (למשל: tal)"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded" type="submit">התחל</button>
      </form>
      <div className="text-sm text-gray-500 mt-4">
        אתר זה מאפשר להורים ולמורים ליצור סטים של שאלות באנגלית ולשלוח קישור לילדים לתרגול.<br/>
        כדי להתחיל, צרו סט שאלות במערכת הניהול, או השתמשו בקוד קיים.
      </div>
    </div>
  );
}
}

function ChildOnly(){
  const [status, setStatus] = React.useState("init"); // init | loading | ready | error | empty
  const [msg, setMsg] = React.useState("");
  const [wordBank, setWordBank] = React.useState([]);
  const [translations, setTranslations] = React.useState([]);
  const [items, setItems] = React.useState([]);
  const [answers, setAnswers] = React.useState({}); // key id -> {correct:boolean, wrongs:number[]}
  const [stats, setStats] = React.useState({correct:0, wrong:0});

  // ...existing code...
  React.useEffect(()=>{
    const p = new URLSearchParams(window.location.search);
    const code = p.get("code");
    if (!code) {
      setStatus("error");
      setMsg("Missing ?code= in URL. Example: ?child=1&code=tal");
      return;
    }
    setStatus("loading"); setMsg("טוען מהשרת…");
    const ts = Date.now();
    fetch(`/api/get-set?code=${encodeURIComponent(code)}&t=${ts}`)
      .then(async r=>{
        const text = await r.text();
        if (!r.ok) throw new Error(text || ("HTTP "+r.status));
        let obj;
        try { obj = JSON.parse(text); }
        catch(e){ throw new Error("JSON parse failed: " + e.message); }

  // ...existing code...

        const wb = Array.isArray(obj.word_bank_order) ? obj.word_bank_order : [];
        const it = Array.isArray(obj.items) ? obj.items : [];
        const tr = Array.isArray(obj.translations_he) ? obj.translations_he : [];

        setWordBank(wb);
        setItems(it);
        setTranslations(tr);

        if (wb.length === 0 || it.length === 0) {
          setStatus("empty"); setMsg("התרגיל מהשרת ריק (אין מילים או אין שאלות).");
        } else {
          setStatus("ready"); setMsg("");
        }
      })
      .catch(e=>{
        console.error("load error", e);
        setStatus("error"); setMsg(e?.message || String(e));
      });
  },[]);

  function onPick(id, optionIdx){
    const item = items.find(x=>x.id===id);
    if (!item) return;
    const isRight = optionIdx === (item.correct_option_index ?? 0);

    setAnswers(prev=>{
      const row = prev[id] || {correct:false, wrongs:[]};
      if (row.correct) return prev; // נועל אחרי תשובה נכונה
      const next = {...row};
      if (isRight) next.correct = true;
      else if (!next.wrongs.includes(optionIdx)) next.wrongs = [...next.wrongs, optionIdx];
      return {...prev, [id]: next};
    });

    setStats(s=>{
      const n = {...s};
      if (isRight) n.correct++; else n.wrong++;
      return n;
    });
  }

  function StatusBox(){
    if (status === "ready") return null;
    return (
      <div className="bg-white p-4 rounded-2xl shadow-sm border">
        <div className="font-semibold mb-1">סטטוס: {status}</div>
        <div className="text-sm text-gray-700 break-words">{msg}</div>
      </div>
    );
  }

  if (status !== "ready") {
    return (
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <h1 className="text-xl font-bold">תרגול אנגלית – מצב ילד</h1>
        <StatusBox/>
        {status === "empty" && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 rounded p-4 mt-4">
            לא נמצאו שאלות או מילים עבור קוד זה.<br/>
            ודאו שהקוד נכון ושהוזנו שאלות ומילים ב-Supabase.
          </div>
        )}
        {status === "error" && (
          <div className="bg-red-100 border border-red-400 text-red-800 rounded p-4 mt-4">
            שגיאה בטעינת התרגול.<br/>
            {msg}
          </div>
        )}
      </div>
    );
  }

  // אנגלית → אנגלית בסדר מעורבב
  const shuffledEn = React.useMemo(()=>{
    const arr = [...items];
    for (let i=arr.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [arr[i],arr[j]] = [arr[j],arr[i]];
    }
    return arr;
  },[items]);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <div className="bg-white p-4 rounded-2xl shadow-sm">
        <h2 className="text-lg font-semibold mb-2">מחסן מילים</h2>
        <div className="flex flex-wrap gap-2">
          {wordBank.map((w,i)=>(
            <span key={i} className="px-2 py-1 rounded-xl bg-gray-100 text-sm">
              {w}{translations[i] ? ` — ${translations[i]}` : ""}
            </span>
          ))}
        </div>
        <div className="mt-2 text-sm text-gray-600">נכונות: {stats.correct} · שגיאות: {stats.wrong}</div>
      </div>

      {/* עברית → אנגלית */}
      <section className="space-y-3">
        <h3 className="font-semibold">עברית → אנגלית</h3>
        {items.map((it,idx)=>(
          <QuestionRow
            key={`he-${it.id}`}
            id={it.id}
            index={idx+1}
            total={items.length}
            sentence={it.hebrew_sentence || it.english_sentence}
            correctIndex={it.correct_option_index ?? 0}
            wordBank={wordBank}
            answers={answers}
            onPick={onPick}
          />
        ))}
      </section>

      {/* אנגלית → אנגלית (מעורבב) */}
      <section className="space-y-3">
        <h3 className="font-semibold">אנגלית → אנגלית (מעורבב)</h3>
        {shuffledEn.map((it,idx)=>(
          <QuestionRow
            key={`en-${it.id}`}
            id={it.id + "-en"} /* מפתח נפרד למדור האנגלי */
            index={idx+1}
            total={shuffledEn.length}
            sentence={it.english_sentence}
            correctIndex={it.correct_option_index ?? 0}
            wordBank={wordBank}
            answers={answers}
            onPick={(id2,opt)=>onPick(it.id, opt)}
          />
        ))}
      </section>
    </div>
  );
}

function QuestionRow({ id, index, total, sentence, correctIndex, wordBank, answers, onPick }){
  const row = answers[id] || {correct:false, wrongs:[]};

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm">
      <div className="text-sm text-gray-500 mb-1">[{index}/{total}]</div>
      <div className="mb-3 text-lg">{sentence}</div>
      <div className="grid grid-cols-2 gap-2">
        {wordBank.map((w,idx)=>{
          let extra = "border hover:shadow active:translate-y-[1px]";
          if (row.correct && idx === correctIndex) extra += " bg-green-100 border-green-400";
          else if (row.wrongs.includes(idx)) extra += " bg-red-100 border-red-300";
          return (
            <button
              key={idx}
              className={`px-3 py-3 rounded-xl ${extra}`}
              onClick={()=> onPick(id, idx)}
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
