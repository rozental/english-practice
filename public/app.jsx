// app.jsx — smoke test מינימלי

function App(){
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">שלום! האפליקציה עלתה ✅</h1>
      <p className="mt-2">אם אתה רואה את זה, React נטען ו־app.jsx רץ תקין.</p>
    </div>
  );
}

//
// // app.jsx — גרסה מלאה: הורה / ילדה / דוחות
// // נטען ישירות דרך index.html עם React UMD + Babel (אין exports)
//
// function App() {
//   const params = new URLSearchParams(window.location.search);
//   const roleFromURL =
//     params.get("parent") === "1" ? "parent" :
//     params.get("admin") === "1"  ? "admin"  : "child";
//
//   const [role, setRole] = React.useState(roleFromURL);
//
//   return (
//     <div className="min-h-screen bg-gray-50 text-gray-800">
//       <header className="p-4 border-b bg-white sticky top-0 z-10">
//         <div className="max-w-4xl mx-auto flex items-center justify-between">
//           <h1 className="text-xl font-bold">תרגול אנגלית – הורה/ילדה</h1>
//           <div className="flex gap-2">
//             <button onClick={() => setRole("child")}  className={`px-3 py-1 rounded-xl ${role==="child" ?"bg-black text-white":"bg-gray-200"}`}>ילדה</button>
//             <button onClick={() => setRole("parent")} className={`px-3 py-1 rounded-xl ${role==="parent"?"bg-black text-white":"bg-gray-200"}`}>הורה</button>
//             <button onClick={() => setRole("admin")}  className={`px-3 py-1 rounded-xl ${role==="admin" ?"bg-black text-white":"bg-gray-200"}`}>דוחות</button>
//           </div>
//         </div>
//       </header>
//
//       <main className="max-w-4xl mx-auto p-4">
//         {role === "parent" && <ParentView/>}
//         {role === "child"  && <ChildView/>}
//         {role === "admin"  && <AdminView/>}
//       </main>
//     </div>
//   );
// }
//
// /* =========================
//    ParentView
// ========================= */
// function ParentView(){
//   const [jsonText, setJsonText] = React.useState("");
//   const [preview, setPreview]   = React.useState(null);
//   const [error, setError]       = React.useState("");
//   const [parentCode, setParentCode] = React.useState(
//     () => localStorage.getItem("PARENT_CODE") || "tal"
//   );
//
//   function loadSample(){
//     const sample = {
//       word_bank_order: ["walk","run","eat","sleep"],
//       translations_he: ["ללכת","לרוץ","לאכול","לישון"],
//       items: [
//         { id:"h1", hebrew_sentence:"הוא ____ לבית הספר", english_sentence:"He ____ to school", correct_option_index:0 },
//         { id:"h2", hebrew_sentence:"היא ____ מהר",        english_sentence:"She ____ fast",     correct_option_index:1 },
//         { id:"h3", hebrew_sentence:"אני אוהב ____ גלידה",  english_sentence:"I like to ____ ice cream", correct_option_index:2 },
//         { id:"h4", hebrew_sentence:"הם צריכים ____ עכשיו", english_sentence:"They need to ____ now",     correct_option_index:3 }
//       ]
//     };
//     setJsonText(JSON.stringify(sample, null, 2));
//     setPreview(sample);
//     setError("");
//   }
//
//   function tryParse(text){
//     setError("");
//     try{
//       const obj = JSON.parse(text);
//       if (!Array.isArray(obj.word_bank_order)) throw new Error("word_bank_order חייב להיות מערך");
//       if (!Array.isArray(obj.items)) throw new Error("items חייב להיות מערך");
//       setPreview(obj);
//     }catch(e){
//       setPreview(null);
//       setError(e?.message || "JSON לא תקין");
//     }
//   }
//
//   React.useEffect(()=>{ if (jsonText) tryParse(jsonText); }, [jsonText]);
//
//   async function saveForChild(){
//     if (!preview) { alert("אין JSON תקין"); return; }
//     const code = (parentCode||"").trim();
//     if (!code) { alert("חסר קוד הורה"); return; }
//     localStorage.setItem("PARENT_CODE", code);
//
//     const payload = {
//       parent_code: code,
//       word_bank_order: preview.word_bank_order,
//       items: preview.items,
//       translations_he: Array.isArray(preview.translations_he) ? preview.translations_he : []
//     };
//
//     try{
//       const r = await fetch("/api/save-set", {
//         method:"POST",
//         headers:{ "Content-Type":"application/json" },
//         body: JSON.stringify(payload)
//       });
//       const txt = await r.text();
//       if (!r.ok) throw new Error(txt || `HTTP ${r.status}`);
//       alert(`נשמר לשרת!\nקישור לילדה:\n${location.origin}${location.pathname}?child=1&code=${encodeURIComponent(code)}&autostart=1`);
//     }catch(e){
//       console.error("saveForChild error", e);
//       alert("שמירה לשרת נכשלה: " + (e?.message||String(e)));
//     }
//   }
//
//   return (
//     <div className="space-y-4">
//       <h2 className="text-lg font-semibold">מצב הורה – JSON</h2>
//
//       <div className="mb-2">
//         <label className="block text-sm mb-1">קוד הורה:</label>
//         <input
//           className="border rounded px-2 py-1 w-full"
//           value={parentCode}
//           onChange={e=>setParentCode(e.target.value)}
//           placeholder="tal"
//         />
//       </div>
//
//       <div className="flex gap-2 items-center">
//         <button onClick={loadSample} className="px-3 py-2 rounded-xl bg-gray-200">טען דוגמה</button>
//       </div>
//
//       <textarea
//         className="w-full p-3 border rounded-xl font-mono"
//         rows={12}
//         value={jsonText}
//         onChange={e=>setJsonText(e.target.value)}
//       ></textarea>
//
//       {error && <div className="text-red-600">{error}</div>}
//       {preview && (
//         <div className="border rounded-xl p-3 bg-white">
//           <div className="text-sm mb-2">מחסן מילים: {preview.word_bank_order.join(" · ")}</div>
//           <button onClick={saveForChild} className="mt-3 px-4 py-2 rounded-xl bg-black text-white">שמור לשרת</button>
//         </div>
//       )}
//     </div>
//   );
// }
//
// /* =========================
//    ChildView
// ========================= */
// function ChildView(){
//   const [name,setName]         = React.useState("");
//   const [items,setItems]       = React.useState([]);
//   const [wordBank,setWordBank] = React.useState([]);
//   const [translations,setTranslations] = React.useState([]);
//   const [answers,setAnswers]   = React.useState({});
//   const [stats,setStats]       = React.useState({correct:0, wrong:0});
//   const [sessionId]            = React.useState(()=> crypto.randomUUID());
//
//   React.useEffect(()=>{
//     const p = new URLSearchParams(window.location.search);
//     const code = p.get("code");
//     if (!code) return;
//     const ts = Date.now();
//     fetch(`/api/get-set?code=${encodeURIComponent(code)}&t=${ts}`)
//       .then(r=> r.ok ? r.json() : Promise.reject(r))
//       .then(obj=>{
//         setWordBank(obj.word_bank_order || []);
//         setItems(Array.isArray(obj.items) ? obj.items : []);
//         setTranslations(Array.isArray(obj.translations_he) ? obj.translations_he : []);
//       })
//       .catch(e=> console.error("load error", e));
//   },[]);
//
//   async function sendLog(totals){
//     const p = new URLSearchParams(window.location.search);
//     const code = p.get("code") || localStorage.getItem("PARENT_CODE");
//     if (!code) return;
//     try{
//       await fetch("/api/log-result",{
//         method:"POST",
//         headers:{ "Content-Type":"application/json" },
//         body: JSON.stringify({
//           parent_code: code,
//           session_id: sessionId,
//           student_name: name || null,
//           correct: totals.correct,
//           wrong: totals.wrong
//         })
//       });
//     }catch(_){}
//   }
//
//   function onPick({ mode, item, optionIdx }){
//     const key = `${mode}:${item.id}`;
//     const isRight = optionIdx === (item.correct_option_index ?? 0);
//
//     setAnswers(prev=>{
//       const prevRow = prev[key] || { correct:false, wrongs:[] };
//       if (prevRow.correct) return prev;
//       const next = { ...prevRow };
//       if (isRight) next.correct = true;
//       else if (!next.wrongs.includes(optionIdx)) next.wrongs = [...next.wrongs, optionIdx];
//       return { ...prev, [key]: next };
//     });
//
//     setStats(s=>{
//       const n = { ...s };
//       if (isRight) n.correct++; else n.wrong++;
//       sendLog(n);
//       return n;
//     });
//   }
//
//   if (!items || items.length===0) {
//     return <div className="text-center p-6 text-gray-500">אין תרגיל טעון</div>;
//   }
//
//   const shuffledEn = React.useMemo(()=>{
//     const arr = [...items];
//     for (let i=arr.length-1;i>0;i--){
//       const j = Math.floor(Math.random()*(i+1));
//       [arr[i],arr[j]] = [arr[j],arr[i]];
//     }
//     return arr;
//   },[items]);
//
//   return (
//     <div className="space-y-6">
//       <div className="bg-white p-4 rounded-2xl shadow-sm">
//         <h2 className="text-lg font-semibold mb-2">מחסן מילים</h2>
//         <div className="flex flex-wrap gap-2">
//           {wordBank.map((w,i)=>(
//             <span key={i} className="px-2 py-1 rounded-xl bg-gray-100 text-sm">
//               {w}{translations[i] ? ` — ${translations[i]}` : ""}
//             </span>
//           ))}
//         </div>
//         <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center">
//           <input
//             className="border rounded-xl px-3 py-2 w-full sm:w-64"
//             placeholder="שם (לא חובה)"
//             value={name}
//             onChange={e=>setName(e.target.value)}
//           />
//           <div className="text-sm text-gray-600">נכונות: {stats.correct} · שגיאות: {stats.wrong}</div>
//         </div>
//       </div>
//
//       <section className="space-y-3">
//         <h3 className="font-semibold">עברית → אנגלית</h3>
//         {items.map((it,idx)=>(
//           <QuestionRow key={`he-${it.id}`} mode="he" index={idx+1} total={items.length}
//             sentence={it.hebrew_sentence} item={it} wordBank={wordBank} answers={answers} onPick={onPick}/>
//         ))}
//       </section>
//
//       <section className="space-y-3">
//         <h3 className="font-semibold">אנגלית → אנגלית (מעורבב)</h3>
//         {shuffledEn.map((it,idx)=>(
//           <QuestionRow key={`en-${it.id}`} mode="en" index={idx+1} total={shuffledEn.length}
//             sentence={it.english_sentence} item={it} wordBank={wordBank} answers={answers} onPick={onPick}/>
//         ))}
//       </section>
//     </div>
//   );
// }
//
// /* =========================
//    QuestionRow
// ========================= */
// function QuestionRow({ mode, index, total, sentence, item, wordBank, answers, onPick }){
//   const key = `${mode}:${item.id}`;
//   const row = answers[key] || { correct:false, wrongs:[] };
//   const correctIdx = item.correct_option_index ?? 0;
//
//   return (
//     <div className="bg-white p-4 rounded-2xl shadow-sm">
//       <div className="text-sm text-gray-500 mb-1">[{index}/{total}]</div>
//       <div className="mb-3 text-lg">{sentence}</div>
//       <div className="grid grid-cols-2 gap-2">
//         {wordBank.map((w,idx)=>{
//           let extra = "border hover:shadow active:translate-y-[1px]";
//           if (row.correct && idx === correctIdx) extra += " bg-green-100 border-green-400";
//           else if (row.wrongs.includes(idx)) extra += " bg-red-100 border-red-300";
//           return (
//             <button
//               key={idx}
//               className={`px-3 py-3 rounded-xl ${extra}`}
//               onClick={()=> onPick({ mode, item, optionIdx: idx })}
//               disabled={row.correct}
//             >
//               {w}
//             </button>
//           );
//         })}
//       </div>
//     </div>
//   );
// }
//
// /* =========================
//    AdminView
// ========================= */
// function AdminView(){
//   const [parentCode, setParentCode] = React.useState(
//     () => localStorage.getItem("PARENT_CODE") || "tal"
//   );
//   const [rows, setRows]     = React.useState([]);
//   const [loading,setLoading]= React.useState(false);
//   const [error, setError]   = React.useState("");
//
//   async function loadResults(code = parentCode){
//     setLoading(true); setError("");
//     try{
//       const ts = Date.now();
//       const r = await fetch(`/api/get-results?code=${encodeURIComponent(code)}&t=${ts}`);
//       const data = await r.json();
//       if (!r.ok || data?.error) throw new Error(data?.detail || data?.error || `HTTP ${r.status}`);
//       setRows(Array.isArray(data.rows) ? data.rows : []);
//       localStorage.setItem("PARENT_CODE", code);
//     }catch(e){ setError(e?.message || String(e)); }
//     finally{ setLoading(false); }
//   }
//
//   React.useEffect(()=>{ loadResults(); }, []);
//
//   const totals = rows.reduce((acc,r)=>{
//     acc.sessions++; acc.correct += Number(r.correct||0); acc.wrong += Number(r.wrong||0);
//     return acc;
//   }, {sessions:0, correct:0, wrong:0});
//
//   return (
//     <div className="space-y-4">
//       <h2 className="text-lg font-semibold">דוחות – מהשרת</h2>
//       <div className="flex gap-2 mb-2">
//         <input className="border rounded px-2 py-1" value={parentCode} onChange={e=>setParentCode(e.target.value)}/>
//         <button onClick={()=>loadResults(parentCode)} className="px-3 py-2 rounded-xl bg-gray-200">{loading?"טוען…":"רענן"}</button>
//       </div>
//       {error && <div className="text-red-600">שגיאה: {error}</div>}
//       <div className="bg-white p-4 rounded-2xl shadow-sm">
//         סה״כ סשנים: {totals.sessions} · נכונות: {totals.correct} · שגיאות: {totals.wrong}
//       </div>
//       <div className="space-y-2">
//         {rows.map(r=>(
//           <div key={r.id} className="bg-white p-3 rounded-xl border">
//             <div className="text-sm text-gray-500">{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</div>
//             <div>Session: <code>{r.session_id||"—"}</code></div>
//             <div>תלמיד/ה: {r.student_name||"—"}</div>
//             <div>נכונות: {r.correct??0} · שגיאות: {r.wrong??0}</div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }
