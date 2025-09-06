// app.jsx — גרסה ללא OpenAI, שמירה ב-Supabase
// כל המידע נטען מהשרת דרך API get-set / save-set / log-result

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
          <h1 className="text-xl font-bold">תרגול אנגלית – הורה/ילד</h1>
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
  TRANS: "last_translations",
};

function saveJSON(key, obj) { localStorage.setItem(key, JSON.stringify(obj)); }
function loadJSON(key) {
  try { return JSON.parse(localStorage.getItem(key)||"null"); }
  catch { return null; }
}

/* -------------------------
   ParentView – טעינת JSON ושמירה לשרת
------------------------- */
function ParentView(){
  const [jsonText, setJsonText] = React.useState("");
  const [preview, setPreview] = React.useState(null);
  const [error, setError] = React.useState("");
  const [parentCode, setParentCode] = React.useState(
    () => localStorage.getItem('PARENT_CODE') || 'tal'
  );

  function loadSample(){
    const sample = {
      word_bank_order: ["walk","run"],
      items: [
        { id:"q1", hebrew_sentence:"הוא ____ לבית הספר", english_sentence:"He ____ to school", correct_option_index:0 },
        { id:"q2", hebrew_sentence:"היא ____ מהר מאוד", english_sentence:"She ____ very fast", correct_option_index:1 }
      ],
      translations_he: ["ללכת","לרוץ"]
    };
    setJsonText(JSON.stringify(sample, null, 2));
    setPreview(sample);
    setError("");
  }

  function tryParse(text){
    setError("");
    try{
      const obj = JSON.parse(text);
      if (!Array.isArray(obj.word_bank_order) || !Array.isArray(obj.items)) throw new Error("פורמט לא תקין");
      setPreview(obj);
    }catch(err){
      setPreview(null);
      setError(err?.message || "JSON לא תקין");
    }
  }

  async function saveForChild(){
    if (!preview) { alert("אין JSON תקין לטעינה"); return; }
    const code = (parentCode || '').trim();
    if (!code) { alert("חסר קוד הורה"); return; }

    localStorage.setItem('PARENT_CODE', code);

    const payload = {
      parent_code: code,
      word_bank_order: preview.word_bank_order,
      items: preview.items,
      translations_he: preview.translations_he || []
    };

    try {
      const r = await fetch('/api/save-set', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(payload)
      });
      const text = await r.text();
      if (!r.ok) throw new Error(text);
      alert(`נשמר לשרת!\nלינק לילדה:\n${location.origin}${location.pathname}?child=1&code=${encodeURIComponent(code)}&autostart=1`);
    } catch (err) {
      console.error('saveForChild error', err);
      alert('שמירה לשרת נכשלה: ' + (err?.message || String(err)));
    }
  }

  React.useEffect(()=>{ if (jsonText) tryParse(jsonText); }, [jsonText]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">מצב הורה – JSON</h2>

      <div className="mb-2">
        <label className="block text-sm mb-1">קוד הורה:</label>
        <input
          className="border rounded px-2 py-1 w-full"
          value={parentCode}
          onChange={e=>setParentCode(e.target.value)}
          placeholder="tal-1234"
        />
      </div>

      <button onClick={loadSample} className="px-3 py-2 rounded-xl bg-gray-200">טען דוגמה</button>

      <textarea
        className="w-full p-3 border rounded-xl font-mono"
        rows={12}
        placeholder='{"word_bank_order":["walk",...],"items":[...]}'
        value={jsonText}
        onChange={e=>setJsonText(e.target.value)}
      ></textarea>

      {error && <div className="text-red-600">{error}</div>}
      {preview && (
        <div className="border rounded-xl p-3 bg-white">
          <div className="text-sm mb-2">מילות מחסן: {preview.word_bank_order.join(" · ")}</div>
          <button onClick={saveForChild} className="px-4 py-2 rounded-xl bg-black text-white">שמור לשרת</button>
        </div>
      )}
    </div>
  );
}


/* -------------------------
   QuestionCard (לא חובה כאן כי הצגתי inline)
------------------------- */
function QuestionCard(){ return null; }

/* -------------------------
   AdminView – דוחות בסיסיים
------------------------- */
function AdminView(){
  return <div className="p-6">דוחות יגיעו בהמשך…</div>;
}




/* -------------------------
   ChildView – כל השאלות בעמוד, עם סימון צבעוני קבוע
------------------------- */
function ChildView(){
  const [name,setName] = React.useState("");
  const [items,setItems] = React.useState([]);
  const [wordBank,setWordBank] = React.useState([]);
  const [translations,setTranslations] = React.useState([]);
  const [stats,setStats] = React.useState({correct:0, wrong:0});
  const [answers,setAnswers] = React.useState({});
  // answers key: "he:<id>" או "en:<id>"
  // { correct: boolean, wrongs: number[] }

  // טוען סט מהשרת לפי code בפרמטרים
  React.useEffect(()=>{
    const p = new URLSearchParams(window.location.search);
    const code = p.get('code');
    if (code) {
      const ts = Date.now();
      fetch(`/api/get-set?code=${encodeURIComponent(code)}&t=${ts}`)
        .then(r=>r.ok?r.json():Promise.reject(r))
        .then(obj=>{
          setWordBank(obj.word_bank_order||[]);
          setItems(Array.isArray(obj.items)? obj.items : []);
          setTranslations(obj.translations_he||[]);
        })
        .catch(e=>console.error("load error",e));
    }
  },[]);

  // אירוע לחיצה על תשובה
  function onPick({ mode, item, optionIdx }) {
    const key = `${mode}:${item.id}`;
    const isRight = optionIdx === (item.correct_option_index ?? 0);

    setAnswers(prev=>{
      const prevRow = prev[key] || { correct:false, wrongs:[] };
      // אם כבר נענה נכון – לא מאפשרים לשנות
      if (prevRow.correct) return prev;

      const next = { ...prevRow };
      if (isRight) {
        next.correct = true;
      } else {
        if (!next.wrongs.includes(optionIdx)) next.wrongs = [...next.wrongs, optionIdx];
      }
      return { ...prev, [key]: next };
    });

    // עדכון ספירה
    setStats(s=>{
      const next = { ...s };
      if (isRight) next.correct += 1; else next.wrong += 1;
      // שליחת לוג (רשות): אם יש לך /api/log-result מחובר
      sendLog({correct: next.correct, wrong: next.wrong});
      return next;
    });
  }

  // שליחת לוג (רשות – יעבוד אם חיברת את פונקציית השרת)
  const [sessionId] = React.useState(()=>crypto.randomUUID());
  async function sendLog(totals){
    try{
      const p = new URLSearchParams(window.location.search);
      const code = p.get('code') || localStorage.getItem('PARENT_CODE');
      if (!code) return;
      await fetch('/api/log-result', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          parent_code: code,
          session_id: sessionId,
          student_name: name || null,
          correct: totals.correct,
          wrong: totals.wrong
        })
      });
    }catch(_){}
  }

  if (!items?.length) {
    return <div className="text-center p-6 text-gray-500">אין תרגיל טעון</div>;
  }

  // מערך מעורבב עבור האנגלית
  const shuffledEn = React.useMemo(()=>{
    const arr = [...items];
    for (let i=arr.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [arr[i],arr[j]] = [arr[j],arr[i]];
    }
    return arr;
  },[items]);

  return (
    <div className="space-y-6">
      {/* כותרת + מחסן מילים עם תרגום */}
      <div className="bg-white p-4 rounded-2xl shadow-sm">
        <h2 className="text-lg font-semibold mb-2">מחסן מילים</h2>
        <div className="flex flex-wrap gap-2">
          {wordBank.map((w,i)=>(
            <span key={i} className="px-2 py-1 rounded-xl bg-gray-100 text-sm">
              {w}{translations[i] ? ` — ${translations[i]}` : ""}
            </span>
          ))}
        </div>
        <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center">
          <input
            className="border rounded-xl px-3 py-2 w-full sm:w-64"
            placeholder="שם (לא חובה)"
            value={name}
            onChange={e=>setName(e.target.value)}
          />
          <div className="text-sm text-gray-600">נכונות: {stats.correct} · שגיאות: {stats.wrong}</div>
        </div>
      </div>

      {/* עברית → אנגלית — כל השאלות */}
      <section className="space-y-3">
        <h3 className="font-semibold">בחר/י את המילה באנגלית שמשלימה את המשפט בעברית</h3>
        {items.map((it,idx)=>(
          <QuestionRow
            key={`he-${it.id}`}
            mode="he"
            index={idx+1}
            total={items.length}
            sentence={it.hebrew_sentence}
            item={it}
            wordBank={wordBank}
            answers={answers}
            onPick={onPick}
          />
        ))}
      </section>

      {/* אנגלית → אנגלית — כל השאלות (בסדר מעורבב) */}
      <section className="space-y-3">
        <h3 className="font-semibold">בחר/י את המילה באנגלית למשפט באנגלית (סדר שאלות מעורבב)</h3>
        {shuffledEn.map((it,idx)=>(
          <QuestionRow
            key={`en-${it.id}`}
            mode="en"
            index={idx+1}
            total={shuffledEn.length}
            sentence={it.english_sentence}
            item={it}
            wordBank={wordBank}
            answers={answers}
            onPick={onPick}
          />
        ))}
      </section>
    </div>
  );
}

/* -------------------------
   QuestionRow – כרטיס שאלה יחיד
   • מסמן תשובה נכונה בירוק בהיר
   • תשובות שגויות מסומנות באדום בהיר ונשמרות
   • אם נענתה נכון – מבטל לחיצות נוספות
------------------------- */
function QuestionRow({ mode, index, total, sentence, item, wordBank, answers, onPick }){
  const key = `${mode}:${item.id}`;
  const row = answers[key] || { correct:false, wrongs:[] };
  const correctIdx = item.correct_option_index ?? 0;

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm">
      <div className="text-sm text-gray-500 mb-1">[{index}/{total}]</div>
      <div className="mb-3 text-lg">{sentence}</div>
      <div className="grid grid-cols-2 gap-2">
        {wordBank.map((w,idx)=>{
          let extra = "border hover:shadow active:translate-y-[1px]";
          if (row.correct && idx === correctIdx) {
            extra += " bg-green-100 border-green-400";
          } else if (row.wrongs?.includes(idx)) {
            extra += " bg-red-100 border-red-300";
          }
          return (
            <button
              key={idx}
              className={`px-3 py-3 rounded-xl ${extra}`}
              onClick={()=> onPick({ mode, item, optionIdx: idx })}
              disabled={row.correct} // אחרי תשובה נכונה – ננעל
            >
              {w}
            </button>
          );
        })}
      </div>
    </div>
  );
}
