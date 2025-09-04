export default function App() {
  const [role, setRole] = React.useState(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("parent") === "1") return "parent";
    if (p.get("admin") === "1") return "admin";
    return "child";
  });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="p-4 border-b bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">תרגול אנגלית – הורה/ילדה</h1>
          <div className="flex gap-2">
            <button onClick={() => setRole("child")} className={`px-3 py-1 rounded-xl ${role==="child"?"bg-black text-white":"bg-gray-200"}`}>ילדה</button>
            <button onClick={() => setRole("parent")} className={`px-3 py-1 rounded-xl ${role==="parent"?"bg-black text-white":"bg-gray-200"}`}>הורה</button>
            <button onClick={() => setRole("admin")} className={`px-3 py-1 rounded-xl ${role==="admin"?"bg-black text-white":"bg-gray-200"}`}>דוחות</button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4">
        {role === "parent" && <ParentView/>}
        {role === "child" && <ChildView/>}
        {role === "admin" && <AdminView/>}
      </main>

      <footer className="max-w-3xl mx-auto p-4 text-sm text-gray-500">נבנה ל-MVP מהיר. לשימוש ביתי/כיתתי.</footer>
    </div>
  );
}

/* -------------------------
   קומפוננטות משנה
------------------------- */

function ParentView(){
  const [wordsText, setWordsText] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [sessionId, setSessionId] = React.useState(() => crypto.randomUUID());

  async function generate(){
    const words = wordsText.split(/[\n,;]+/).map(w=>w.trim()).filter(Boolean);
    if (words.length === 0) { alert("הזן מילים באנגלית, מופרדות בפסיק/שורה"); return; }
    setLoading(true);
    setResult(null);
    try{
      const r = await fetch("/api/generate",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ words, sessionId })
      });
      const j = await r.json();
      if(!r.ok) throw new Error(j.error||"Fail");
      localStorage.setItem("last_word_bank", JSON.stringify(j.word_bank_order||words));
      localStorage.setItem("last_items", JSON.stringify(j.items||[]));
      localStorage.setItem("last_session_id", sessionId);
      setResult(j);
    }catch(e){
      console.error(e);
      alert("שגיאה ביצירה");
    }finally{ setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">מצב הורה – הזנת מילים ויצירת תרגיל</h2>
      <textarea className="w-full p-3 border rounded-xl" rows={4} placeholder={"Walk, Understand, Ignore, Brave, Clearly"} value={wordsText} onChange={e=>setWordsText(e.target.value)}></textarea>
      <div className="flex items-center gap-2">
        <button onClick={generate} disabled={loading} className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50">צור תרגיל</button>
        <span className="text-sm">Session: <code>{sessionId}</code></span>
      </div>
      {loading && <div className="animate-pulse text-gray-500">יוצר תרגיל…</div>}
      {result && (
        <div className="border rounded-xl p-3 bg-white">
          <h3 className="font-semibold mb-2">תצוגת מקדימה</h3>
          <div className="text-sm mb-2">מילות מחסן (סדר קבוע): {result.word_bank_order?.join(" · ")}</div>
          <ol className="list-decimal pr-5 space-y-1">
            {result.items?.map(it=> (
              <li key={it.id}><span className="font-medium">[עברית]</span> {it.hebrew_sentence}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function ChildView(){
  const [name, setName] = React.useState("");
  const [phase, setPhase] = React.useState(0);
  const [items, setItems] = React.useState([]);
  const [wordBank, setWordBank] = React.useState([]);
  const [sessionId, setSessionId] = React.useState("");
  const [fixedOrder, setFixedOrder] = React.useState([]);
  const [cursor, setCursor] = React.useState(0);
  const [correct, setCorrect] = React.useState(0);
  const [wrong, setWrong] = React.useState(0);

  React.useEffect(()=>{
    const wb = JSON.parse(localStorage.getItem("last_word_bank")||"null");
    const it = JSON.parse(localStorage.getItem("last_items")||"null");
    const sid = localStorage.getItem("last_session_id")||crypto.randomUUID();
    if (wb && it) {
      setWordBank(wb);
      setItems(it);
      setSessionId(sid);
      setFixedOrder(wb.map((w,idx)=>idx));
    }
  },[]);

  function start(){ setPhase(1); setCursor(0); setCorrect(0); setWrong(0); }

  function pick(optionIdx){
    const q = phase===1 ? items[cursor] : shuffled[cursor];
    const isRight = optionIdx === (q.correct_option_index ?? 0);
    if (isRight) setCorrect(v=>v+1); else setWrong(v=>v+1);
    const next = cursor + 1;
    if (next < items.length) setCursor(next);
    else if (phase===1) { setPhase(2); setCursor(0); }
    else { setPhase(3); }
  }

  const shuffled = React.useMemo(()=>{
    const arr = [...items];
    for (let i=arr.length-1; i>0; i--) { const j = Math.floor(Math.random()*(i+1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  },[items]);

  if (!items?.length) {
    return <div className="text-center text-gray-500">אין תרגיל טעון. בקש/י מהורה ליצור תרגיל חדש.</div>
  }

  return (
    <div className="space-y-4">
      {phase===0 && (
        <div className="bg-white p-4 rounded-2xl shadow-sm">
          <h2 className="text-lg font-semibold mb-2">מוכנה לתרגול?</h2>
          <div className="mb-2 text-sm">מילות מחסן: {wordBank.join(" · ")}</div>
          <input className="border rounded-xl px-3 py-2 w-full mb-2" placeholder="שם (לא חובה)" value={name} onChange={e=>setName(e.target.value)} />
          <button onClick={start} className="px-4 py-2 rounded-xl bg-black text-white">התחילי</button>
        </div>
      )}
      {phase===1 && (
        <QuestionCard
          title={`[${cursor+1}/${items.length}] השלימי את המשפט בעברית`}
          sentence={items[cursor].hebrew_sentence}
          options={fixedOrder}
          wordBank={wordBank}
          onPick={pick}
        />
      )}
      {phase===2 && (
        <QuestionCard
          title={`[${cursor+1}/${items.length}] השלימי את המשפט באנגלית`}
          sentence={shuffled[cursor].english_sentence}
          options={fixedOrder}
          wordBank={wordBank}
          onPick={pick}
        />
      )}
      {phase===3 && (
        <div className="bg-white p-4 rounded-2xl shadow-sm text-center">
          <h2 className="text-lg font-semibold">כל הכבוד!</h2>
          <p className="mt-2">נכונות: {correct} · שגיאות: {wrong}</p>
        </div>
      )}
    </div>
  );
}

function QuestionCard({ title, sentence, options, wordBank, onPick }){
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm">
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="mb-4 text-lg">{sentence}</div>
      <div className="grid grid-cols-2 gap-2">
        {options.map((idx)=> (
          <button key={idx} onClick={()=>onPick(idx)} className="px-3 py-3 rounded-xl border hover:shadow">{wordBank[idx]}</button>
        ))}
      </div>
    </div>
  );
}

function AdminView(){
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">מסך דוחות (צריך לממש קריאה ל-API)</h2>
      <p className="text-sm text-gray-500">ב-MVP בסיסי זה רק placeholder. בגרסה המלאה זה יתחבר ל-`/api/admin`.</p>
    </div>
  );
}
