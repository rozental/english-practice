// app.jsx — גרסה ללא OpenAI וללא שרת. הכל בצד לקוח (localStorage).

function App() {
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
          <h1 className="text-xl font-bold">תרגול אנגלית – הורה/ילדה (ללא OpenAI)</h1>
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

      <footer className="max-w-3xl mx-auto p-4 text-sm text-gray-500">
        נתונים נשמרים מקומית בדפדפן (localStorage). אין שרת ואין OpenAI.
      </footer>
    </div>
  );
}

/* -------------------------
   Utils – localStorage
------------------------- */

const LS_KEYS = {
  WORD_BANK: "last_word_bank",
  ITEMS: "last_items",
  SESSION_ID: "last_session_id",
  LOG: "results_log", // מערך של סשנים שנשמרו
};

function saveJSON(key, obj) { localStorage.setItem(key, JSON.stringify(obj)); }
function loadJSON(key) {
  try { return JSON.parse(localStorage.getItem(key)||"null"); }
  catch { return null; }
}

// ----- RESULTS LOG HELPERS -----
function upsertSessionLog({ session_id, student_name, words, started_at, finished_at, correct, wrong }) {
  const log = loadJSON(LS_KEYS.LOG) || [];
  const idx = log.findIndex(r => r.session_id === session_id);
  const row = {
    id: idx >= 0 ? log[idx].id : crypto.randomUUID(),
    session_id,
    student_name: student_name ?? (idx >= 0 ? log[idx].student_name : null),
    words: words ?? (idx >= 0 ? log[idx].words : []),
    started_at: started_at ?? (idx >= 0 ? log[idx].started_at : Date.now()),
    finished_at: finished_at ?? (idx >= 0 ? log[idx].finished_at : null),
    correct: Number.isFinite(correct) ? correct : (idx >= 0 ? log[idx].correct : 0),
    wrong: Number.isFinite(wrong) ? wrong : (idx >= 0 ? log[idx].wrong : 0),
    last_updated: Date.now()
  };
  if (idx >= 0) log[idx] = row; else log.unshift(row);
  saveJSON(LS_KEYS.LOG, log);
  // ליידע את מסך הדוחות להתעדכן מיידית
  window.dispatchEvent(new Event("results_updated"));
}

/* -------------------------
   ParentView – הזנת JSON
------------------------- */

function ParentView(){
  const [jsonText, setJsonText] = React.useState("");
  const [preview, setPreview] = React.useState(null);
  const [error, setError] = React.useState("");
  const [sessionId, setSessionId] = React.useState(() => crypto.randomUUID());

  function loadSample(){
    const sample = {
      word_bank_order: ["Walk","Understand","Ignore","Brave","Clearly"],
      items: [
        { id: "q1", hebrew_sentence: "הוא ____ לבית הספר", english_sentence: "He ____ to school", correct_option_index: 0 },
        { id: "q2", hebrew_sentence: "אני לא ____ אותך", english_sentence: "I do not ____ you", correct_option_index: 1 },
        { id: "q3", hebrew_sentence: "אל ____ את החוקים", english_sentence: "Do not ____ the rules", correct_option_index: 2 },
        { id: "q4", hebrew_sentence: "היא היתה ____ מאוד", english_sentence: "She was very ____", correct_option_index: 3 },
        { id: "q5", hebrew_sentence: "הוא הסביר ____, כדי שיבינו", english_sentence: "He explained ____, so they understand", correct_option_index: 4 }
      ]
    };
    setJsonText(JSON.stringify(sample, null, 2));
    setPreview(sample);
    setError("");
  }

  function onFile(e){
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setJsonText(String(reader.result||"")); tryParse(String(reader.result||"")); };
    reader.readAsText(file, "utf-8");
  }

  function tryParse(text){
    setError("");
    try{
      const obj = JSON.parse(text);
      validateSchema(obj);
      setPreview(obj);
    }catch(err){
      setPreview(null);
      setError(err?.message || "JSON לא תקין");
    }
  }

  function validateSchema(obj){
    if (typeof obj !== "object" || !obj) throw new Error("JSON צריך להיות אובייקט עליון");
    const wb = obj.word_bank_order;
    const items = obj.items;
    if (!Array.isArray(wb) || wb.length === 0) throw new Error("word_bank_order חייב להיות מערך מחרוזות");
    if (!Array.isArray(items) || items.length === 0) throw new Error("items חייב להיות מערך עם לפחות שאלה אחת");
    wb.forEach((w,i)=> { if (typeof w !== "string") throw new Error(`word_bank_order[${i}] אינו מחרוזת`); });
    items.forEach((it,idx)=>{
      if (typeof it.id !== "string") throw new Error(`items[${idx}].id חסר/לא מחרוזת`);
      if (typeof it.hebrew_sentence !== "string")
        throw new Error(`items[${idx}].hebrew_sentence חייב להיות מחרוזת`);
      if (it.hebrew_sentence && !it.hebrew_sentence.includes("____"))
        throw new Error(`items[${idx}].hebrew_sentence (אם לא ריק) חייב לכלול "____"`);
      if (typeof it.english_sentence !== "string" || !it.english_sentence.includes("____"))
        throw new Error(`items[${idx}].english_sentence חייב לכלול "____"`);
      if (!Number.isInteger(it.correct_option_index) || it.correct_option_index < 0 || it.correct_option_index >= wb.length)
        throw new Error(`items[${idx}].correct_option_index מחוץ לטווח אפשרויות`);
    });
  }

  function saveForChild(){
    if (!preview) { alert("אין JSON תקין לטעינה"); return; }
    saveJSON(LS_KEYS.WORD_BANK, preview.word_bank_order);
    saveJSON(LS_KEYS.ITEMS, preview.items);
    localStorage.setItem(LS_KEYS.SESSION_ID, sessionId);
    alert("נשמר! כעת אפשר לעבור למסך הילדה ולהתחיל תרגול.");
  }

  React.useEffect(()=>{ if (jsonText) tryParse(jsonText); }, [jsonText]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">מצב הורה – הדבק/העלה JSON של התרגיל</h2>
      <p className="text-sm text-gray-600">
        פורמט מצופה:
        <code className="bg-gray-100 px-1 mx-1 rounded">word_bank_order: string[]</code>,
        <code className="bg-gray-100 px-1 mx-1 rounded">items: [ ... ]</code> עם
        <code className="bg-gray-100 px-1 mx-1 rounded">hebrew_sentence</code> (ריק או כולל "____"),
        <code className="bg-gray-100 px-1 mx-1 rounded">english_sentence</code> (חובה לכלול "____"),
        <code className="bg-gray-100 px-1 mx-1 rounded">correct_option_index</code>.
      </p>

      <div className="flex gap-2 items-center">
        <button onClick={loadSample} className="px-3 py-2 rounded-xl bg-gray-200">טען דוגמה</button>
        <label className="px-3 py-2 rounded-xl bg-gray-200 cursor-pointer">
          העלה קובץ JSON
          <input type="file" accept=".json,application/json" className="hidden" onChange={onFile}/>
        </label>
      </div>

      <textarea
        className="w-full p-3 border rounded-xl font-mono"
        rows={14}
        placeholder='{"word_bank_order":["Walk",...],"items":[...]}'
        value={jsonText}
        onChange={e=>setJsonText(e.target.value)}
      ></textarea>

      {error && <div className="text-red-600">{error}</div>}

      {preview && (
        <div className="border rounded-xl p-3 bg-white">
          <h3 className="font-semibold mb-2">תצוגת מקדימה</h3>
          <div className="text-sm mb-2">מילות מחסן (סדר קבוע): {preview.word_bank_order.join(" · ")}</div>
          <ol className="list-decimal pr-5 space-y-1">
            {preview.items.map(it=> (
              <li key={it.id}>
                <span className="font-medium">[עברית]</span> {it.hebrew_sentence || "—"}
                <span className="text-gray-400"> (נכון: #{(it.correct_option_index??0)+1})</span>
              </li>
            ))}
          </ol>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm">Session:</span>
            <code className="text-sm px-2 py-1 rounded bg-gray-100">{sessionId}</code>
          </div>
          <button onClick={saveForChild} className="mt-3 px-4 py-2 rounded-xl bg-black text-white">שמור ופתח לתרגול</button>
        </div>
      )}
    </div>
  );
}

/* -------------------------
   ChildView – תרגול
------------------------- */

function ChildView(){
  const [name, setName] = React.useState("");
  const [phase, setPhase] = React.useState(0); // 0=הכנה, 1=עברית→אנגלית, 2=אנגלית→אנגלית (מעורב), 3=סיום
  const [items, setItems] = React.useState([]);
  const [wordBank, setWordBank] = React.useState([]);
  const [sessionId, setSessionId] = React.useState("");
  const [fixedOrder, setFixedOrder] = React.useState([]);
  const [cursor, setCursor] = React.useState(0);
  const [correct, setCorrect] = React.useState(0);
  const [wrong, setWrong] = React.useState(0);
  const [flash, setFlash] = React.useState(null);
  const sessionStartRef = React.useRef(null);

  React.useEffect(()=>{
    const wb = loadJSON(LS_KEYS.WORD_BANK);
    const it = loadJSON(LS_KEYS.ITEMS);
    const sid = localStorage.getItem(LS_KEYS.SESSION_ID) || crypto.randomUUID();
    if (wb && it) {
      setWordBank(wb);
      setItems(it);
      setSessionId(sid);
      setFixedOrder(wb.map((_,idx)=>idx));
    }
  },[]);

  const shuffled = React.useMemo(()=>{
    const arr = [...items];
    for (let i=arr.length-1; i>0; i--) { const j = Math.floor(Math.random()*(i+1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  },[items]);

  function start(){
    setPhase(1);
    setCursor(0);
    setCorrect(0);
    setWrong(0);
    setFlash(null);
    sessionStartRef.current = Date.now();
    // רושמים פתיחת סשן בלוג
    upsertSessionLog({
      session_id: sessionId,
      student_name: name || null,
      words: wordBank,
      started_at: sessionStartRef.current,
      correct: 0,
      wrong: 0
    });
  }

  function flashNow(msg){
    setFlash(msg);
    setTimeout(()=> setFlash(null), 600);
  }

  function pick(optionIdx){
    const q = phase===1 ? items[cursor] : shuffled[cursor];
    const isRight = optionIdx === (q.correct_option_index ?? 0);

    if (isRight) {
      setCorrect(v => {
        const nv = v + 1;
        upsertSessionLog({
          session_id: sessionId,
          student_name: name || null,
          words: wordBank,
          correct: nv,
          wrong
        });
        return nv;
      });
      flashNow("נכון! ✅");

      // מעבר לשאלה הבאה רק אם נכון
      const next = cursor + 1;
      if (next < items.length) {
        setCursor(next);
      } else if (phase === 1) {
        setPhase(2);
        setCursor(0);
        setFlash(null);
      } else {
        // סיום
        setPhase(3);
        upsertSessionLog({
          session_id: sessionId,
          finished_at: Date.now(),
        });
      }
    } else {
      setWrong(v => {
        const nv = v + 1;
        upsertSessionLog({
          session_id: sessionId,
          student_name: name || null,
          words: wordBank,
          correct,
          wrong: nv
        });
        return nv;
      });
      flashNow("טעות ❌");
      // נשארים על אותה שאלה
    }
  }

  if (!items?.length) {
    return <div className="text-center text-gray-500">אין תרגיל טעון. בקש/י מהורה ליצור/להדביק JSON במסך ההורה.</div>
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

      {(phase===1 || phase===2) && (
        <>
          {flash && <div className="text-center font-medium">{flash}</div>}
          <QuestionCard
            title={phase===1
              ? `[${cursor+1}/${items.length}] בחרי את המילה באנגלית שמשלימה את המשפט בעברית`
              : `[${cursor+1}/${items.length}] בחרי את המילה באנגלית למשפט באנגלית (סדר שאלות מעורבב)`
            }
            sentence={(phase===1 ? items[cursor].hebrew_sentence : shuffled[cursor].english_sentence)}
            options={fixedOrder}
            wordBank={wordBank}
            onPick={pick}
          />
          <div className="text-sm text-gray-500 text-center">נכונות: {correct} · שגיאות: {wrong}</div>
        </>
      )}

      {phase===3 && (
        <div className="bg-white p-4 rounded-2xl shadow-sm text-center">
          <h2 className="text-lg font-semibold">כל הכבוד!</h2>
          <p className="mt-2">נכונות: {correct} · שגיאות: {wrong}</p>
          <p className="text-sm text-gray-500">התוצאה נשמרה ומתעדכנת בדוחות.</p>
        </div>
      )}
    </div>
  );
}

/* -------------------------
   Question card
------------------------- */

function QuestionCard({ title, sentence, options, wordBank, onPick }){
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm">
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="mb-4 text-lg">{sentence}</div>
      <div className="grid grid-cols-2 gap-2">
        {options.map((idx)=> (
          <button key={idx} onClick={()=>onPick(idx)} className="px-3 py-3 rounded-xl border hover:shadow active:translate-y-[1px]">
            {wordBank[idx]}
          </button>
        ))}
      </div>
    </div>
  );
}

/* -------------------------
   AdminView – דוחות (מ-localStorage)
------------------------- */

function AdminView(){
  const [rows, setRows] = React.useState([]);

  React.useEffect(()=>{
    const load = () => {
      const log = loadJSON(LS_KEYS.LOG) || [];
      setRows(log);
    };
    load();
    const onUpd = () => load();
    window.addEventListener("results_updated", onUpd);
    window.addEventListener("storage", onUpd);
    return () => {
      window.removeEventListener("results_updated", onUpd);
      window.removeEventListener("storage", onUpd);
    };
  },[]);

  function clearAll(){
    if (!confirm("למחוק את כל היסטוריית התוצאות במכשיר?")) return;
    localStorage.removeItem(LS_KEYS.LOG);
    setRows([]);
  }
  function exportJSON(){
    const blob = new Blob([JSON.stringify(rows, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `results_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totals = rows.reduce((acc,r)=>{ acc.sessions++; acc.correct+=r.correct||0; acc.wrong+=r.wrong||0; return acc; }, {sessions:0, correct:0, wrong:0});

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">דוחות – מקומי לדפדפן (מתעדכן בזמן אמת)</h2>
      <div className="flex gap-2">
        <button onClick={exportJSON} className="px-3 py-2 rounded-xl bg-gray-200">ייצא JSON</button>
        <button onClick={clearAll} className="px-3 py-2 rounded-xl bg-red-600 text-white">נקה הכל</button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm">
        <div>סה״כ סשנים: {totals.sessions}</div>
        <div>נכונות: {totals.correct} · שגיאות: {totals.wrong}</div>
      </div>

      <div className="space-y-2">
        {rows.map(r=> (
          <div key={r.id} className="bg-white p-3 rounded-xl border">
            <div className="text-sm text-gray-500">
              התחיל: {r.started_at ? new Date(r.started_at).toLocaleString() : "—"}
              {" · "}
              עודכן: {r.last_updated ? new Date(r.last_updated).toLocaleString() : "—"}
            </div>
            <div>Session: <code>{r.session_id}</code></div>
            <div>תלמיד/ה: {r.student_name||"—"}</div>
            <div>מילים: {(r.words||[]).join(", ")}</div>
            <div>נכונות: {r.correct} · שגיאות: {r.wrong}</div>
          </div>
        ))}
        {rows.length===0 && <div className="text-sm text-gray-500">אין עדיין תוצאות שמורות במכשיר.</div>}
      </div>
    </div>
  );
}
