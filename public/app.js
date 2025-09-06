// public/app.js — גרסת בדיקה ללא JSX
function App(){
  return React.createElement(
    "div",
    { className: "p-6" },
    React.createElement("h1", { className: "text-2xl font-bold" }, "Hello from app.js (no JSX) ✅"),
    React.createElement("p", null, "עובד בלי Babel, נבדוק ככה שהנתיב וההרצה תקינים.")
  );
}

(function(){
  const rootEl = document.getElementById("root");
  if (!rootEl) { alert("No #root element"); return; }
  const root = ReactDOM.createRoot(rootEl);
  root.render(React.createElement(App));
})();
