// app.jsx — ללא OpenAI/שרת. כל הלוגיקה בצד לקוח, עם תמיכה: כל השאלות בעמוד, child-only link, תרגומי מילים, צבעים מתמשכים, ודוחות חיים.

function App() {
  const params = new URLSearchParams(window.location.search);
  const childOnly = params.get("child") === "1";
  const [role, setRole] = React.useState(() => {
    if (params.get("parent") === "1") return "parent";
    if (params.get("admin") === "1") return "admin";
    return "child";
  });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="p-4 border-b bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">תרגול אנגלית – הורה/ילדה</h1>
          {!childOnly && (
            <div className="flex gap-2">
              <button onClick={() => setRole("child")} className={`px-3 py-1 rounded-xl ${role==="child"?"bg-black text-white":"bg-gray-200"}`}>ילדה</button>
              <button onClick={() => setRole("parent")} className={`px-3 py-1 rounded-xl ${role==="parent"?"bg-black text-white":"bg-gray-200"}`}>הורה</button>
              <button onClick={() => setRole("admin")} className={`px-3 py-1 rounded-xl ${role==="admin"?"bg-black text-white":"bg-gray-200"}`}>דוחות</button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4">
        {role === "parent" && !childOnly && <ParentView/>}
        {role === "child" && <ChildView childOnly={childOnly}/>}
        {role === "admin" && !childOnly && <AdminView/>}
        {childOnly && role!=="child" && <ChildView childOnly={true}/>}
      </main>

      <footer className="max-w-3xl mx-auto p-4 text-sm text-gray-500">
        נתונים נשמרים מקומית בדפדפן (localStorage).
        {" "}לקישור “ילדה בלבד”: <code>?child=1</code>
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
  LOG: "results_log",           // היסטוריית סשנים
  TRANS: "word_translations_he" // תרגום עברי לכל מילה (מיושר ל-word_bank_order)
};

function saveJSON(key, obj) { localStorage.setItem(key, JSON.stringify(obj)); }
function loadJSON(key) { try { return JSON.parse(localStorage.getItem(key)||"null"); } catch { return null; } }

// ----- דוחות (upsert) -----
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
  window.dispatchEvent(new Event("results_updated"));
}

/* -------------------------
   ParentView – הזנת JSON + תרגומים
------------------------- */

function ParentView(){
  const [jsonText, setJsonText] = React.useState("");
  const [preview, setPreview] = React.useState(null);
  const [translations, setTranslations] = React.useState([]);
  const [error, setError] = React.useState("");
  const [sessionId, setSessionId] = React.useState(() => localStorage.getItem(LS_KEYS.SESSION_ID) || crypto.randomUUID());

  // טוען אוטומטית את הסט האחרון
  React.useEffect(()=>{
    const wb = loadJSON(LS_KEYS.WORD_BANK);
    const items = loadJSON(LS_KEYS.ITEMS);
    const tr = loadJSON(LS_KEYS.TRANS) || [];
    if (wb && items) {
      const obj = { word_bank_order: wb, items, translations_he: tr };
      setPreview(obj);
      setTranslations(alignTranslations(wb, tr));
      setJsonText(JSON.stringify(obj, null, 2));
    }
  },[]);

  function alignTranslations(wb, tr) {
    const out = Array.isArray(tr) ? [...tr] : [];
    for (let i=0;i<wb.length;i++){ if (typeof out[i] !== "string") out[i] = ""; }
    return out;
    }

  function loadSample(){
    const sample = {
      word_bank_order: ["Walk","Understand","Ignore","Brave","Clearly"],
      translations_he: ["ללכת","להבין","להתעלם","אמיצה/אמיץ","בבירור"],
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
    setTranslations(alignTranslations(sample.word_bank_order, sample.translations_he));
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
      setTranslations(alignTranslations(obj.word_bank_order, obj.translations_he || []));
    }catch(err){
      setPreview(null);
      setTranslations([]);
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
      if (typeof it.hebrew_sentence !== "string") throw new Error(`items[${idx}].hebrew_sentence חייב להיות מחרוזת`);
      if (it.hebrew_sentence && !it.hebrew_sentence.includes("____"))
        throw new Error(`items[${idx}].hebrew_sentence (אם לא ריק) חייב לכלול "____"`);
      if (typeof it.english_sentence !== "string" || !it.english_sentence.includes("____"))
        throw new Error(`items[${idx}].english_sentence חייב לכלול "____"`);
      if (!Number.isInteger(it.correct_option_index) || it.correct_option_index < 0 || it.correct_option_index >= wb.length)
        throw new Error(`items[${idx}].correct_option_index מחוץ לטווח אפשרויות`);
    });
    if (obj.translations_he && (!Array.isArray(obj.translations_he) || obj.translations_he.length !== wb.length)) {
      throw new Error("translations_he (אם קיים) חייב להיות מערך באורך word_bank_order");
    }
  }

  function updateTranslation(i, val){
    const next = [...translations];
    next[i] = val;
    setTranslations(next);
  }

  function saveForChild(){
    if (!preview) { alert("אין JSON תקין לטעינה"); return; }
    const wb = preview.word_bank_order;
    const items = preview.items;
    saveJSON(LS_KEYS.WORD_BANK, wb);
    saveJSON(LS_KEYS.ITEMS, items);
    saveJSON(LS_KEYS.TRANS, alignTranslations(wb, translations));
    localStorage.setItem(LS_KEYS.SESSION_ID, sessionId);
    alert("נשמר! כעת הילדה יכולה להיכנס ל־?child=1 ולהתחיל תרגול.");
  }

  React.useEffect(()=>{ if (jsonText) tryParse(jsonText); }, [jsonText]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">מצב הורה – הדבק/העלה JSON, ועדכן תרגומים</h2>

      <div className="flex gap-2 items-center">
        <button onClick={loadSample} className="px-3 py-2 rounded-xl bg-gray-200">טען דוגמה</button>
        <label className="px-3 py-2 rounded-xl bg-gray-200 cursor-pointer">
          העלה קובץ JSON
          <input type="file" accept=".json,application/json" className="hidden" onChange={onFile}/>
        </label>
      </div>

      <textarea
        className="w-full p-3 border rounded-xl font-mono"
        rows={12}
        placeholder='{"word_bank_order":["Walk",...],"items":[...],"translations_he":["...", ...]}'
        value={jsonText}
        onChange={e=>setJsonText(e.target.value)}
      ></textarea>

      {preview && (
        <>
          <div className="bg-white border rounded-xl p-3">
            <h3 className="font-semibold mb-2">תרגומים למחסן המילים</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {preview.word_bank_order.map((w, i)=>(
                <div key={i} className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded bg-gray-100 font-mono">{w}</span>
                  <input className="flex-1 border rounded px-2 py-1" placeholder="תרגום לעברית" value={translations[i]||""} onChange={e=>updateTranslation(i, e.target.value)} />
                </div>
              ))}
            </div>
            <button onClick={saveForChild} className="mt-3 px-4 py-2 rounded-xl bg-black text-white">שמור ופתח לתרגול</button>
          </div>

          <div className="border rounded-xl p-3 bg-white">
            <h3 className="font-semibold mb-2">תצוגת מקדימה</h3>
            <div className="text-sm mb-2">
              מחסן מילים: {preview.word_bank_order.map((w,i)=>`${w} (${translations[i]||"—"})`).join(" · ")}
            </div>
            <ol className="list-decimal pr-5 space-y-1">
              {preview.items.map(it=> (
                <li key={it.id}>
                  <span className="font-medium">[עברית]</span> {it.hebrew_sentence || "—"}
                  <span className="text-gray-400"> (נכון: #{(it.correct_option_index??0)+1})</span>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}

      {error && <div className="text-red-600">{error}</div>}
    </div>
  );
}

/* -------------------------
   ChildView – כל השאלות בעמוד + צבעים מתמשכים
------------------------- */

function ChildView({ childOnly }){
  const [name, setName] = React.useState("");
  const [items, setItems] = React.useState([]);
  const [wordBank, setWordBank] = React.useState([]);
  const [translations, setTranslations] = React.useState([]);
  const [sessionId, setSessionId] = React.useState("");
  const [answers, setAnswers] = React.useState({}); // { [itemId]: { correctClicks: number, wrongClicks: number, picked: { [optIdx]: "green"|"red" } } }
  const sessionStartRef = React.useRef(null);

  React.useEffect(()=>{
    const wb = loadJSON(LS_KEYS.WORD_BANK) || [];
    const it = loadJSON(LS_KEYS.ITEMS) || [];
    const tr = loadJSON(LS_KEYS.TRANS) || [];
    const sid = localStorage.getItem(LS_KEYS.SESSION_ID) || crypto.randomUUID();
    setWordBank(wb);
    setItems(prepareItems(it)); // נחלק לשתי קבוצות: עברית->אנגלית ואנגלית->אנגלית מעורב
    setTranslations(alignTranslations(wb, tr));
    setSessionId(sid);
  },[]);

  function alignTranslations(wb, tr) {
    const out = Array.isArray(tr) ? [...tr] : [];
    for (let i=0;i<wb.length;i++){ if (typeof out[i] !== "string") out[i] = ""; }
    return out;
  }

  function prepareItems(base) {
    if (!Array.isArray(base)) return [];
    const heb = base.filter(q => q.hebrew_sentence && q.hebrew_sentence.includes("____"));
    const engSrc = base.filter(q => q.english_sentence && q.english_sentence.includes("____"));
    // ערבוב לאנגלית
    const eng = [...engSrc];
    for (let i=eng.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [eng[i], eng[j]] = [eng[j], eng[i]]; }
    // מצמידים הכל לרשימה אחת עם שדות עזר
    const tag = (q, type) => ({...q, _type:type}); // type: "he"|"en"
    return [...heb.map(q=>tag(q,"he")), ...eng.map(q=>tag(q,"en"))];
  }

  function start(){
    if (!items.length || !wordBank.length) return;
    sessionStartRef.current = Date.now();
    upsertSessionLog({
      session_id: sessionId,
      student_name: name || null,
      words: wordBank,
      started_at: sessionStartRef.current,
      correct: 0,
      wrong: 0
    });
  }

  // לחיצה על תשובה => צובע, מעדכן מונים, משאיר הכל גלוי
  function onPick(item, optIdx){
    const isRight = optIdx === (item.correct_option_index ?? 0);
    setAnswers(prev => {
      const prevRow = prev[item.id] || { correctClicks:0, wrongClicks:0, picked:{} };
      const picked = {...prevRow.picked};
      picked[optIdx] = isRight ? "green" : "red";
      const row = {
        correctClicks: prevRow.correctClicks + (isRight ? 1 : 0),
        wrongClicks: prevRow.wrongClicks + (!isRight ? 1 : 0),
        picked
      };
      const next = {...prev, [item.id]: row};

      // סכימה לכלל התרגיל כדי לעדכן דוחות בזמן אמת
      const totals = Object.values(next).reduce((a,r)=>({correct:a.correct+r.correctClicks, wrong:a.wrong+r.wrongClicks}), {correct:0, wrong:0});
      upsertSessionLog({
        session_id: sessionId,
        student_name: name || null,
        words: wordBank,
        correct: totals.correct,
        wrong: totals.wrong
      });

      return next;
    });
  }

  if (!items?.length) {
    return <div className="text-center text-gray-500">אין תרגיל טעון. בקש/י מהורה ליצור/להדביק JSON במסך ההורה.</div>
  }

  const totals = Object.values(answers).reduce((a,r)=>({correct:a.correct+r.correctClicks, wrong:a.wrong+r.wrongClicks}), {correct:0, wrong:0});

  return (
    <div className="space-y-4">
      {!childOnly && (
        <div className="bg-white p-4 rounded-2xl shadow-sm">
          <h2 className="text-lg font-semibold mb-2">מוכנה לתרגול?</h2>
          <input className="border rounded-xl px-3 py-2 w-full mb-2" placeholder="שם (לא חובה)" value={name} onChange={e=>setName(e.target.value)} />
          <button onClick={start} className="px-4 py-2 rounded-xl bg-black text-white">התחילי</button>
        </div>
      )}

      {/* מחסן מילים עם תרגום */}
      <div className="bg-white p-3 rounded-2xl shadow-sm">
        <h3 className="font-semibold mb-2">מחסן מילים</h3>
        <div className="flex flex-wrap gap-2">
          {wordBank.map((w,i)=>(
            <span key={i} className="px-2 py-1 rounded-xl bg-gray-100 text-sm">
              {w}{translations[i] ? ` — ${translations[i]}` : ""}
            </span>
          ))}
        </div>
      </div>

      {/* כל השאלות בעמוד */}
      <div className="space-y-4">
        {items.map((q, idx)=>(
          <QuestionBlock
            key={q.id || idx}
            index={idx}
            q={q}
            wordBank={wordBank}
            onPick={onPick}
            pickedMap={(answers[q.id]?.picked)||{}}
          />
        ))}
      </div>

      <div className="text-center text-sm text-gray-600">
        נכונות: {totals.correct} · שגיאות: {totals.wrong}
      </div>
    </div>
  );
}

function QuestionBlock({ index, q, wordBank, onPick, pickedMap }){
  const title = q._type==="he"
    ? `[${index+1}] בחרי את המילה באנגלית שמשלימה את המשפט בעברית`
    : `[${index+1}] בחרי את המילה באנגלית למשפט באנגלית (סדר Melange)`;

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm">
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="mb-4 text-lg">{q._type==="he" ? q.hebrew_sentence : q.english_sentence}</div>
      <div className="grid grid-cols-2 gap-2">
        {wordBank.map((word, optIdx)=> {
          const color = pickedMap[optIdx]==="green" ? "bg-green-100 border-green-400"
                      : pickedMap[optIdx]==="red"   ? "bg-red-100 border-red-300"
                      : "bg-white";
          return (
            <button
              key={optIdx}
              onClick={()=>onPick(q, optIdx)}
              className={`px-3 py-3 rounded-xl border ${color} hover:shadow active:translate-y-[1px] text-left`}
            >
              {word}
            </button>
          );
        })}
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
    const load = () => { setRows(loadJSON(LS_KEYS.LOG) || []); };
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
