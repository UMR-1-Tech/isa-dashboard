import { useState, useMemo, useRef, useEffect, useCallback } from "react";

// ── SUPABASE ──
const SUPABASE_URL = "https://dzrzuwvlqdfulntfogct.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6cnp1d3ZscWRmdWxudGZvZ2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MTU2NTAsImV4cCI6MjA5MTA5MTY1MH0.k-k8M26MQ_ggvONpWJc7WYv0s4W2ZI1mzdr73_7_vEQ";

const sbFetch = async (path, options = {}) => {
  const res = await fetch(SUPABASE_URL + "/rest/v1/" + path, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY,
      "Content-Type": "application/json",
      "Prefer": options.prefer !== undefined ? options.prefer : "return=representation",
      ...(options.headers || {}),
    },
    method: options.method || "GET",
    body: options.body,
  });
  const text = await res.text();
  return text ? JSON.parse(text) : [];
};

const db = {
  get:    (t, q="")    => sbFetch(t + "?order=id" + (q?"&"+q:"")),
  insert: (t, d)       => sbFetch(t, { method:"POST", body:JSON.stringify(d) }),
  update: (t, id, d)   => sbFetch(t+"?id=eq."+id, { method:"PATCH", body:JSON.stringify(d) }),
  delete: (t, id)      => sbFetch(t+"?id=eq."+id, { method:"DELETE", prefer:"" }),
  upsert: (t, d, on)   => sbFetch(t+"?on_conflict="+on, { method:"POST", body:JSON.stringify(d), prefer:"resolution=merge-duplicates,return=representation" }),
  deleteWhere: (t, q)  => sbFetch(t+"?"+q, { method:"DELETE", prefer:"" }),
};

// ── CONSTANTS ──
const COLORS_LIST = ["#6EE7B7","#93C5FD","#FCA5A5","#FCD34D","#C4B5FD","#6EE7F7","#F9A8D4","#A5B4FC"];
const ATT = {
  P:  { label:"Present",  bg:"#064E3B", color:"#6EE7B7" },
  A:  { label:"Absent",   bg:"#3B1A1A", color:"#FCA5A5" },
  HD: { label:"Half Day", bg:"#3B2E0A", color:"#FCD34D" },
  L:  { label:"Leave",    bg:"#1E1A3B", color:"#C4B5FD" },
  LT: { label:"Late",     bg:"#2D1A00", color:"#FB923C" },
};
const THEMES = {
  cyan:   { name:"Cyan Blue",    primary:"#0EA5E9", secondary:"#6366F1", accent:"#6EE7B7" },
  purple: { name:"Purple",       primary:"#8B5CF6", secondary:"#6366F1", accent:"#C4B5FD" },
  green:  { name:"Emerald",      primary:"#10B981", secondary:"#0EA5E9", accent:"#6EE7B7" },
  orange: { name:"Orange",       primary:"#F97316", secondary:"#EF4444", accent:"#FCD34D" },
  pink:   { name:"Pink",         primary:"#EC4899", secondary:"#8B5CF6", accent:"#F9A8D4" },
  red:    { name:"Red",          primary:"#EF4444", secondary:"#F97316", accent:"#FCA5A5" },
};
const INIT_APP = { name:"ISA Performance Dashboard", logo:"⚡", logoType:"emoji", themeKey:"cyan" };

// ── HELPERS — Pakistan Standard Time (UTC+5) ──
// Always derive "now" in PKT so dates and day names are correct
const getPKTNow = () => {
  const utcMs = Date.now();
  const pktOffsetMs = 5 * 60 * 60 * 1000; // UTC+5
  return new Date(utcMs + pktOffsetMs);
};

const today = () => {
  const n = getPKTNow();
  const y = n.getUTCFullYear();
  const m = String(n.getUTCMonth() + 1).padStart(2, "0");
  const d = String(n.getUTCDate()).padStart(2, "0");
  return y + "-" + m + "-" + d;
};

const fmtDate = d => {
  if (!d) return "";
  const [y, m, dy] = d.split("-");
  return dy + "/" + m + "/" + y;
};

// Build YYYY-MM-DD string from year, 1-based month, day — no timezone ambiguity
const ymd = (y, m, d) =>
  y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");

const mRange = () => {
  const n = getPKTNow();
  const y = n.getUTCFullYear();
  const mo = n.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return { start: ymd(y, mo, 1), end: ymd(y, mo, lastDay) };
};

const daysInMonth = (y, m) => {
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => ymd(y, m, i + 1));
};

const mLabel = (y, m) =>
  new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-PK", { month: "long", year: "numeric" });

const rangeDays = (s, e) => {
  const days = [];
  const [sy, sm, sd] = s.split("-").map(Number);
  const [ey, em, ed] = e.split("-").map(Number);
  let cur = new Date(Date.UTC(sy, sm - 1, sd));
  const end = new Date(Date.UTC(ey, em - 1, ed));
  while (cur <= end) {
    days.push(ymd(cur.getUTCFullYear(), cur.getUTCMonth() + 1, cur.getUTCDate()));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
};

// Get correct day name for a YYYY-MM-DD string — uses UTC construction so no
// browser-timezone shift can flip the day
const getDayName = (dateStr, fmt = "short") => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d))
    .toLocaleDateString("en-PK", { weekday: fmt, timeZone: "Asia/Karachi" });
};

const isToday = (dateStr) => dateStr === today();

// ── GLOBAL CSS ──
const makeCSS = (theme) => `
  :root { --p:${theme.primary}; --s:${theme.secondary}; --a:${theme.accent}; }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'DM Sans','Segoe UI',sans-serif;background:#0A0F1E;color:#E2E8F0}
  ::-webkit-scrollbar{width:4px;height:4px}
  ::-webkit-scrollbar-track{background:#0A0F1E}
  ::-webkit-scrollbar-thumb{background:#1E2A45;border-radius:3px}
  input,select,button,textarea{font-family:inherit}
  input,select,textarea{outline:none}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}
  @keyframes pulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.3)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes slideIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes popIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
  @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
  .fade-up{animation:fadeUp .4s ease both}
  .fade-in{animation:fadeIn .3s ease both}
  .pop-in{animation:popIn .25s ease both}
  .slide-in{animation:slideIn .3s ease both}
  .tbtn{border:none;border-radius:10px;padding:8px 16px;font-weight:600;font-size:12px;cursor:pointer;transition:all .2s;white-space:nowrap;flex-shrink:0}
  .tbtn:hover{opacity:.85}
  .tbtnA{background:var(--p);color:#fff}
  .tbtnI{background:#111827;color:#64748B}
  .rbtn{border:none;border-radius:8px;padding:7px 12px;font-weight:600;font-size:12px;cursor:pointer;transition:all .2s;text-align:left;width:100%}
  .rbtnA{background:var(--p);color:#fff}
  .rbtnI{background:#1E2A45;color:#94A3B8}
  .rbtnI:hover{background:#253450;color:#E2E8F0}
  .btnP{background:linear-gradient(135deg,var(--p),var(--s));border:none;color:#fff;border-radius:10px;padding:9px 18px;font-weight:600;font-size:13px;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:6px}
  .btnP:hover{opacity:.85;transform:translateY(-1px)}
  .btnP:active{transform:translateY(0)}
  .btnG{background:#1E2A45;border:1px solid #2D3E5C;color:#94A3B8;border-radius:8px;padding:7px 13px;font-size:12px;cursor:pointer;transition:all .2s}
  .btnG:hover{background:#253450;color:#E2E8F0}
  .btnR{background:#3B1A1A;border:1px solid #FCA5A544;color:#FCA5A5;border-radius:8px;padding:7px 13px;font-size:12px;cursor:pointer;transition:all .2s}
  .btnR:hover{background:#4A1A1A}
  .btnGR{background:#064E3B;border:1px solid #6EE7B744;color:#6EE7B7;border-radius:8px;padding:7px 13px;font-size:12px;cursor:pointer;transition:all .2s}
  .btnGR:hover{background:#075E47}
  .btnPDF{background:linear-gradient(135deg,#EF4444,#DC2626);border:none;color:#fff;border-radius:10px;padding:9px 18px;font-weight:700;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .2s}
  .btnPDF:hover{opacity:.85}
  .btnLO{background:#1A0F0F;border:1px solid #FCA5A544;color:#FCA5A5;border-radius:8px;padding:7px 13px;font-size:12px;cursor:pointer;transition:all .2s}
  .btnLO:hover{background:#3B1A1A}
  .upill{display:flex;align-items:center;gap:7px;background:#1E2A45;border:1px solid #2D3E5C;border-radius:10px;padding:5px 12px;font-size:12px;color:#94A3B8;cursor:pointer;transition:all .2s}
  .upill:hover{background:#253450;color:#E2E8F0}
  .row:hover{background:#141D2E!important;transition:background .15s}
  .bfill{transition:width .7s cubic-bezier(.4,0,.2,1)}
  .apill{border:none;border-radius:6px;font-size:9px;font-weight:800;cursor:pointer;transition:all .15s;padding:2px 4px;min-width:28px;line-height:1.4}
  .apill:hover{filter:brightness(1.25);transform:scale(1.1)}
  .mabtn{border:none;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer;padding:4px 8px;transition:all .15s}
  .mabtn:hover{filter:brightness(1.2)}
  .chip{display:flex;align-items:center;gap:8px;background:#0D1424;border:1px solid #1E2A45;border-radius:10px;padding:7px 11px;cursor:pointer;transition:all .15s}
  .chip:hover{border-color:var(--p);background:#0EA5E910}
  .chipS{border-color:var(--p)!important;background:#0EA5E91A!important}
  .bga{background:#064E3B;color:#6EE7B7;border-radius:20px;padding:2px 10px;font-size:11px;font-weight:600;display:inline-block}
  .bgi{background:#3B1A1A;color:#FCA5A5;border-radius:20px;padding:2px 10px;font-size:11px;font-weight:600;display:inline-block}
  .bgd{background:#1A1A3B;color:#A5B4FC;border-radius:20px;padding:2px 10px;font-size:11px;font-weight:600;display:inline-block}
  .overlay{position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:500;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(6px);animation:fadeIn .2s ease}
  .modal{background:#111827;border:1px solid #1E2A45;border-radius:20px;padding:24px;width:440px;max-width:calc(100vw - 32px);max-height:90vh;overflow-y:auto;animation:popIn .25s ease}
  .card{background:#111827;border:1px solid #1E2A45;border-radius:14px}
  .sc{background:linear-gradient(135deg,#111827,#1A2235);border:1px solid #1E2A45;border-radius:14px}
  .inp{background:#0A0F1E;border:1px solid #1E2A45;border-radius:10px;padding:9px 13px;color:#E2E8F0;font-size:13px;width:100%;transition:border .2s}
  .inp:focus{border-color:var(--p)}
  .inact-sec{background:#1A0F0F;border:1px solid #FCA5A544;border-radius:14px;padding:18px;margin-top:16px}
  .saving-bar{position:fixed;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--p),var(--s),var(--p));background-size:200% 100%;animation:shimmer 1.2s linear infinite;z-index:999}
  .theme-dot{width:28px;height:28px;border-radius:50%;cursor:pointer;transition:all .2s;border:3px solid transparent}
  .theme-dot:hover{transform:scale(1.15)}
  .theme-dot.selected{border-color:#fff;transform:scale(1.2)}
  .stat-card{transition:transform .2s,box-shadow .2s}
  .stat-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.3)}
  @media(max-width:768px){
    .tbtn{padding:7px 12px;font-size:11px}
    .btnP,.btnG,.btnR,.btnLO{padding:7px 12px;font-size:12px}
    .modal{padding:20px;border-radius:16px}
  }
`;

// ── SPINNER ──
const Spinner = ({size=16,color="var(--p)"}) => (
  <div style={{width:size,height:size,border:"2px solid "+color+"33",borderTop:"2px solid "+color,borderRadius:"50%",animation:"spin .7s linear infinite",flexShrink:0}}/>
);

// ── TOAST ──
function Toast({ msg, type="success", onDone }) {
  useEffect(()=>{ const t=setTimeout(onDone,2500); return ()=>clearTimeout(t); },[]);
  const bg = type==="error"?"#3B1A1A":type==="info"?"#1E2A45":"#064E3B";
  const cl = type==="error"?"#FCA5A5":type==="info"?"#93C5FD":"#6EE7B7";
  return (
    <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:bg,border:"1px solid "+cl+"55",color:cl,borderRadius:12,padding:"10px 20px",fontSize:13,fontWeight:600,zIndex:9999,animation:"slideIn .3s ease",whiteSpace:"nowrap",boxShadow:"0 4px 20px rgba(0,0,0,.4)"}}>
      {type==="success"?"✅":type==="error"?"❌":"ℹ️"} {msg}
    </div>
  );
}

// ── LOADING SCREEN ──
function LoadingScreen({ theme }) {
  return (
    <div style={{minHeight:"100vh",background:"#0A0F1E",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
      <style>{makeCSS(theme||THEMES.cyan)}</style>
      <div style={{width:70,height:70,borderRadius:20,background:"linear-gradient(135deg,var(--p),var(--s))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,marginBottom:20,animation:"popIn .5s ease"}}> ⚡</div>
      <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:22,color:"#E2E8F0",marginBottom:6,animation:"fadeUp .5s ease .1s both"}}>ISA Performance Dashboard</div>
      <div style={{fontSize:13,color:"#4B5E80",marginBottom:28,animation:"fadeUp .5s ease .2s both"}}>Connecting to database...</div>
      <div style={{display:"flex",gap:8,animation:"fadeUp .5s ease .3s both"}}>
        {[0,1,2].map(i=>(<div key={i} style={{width:8,height:8,borderRadius:"50%",background:"var(--p)",animation:"pulse 1.2s ease-in-out infinite",animationDelay:i*.2+"s"}}/>))}
      </div>
    </div>
  );
}

// ── LOGIN ──
function Login({ creds, appCfg, theme, onLogin }) {
  const [u,setU]=useState(""), [p,setP]=useState(""), [show,setShow]=useState(false);
  const [err,setErr]=useState(""), [shake,setShake]=useState(false), [loading,setLoading]=useState(false);
  const attempt = async () => {
    if(loading) return;
    setLoading(true);
    await new Promise(r=>setTimeout(r,400));
    if(u.trim()===creds.username && p===creds.password){ onLogin(); }
    else { setErr("Incorrect username or password."); setShake(true); setTimeout(()=>setShake(false),600); }
    setLoading(false);
  };
  const logo = appCfg.logoType==="image" && appCfg.logoData
    ? <img src={appCfg.logoData} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:16}} alt="logo"/>
    : <span style={{fontSize:30}}>{appCfg.logo}</span>;

  return (
    <div style={{minHeight:"100vh",background:"#0A0F1E",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:16}}>
      <style>{makeCSS(theme)}</style>
      <div className="fade-up" style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:72,height:72,borderRadius:20,background:"linear-gradient(135deg,var(--p),var(--s))",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",overflow:"hidden",boxShadow:"0 0 40px var(--p)44"}}>{logo}</div>
          <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:22,color:"#E2E8F0",lineHeight:1.3}}>{appCfg.name}</div>
          <div style={{fontSize:13,color:"#4B5E80",marginTop:6}}>Sign in to your workspace</div>
        </div>
        <div className="card" style={{padding:28,animation:shake?"shake .4s ease":"none"}}>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:11,color:"#64748B",fontWeight:700,marginBottom:7,display:"block",textTransform:"uppercase",letterSpacing:".08em"}}>Username</label>
            <input className="inp" value={u} onChange={e=>{setU(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&attempt()} placeholder="Enter username"/>
          </div>
          <div style={{marginBottom:20}}>
            <label style={{fontSize:11,color:"#64748B",fontWeight:700,marginBottom:7,display:"block",textTransform:"uppercase",letterSpacing:".08em"}}>Password</label>
            <div style={{position:"relative"}}>
              <input type={show?"text":"password"} className="inp" value={p} onChange={e=>{setP(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&attempt()} placeholder="Enter password" style={{paddingRight:44}}/>
              <button onClick={()=>setShow(s=>!s)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#4B5E80",fontSize:16}}>{show?"🙈":"👁"}</button>
            </div>
          </div>
          {err && <div className="fade-in" style={{background:"#3B1A1A",border:"1px solid #FCA5A555",borderRadius:9,padding:"9px 13px",color:"#FCA5A5",fontSize:12,marginBottom:16}}>⚠ {err}</div>}
          <button onClick={attempt} className="btnP" style={{width:"100%",justifyContent:"center",padding:13,fontSize:15}}>
            {loading ? <><Spinner size={16} color="#fff"/> Signing in...</> : "Sign In →"}
          </button>
        </div>
        <div style={{textAlign:"center",marginTop:20,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:2}}>
            <span style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:13,background:"linear-gradient(135deg,var(--p),var(--s))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"1px"}}>U-TECH</span>
            <span style={{fontSize:8,color:"var(--p)",verticalAlign:"super",fontWeight:700}}>®</span>
          </div>
          <span style={{color:"#1E2A45",fontSize:11}}>|</span>
          <span style={{fontSize:11,color:"#2D3E5C"}}>Powering your performance</span>
        </div>
      </div>
    </div>
  );
}

// ── CHANGE CREDS MODAL ──
function ChangeCredsModal({ creds, onSave, onClose }) {
  const [cur,setCur]=useState(""), [nu,setNu]=useState(creds.username);
  const [np,setNp]=useState(""), [cp,setCp]=useState("");
  const [showC,setShowC]=useState(false), [showN,setShowN]=useState(false);
  const [err,setErr]=useState(""), [ok,setOk]=useState(false), [loading,setLoading]=useState(false);
  const save = async () => {
    setErr("");
    if(!cur) return setErr("Enter current password.");
    if(cur!==creds.password) return setErr("Current password is incorrect.");
    if(!nu.trim()) return setErr("Username cannot be empty.");
    if(np && np.length<6) return setErr("Password must be at least 6 characters.");
    if(np && np!==cp) return setErr("Passwords do not match.");
    setLoading(true);
    try { await db.update("credentials", creds.id, {username:nu.trim(),password:np||creds.password}); onSave({...creds,username:nu.trim(),password:np||creds.password}); setOk(true); setTimeout(onClose,1500); }
    catch(e) { setErr("Failed to save. Try again."); }
    setLoading(false);
  };
  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:16,marginBottom:20}}>🔐 Change Credentials</div>
        {ok ? <div style={{textAlign:"center",padding:"20px 0"}}><div style={{fontSize:36,marginBottom:10}}>✅</div><div style={{fontWeight:700,color:"#6EE7B7"}}>Credentials updated!</div></div> : (<>
          <div style={{marginBottom:13}}>
            <label style={{fontSize:11,color:"#64748B",fontWeight:700,marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:".07em"}}>Current Password *</label>
            <div style={{position:"relative"}}><input type={showC?"text":"password"} className="inp" value={cur} onChange={e=>{setCur(e.target.value);setErr("");}} placeholder="Current password" style={{paddingRight:40}}/><button onClick={()=>setShowC(s=>!s)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#4B5E80"}}>{showC?"🙈":"👁"}</button></div>
          </div>
          <div style={{marginBottom:13}}><label style={{fontSize:11,color:"#64748B",fontWeight:700,marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:".07em"}}>New Username</label><input className="inp" value={nu} onChange={e=>{setNu(e.target.value);setErr("");}} placeholder="New username"/></div>
          <div style={{marginBottom:13}}><label style={{fontSize:11,color:"#64748B",fontWeight:700,marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:".07em"}}>New Password <span style={{color:"#2D3E5C",textTransform:"none"}}>(blank = keep current)</span></label><div style={{position:"relative"}}><input type={showN?"text":"password"} className="inp" value={np} onChange={e=>{setNp(e.target.value);setErr("");}} placeholder="New password" style={{paddingRight:40}}/><button onClick={()=>setShowN(s=>!s)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#4B5E80"}}>{showN?"🙈":"👁"}</button></div></div>
          {np && <div style={{marginBottom:13}}><label style={{fontSize:11,color:"#64748B",fontWeight:700,marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:".07em"}}>Confirm Password</label><input type="password" className="inp" value={cp} onChange={e=>{setCp(e.target.value);setErr("");}} style={{borderColor:cp&&cp!==np?"#FCA5A5":undefined}} placeholder="Repeat new password"/></div>}
          {err && <div style={{background:"#3B1A1A",border:"1px solid #FCA5A555",borderRadius:9,padding:"9px 13px",color:"#FCA5A5",fontSize:12,marginBottom:14}}>⚠ {err}</div>}
          <div style={{display:"flex",gap:9,marginTop:6}}>
            <button onClick={onClose} className="btnG" style={{flex:1}}>Cancel</button>
            <button onClick={save} className="btnP" style={{flex:2}}>{loading?<><Spinner size={14} color="#fff"/> Saving...</>:"Save Changes"}</button>
          </div>
        </>)}
      </div>
    </div>
  );
}

// ── APP SETTINGS MODAL ──
function AppSettingsModal({ appCfg, theme, onSave, onClose }) {
  const [name,setName]=useState(appCfg.name);
  const [logo,setLogo]=useState(appCfg.logo);
  const [logoType,setLogoType]=useState(appCfg.logoType||"emoji");
  const [logoData,setLogoData]=useState(appCfg.logoData||"");
  const [themeKey,setThemeKey]=useState(appCfg.themeKey||"cyan");
  const fileRef = useRef();
  const EMOJIS = ["⚡","🚀","🎯","💼","📊","🔥","💡","🏆","⭐","🌟","💎","🛡","📈","🤝","👑"];

  const handleImage = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setLogoData(ev.target.result); setLogoType("image"); };
    reader.readAsDataURL(file);
  };

  const preview = logoType==="image"&&logoData
    ? <img src={logoData} style={{width:44,height:44,objectFit:"cover",borderRadius:12}} alt="logo"/>
    : <span style={{fontSize:24}}>{logo}</span>;

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{width:480}}>
        <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:16,marginBottom:20}}>🎨 App Settings</div>

        {/* Preview */}
        <div style={{background:"#0D1424",border:"1px solid #1E2A45",borderRadius:12,padding:14,marginBottom:18,display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,"+THEMES[themeKey].primary+","+THEMES[themeKey].secondary+")",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>{preview}</div>
          <div><div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:14,color:"#E2E8F0"}}>{name||"App Name"}</div><div style={{fontSize:11,color:THEMES[themeKey].primary,marginTop:2}}>● Live Preview</div></div>
        </div>

        {/* App Name */}
        <div style={{marginBottom:16}}>
          <label style={{fontSize:11,color:"#64748B",fontWeight:700,marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:".07em"}}>App Name</label>
          <input className="inp" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. ISA Performance Dashboard"/>
        </div>

        {/* Logo Type Toggle */}
        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,color:"#64748B",fontWeight:700,marginBottom:8,display:"block",textTransform:"uppercase",letterSpacing:".07em"}}>Logo Type</label>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            {[["emoji","Emoji Icon"],["image","Upload Image"]].map(([v,l])=>(
              <button key={v} className={"rbtn "+(logoType===v?"rbtnA":"rbtnI")} style={{flex:1}} onClick={()=>setLogoType(v)}>{l}</button>
            ))}
          </div>
          {logoType==="emoji" && (
            <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
              {EMOJIS.map(e=>(<button key={e} onClick={()=>setLogo(e)} style={{width:40,height:40,borderRadius:9,background:logo===e?"linear-gradient(135deg,var(--p),var(--s))":"#1E2A45",border:logo===e?"none":"1px solid #2D3E5C",fontSize:20,cursor:"pointer",transition:"all .2s"}}>{e}</button>))}
            </div>
          )}
          {logoType==="image" && (
            <div>
              <input type="file" accept="image/*" ref={fileRef} onChange={handleImage} style={{display:"none"}}/>
              <button className="btnG" onClick={()=>fileRef.current.click()} style={{marginBottom:8}}>📁 Choose Image</button>
              {logoData && <div style={{marginTop:8}}><img src={logoData} alt="preview" style={{width:60,height:60,borderRadius:12,objectFit:"cover",border:"2px solid #1E2A45"}}/></div>}
            </div>
          )}
        </div>

        {/* Theme */}
        <div style={{marginBottom:20}}>
          <label style={{fontSize:11,color:"#64748B",fontWeight:700,marginBottom:10,display:"block",textTransform:"uppercase",letterSpacing:".07em"}}>Color Theme</label>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {Object.entries(THEMES).map(([key,t])=>(
              <div key={key} title={t.name} style={{textAlign:"center"}}>
                <div className={"theme-dot "+(themeKey===key?"selected":"")} onClick={()=>setThemeKey(key)}
                  style={{background:"linear-gradient(135deg,"+t.primary+","+t.secondary+")",margin:"0 auto 4px"}}/>
                <div style={{fontSize:9,color:"#4B5E80"}}>{t.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{display:"flex",gap:9}}>
          <button onClick={onClose} className="btnG" style={{flex:1}}>Cancel</button>
          <button onClick={()=>{ onSave({name:name.trim()||appCfg.name,logo,logoType,logoData,themeKey}); onClose(); }} className="btnP" style={{flex:2}}>Save Settings</button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN DASHBOARD ──
function Dashboard({ creds, setCreds, appCfg, setAppCfg, theme, setTheme, onLogout }) {
  const [members,    setMembers]    = useState([]);
  const [leads,      setLeads]      = useState([]);
  const [attendance, setAttendance] = useState({});
  const [finance,    setFinance]    = useState([]); // { id, member_id, type:'dock'|'bonus', amount, reason, date }
  const [loadingApp, setLoadingApp] = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [toast,      setToast]      = useState(null);
  const [tab,        setTab]        = useState("dashboard");

  // Modals
  const [showAddM,    setShowAddM]    = useState(false);
  const [showAddL,    setShowAddL]    = useState(false);
  const [showCreds,   setShowCreds]   = useState(false);
  const [showSettings,setShowSettings]= useState(false);
  const [showAddFin,  setShowAddFin]  = useState(null); // 'dock' | 'bonus'
  const [editLead,    setEditLead]    = useState(null);
  const [editFinance, setEditFinance] = useState(null); // finance record for editing
  const [confirmDel,  setConfirmDel]  = useState(null);

  // Forms
  const [mName,setMName]=useState(""), [mRole,setMRole]=useState(""), [mStatus,setMStatus]=useState("active");
  const [lMember,setLMember]=useState(""), [lCount,setLCount]=useState(""), [lDate,setLDate]=useState(today());
  const [finMember,setFinMember]=useState(""), [finAmount,setFinAmount]=useState(""), [finReason,setFinReason]=useState(""), [finDate,setFinDate]=useState(today());

  // Attendance view — use PKT now
  const now0 = getPKTNow();
  const [aYear,setAYear]=useState(now0.getUTCFullYear()), [aMonth,setAMonth]=useState(now0.getUTCMonth()+1), [aDate,setADate]=useState(today());

  // Report
  const [rMode,setRMode]=useState("month"), [rSingle,setRSingle]=useState(today());
  const [rStart,setRStart]=useState(mRange().start), [rEnd,setREnd]=useState(mRange().end);
  const [rType,setRType]=useState("all"), [rTarget,setRTarget]=useState("team");
  const [rMember,setRMember]=useState(""), [mSearch,setMSearch]=useState("");
  const [finYear,setFinYear]=useState(()=>getPKTNow().getUTCFullYear());
  const [finMonth,setFinMonth]=useState(()=>getPKTNow().getUTCMonth()+1);
  const printRef = useRef(null);

  const showToast = (msg, type="success") => { setToast({msg,type}); };

  // ── LOAD ──
  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoadingApp(true);
    try {
      const [ms,ls,as,fs] = await Promise.all([
        db.get("members"),
        db.get("leads"),
        db.get("attendance"),
        db.get("finance").catch(()=>[]),
      ]);
      setMembers(ms||[]);
      setLeads(ls||[]);
      const attMap={};
      (as||[]).forEach(a=>{ attMap[a.member_id+"_"+a.date]=a.status; });
      setAttendance(attMap);
      setFinance(fs||[]);
    } catch(e) { showToast("Failed to load data","error"); }
    setLoadingApp(false);
  };

  // ── COMPUTED ──
  const visibleMembers = members.filter(m=>!m.deleted);
  const activeM        = visibleMembers.filter(m=>m.status==="active");
  const inactiveM      = visibleMembers.filter(m=>m.status==="inactive");
  const binMembers     = members.filter(m=>m.deleted);

  const attKey = (mid,d) => mid+"_"+d;
  const getAtt = (mid,d) => attendance[attKey(mid,d)]||null;

  const setAttDB = async (mid,d,s) => {
    const cur=getAtt(mid,d), nv=cur===s?null:s;
    setAttendance(p=>{ const k=attKey(mid,d); if(!nv){const n={...p};delete n[k];return n;} return{...p,[k]:nv}; });
    try {
      if(!nv) await db.deleteWhere("attendance","member_id=eq."+mid+"&date=eq."+d);
      else    await db.upsert("attendance",{member_id:mid,date:d,status:nv},"member_id,date");
    } catch(e) { showToast("Failed to save attendance","error"); loadAll(); }
  };

  const markAll = async (d,s) => {
    const updates = activeM.map(m=>({member_id:m.id,date:d,status:s}));
    setAttendance(p=>{const n={...p};activeM.forEach(m=>{n[attKey(m.id,d)]=s;});return n;});
    try { await db.upsert("attendance",updates,"member_id,date"); showToast("Marked all as "+ATT[s].label); }
    catch(e) { showToast("Failed","error"); loadAll(); }
  };

  const attStats = (mid,dates) => {
    let P=0,A=0,HD=0,L=0,LT=0;
    dates.forEach(d=>{const v=getAtt(mid,d);if(v==="P")P++;else if(v==="A")A++;else if(v==="HD")HD++;else if(v==="L")L++;else if(v==="LT")LT++;});
    return{P,A,HD,L,LT};
  };

  // Member ops
  const addMember = async () => {
    if(!mName.trim()) return;
    setSaving(true);
    try {
      const av=mName.trim().split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
      const col=COLORS_LIST[members.length%COLORS_LIST.length];
      const [nm]=await db.insert("members",{name:mName.trim(),role:mRole.trim()||"Member",status:mStatus,avatar:av,color:col,deleted:false});
      setMembers(p=>[...p,nm]); setMName(""); setMRole(""); setMStatus("active"); setShowAddM(false);
      showToast("Member added successfully");
    } catch(e) { showToast("Failed to add member","error"); }
    setSaving(false);
  };
  const toggleStatus = async id => {
    const m=members.find(x=>x.id===id), ns=m.status==="active"?"inactive":"active";
    setMembers(p=>p.map(x=>x.id===id?{...x,status:ns}:x));
    try { await db.update("members",id,{status:ns}); showToast("Status updated"); }
    catch(e) { showToast("Failed","error"); loadAll(); }
  };
  const softDelete = async id => {
    setMembers(p=>p.map(m=>m.id===id?{...m,deleted:true}:m)); setConfirmDel(null);
    try { await db.update("members",id,{deleted:true}); showToast("Moved to bin"); }
    catch(e) { showToast("Failed","error"); loadAll(); }
  };
  const restoreMember = async id => {
    setMembers(p=>p.map(m=>m.id===id?{...m,deleted:false,status:"inactive"}:m));
    try { await db.update("members",id,{deleted:false,status:"inactive"}); showToast("Member restored"); }
    catch(e) { showToast("Failed","error"); loadAll(); }
  };
  const hardDelete = async id => {
    setMembers(p=>p.filter(m=>m.id!==id));
    try { await Promise.all([db.deleteWhere("attendance","member_id=eq."+id), db.deleteWhere("leads","member_id=eq."+id), db.deleteWhere("finance","member_id=eq."+id), db.delete("members",id)]); showToast("Permanently deleted"); }
    catch(e) { showToast("Failed","error"); loadAll(); }
  };

  // Lead ops
  const addLead = async () => {
    if(!lMember||!lCount||!lDate) return;
    setSaving(true);
    try {
      const [nl]=await db.insert("leads",{member_id:parseInt(lMember),count:parseInt(lCount),date:lDate});
      setLeads(p=>[...p,nl]); setLCount(""); setLDate(today()); setLMember(""); setShowAddL(false);
      showToast("Lead entry added");
    } catch(e) { showToast("Failed to add lead","error"); }
    setSaving(false);
  };
  const updateLead = async () => {
    if(!editLead) return;
    setSaving(true);
    try {
      await db.update("leads",editLead.id,{count:parseInt(editLead.count),date:editLead.date,member_id:parseInt(editLead.member_id)});
      setLeads(p=>p.map(l=>l.id===editLead.id?{...l,...editLead}:l)); setEditLead(null);
      showToast("Lead updated");
    } catch(e) { showToast("Failed to update","error"); }
    setSaving(false);
  };
  const deleteLead = async id => {
    setLeads(p=>p.filter(l=>l.id!==id));
    try { await db.delete("leads",id); showToast("Lead deleted"); }
    catch(e) { showToast("Failed","error"); loadAll(); }
  };

  // Finance ops
  const addFinance = async () => {
    if(!finMember||!finAmount||!finReason||!finDate) return;
    setSaving(true);
    try {
      const [nf]=await db.insert("finance",{member_id:parseInt(finMember),type:showAddFin,amount:parseFloat(finAmount),reason:finReason.trim(),date:finDate});
      setFinance(p=>[...p,nf]); setFinMember(""); setFinAmount(""); setFinReason(""); setFinDate(today()); setShowAddFin(null);
      showToast((showAddFin==="bonus"?"Bonus":"Dock")+" added");
    } catch(e) { showToast("Failed to add","error"); }
    setSaving(false);
  };
  const deleteFinance = async id => {
    setFinance(p=>p.filter(f=>f.id!==id));
    try { await db.delete("finance",id); showToast("Record deleted"); }
    catch(e) { showToast("Failed","error"); loadAll(); }
  };
  const updateFinance = async () => {
    if(!editFinance) return;
    setSaving(true);
    try {
      await db.update("finance", editFinance.id, {
        member_id: parseInt(editFinance.member_id),
        amount: parseFloat(editFinance.amount),
        reason: editFinance.reason,
        date: editFinance.date,
      });
      setFinance(p=>p.map(f=>f.id===editFinance.id?{...f,...editFinance}:f));
      setEditFinance(null);
      showToast("Record updated");
    } catch(e) { showToast("Failed to update","error"); }
    setSaving(false);
  };

  const mDays = daysInMonth(aYear,aMonth);

  const rDates = useMemo(()=>{
    if(rMode==="month"){const{start,end}=mRange();return rangeDays(start,end);}
    if(rMode==="single") return[rSingle];
    return rangeDays(rStart,rEnd);
  },[rMode,rSingle,rStart,rEnd]);

  const rLeads = useMemo(()=>{
    if(!rDates.length) return[];
    const s=rDates[0],e=rDates[rDates.length-1];
    return leads.filter(l=>l.date>=s&&l.date<=e);
  },[leads,rDates]);

  const rFinance = useMemo(()=>{
    if(!rDates.length) return[];
    const s=rDates[0],e=rDates[rDates.length-1];
    return finance.filter(f=>f.date>=s&&f.date<=e);
  },[finance,rDates]);

  const rMemberObj = visibleMembers.find(m=>m.id===parseInt(rMember))||null;

  const buildSummary = list => list.map(m=>{
    const total=rLeads.filter(l=>l.member_id===m.id).reduce((s,l)=>s+l.count,0);
    const att=attStats(m.id,rDates);
    const rate=rDates.length?Math.round(((att.P+att.HD*.5+att.LT*.75)/rDates.length)*100):0;
    const docks=rFinance.filter(f=>f.member_id===m.id&&f.type==="dock");
    const bonuses=rFinance.filter(f=>f.member_id===m.id&&f.type==="bonus");
    const totalDock=docks.reduce((s,f)=>s+Number(f.amount),0);
    const totalBonus=bonuses.reduce((s,f)=>s+Number(f.amount),0);
    return{member:m,total,att,rate,docks,bonuses,totalDock,totalBonus};
  }).sort((a,b)=>b.total-a.total);

  const activeSumm   = buildSummary(activeM);
  const inactiveSumm = buildSummary(inactiveM);
  const totalLeads   = [...activeSumm,...inactiveSumm].reduce((s,r)=>s+r.total,0);
  const topPerf      = [...activeSumm,...inactiveSumm].find(r=>r.total>0);
  const maxBar       = Math.max(1,...[...activeSumm,...inactiveSumm].map(r=>r.total));

  const {start:ms,end:me}=mRange();
  const mLeads   = leads.filter(l=>l.date>=ms&&l.date<=me&&!members.find(m=>m.id===l.member_id)?.deleted);
  const totMonth = mLeads.reduce((s,l)=>s+l.count,0);
  const todLeads = leads.filter(l=>l.date===today()&&!members.find(m=>m.id===l.member_id)?.deleted).reduce((s,l)=>s+l.count,0);
  const todAtt   = activeM.reduce((acc,m)=>{const v=getAtt(m.id,today())||"none";acc[v]=(acc[v]||0)+1;return acc;},{});

  const exportPDF = () => {
    if(!printRef.current) return;
    const w=window.open("","_blank");
    w.document.write("<html><head><title>"+appCfg.name+" Report</title><style>body{font-family:sans-serif;padding:28px;color:#111;font-size:13px}h1{font-size:20px;font-weight:800;margin-bottom:6px}h2{font-size:15px;font-weight:700;margin:20px 0 8px;border-bottom:2px solid #e2e8f0;padding-bottom:4px}h3{font-size:13px;font-weight:700;margin:14px 0 6px;color:#334155}table{width:100%;border-collapse:collapse;margin-bottom:14px}th{background:#f8fafc;padding:6px 10px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b}td{padding:6px 10px;border-bottom:1px solid #f1f5f9}.meta{color:#64748b;font-size:12px;margin-bottom:18px}.good{color:#16a34a;font-weight:700}.bad{color:#dc2626;font-weight:700}</style></head><body>");
    w.document.write(printRef.current.innerHTML);
    w.document.write("</body></html>"); w.document.close(); setTimeout(()=>{w.focus();w.print();},400);
  };

  const buildPrint = () => {
    const pktNow=getPKTNow();
    const dl=rMode==="month"?mLabel(pktNow.getUTCFullYear(),pktNow.getUTCMonth()+1):rMode==="single"?fmtDate(rSingle):fmtDate(rStart)+" - "+fmtDate(rEnd);
    const who=rTarget==="member"&&rMemberObj?rMemberObj.name:"Full Team";
    let h="<h1>"+appCfg.name+"</h1><p class='meta'>Report Period: "+dl+" &nbsp;|&nbsp; Scope: "+who+" &nbsp;|&nbsp; Generated: "+new Date().toLocaleString("en-PK",{timeZone:"Asia/Karachi"})+"</p>";

    const renderMemberTable = (list, inact) => {
      if(!list.length) return "";
      const showLeads  = rType==="all"||rType==="leads";
      const showAtt    = rType==="all"||rType==="attendance";
      const showFinance= rType==="all"||rType==="finance";
      let t="<table><tr><th>Member</th><th>Role</th>";
      if(showLeads)   t+="<th>Leads</th><th>Share</th>";
      if(showAtt)     t+="<th>P</th><th>A</th><th>HD</th><th>L</th><th>LT</th><th>Att%</th>";
      if(showFinance) t+="<th>Bonus</th><th>Dock</th>";
      t+="</tr>";
      list.forEach(({member:m,total,att,rate,totalBonus,totalDock})=>{
        if(rTarget==="member"&&rMemberObj&&m.id!==rMemberObj.id) return;
        t+="<tr><td>"+m.name+(inact?" (Inactive)":"")+"</td><td>"+m.role+"</td>";
        if(showLeads)   t+="<td>"+total+"</td><td>"+(totalLeads?Math.round(total/totalLeads*100):0)+"%</td>";
        if(showAtt)     t+="<td>"+att.P+"</td><td>"+att.A+"</td><td>"+att.HD+"</td><td>"+att.L+"</td><td>"+att.LT+"</td><td>"+rate+"%</td>";
        if(showFinance) t+="<td class='good'>"+totalBonus.toFixed(2)+"</td><td class='bad'>"+totalDock.toFixed(2)+"</td>";
        t+="</tr>";
      });
      return t+"</table>";
    };

    h+="<h2>Active Members</h2>"+renderMemberTable(activeSumm,false);
    if(rTarget==="team") h+="<h2>Inactive Members</h2>"+renderMemberTable(inactiveSumm,true);

    // Individual detail
    if(rTarget==="member"&&rMemberObj) {
      const m=rMemberObj;
      const mLeadsR=rLeads.filter(l=>l.member_id===m.id);
      const mDocks=rFinance.filter(f=>f.member_id===m.id&&f.type==="dock");
      const mBonus=rFinance.filter(f=>f.member_id===m.id&&f.type==="bonus");
      if(rType==="all"||rType==="leads") {
        h+="<h3>Leads Detail</h3><table><tr><th>Date</th><th>Leads</th></tr>";
        rDates.forEach(d=>{ const lc=mLeadsR.filter(l=>l.date===d).reduce((s,l)=>s+l.count,0); if(lc) h+="<tr><td>"+fmtDate(d)+"</td><td>"+lc+"</td></tr>"; });
        h+="</table>";
      }
      if(rType==="all"||rType==="attendance") {
        h+="<h3>Attendance Detail</h3><table><tr><th>Date</th><th>Day</th><th>Status</th></tr>";
        rDates.forEach(d=>{ const v=getAtt(m.id,d),meta=v?ATT[v]:null; h+="<tr><td>"+fmtDate(d)+"</td><td>"+getDayName(d,"long")+"</td><td>"+(meta?meta.label:"Not marked")+"</td></tr>"; });
        h+="</table>";
      }
      if((rType==="all"||rType==="finance")&&mBonus.length) {
        h+="<h3>Bonus Records</h3><table><tr><th>Date</th><th>Amount</th><th>Reason</th></tr>";
        mBonus.forEach(f=>{ h+="<tr><td>"+fmtDate(f.date)+"</td><td class='good'>"+Number(f.amount).toFixed(2)+"</td><td>"+f.reason+"</td></tr>"; });
        h+="</table>";
      }
      if((rType==="all"||rType==="finance")&&mDocks.length) {
        h+="<h3>Dock Records</h3><table><tr><th>Date</th><th>Amount</th><th>Reason</th></tr>";
        mDocks.forEach(f=>{ h+="<tr><td>"+fmtDate(f.date)+"</td><td class='bad'>"+Number(f.amount).toFixed(2)+"</td><td>"+f.reason+"</td></tr>"; });
        h+="</table>";
      }
    }
    return h;
  };

  const TABS=[["dashboard","📊 Dashboard"],["members","👥 Members"],["attendance","🗓 Attendance"],["leads","📋 Leads"],["finance","💰 Finance"],["report","📈 Reports"],["bin","🗑 Bin"+(binMembers.length?" ("+binMembers.length+")":"")]];

  if(loadingApp) return <LoadingScreen theme={theme}/>;

  const logoEl = appCfg.logoType==="image"&&appCfg.logoData
    ? <img src={appCfg.logoData} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:9}} alt="logo"/>
    : <span style={{fontSize:17}}>{appCfg.logo}</span>;

  return (
    <div style={{minHeight:"100vh",background:"#0A0F1E",color:"#E2E8F0",display:"flex",flexDirection:"column"}}>
      <style>{makeCSS(theme)}</style>
      {saving && <div className="saving-bar"/>}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}

      {/* HEADER */}
      <div style={{background:"#0D1424",borderBottom:"1px solid #1E2A45",padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setShowSettings(true)}>
          <div style={{width:34,height:34,borderRadius:9,background:"linear-gradient(135deg,var(--p),var(--s))",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,overflow:"hidden"}}>{logoEl}</div>
          <div>
            <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:14,letterSpacing:"-.5px",lineHeight:1.2}}>{appCfg.name}</div>
            <div style={{fontSize:10,color:"#4B5E80",marginTop:1}}>Lead · Attendance · Finance</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          <button className="btnG" style={{fontSize:12,padding:"6px 12px"}} onClick={()=>setShowAddM(true)}>+ Member</button>
          <button className="btnP" style={{fontSize:12,padding:"6px 12px"}} onClick={()=>setShowAddL(true)}>+ Leads</button>
          <button className="upill" onClick={()=>setShowCreds(true)}>
            <div style={{width:22,height:22,borderRadius:5,background:"linear-gradient(135deg,var(--p),var(--s))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff",flexShrink:0}}>{creds.username.slice(0,2).toUpperCase()}</div>
            <span style={{fontSize:12}}>{creds.username}</span>
            <span style={{fontSize:11}}>🔐</span>
          </button>
          <button className="btnLO" onClick={onLogout}>Sign Out</button>
        </div>
      </div>

      {/* TABS */}
      <div style={{padding:"12px 20px 0",display:"flex",gap:4,overflowX:"auto"}}>
        {TABS.map(([k,l])=>(<button key={k} className={"tbtn "+(tab===k?"tbtnA":"tbtnI")} onClick={()=>setTab(k)}>{l}</button>))}
      </div>

      <div style={{padding:"16px 20px",maxWidth:1200,margin:"0 auto",width:"100%",flex:1}}>

        {/* ══ DASHBOARD ══ */}
        {tab==="dashboard" && (
          <div className="fade-up">
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:16}}>
              {[
                {icon:"👥",val:visibleMembers.length,lbl:"Total Members",   sub:activeM.length+" active",                accent:"var(--a)"},
                {icon:"🎯",val:totMonth,              lbl:"Leads This Month",sub:"current month",                         accent:"#93C5FD"},
                {icon:"⚡",val:todLeads,              lbl:"Today Leads",     sub:today(),                                 accent:"#FCD34D"},
                {icon:"✅",val:todAtt["P"]||0,       lbl:"Present Today",   sub:(todAtt["A"]||0)+" absent",              accent:"var(--a)"},
                {icon:"🕐",val:todAtt["LT"]||0,      lbl:"Late Today",      sub:"arrived late",                          accent:"#FB923C"},
                {icon:"💰",val:finance.filter(f=>f.type==="bonus"&&f.date>=ms&&f.date<=me).length,lbl:"Bonuses (Month)",sub:"this month",accent:"#6EE7B7"},
              ].map((s,i)=>(
                <div key={i} className="sc stat-card" style={{padding:"13px 13px 10px",boxShadow:"0 0 20px rgba(0,0,0,.2)",animationDelay:i*.05+"s"}} >
                  <div style={{fontSize:18,marginBottom:5}}>{s.icon}</div>
                  <div style={{fontSize:24,fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,color:s.accent}}>{s.val}</div>
                  <div style={{fontSize:11,color:"#94A3B8",marginTop:2}}>{s.lbl}</div>
                  <div style={{fontSize:9,color:"#4B5E80",marginTop:1}}>{s.sub}</div>
                </div>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              {/* Today attendance */}
              <div className="card" style={{padding:16}}>
                <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:13,marginBottom:11,display:"flex",alignItems:"center",gap:7}}>🗓 Today <span style={{fontSize:11,color:"#4B5E80",fontWeight:400}}>{fmtDate(today())}</span></div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {activeM.map(m=>{
                    const v=getAtt(m.id,today()),meta=v?ATT[v]:null;
                    return(<div key={m.id} style={{display:"flex",alignItems:"center",gap:6,background:"#0D1424",borderRadius:9,padding:"6px 10px",border:"1px solid "+(meta?meta.color+"44":"#1E2A45")}}>
                      <div style={{width:24,height:24,borderRadius:6,background:m.color+"22",border:"2px solid "+m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:m.color}}>{m.avatar}</div>
                      <span style={{fontSize:12,fontWeight:600}}>{m.name.split(" ")[0]}</span>
                      {meta?<span style={{background:meta.bg,color:meta.color,borderRadius:5,padding:"1px 6px",fontSize:9,fontWeight:800}}>{v}</span>:<span style={{background:"#1E2A45",color:"#4B5E80",borderRadius:5,padding:"1px 6px",fontSize:9}}>—</span>}
                    </div>);
                  })}
                </div>
              </div>

              {/* Leaderboard */}
              <div className="card" style={{padding:16}}>
                <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:13,marginBottom:11}}>🏆 This Month</div>
                {activeM.slice(0,5).map(m=>{
                  const tot=mLeads.filter(l=>l.member_id===m.id).reduce((s,l)=>s+l.count,0);
                  const mx=Math.max(1,...activeM.map(mm=>mLeads.filter(l=>l.member_id===mm.id).reduce((s,l)=>s+l.count,0)));
                  return(<div key={m.id} style={{display:"flex",alignItems:"center",gap:9,marginBottom:9}}>
                    <div style={{width:28,height:28,borderRadius:7,background:m.color+"22",border:"2px solid "+m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:m.color,flexShrink:0}}>{m.avatar}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:600,marginBottom:2}}>{m.name}</div>
                      <div style={{height:5,background:"#1E2A45",borderRadius:6,overflow:"hidden"}}><div className="bfill" style={{height:"100%",borderRadius:6,background:"linear-gradient(90deg,var(--p),var(--s))",width:(mx?tot/mx*100:0)+"%"}}/></div>
                    </div>
                    <div style={{fontSize:16,fontWeight:700,color:"var(--p)",minWidth:28,textAlign:"right"}}>{tot}</div>
                  </div>);
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══ MEMBERS ══ */}
        {tab==="members" && (
          <div className="fade-up" style={{...{},overflow:"hidden"}} className="card">
            <div style={{padding:"14px 18px",borderBottom:"1px solid #1E2A45",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:14}}>Team Members ({visibleMembers.length})</div>
              <button className="btnP" onClick={()=>setShowAddM(true)}>+ Add Member</button>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:520}}>
                <thead><tr style={{background:"#0D1424"}}>
                  {["ID","Member","Role","Status","Leads (Month)","Actions"].map(h=>(<th key={h} style={{padding:"9px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:"#4B5E80",textTransform:"uppercase",letterSpacing:".07em"}}>{h}</th>))}
                </tr></thead>
                <tbody>
                  {visibleMembers.map(m=>{
                    const tot=mLeads.filter(l=>l.member_id===m.id).reduce((s,l)=>s+l.count,0);
                    return(<tr key={m.id} className="row" style={{borderTop:"1px solid #1A2235"}}>
                      <td style={{padding:"11px 14px",color:"#4B5E80",fontSize:12,fontWeight:700}}>#{m.id}</td>
                      <td style={{padding:"11px 14px"}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:28,height:28,borderRadius:7,background:m.color+"22",border:"2px solid "+m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:m.color}}>{m.avatar}</div><span style={{fontWeight:600,fontSize:13}}>{m.name}</span></div></td>
                      <td style={{padding:"11px 14px",color:"#94A3B8",fontSize:12}}>{m.role}</td>
                      <td style={{padding:"11px 14px"}}><span className={m.status==="active"?"bga":"bgi"}>{m.status}</span></td>
                      <td style={{padding:"11px 14px",fontWeight:700,color:m.color,fontSize:15}}>{tot}</td>
                      <td style={{padding:"11px 14px"}}><div style={{display:"flex",gap:5}}><button className="btnG" style={{fontSize:11,padding:"4px 9px"}} onClick={()=>toggleStatus(m.id)}>{m.status==="active"?"Deactivate":"Activate"}</button><button className="btnR" style={{fontSize:11,padding:"4px 9px"}} onClick={()=>setConfirmDel(m.id)}>Delete</button></div></td>
                    </tr>);
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ ATTENDANCE ══ */}
        {tab==="attendance" && (
          <div className="fade-up">
            {/* Controls */}
            <div className="card" style={{padding:"13px 16px",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <button className="btnG" style={{padding:"4px 11px",fontSize:16}} onClick={()=>{let mo=aMonth-1,yr=aYear;if(mo<1){mo=12;yr--;}setAMonth(mo);setAYear(yr);}}>‹</button>
                  <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:13,minWidth:145,textAlign:"center"}}>{mLabel(aYear,aMonth)}</div>
                  <button className="btnG" style={{padding:"4px 11px",fontSize:16}} onClick={()=>{let mo=aMonth+1,yr=aYear;if(mo>12){mo=1;yr++;}setAMonth(mo);setAYear(yr);}}>›</button>
                </div>
                <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                  {Object.entries(ATT).map(([k,v])=>(<div key={k} style={{display:"flex",alignItems:"center",gap:3}}><div style={{width:7,height:7,borderRadius:2,background:v.color}}/><span style={{fontSize:10,color:"#94A3B8"}}><b style={{color:v.color}}>{k}</b> {v.label}</span></div>))}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
                  <input type="date" className="inp" value={aDate} onChange={e=>setADate(e.target.value)} style={{width:140,padding:"5px 9px",fontSize:11}}/>
                  <span style={{fontSize:10,color:"#4B5E80"}}>Mark all:</span>
                  {Object.entries(ATT).map(([k,v])=>(<button key={k} className="mabtn" onClick={()=>markAll(aDate,k)} style={{background:v.bg,color:v.color,border:"1px solid "+v.color+"55"}}>{k}</button>))}
                </div>
              </div>
            </div>

            {/* Grid */}
            <div className="card" style={{overflowX:"auto",marginBottom:12}}>
              <table style={{borderCollapse:"collapse",minWidth:600}}>
                <thead><tr style={{background:"#0D1424"}}>
                  <th style={{padding:"8px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:"#4B5E80",textTransform:"uppercase",position:"sticky",left:0,background:"#0D1424",zIndex:2,minWidth:140,borderRight:"1px solid #1A2235"}}>Member</th>
                  {mDays.map(d=>{
                    const day=parseInt(d.split("-")[2]);
                    const dow=getDayName(d,"short");
                    const isTod=isToday(d);
                    return(<th key={d} style={{padding:"5px 1px",textAlign:"center",fontSize:8,fontWeight:700,color:isTod?"var(--p)":"#4B5E80",minWidth:42,background:isTod?"#0EA5E91A":"transparent"}}>
                      <div style={{fontSize:8}}>{dow}</div><div style={{fontSize:10,fontWeight:800}}>{day}</div>
                    </th>);
                  })}
                  {["P","A","HD","L","LT"].map(k=>(<th key={k} style={{padding:"8px 4px",textAlign:"center",fontSize:9,fontWeight:700,color:ATT[k].color,minWidth:30}}>{k}</th>))}
                </tr></thead>
                <tbody>
                  {activeM.map(m=>{
                    const s=attStats(m.id,mDays);
                    return(<tr key={m.id} className="row" style={{borderTop:"1px solid #1A2235"}}>
                      <td style={{padding:"6px 10px",position:"sticky",left:0,background:"#111827",zIndex:1,borderRight:"1px solid #1A2235"}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <div style={{width:22,height:22,borderRadius:5,background:m.color+"22",border:"2px solid "+m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:m.color,flexShrink:0}}>{m.avatar}</div>
                          <div><div style={{fontSize:11,fontWeight:600}}>{m.name}</div><div style={{fontSize:9,color:"#4B5E80"}}>{m.role}</div></div>
                        </div>
                      </td>
                      {mDays.map(d=>{
                        const v=getAtt(m.id,d),isTod=isToday(d);
                        return(<td key={d} style={{padding:"1px",textAlign:"center",background:isTod?"#0EA5E90A":"transparent"}}>
                          <div style={{display:"flex",flexDirection:"column",gap:1,alignItems:"center"}}>
                            {Object.entries(ATT).map(([k,vm])=>(<button key={k} className="apill" onClick={()=>setAttDB(m.id,d,k)} style={{background:v===k?vm.bg:"transparent",color:v===k?vm.color:"#2D3E5C",border:v===k?"1px solid "+vm.color+"55":"1px solid transparent",opacity:v===k?1:.45}}>{k}</button>))}
                          </div>
                        </td>);
                      })}
                      {[["P","#6EE7B7",s.P],["A","#FCA5A5",s.A],["HD","#FCD34D",s.HD],["L","#C4B5FD",s.L],["LT","#FB923C",s.LT]].map(([k,c,v])=>(<td key={k} style={{padding:"6px 4px",textAlign:"center",fontWeight:700,color:c,fontSize:11}}>{v}</td>))}
                    </tr>);
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary cards */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))",gap:10}}>
              {activeM.map(m=>{
                const s=attStats(m.id,mDays),tot=mDays.length,rate=tot?((s.P+s.HD*.5+s.LT*.75)/tot*100):0;
                return(<div key={m.id} className="sc" style={{padding:"13px 14px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:9}}>
                    <div style={{width:24,height:24,borderRadius:6,background:m.color+"22",border:"2px solid "+m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:m.color}}>{m.avatar}</div>
                    <div><div style={{fontSize:12,fontWeight:700}}>{m.name}</div><div style={{fontSize:9,color:"#4B5E80"}}>{m.role}</div></div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4,marginBottom:7}}>
                    {[["P","Present",s.P,"#6EE7B7"],["A","Absent",s.A,"#FCA5A5"],["HD","Half Day",s.HD,"#FCD34D"],["L","Leave",s.L,"#C4B5FD"],["LT","Late",s.LT,"#FB923C"]].map(([k,lb,val,c])=>(<div key={k} style={{background:c+"11",border:"1px solid "+c+"33",borderRadius:6,padding:"5px 6px",textAlign:"center"}}><div style={{fontSize:14,fontWeight:700,color:c}}>{val}</div><div style={{fontSize:8,color:"#64748B",marginTop:1}}>{lb}</div></div>))}
                  </div>
                  <div style={{fontSize:9,color:"#4B5E80",display:"flex",justifyContent:"space-between",marginBottom:3}}><span>Att. Rate</span><span style={{color:rate>=80?"#6EE7B7":rate>=50?"#FCD34D":"#FCA5A5"}}>{Math.round(rate)}%</span></div>
                  <div style={{height:4,background:"#1E2A45",borderRadius:6,overflow:"hidden"}}><div className="bfill" style={{height:"100%",borderRadius:6,background:"linear-gradient(90deg,var(--p),var(--s))",width:rate+"%"}}/></div>
                </div>);
              })}
            </div>
          </div>
        )}

        {/* ══ LEADS ══ */}
        {tab==="leads" && (
          <div className="fade-up">
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:11}}>
              <button className="btnP" onClick={()=>setShowAddL(true)}>+ Add Leads</button>
            </div>
            <div className="card" style={{overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr style={{background:"#0D1424"}}>
                  {["Date","Member","Role","Leads","Actions"].map(h=>(<th key={h} style={{padding:"9px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:"#4B5E80",textTransform:"uppercase",letterSpacing:".07em"}}>{h}</th>))}
                </tr></thead>
                <tbody>
                  {[...leads].filter(l=>!members.find(m=>m.id===l.member_id)?.deleted).sort((a,b)=>b.date.localeCompare(a.date)).map(l=>{
                    const m=members.find(x=>x.id===l.member_id);
                    return(<tr key={l.id} className="row" style={{borderTop:"1px solid #1A2235"}}>
                      <td style={{padding:"10px 14px",color:"#94A3B8",fontSize:12}}>{fmtDate(l.date)}</td>
                      <td style={{padding:"10px 14px"}}><div style={{display:"flex",alignItems:"center",gap:7}}>{m&&<div style={{width:22,height:22,borderRadius:5,background:m.color+"22",border:"2px solid "+m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:m.color}}>{m.avatar}</div>}<span style={{fontWeight:500,fontSize:12}}>{m?.name||"Unknown"}</span>{m?.status==="inactive"&&<span style={{fontSize:9,color:"#FCA5A5",background:"#3B1A1A",borderRadius:9,padding:"1px 5px"}}>Inactive</span>}</div></td>
                      <td style={{padding:"10px 14px",color:"#64748B",fontSize:12}}>{m?.role||""}</td>
                      <td style={{padding:"10px 14px",fontWeight:700,color:m?.color||"var(--p)",fontSize:16}}>{l.count}</td>
                      <td style={{padding:"10px 14px"}}><div style={{display:"flex",gap:5}}><button className="btnG" style={{fontSize:11,padding:"4px 8px"}} onClick={()=>setEditLead({...l})}>✏️ Edit</button><button className="btnR" style={{fontSize:11,padding:"4px 8px"}} onClick={()=>deleteLead(l.id)}>🗑</button></div></td>
                    </tr>);
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ FINANCE ══ */}
        {tab==="finance" && (()=>{
          const finStart=ymd(finYear,finMonth,1);
          const finEnd=ymd(finYear,finMonth,new Date(Date.UTC(finYear,finMonth,0)).getUTCDate());
          const monthFinance=finance.filter(f=>f.date>=finStart&&f.date<=finEnd);
          const pn=getPKTNow();
          const isPKTCurrentMonth=finYear===pn.getUTCFullYear()&&finMonth===pn.getUTCMonth()+1;
          return(
          <div className="fade-up">
            <div className="card" style={{padding:"12px 16px",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <button className="btnG" style={{padding:"4px 11px",fontSize:16}} onClick={()=>{let mo=finMonth-1,yr=finYear;if(mo<1){mo=12;yr--;}setFinMonth(mo);setFinYear(yr);}}>‹</button>
                <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:14,minWidth:145,textAlign:"center"}}>{mLabel(finYear,finMonth)}</div>
                <button className="btnG" style={{padding:"4px 11px",fontSize:16}} onClick={()=>{let mo=finMonth+1,yr=finYear;if(mo>12){mo=1;yr++;}setFinMonth(mo);setFinYear(yr);}}>›</button>
                {isPKTCurrentMonth&&<span style={{fontSize:10,background:"#064E3B",color:"#6EE7B7",borderRadius:8,padding:"2px 8px"}}>Current Month</span>}
              </div>
              <div style={{display:"flex",gap:8}}>
                <button className="btnGR" onClick={()=>setShowAddFin("bonus")}>+ Add Bonus</button>
                <button className="btnR"  onClick={()=>setShowAddFin("dock")}>+ Add Dock</button>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:14}}>
              {[
                {lbl:"Total Bonuses",val:"+"+monthFinance.filter(f=>f.type==="bonus").reduce((s,f)=>s+Number(f.amount),0).toFixed(2),c:"#6EE7B7"},
                {lbl:"Total Docks",  val:"-"+monthFinance.filter(f=>f.type==="dock").reduce((s,f)=>s+Number(f.amount),0).toFixed(2),c:"#FCA5A5"},
                {lbl:"Bonus Records",val:monthFinance.filter(f=>f.type==="bonus").length,c:"#6EE7B7"},
                {lbl:"Dock Records", val:monthFinance.filter(f=>f.type==="dock").length,c:"#FCA5A5"},
              ].map((s,i)=>(<div key={i} className="sc" style={{padding:"12px 13px"}}><div style={{fontSize:9,color:"#4B5E80",textTransform:"uppercase",letterSpacing:".07em",marginBottom:4}}>{s.lbl}</div><div style={{fontSize:20,fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,color:s.c}}>{s.val}</div></div>))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              {/* BONUS */}
              <div>
                <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:13,marginBottom:9,color:"#6EE7B7"}}>🎁 Bonuses</div>
                <div className="card" style={{overflow:"hidden"}}>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr style={{background:"#0D1424"}}>{["Date","Member","Amount","Reason",""].map(h=>(<th key={h} style={{padding:"7px 11px",textAlign:"left",fontSize:9,fontWeight:700,color:"#4B5E80",textTransform:"uppercase"}}>{h}</th>))}</tr></thead>
                    <tbody>
                      {monthFinance.filter(f=>f.type==="bonus"&&!members.find(m=>m.id===f.member_id)?.deleted).sort((a,b)=>b.date.localeCompare(a.date)).map(f=>{
                        const m=members.find(x=>x.id===f.member_id);
                        return(<tr key={f.id} className="row" style={{borderTop:"1px solid #1A2235"}}>
                          <td style={{padding:"8px 11px",color:"#94A3B8",fontSize:10}}>{fmtDate(f.date)}</td>
                          <td style={{padding:"8px 11px"}}><div style={{display:"flex",alignItems:"center",gap:5}}>{m&&<div style={{width:18,height:18,borderRadius:4,background:m.color+"22",border:"2px solid "+m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,fontWeight:700,color:m.color}}>{m.avatar}</div>}<span style={{fontSize:11,fontWeight:600}}>{m?.name||"?"}</span></div></td>
                          <td style={{padding:"8px 11px",fontWeight:700,color:"#6EE7B7",fontSize:13}}>+{Number(f.amount).toFixed(2)}</td>
                          <td style={{padding:"8px 11px",color:"#94A3B8",fontSize:10}}>{f.reason}</td>
                          <td style={{padding:"8px 8px"}}><div style={{display:"flex",gap:4}}><button className="btnG" style={{fontSize:9,padding:"3px 6px"}} onClick={()=>setEditFinance({...f})}>✏️</button><button className="btnR" style={{fontSize:9,padding:"3px 6px"}} onClick={()=>deleteFinance(f.id)}>🗑</button></div></td>
                        </tr>);
                      })}
                      {monthFinance.filter(f=>f.type==="bonus").length===0&&<tr><td colSpan={5} style={{padding:"18px",textAlign:"center",color:"#4B5E80",fontSize:12}}>No bonuses this month</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DOCK */}
              <div>
                <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:13,marginBottom:9,color:"#FCA5A5"}}>📉 Docks</div>
                <div className="card" style={{overflow:"hidden"}}>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr style={{background:"#0D1424"}}>{["Date","Member","Amount","Reason",""].map(h=>(<th key={h} style={{padding:"7px 11px",textAlign:"left",fontSize:9,fontWeight:700,color:"#4B5E80",textTransform:"uppercase"}}>{h}</th>))}</tr></thead>
                    <tbody>
                      {monthFinance.filter(f=>f.type==="dock"&&!members.find(m=>m.id===f.member_id)?.deleted).sort((a,b)=>b.date.localeCompare(a.date)).map(f=>{
                        const m=members.find(x=>x.id===f.member_id);
                        return(<tr key={f.id} className="row" style={{borderTop:"1px solid #1A2235"}}>
                          <td style={{padding:"8px 11px",color:"#94A3B8",fontSize:10}}>{fmtDate(f.date)}</td>
                          <td style={{padding:"8px 11px"}}><div style={{display:"flex",alignItems:"center",gap:5}}>{m&&<div style={{width:18,height:18,borderRadius:4,background:m.color+"22",border:"2px solid "+m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,fontWeight:700,color:m.color}}>{m.avatar}</div>}<span style={{fontSize:11,fontWeight:600}}>{m?.name||"?"}</span></div></td>
                          <td style={{padding:"8px 11px",fontWeight:700,color:"#FCA5A5",fontSize:13}}>-{Number(f.amount).toFixed(2)}</td>
                          <td style={{padding:"8px 11px",color:"#94A3B8",fontSize:10}}>{f.reason}</td>
                          <td style={{padding:"8px 8px"}}><div style={{display:"flex",gap:4}}><button className="btnG" style={{fontSize:9,padding:"3px 6px"}} onClick={()=>setEditFinance({...f})}>✏️</button><button className="btnR" style={{fontSize:9,padding:"3px 6px"}} onClick={()=>deleteFinance(f.id)}>🗑</button></div></td>
                        </tr>);
                      })}
                      {monthFinance.filter(f=>f.type==="dock").length===0&&<tr><td colSpan={5} style={{padding:"18px",textAlign:"center",color:"#4B5E80",fontSize:12}}>No docks this month</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Member summary */}
            <div>
              <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:13,marginBottom:10}}>💼 Member Summary — {mLabel(finYear,finMonth)}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))",gap:9}}>
                {activeM.map(m=>{
                  const mb=monthFinance.filter(f=>f.member_id===m.id&&f.type==="bonus").reduce((s,f)=>s+Number(f.amount),0);
                  const md=monthFinance.filter(f=>f.member_id===m.id&&f.type==="dock").reduce((s,f)=>s+Number(f.amount),0);
                  return(<div key={m.id} className="sc" style={{padding:"12px 13px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:9}}>
                      <div style={{width:24,height:24,borderRadius:6,background:m.color+"22",border:"2px solid "+m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:m.color}}>{m.avatar}</div>
                      <div><div style={{fontSize:12,fontWeight:700}}>{m.name}</div><div style={{fontSize:9,color:"#4B5E80"}}>{m.role}</div></div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                      <div style={{background:"#6EE7B711",border:"1px solid #6EE7B733",borderRadius:7,padding:"7px 8px",textAlign:"center"}}><div style={{fontSize:15,fontWeight:700,color:"#6EE7B7"}}>+{mb.toFixed(2)}</div><div style={{fontSize:9,color:"#64748B",marginTop:1}}>Bonus</div></div>
                      <div style={{background:"#FCA5A511",border:"1px solid #FCA5A533",borderRadius:7,padding:"7px 8px",textAlign:"center"}}><div style={{fontSize:15,fontWeight:700,color:"#FCA5A5"}}>-{md.toFixed(2)}</div><div style={{fontSize:9,color:"#64748B",marginTop:1}}>Dock</div></div>
                    </div>
                  </div>);
                })}
              </div>
            </div>
          </div>
          );
        })()}

        {/* ══ REPORTS ══ */}
        {tab==="report" && (
          <div className="fade-up">
            <div className="card" style={{padding:18,marginBottom:14}}>
              <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:14,marginBottom:14}}>📈 Report Builder</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:14}}>
                {/* Period */}
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:"#4B5E80",textTransform:"uppercase",letterSpacing:".07em",marginBottom:7}}>① Period</div>
                  <div style={{display:"flex",flexDirection:"column",gap:5}}>
                    {[["month","📅 This Month"],["single","📌 Single Date"],["range","📆 Date Range"]].map(([v,l])=>(<button key={v} className={"rbtn "+(rMode===v?"rbtnA":"rbtnI")} onClick={()=>setRMode(v)}>{l}</button>))}
                    <div style={{marginTop:4}}>
                      {rMode==="single"&&<input type="date" className="inp" value={rSingle} onChange={e=>setRSingle(e.target.value)} style={{fontSize:12,padding:"6px 9px"}}/>}
                      {rMode==="range"&&<><input type="date" className="inp" value={rStart} onChange={e=>setRStart(e.target.value)} style={{fontSize:12,padding:"6px 9px",marginBottom:5}}/><input type="date" className="inp" value={rEnd} onChange={e=>setREnd(e.target.value)} style={{fontSize:12,padding:"6px 9px"}}/></>}
                    </div>
                  </div>
                </div>
                {/* Type */}
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:"#4B5E80",textTransform:"uppercase",letterSpacing:".07em",marginBottom:7}}>② Type</div>
                  <div style={{display:"flex",flexDirection:"column",gap:5}}>
                    {[["all","📊 Full Report"],["leads","🎯 Leads Only"],["attendance","🗓 Attendance Only"],["finance","💰 Finance Only"]].map(([v,l])=>(<button key={v} className={"rbtn "+(rType===v?"rbtnA":"rbtnI")} onClick={()=>setRType(v)}>{l}</button>))}
                  </div>
                </div>
                {/* Who */}
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:"#4B5E80",textTransform:"uppercase",letterSpacing:".07em",marginBottom:7}}>③ Who</div>
                  <div style={{display:"flex",gap:6,marginBottom:8}}>
                    {[["team","👥 Team"],["member","👤 Member"]].map(([v,l])=>(<button key={v} className={"rbtn "+(rTarget===v?"rbtnA":"rbtnI")} style={{flex:1}} onClick={()=>{setRTarget(v);if(v==="team")setRMember("");}}>{l}</button>))}
                  </div>
                  {rTarget==="member"&&<>
                    <input placeholder="Search name or ID..." className="inp" value={mSearch} onChange={e=>setMSearch(e.target.value)} style={{fontSize:11,padding:"6px 9px",marginBottom:6}}/>
                    <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:165,overflowY:"auto"}}>
                      {visibleMembers.filter(m=>{const q=mSearch.toLowerCase();return !q||m.name.toLowerCase().includes(q)||String(m.id).includes(q);}).map(m=>(
                        <div key={m.id} className={"chip "+(rMember===String(m.id)?"chipS":"")} onClick={()=>setRMember(String(m.id))}>
                          <div style={{width:20,height:20,borderRadius:4,background:m.color+"22",border:"2px solid "+m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,fontWeight:700,color:m.color,flexShrink:0}}>{m.avatar}</div>
                          <div style={{flex:1}}><div style={{fontSize:11,fontWeight:600}}>{m.name}</div><div style={{fontSize:9,color:"#4B5E80"}}>#{m.id}</div></div>
                          {m.status==="inactive"&&<span style={{fontSize:8,background:"#3B1A1A",color:"#FCA5A5",borderRadius:5,padding:"1px 5px"}}>Inactive</span>}
                          {rMember===String(m.id)&&<span style={{color:"var(--p)",fontSize:14}}>✓</span>}
                        </div>
                      ))}
                    </div>
                  </>}
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",paddingTop:11,borderTop:"1px solid #1E2A45"}}>
                <button className="btnPDF" onClick={exportPDF}><span>📄</span> Export PDF</button>
              </div>
            </div>

            <div ref={printRef} style={{display:"none"}} dangerouslySetInnerHTML={{__html:buildPrint()}}/>

            {/* Summary stats */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:14}}>
              {[
                {lbl:"Total Leads",   val:totalLeads,                       c:"#93C5FD"},
                {lbl:"Top Performer", val:topPerf?.member.name||"—",         c:"var(--a)",sub:(topPerf?.total||0)+" leads",sm:true},
                {lbl:"Period Days",   val:rDates.length,                     c:"#FCD34D"},
                {lbl:"Total Bonus",   val:rFinance.filter(f=>f.type==="bonus").reduce((s,f)=>s+Number(f.amount),0).toFixed(0), c:"#6EE7B7"},
                {lbl:"Total Dock",    val:rFinance.filter(f=>f.type==="dock").reduce((s,f)=>s+Number(f.amount),0).toFixed(0),  c:"#FCA5A5"},
              ].map((s,i)=>(
                <div key={i} className="sc" style={{padding:"12px 13px"}}>
                  <div style={{fontSize:9,color:"#4B5E80",textTransform:"uppercase",letterSpacing:".07em",marginBottom:4}}>{s.lbl}</div>
                  <div style={{fontSize:s.sm?13:22,fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,color:s.c}}>{s.val}</div>
                  {s.sub&&<div style={{fontSize:9,color:"#4B5E80",marginTop:2}}>{s.sub}</div>}
                </div>
              ))}
            </div>

            {/* Team tables */}
            {rTarget==="team"&&(
              <div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  {(rType==="all"||rType==="leads")&&<div className="card" style={{padding:16}}><div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:13,marginBottom:11}}>🎯 Lead Performance</div>{activeSumm.map(({member:m,total})=>(<div key={m.id} style={{marginBottom:9}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3,fontSize:12}}><span style={{fontWeight:600}}>{m.name}</span><span style={{color:"var(--p)",fontWeight:700}}>{total}</span></div><div style={{height:6,background:"#1E2A45",borderRadius:6,overflow:"hidden"}}><div className="bfill" style={{height:"100%",borderRadius:6,background:"linear-gradient(90deg,var(--p),var(--s))",width:(maxBar?total/maxBar*100:0)+"%"}}/></div></div>))}</div>}
                  {(rType==="all"||rType==="finance")&&<div className="card" style={{padding:16}}><div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:13,marginBottom:11}}>💰 Finance Summary</div>{activeSumm.map(({member:m,totalBonus,totalDock})=>(<div key={m.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:9}}><div style={{width:20,height:20,borderRadius:5,background:m.color+"22",border:"2px solid "+m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:m.color,flexShrink:0}}>{m.avatar}</div><span style={{fontSize:12,fontWeight:600,flex:1}}>{m.name}</span><span style={{fontSize:12,fontWeight:700,color:"#6EE7B7"}}>+{totalBonus.toFixed(0)}</span><span style={{fontSize:12,fontWeight:700,color:"#FCA5A5"}}>-{totalDock.toFixed(0)}</span></div>))}</div>}
                </div>

                <div className="card" style={{overflow:"hidden",marginBottom:0}}>
                  <div style={{padding:"12px 14px",borderBottom:"1px solid #1E2A45",fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:13}}>👥 Full Team Report</div>
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
                      <thead><tr style={{background:"#0D1424"}}>
                        <th style={{padding:"7px 11px",textAlign:"left",fontSize:10,fontWeight:700,color:"#4B5E80",textTransform:"uppercase"}}>Member</th>
                        {(rType==="all"||rType==="leads")&&<><th style={{padding:"7px 8px",textAlign:"center",fontSize:10,fontWeight:700,color:"#4B5E80",textTransform:"uppercase"}}>Leads</th><th style={{padding:"7px 8px",textAlign:"center",fontSize:10,fontWeight:700,color:"#4B5E80",textTransform:"uppercase"}}>Share</th></>}
                        {(rType==="all"||rType==="attendance")&&<><th style={{padding:"7px 4px",textAlign:"center",fontSize:9,fontWeight:700,color:"#6EE7B7"}}>P</th><th style={{padding:"7px 4px",textAlign:"center",fontSize:9,fontWeight:700,color:"#FCA5A5"}}>A</th><th style={{padding:"7px 4px",textAlign:"center",fontSize:9,fontWeight:700,color:"#FCD34D"}}>HD</th><th style={{padding:"7px 4px",textAlign:"center",fontSize:9,fontWeight:700,color:"#C4B5FD"}}>L</th><th style={{padding:"7px 4px",textAlign:"center",fontSize:9,fontWeight:700,color:"#FB923C"}}>LT</th><th style={{padding:"7px 8px",textAlign:"center",fontSize:10,fontWeight:700,color:"#4B5E80",textTransform:"uppercase"}}>Att%</th></>}
                        {(rType==="all"||rType==="finance")&&<><th style={{padding:"7px 8px",textAlign:"center",fontSize:9,fontWeight:700,color:"#6EE7B7"}}>Bonus</th><th style={{padding:"7px 8px",textAlign:"center",fontSize:9,fontWeight:700,color:"#FCA5A5"}}>Dock</th></>}
                      </tr></thead>
                      <tbody>
                        {activeSumm.map(({member:m,total,att,rate,totalBonus,totalDock})=>(
                          <tr key={m.id} className="row" style={{borderTop:"1px solid #1A2235"}}>
                            <td style={{padding:"8px 11px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:19,height:19,borderRadius:4,background:m.color+"22",border:"2px solid "+m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,fontWeight:700,color:m.color}}>{m.avatar}</div><div><div style={{fontSize:11,fontWeight:600}}>{m.name}</div><div style={{fontSize:9,color:"#4B5E80"}}>#{m.id}</div></div></div></td>
                            {(rType==="all"||rType==="leads")&&<><td style={{padding:"8px 8px",textAlign:"center",fontWeight:700,color:"var(--p)",fontSize:13}}>{total}</td><td style={{padding:"8px 8px",textAlign:"center",color:"#64748B",fontSize:11}}>{totalLeads?Math.round(total/totalLeads*100):0}%</td></>}
                            {(rType==="all"||rType==="attendance")&&<><td style={{padding:"8px 4px",textAlign:"center",fontWeight:700,color:"#6EE7B7",fontSize:11}}>{att.P}</td><td style={{padding:"8px 4px",textAlign:"center",fontWeight:700,color:"#FCA5A5",fontSize:11}}>{att.A}</td><td style={{padding:"8px 4px",textAlign:"center",fontWeight:700,color:"#FCD34D",fontSize:11}}>{att.HD}</td><td style={{padding:"8px 4px",textAlign:"center",fontWeight:700,color:"#C4B5FD",fontSize:11}}>{att.L}</td><td style={{padding:"8px 4px",textAlign:"center",fontWeight:700,color:"#FB923C",fontSize:11}}>{att.LT}</td><td style={{padding:"8px 8px",textAlign:"center"}}><span style={{background:rate>=80?"#064E3B":rate>=50?"#3B2E0A":"#3B1A1A",color:rate>=80?"#6EE7B7":rate>=50?"#FCD34D":"#FCA5A5",borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:700}}>{rate}%</span></td></>}
                            {(rType==="all"||rType==="finance")&&<><td style={{padding:"8px 8px",textAlign:"center",fontWeight:700,color:"#6EE7B7",fontSize:11}}>+{totalBonus.toFixed(1)}</td><td style={{padding:"8px 8px",textAlign:"center",fontWeight:700,color:"#FCA5A5",fontSize:11}}>-{totalDock.toFixed(1)}</td></>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {inactiveM.length>0&&<div className="inact-sec"><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}><span>🔴</span><span style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:13,color:"#FCA5A5"}}>Inactive Members</span><span style={{fontSize:9,color:"#4B5E80",background:"#1E2A45",borderRadius:7,padding:"1px 7px"}}>{inactiveM.length}</span></div>
                  <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#1A0A0A"}}><th style={{padding:"7px 11px",textAlign:"left",fontSize:10,fontWeight:700,color:"#4B5E80",textTransform:"uppercase"}}>Member</th>{(rType==="all"||rType==="leads")&&<><th style={{padding:"7px 8px",textAlign:"center",fontSize:10,fontWeight:700,color:"#4B5E80",textTransform:"uppercase"}}>Leads</th></>}{(rType==="all"||rType==="finance")&&<><th style={{padding:"7px 8px",textAlign:"center",fontSize:9,fontWeight:700,color:"#6EE7B7"}}>Bonus</th><th style={{padding:"7px 8px",textAlign:"center",fontSize:9,fontWeight:700,color:"#FCA5A5"}}>Dock</th></>}</tr></thead>
                  <tbody>{inactiveSumm.map(({member:m,total,totalBonus,totalDock})=>(<tr key={m.id} className="row" style={{borderTop:"1px solid #3B1A1A"}}><td style={{padding:"8px 11px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:19,height:19,borderRadius:4,background:m.color+"22",border:"2px solid "+m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,fontWeight:700,color:m.color}}>{m.avatar}</div><div><div style={{fontSize:11,fontWeight:600,color:"#94A3B8"}}>{m.name}</div></div><span style={{fontSize:8,background:"#3B1A1A",color:"#FCA5A5",borderRadius:5,padding:"1px 5px",fontWeight:700}}>Inactive</span></div></td>{(rType==="all"||rType==="leads")&&<td style={{padding:"8px 8px",textAlign:"center",fontWeight:700,color:"var(--p)",fontSize:13}}>{total}</td>}{(rType==="all"||rType==="finance")&&<><td style={{padding:"8px 8px",textAlign:"center",fontWeight:700,color:"#6EE7B7",fontSize:11}}>+{totalBonus.toFixed(1)}</td><td style={{padding:"8px 8px",textAlign:"center",fontWeight:700,color:"#FCA5A5",fontSize:11}}>-{totalDock.toFixed(1)}</td></>}</tr>))}</tbody></table>
                </div>}
              </div>
            )}

            {/* Individual report */}
            {rTarget==="member"&&rMemberObj&&(()=>{
              const m=rMemberObj;
              const mLeadsR=rLeads.filter(l=>l.member_id===m.id);
              const totL=mLeadsR.reduce((s,l)=>s+l.count,0);
              const s=attStats(m.id,rDates);
              const rate=rDates.length?Math.round(((s.P+s.HD*.5+s.LT*.75)/rDates.length)*100):0;
              const mBonus=rFinance.filter(f=>f.member_id===m.id&&f.type==="bonus");
              const mDocks=rFinance.filter(f=>f.member_id===m.id&&f.type==="dock");
              const totBonus=mBonus.reduce((a,f)=>a+Number(f.amount),0);
              const totDock=mDocks.reduce((a,f)=>a+Number(f.amount),0);
              return(<div>
                <div className="card" style={{padding:18,marginBottom:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,flexWrap:"wrap"}}>
                    <div style={{width:46,height:46,borderRadius:12,background:m.color+"22",border:"3px solid "+m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:m.color,flexShrink:0}}>{m.avatar}</div>
                    <div style={{flex:1}}><div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:17}}>{m.name}</div><div style={{color:"#94A3B8",fontSize:12,marginTop:2}}>{m.role} · #{m.id}</div><span className={m.status==="active"?"bga":"bgi"} style={{marginTop:5,display:"inline-block"}}>{m.status}</span></div>
                    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                      {(rType==="all"||rType==="leads")&&<div style={{textAlign:"center"}}><div style={{fontSize:24,fontWeight:700,color:"var(--p)"}}>{totL}</div><div style={{fontSize:10,color:"#4B5E80"}}>Leads</div></div>}
                      {(rType==="all"||rType==="attendance")&&<div style={{textAlign:"center"}}><div style={{fontSize:24,fontWeight:700,color:rate>=80?"#6EE7B7":rate>=50?"#FCD34D":"#FCA5A5"}}>{rate}%</div><div style={{fontSize:10,color:"#4B5E80"}}>Att. Rate</div></div>}
                      {(rType==="all"||rType==="finance")&&<><div style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:700,color:"#6EE7B7"}}>+{totBonus.toFixed(1)}</div><div style={{fontSize:10,color:"#4B5E80"}}>Bonus</div></div><div style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:700,color:"#FCA5A5"}}>-{totDock.toFixed(1)}</div><div style={{fontSize:10,color:"#4B5E80"}}>Dock</div></div></>}
                    </div>
                  </div>
                </div>

                {/* Daily breakdown */}
                <div className="card" style={{overflow:"hidden",marginBottom:12}}>
                  <div style={{padding:"12px 14px",borderBottom:"1px solid #1E2A45",fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:13}}>📅 Daily Breakdown</div>
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",minWidth:400}}>
                      <thead><tr style={{background:"#0D1424"}}>
                        <th style={{padding:"7px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:"#4B5E80",textTransform:"uppercase"}}>Date</th>
                        <th style={{padding:"7px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:"#4B5E80",textTransform:"uppercase"}}>Day</th>
                        {(rType==="all"||rType==="leads")&&<th style={{padding:"7px 14px",textAlign:"center",fontSize:10,fontWeight:700,color:"#4B5E80",textTransform:"uppercase"}}>Leads</th>}
                        {(rType==="all"||rType==="attendance")&&<th style={{padding:"7px 14px",textAlign:"center",fontSize:10,fontWeight:700,color:"#4B5E80",textTransform:"uppercase"}}>Attendance</th>}
                      </tr></thead>
                      <tbody>
                        {rDates.map(d=>{
                          const v=getAtt(m.id,d),meta=v?ATT[v]:null,lc=mLeadsR.filter(l=>l.date===d).reduce((s,l)=>s+l.count,0);
                          return(<tr key={d} className="row" style={{borderTop:"1px solid #1A2235"}}>
                            <td style={{padding:"8px 14px",color:"#94A3B8",fontSize:11}}>{fmtDate(d)}</td>
                            <td style={{padding:"8px 14px",color:"#64748B",fontSize:11}}>{getDayName(d,"long")}</td>
                            {(rType==="all"||rType==="leads")&&<td style={{padding:"8px 14px",textAlign:"center",fontWeight:700,color:lc?"var(--p)":"#2D3E5C",fontSize:lc?14:11}}>{lc||"—"}</td>}
                            {(rType==="all"||rType==="attendance")&&<td style={{padding:"8px 14px",textAlign:"center"}}>{meta?<span style={{background:meta.bg,color:meta.color,borderRadius:6,padding:"2px 9px",fontSize:10,fontWeight:800}}>{meta.label}</span>:<span style={{color:"#2D3E5C",fontSize:10}}>Not marked</span>}</td>}
                          </tr>);
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Finance detail */}
                {(rType==="all"||rType==="finance")&&(mBonus.length>0||mDocks.length>0)&&(
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    {mBonus.length>0&&<div className="card" style={{overflow:"hidden"}}><div style={{padding:"11px 14px",borderBottom:"1px solid #1E2A45",fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:13,color:"#6EE7B7"}}>🎁 Bonus Records</div><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#0D1424"}}>{["Date","Amount","Reason"].map(h=>(<th key={h} style={{padding:"7px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:"#4B5E80",textTransform:"uppercase"}}>{h}</th>))}</tr></thead><tbody>{mBonus.map(f=>(<tr key={f.id} className="row" style={{borderTop:"1px solid #1A2235"}}><td style={{padding:"8px 12px",color:"#94A3B8",fontSize:11}}>{fmtDate(f.date)}</td><td style={{padding:"8px 12px",fontWeight:700,color:"#6EE7B7",fontSize:13}}>+{Number(f.amount).toFixed(2)}</td><td style={{padding:"8px 12px",color:"#94A3B8",fontSize:11}}>{f.reason}</td></tr>))}</tbody></table></div>}
                    {mDocks.length>0&&<div className="card" style={{overflow:"hidden"}}><div style={{padding:"11px 14px",borderBottom:"1px solid #1E2A45",fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:13,color:"#FCA5A5"}}>📉 Dock Records</div><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#0D1424"}}>{["Date","Amount","Reason"].map(h=>(<th key={h} style={{padding:"7px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:"#4B5E80",textTransform:"uppercase"}}>{h}</th>))}</tr></thead><tbody>{mDocks.map(f=>(<tr key={f.id} className="row" style={{borderTop:"1px solid #1A2235"}}><td style={{padding:"8px 12px",color:"#94A3B8",fontSize:11}}>{fmtDate(f.date)}</td><td style={{padding:"8px 12px",fontWeight:700,color:"#FCA5A5",fontSize:13}}>-{Number(f.amount).toFixed(2)}</td><td style={{padding:"8px 12px",color:"#94A3B8",fontSize:11}}>{f.reason}</td></tr>))}</tbody></table></div>}
                  </div>
                )}
              </div>);
            })()}
          </div>
        )}

        {/* ══ BIN ══ */}
        {tab==="bin" && (
          <div className="fade-up">
            <div className="card" style={{padding:"13px 16px",marginBottom:12,display:"flex",alignItems:"center",gap:9}}>
              <span style={{fontSize:18}}>🗑</span>
              <div><div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:13}}>Deleted Members</div><div style={{fontSize:11,color:"#4B5E80",marginTop:1}}>Restore or permanently delete. Hidden from all other sections.</div></div>
            </div>
            {binMembers.length===0?(
              <div className="card" style={{padding:36,textAlign:"center"}}>
                <div style={{fontSize:36,marginBottom:10}}>🗑</div>
                <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:15,color:"#4B5E80"}}>Bin is empty</div>
                <div style={{fontSize:12,color:"#2D3E5C",marginTop:5}}>Deleted members will appear here</div>
              </div>
            ):(
              <div className="card" style={{overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr style={{background:"#0D1424"}}>{["Member","Role","All-Time Leads","Actions"].map(h=>(<th key={h} style={{padding:"9px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:"#4B5E80",textTransform:"uppercase",letterSpacing:".07em"}}>{h}</th>))}</tr></thead>
                  <tbody>
                    {binMembers.map(m=>{
                      const tot=leads.filter(l=>l.member_id===m.id).reduce((s,l)=>s+l.count,0);
                      return(<tr key={m.id} className="row" style={{borderTop:"1px solid #1A2235",opacity:.8}}>
                        <td style={{padding:"11px 14px"}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:28,height:28,borderRadius:7,background:m.color+"22",border:"2px solid "+m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:m.color}}>{m.avatar}</div><div><div style={{fontWeight:600,fontSize:13,color:"#94A3B8"}}>{m.name}</div><div style={{fontSize:9,color:"#4B5E80"}}>#{m.id}</div></div><span className="bgd">Deleted</span></div></td>
                        <td style={{padding:"11px 14px",color:"#64748B",fontSize:12}}>{m.role}</td>
                        <td style={{padding:"11px 14px",fontWeight:700,color:m.color,fontSize:15}}>{tot}</td>
                        <td style={{padding:"11px 14px"}}><div style={{display:"flex",gap:5}}><button className="btnGR" style={{fontSize:11,padding:"4px 9px"}} onClick={()=>restoreMember(m.id)}>↩ Restore</button><button className="btnR" style={{fontSize:11,padding:"4px 9px"}} onClick={()=>hardDelete(m.id)}>🗑 Forever</button></div></td>
                      </tr>);
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div style={{borderTop:"1px solid #0D1424",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:"#0A0F1E"}}>
        <div style={{display:"flex",alignItems:"center",gap:2}}>
          <span style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:13,background:"linear-gradient(135deg,var(--p),var(--s))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"1px"}}>U-TECH</span>
          <span style={{fontSize:8,color:"var(--p)",verticalAlign:"super",fontWeight:700}}>®</span>
        </div>
        <span style={{color:"#1E2A45",fontSize:10}}>|</span>
        <span style={{fontSize:10,color:"#2D3E5C"}}>Designed & Developed by U-TECH®</span>
      </div>

      {/* ── MODALS ── */}

      {/* ADD MEMBER */}
      {showAddM&&(<div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowAddM(false)}><div className="modal">
        <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:16,marginBottom:18}}>👥 Add Team Member</div>
        <div style={{marginBottom:12}}><label style={{fontSize:10,color:"#64748B",fontWeight:700,marginBottom:5,display:"block",textTransform:"uppercase",letterSpacing:".07em"}}>Full Name *</label><input className="inp" placeholder="e.g. John Smith" value={mName} onChange={e=>setMName(e.target.value)}/></div>
        <div style={{marginBottom:12}}><label style={{fontSize:10,color:"#64748B",fontWeight:700,marginBottom:5,display:"block",textTransform:"uppercase",letterSpacing:".07em"}}>Role</label><input className="inp" placeholder="e.g. Sales Lead" value={mRole} onChange={e=>setMRole(e.target.value)}/></div>
        <div style={{marginBottom:20}}><label style={{fontSize:10,color:"#64748B",fontWeight:700,marginBottom:5,display:"block",textTransform:"uppercase",letterSpacing:".07em"}}>Status</label><select className="inp" style={{cursor:"pointer"}} value={mStatus} onChange={e=>setMStatus(e.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
        <div style={{display:"flex",gap:8}}><button className="btnG" onClick={()=>setShowAddM(false)} style={{flex:1}}>Cancel</button><button className="btnP" onClick={addMember} style={{flex:2}}>{saving?<><Spinner size={13} color="#fff"/> Adding...</>:"Add Member"}</button></div>
      </div></div>)}

      {/* ADD LEAD */}
      {showAddL&&(<div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowAddL(false)}><div className="modal">
        <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:16,marginBottom:18}}>🎯 Add Lead Entry</div>
        <div style={{marginBottom:12}}><label style={{fontSize:10,color:"#64748B",fontWeight:700,marginBottom:5,display:"block",textTransform:"uppercase",letterSpacing:".07em"}}>Team Member *</label><select className="inp" style={{cursor:"pointer"}} value={lMember} onChange={e=>setLMember(e.target.value)}><option value="">Select member...</option>{activeM.map(m=>(<option key={m.id} value={m.id}>{m.name}</option>))}</select></div>
        <div style={{marginBottom:12}}><label style={{fontSize:10,color:"#64748B",fontWeight:700,marginBottom:5,display:"block",textTransform:"uppercase",letterSpacing:".07em"}}>Number of Leads *</label><input className="inp" type="number" min="1" placeholder="e.g. 15" value={lCount} onChange={e=>setLCount(e.target.value)}/></div>
        <div style={{marginBottom:20}}><label style={{fontSize:10,color:"#64748B",fontWeight:700,marginBottom:5,display:"block",textTransform:"uppercase",letterSpacing:".07em"}}>Date *</label><input className="inp" type="date" value={lDate} onChange={e=>setLDate(e.target.value)}/></div>
        <div style={{display:"flex",gap:8}}><button className="btnG" onClick={()=>setShowAddL(false)} style={{flex:1}}>Cancel</button><button className="btnP" onClick={addLead} style={{flex:2}}>{saving?<><Spinner size={13} color="#fff"/> Saving...</>:"Save Entry"}</button></div>
      </div></div>)}

      {/* EDIT LEAD */}
      {editLead&&(<div className="overlay" onClick={e=>e.target===e.currentTarget&&setEditLead(null)}><div className="modal">
        <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:16,marginBottom:18}}>✏️ Edit Lead</div>
        <div style={{marginBottom:12}}><label style={{fontSize:10,color:"#64748B",fontWeight:700,marginBottom:5,display:"block",textTransform:"uppercase",letterSpacing:".07em"}}>Team Member</label><select className="inp" style={{cursor:"pointer"}} value={editLead.member_id} onChange={e=>setEditLead({...editLead,member_id:e.target.value})}>{visibleMembers.map(m=>(<option key={m.id} value={m.id}>{m.name}</option>))}</select></div>
        <div style={{marginBottom:12}}><label style={{fontSize:10,color:"#64748B",fontWeight:700,marginBottom:5,display:"block",textTransform:"uppercase",letterSpacing:".07em"}}>Number of Leads</label><input className="inp" type="number" min="1" value={editLead.count} onChange={e=>setEditLead({...editLead,count:e.target.value})}/></div>
        <div style={{marginBottom:20}}><label style={{fontSize:10,color:"#64748B",fontWeight:700,marginBottom:5,display:"block",textTransform:"uppercase",letterSpacing:".07em"}}>Date</label><input className="inp" type="date" value={editLead.date} onChange={e=>setEditLead({...editLead,date:e.target.value})}/></div>
        <div style={{display:"flex",gap:8}}><button className="btnG" onClick={()=>setEditLead(null)} style={{flex:1}}>Cancel</button><button className="btnP" onClick={updateLead} style={{flex:2}}>{saving?<><Spinner size={13} color="#fff"/> Saving...</>:"Save Changes"}</button></div>
      </div></div>)}

      {/* ADD FINANCE */}
      {showAddFin&&(<div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowAddFin(null)}><div className="modal">
        <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:16,marginBottom:18,color:showAddFin==="bonus"?"#6EE7B7":"#FCA5A5"}}>{showAddFin==="bonus"?"🎁 Add Bonus":"📉 Add Dock"}</div>
        <div style={{marginBottom:12}}><label style={{fontSize:10,color:"#64748B",fontWeight:700,marginBottom:5,display:"block",textTransform:"uppercase",letterSpacing:".07em"}}>Team Member *</label><select className="inp" style={{cursor:"pointer"}} value={finMember} onChange={e=>setFinMember(e.target.value)}><option value="">Select member...</option>{visibleMembers.map(m=>(<option key={m.id} value={m.id}>{m.name}</option>))}</select></div>
        <div style={{marginBottom:12}}><label style={{fontSize:10,color:"#64748B",fontWeight:700,marginBottom:5,display:"block",textTransform:"uppercase",letterSpacing:".07em"}}>Amount *</label><input className="inp" type="number" min="0" step="0.01" placeholder="e.g. 500.00" value={finAmount} onChange={e=>setFinAmount(e.target.value)}/></div>
        <div style={{marginBottom:12}}><label style={{fontSize:10,color:"#64748B",fontWeight:700,marginBottom:5,display:"block",textTransform:"uppercase",letterSpacing:".07em"}}>Reason *</label><input className="inp" placeholder={showAddFin==="bonus"?"e.g. Top performer of the month":"e.g. Late arrival deduction"} value={finReason} onChange={e=>setFinReason(e.target.value)}/></div>
        <div style={{marginBottom:20}}><label style={{fontSize:10,color:"#64748B",fontWeight:700,marginBottom:5,display:"block",textTransform:"uppercase",letterSpacing:".07em"}}>Date *</label><input className="inp" type="date" value={finDate} onChange={e=>setFinDate(e.target.value)}/></div>
        <div style={{display:"flex",gap:8}}><button className="btnG" onClick={()=>setShowAddFin(null)} style={{flex:1}}>Cancel</button><button className="btnP" onClick={addFinance} style={{flex:2,background:showAddFin==="bonus"?"linear-gradient(135deg,#10B981,#0EA5E9)":"linear-gradient(135deg,#EF4444,#F97316)"}}>{saving?<><Spinner size={13} color="#fff"/> Saving...</>:"Save Record"}</button></div>
      </div></div>)}

      {showCreds   && <ChangeCredsModal creds={creds} onSave={c=>setCreds(c)} onClose={()=>setShowCreds(false)}/>}
      {showSettings&& <AppSettingsModal appCfg={appCfg} theme={theme} onSave={cfg=>{setAppCfg(cfg);setTheme(THEMES[cfg.themeKey]);}} onClose={()=>setShowSettings(false)}/>}

      {/* EDIT FINANCE */}
      {editFinance&&(<div className="overlay" onClick={e=>e.target===e.currentTarget&&setEditFinance(null)}><div className="modal">
        <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:16,marginBottom:18,color:editFinance.type==="bonus"?"#6EE7B7":"#FCA5A5"}}>{editFinance.type==="bonus"?"✏️ Edit Bonus":"✏️ Edit Dock"}</div>
        <div style={{marginBottom:12}}><label style={{fontSize:10,color:"#64748B",fontWeight:700,marginBottom:5,display:"block",textTransform:"uppercase",letterSpacing:".07em"}}>Team Member</label><select className="inp" style={{cursor:"pointer"}} value={editFinance.member_id} onChange={e=>setEditFinance({...editFinance,member_id:e.target.value})}>{visibleMembers.map(m=>(<option key={m.id} value={m.id}>{m.name}</option>))}</select></div>
        <div style={{marginBottom:12}}><label style={{fontSize:10,color:"#64748B",fontWeight:700,marginBottom:5,display:"block",textTransform:"uppercase",letterSpacing:".07em"}}>Amount</label><input className="inp" type="number" min="0" step="0.01" value={editFinance.amount} onChange={e=>setEditFinance({...editFinance,amount:e.target.value})}/></div>
        <div style={{marginBottom:12}}><label style={{fontSize:10,color:"#64748B",fontWeight:700,marginBottom:5,display:"block",textTransform:"uppercase",letterSpacing:".07em"}}>Reason</label><input className="inp" value={editFinance.reason} onChange={e=>setEditFinance({...editFinance,reason:e.target.value})}/></div>
        <div style={{marginBottom:20}}><label style={{fontSize:10,color:"#64748B",fontWeight:700,marginBottom:5,display:"block",textTransform:"uppercase",letterSpacing:".07em"}}>Date</label><input className="inp" type="date" value={editFinance.date} onChange={e=>setEditFinance({...editFinance,date:e.target.value})}/></div>
        <div style={{display:"flex",gap:8}}><button className="btnG" onClick={()=>setEditFinance(null)} style={{flex:1}}>Cancel</button><button className="btnP" onClick={updateFinance} style={{flex:2,background:editFinance.type==="bonus"?"linear-gradient(135deg,#10B981,#0EA5E9)":"linear-gradient(135deg,#EF4444,#F97316)"}}>{saving?<><Spinner size={13} color="#fff"/> Saving...</>:"Save Changes"}</button></div>
      </div></div>)}

      {/* DELETE CONFIRM */}
      {confirmDel&&(<div className="overlay" onClick={e=>e.target===e.currentTarget&&setConfirmDel(null)}><div className="modal" style={{maxWidth:340}}>
        <div style={{fontSize:32,textAlign:"center",marginBottom:10}}>⚠️</div>
        <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:16,textAlign:"center",marginBottom:8}}>Delete Member?</div>
        <div style={{fontSize:12,color:"#94A3B8",textAlign:"center",marginBottom:20,lineHeight:1.6}}>This member will be moved to the Bin. You can restore them anytime from the Bin tab.</div>
        <div style={{display:"flex",gap:8}}><button className="btnG" onClick={()=>setConfirmDel(null)} style={{flex:1}}>Cancel</button><button className="btnR" onClick={()=>softDelete(confirmDel)} style={{flex:1,fontWeight:700}}>Move to Bin</button></div>
      </div></div>)}
    </div>
  );
}

// ── ROOT ──
export default function App() {
  const [creds,    setCreds]    = useState(null);
  const [appCfg,   setAppCfg]  = useState(INIT_APP);
  const [theme,    setTheme]    = useState(THEMES.cyan);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    db.get("credentials").then(rows => {
      setCreds(rows&&rows.length>0 ? rows[0] : {id:1,username:"ISA",password:"ISA@1234"});
      setLoading(false);
    }).catch(() => { setCreds({id:1,username:"ISA",password:"ISA@1234"}); setLoading(false); });
  }, []);

  if(loading) return <LoadingScreen theme={theme}/>;
  if(!loggedIn) return <Login creds={creds} appCfg={appCfg} theme={theme} onLogin={()=>setLoggedIn(true)}/>;
  return <Dashboard creds={creds} setCreds={setCreds} appCfg={appCfg} setAppCfg={setAppCfg} theme={theme} setTheme={setTheme} onLogout={()=>setLoggedIn(false)}/>;
}