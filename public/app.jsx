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
   ChildView – תרגול
------------------------- */
function ChildView(){
  const [name,setName] = React.useState("");
  const [items,setItems] = React.useState([]);
  const [wordBank,setWordBank] = React.useState([]);
  const [translations,setTranslations] = React.useState([]);
  const [cursor,setCursor] = React.useState(0);
  const [correct,setCorrect] = React.useState(0);
  const [wrong,setWrong] = React.useState(0);
  const [finished,setFinished] = React.useState(false);

  React.useEffect(()=>{
    const p = new URLSearchParams(window.location.search);
    const code = p.get('code');
    if (code) {
      const ts = Date.now();
      fetch(`/api/get-set?code=${encodeURIComponent(code)}&t=${ts}`)
        .then(r=>r.ok?r.json():Promise.reject(r))
        .then(obj=>{
          setWordBank(obj.word_bank_order||[]);
          setItems(obj.items||[]);
          setTranslations(obj.translations_he||[]);
        })
        .catch(e=>console.error("load error",e));
    }
  },[]);

  function pick(idx){
    const q = items[cursor];
    if (!q) return;
    if (idx===q.correct_option_index) setCorrect(c=>c+1);
    else setWrong(w=>w+1);
    if (cursor+1<items.length) setCursor(c=>c+1);
    else setFinished(true);
  }

  if (!items?.length) return <div className="text-center p-6">אין תרגיל טעון</div>;
  if (finished) return <div className="text-center p-6">סיימת! נכונות {correct}, שגיאות {wrong}</div>;

  const q = items[cursor];
  return (
    <div className="p-4 space-y-4">
      <div>מילות מחסן: {wordBank.map((w,i)=> <span key={i}>{w} ({translations[i]||"?"}) · </span>)}</div>
      <h3 className="font-semibold">שאלה {cursor+1}/{items.length}</h3>
      <div className="text-lg mb-4">{q.hebrew_sentence || q.english_sentence}</div>
      <div className="grid grid-cols-2 gap-2">
        {wordBank.map((w,i)=>(
          <button key={i} onClick={()=>pick(i)} className="px-3 py-2 border rounded-xl">{w}</button>
        ))}
      </div>
      <div>נכון: {correct} · שגוי: {wrong}</div>
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

