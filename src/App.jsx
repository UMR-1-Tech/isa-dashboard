import { useState, useMemo, useRef } from "react";

const INIT_CREDS = { username: "ISA", password: "ISA@1234" };
const INIT_APP = { name: "ISA Performance Dashboard", logo: "⚡" };

const SEED_MEMBERS = [
  { id:1, name:"Sarah Mitchell", role:"Sales Lead",  status:"active",   avatar:"SM", color:"#6EE7B7", deleted:false },
  { id:2, name:"James Rivera",   role:"Lead Hunter", status:"active",   avatar:"JR", color:"#93C5FD", deleted:false },
  { id:3, name:"Priya Nair",     role:"Closer",      status:"inactive", avatar:"PN", color:"#FCA5A5", deleted:false },
  { id:4, name:"Ali Hassan",     role:"Outreach",    status:"active",   avatar:"AH", color:"#FCD34D", deleted:false },
];

const SEED_LEADS = [
  { id:1, memberId:1, count:12, date:"2026-04-01" },
  { id:2, memberId:2, count:8,  date:"2026-04-01" },
  { id:3, memberId:4, count:6,  date:"2026-04-01" },
  { id:4, memberId:1, count:15, date:"2026-04-02" },
  { id:5, memberId:3, count:5,  date:"2026-04-02" },
  { id:6, memberId:2, count:20, date:"2026-04-03" },
  { id:7, memberId:1, count:9,  date:"2026-04-03" },
  { id:8, memberId:4, count:11, date:"2026-04-03" },
];

const SEED_ATT = {
  "1_2026-04-01":"P", "2_2026-04-01":"P",  "3_2026-04-01":"HD","4_2026-04-01":"P",
  "1_2026-04-02":"P", "2_2026-04-02":"A",  "3_2026-04-02":"P", "4_2026-04-02":"LT",
  "1_2026-04-03":"P", "2_2026-04-03":"P",  "3_2026-04-03":"L", "4_2026-04-03":"P",
};

const COLORS = ["#6EE7B7","#93C5FD","#FCA5A5","#FCD34D","#C4B5FD","#6EE7F7","#F9A8D4","#A5B4FC"];

const ATT = {
  P:  { label:"Present",  bg:"#064E3B", color:"#6EE7B7" },
  A:  { label:"Absent",   bg:"#3B1A1A", color:"#FCA5A5" },
  HD: { label:"Half Day", bg:"#3B2E0A", color:"#FCD34D" },
  L:  { label:"Leave",    bg:"#1E1A3B", color:"#C4B5FD" },
  LT: { label:"Late",     bg:"#2D1A00", color:"#FB923C" },
};

const CSS = `
  .tbtn{border:none;border-radius:10px;padding:9px 18px;font-weight:600;font-size:13px;cursor:pointer;transition:all .2s;white-space:nowrap}
  .tbtn:hover{opacity:.85}
  .tbtnA{background:#0EA5E9;color:#fff}
  .tbtnI{background:#111827;color:#64748B}
  .rbtn{border:none;border-radius:8px;padding:7px 14px;font-weight:600;font-size:12px;cursor:pointer;transition:all .2s;text-align:left}
  .rbtnA{background:#0EA5E9;color:#fff}
  .rbtnI{background:#1E2A45;color:#94A3B8}
  .rbtnI:hover{background:#253450;color:#E2E8F0}
  .btnP{background:linear-gradient(135deg,#0EA5E9,#6366F1);border:none;color:#fff;border-radius:10px;padding:10px 20px;font-weight:600;font-size:14px;cursor:pointer}
  .btnP:hover{opacity:.85}
  .btnG{background:#1E2A45;border:1px solid #2D3E5C;color:#94A3B8;border-radius:8px;padding:8px 14px;font-size:13px;cursor:pointer}
  .btnG:hover{background:#253450;color:#E2E8F0}
  .btnR{background:#3B1A1A;border:1px solid #FCA5A544;color:#FCA5A5;border-radius:8px;padding:8px 14px;font-size:13px;cursor:pointer}
  .btnR:hover{background:#4A1A1A}
  .btnGR{background:#064E3B;border:1px solid #6EE7B744;color:#6EE7B7;border-radius:8px;padding:8px 14px;font-size:13px;cursor:pointer}
  .btnGR:hover{background:#075E47}
  .btnPDF{background:linear-gradient(135deg,#EF4444,#DC2626);border:none;color:#fff;border-radius:10px;padding:10px 20px;font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px}
  .btnLO{background:#1A0F0F;border:1px solid #FCA5A544;color:#FCA5A5;border-radius:8px;padding:8px 14px;font-size:13px;cursor:pointer}
  .btnLO:hover{background:#3B1A1A}
  .upill{display:flex;align-items:center;gap:7px;background:#1E2A45;border:1px solid #2D3E5C;border-radius:10px;padding:6px 14px;font-size:13px;color:#94A3B8;cursor:pointer}
  .upill:hover{background:#253450;color:#E2E8F0}
  .row:hover{background:#141D2E!important}
  .bfill{transition:width .6s cubic-bezier(.4,0,.2,1)}
  .apill{border:none;border-radius:7px;font-size:10px;font-weight:800;cursor:pointer;transition:all .15s;padding:3px 6px;min-width:32px}
  .apill:hover{filter:brightness(1.2);transform:scale(1.08)}
  .mabtn{border:none;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;padding:5px 10px}
  .mabtn:hover{filter:brightness(1.2)}
  .chip{display:flex;align-items:center;gap:8px;background:#0D1424;border:1px solid #1E2A45;border-radius:10px;padding:8px 12px;cursor:pointer}
  .chip:hover{border-color:#0EA5E9;background:#0EA5E910}
  .chipS{border-color:#0EA5E9!important;background:#0EA5E91A!important}
  .bga{background:#064E3B;color:#6EE7B7;border-radius:20px;padding:3px 11px;font-size:12px;font-weight:600}
  .bgi{background:#3B1A1A;color:#FCA5A5;border-radius:20px;padding:3px 11px;font-size:12px;font-weight:600}
  .bgd{background:#1A1A3B;color:#A5B4FC;border-radius:20px;padding:3px 11px;font-size:12px;font-weight:600}
  .overlay{position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:500;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)}
  .modal{background:#111827;border:1px solid #1E2A45;border-radius:20px;padding:28px;width:420px;max-width:100%}
  .inact-sec{background:#1A0F0F;border:1px solid #FCA5A544;border-radius:14px;padding:20px;margin-top:20px}
  ::-webkit-scrollbar{width:5px}
  ::-webkit-scrollbar-track{background:#0A0F1E}
  ::-webkit-scrollbar-thumb{background:#1E2A45;border-radius:3px}
`;

const today     = () => new Date().toISOString().split("T")[0];
const fmtDate   = d => { if(!d) return ""; const [y,m,dy]=d.split("-"); return dy+"/"+m+"/"+y; };
const mRange    = () => {
  const n=new Date(), y=n.getFullYear(), m=String(n.getMonth()+1).padStart(2,"0");
  return { start:y+"-"+m+"-01", end:y+"-"+m+"-"+String(new Date(y,n.getMonth()+1,0).getDate()).padStart(2,"0") };
};
const daysInMonth = (y,m) =>
  Array.from({length:new Date(y,m,0).getDate()},(_,i)=>y+"-"+String(m).padStart(2,"0")+"-"+String(i+1).padStart(2,"0"));
const mLabel    = (y,m) => new Date(y,m-1,1).toLocaleString("default",{month:"long",year:"numeric"});
const rangeDays = (s,e) => {
  const days=[]; let d=new Date(s), end=new Date(e);
  while(d<=end){ days.push(d.toISOString().split("T")[0]); d.setDate(d.getDate()+1); }
  return days;
};
const nextId = arr => arr.length ? Math.max(...arr.map(x=>x.id))+1 : 1;

function Login({ creds, appCfg, onLogin }) {
  const [u,setU]=useState(""), [p,setP]=useState(""), [show,setShow]=useState(false);
  const [err,setErr]=useState(""), [shake,setShake]=useState(false);
  const attempt = () => {
    if(u.trim()===creds.username && p===creds.password){ onLogin(); }
    else { setErr("Incorrect username or password."); setShake(true); setTimeout(()=>setShake(false),600); }
  };
  const loginStyle = {
    card: { background:"#111827", border:"1px solid #1E2A45", borderRadius:20, padding:28,
            animation: shake ? "shake .4s ease" : "none" },
    input: { width:"100%", background:"#0D1424", border:"1.5px solid #1E2A45", borderRadius:10,
             padding:"11px 14px", color:"#E2E8F0", fontSize:15, outline:"none", fontFamily:"inherit" },
    label: { fontSize:11, color:"#64748B", fontWeight:700, marginBottom:7, display:"block",
             textTransform:"uppercase", letterSpacing:".08em" },
  };
  return (
    <div style={{minHeight:"100vh",background:"#0A0F1E",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:16,fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      <style>{CSS}</style>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-10px)}75%{transform:translateX(10px)}}
      `}</style>
      <div style={{width:"100%",maxWidth:400,animation:"fadeUp .5s ease"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:64,height:64,borderRadius:18,background:"linear-gradient(135deg,#0EA5E9,#6366F1)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",fontSize:28}}>{appCfg.logo}</div>
          <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:22,color:"#E2E8F0",lineHeight:1.3}}>{appCfg.name}</div>
          <div style={{fontSize:13,color:"#4B5E80",marginTop:6}}>Sign in to your workspace</div>
        </div>
        <div style={loginStyle.card}>
          <div style={{marginBottom:16}}>
            <label style={loginStyle.label}>Username</label>
            <input value={u} onChange={e=>{setU(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&attempt()} placeholder="Enter username" style={loginStyle.input}/>
          </div>
          <div style={{marginBottom:20}}>
            <label style={loginStyle.label}>Password</label>
            <div style={{position:"relative"}}>
              <input type={show?"text":"password"} value={p} onChange={e=>{setP(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&attempt()} placeholder="Enter password" style={{...loginStyle.input,paddingRight:44}}/>
              <button onClick={()=>setShow(s=>!s)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#4B5E80",fontSize:18}}>{show?"🙈":"👁"}</button>
            </div>
          </div>
          {err && <div style={{background:"#3B1A1A",border:"1px solid #FCA5A555",borderRadius:9,padding:"10px 14px",color:"#FCA5A5",fontSize:13,marginBottom:18}}>⚠ {err}</div>}
          <button onClick={attempt} style={{width:"100%",background:"linear-gradient(135deg,#0EA5E9,#6366F1)",border:"none",color:"#fff",borderRadius:11,padding:"13px",fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>Sign In →</button>
        </div>
        <div style={{textAlign:"center",marginTop:24,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:3}}>
            <span style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:13,background:"linear-gradient(135deg,#0EA5E9,#6366F1)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"1px"}}>U-TECH</span>
            <span style={{fontSize:9,color:"#0EA5E9",verticalAlign:"super",fontWeight:700}}>®</span>
          </div>
          <span style={{color:"#1E2A45",fontSize:11}}>|</span>
          <span style={{fontSize:11,color:"#2D3E5C"}}>Powering your performance</span>
        </div>
      </div>
    </div>
  );
}

function ChangeCredsModal({ creds, onSave, onClose }) {
  const [cur,setCur]=useState(""), [nu,setNu]=useState(creds.username);
  const [np,setNp]=useState(""), [cp,setCp]=useState("");
  const [showC,setShowC]=useState(false), [showN,setShowN]=useState(false);
  const [err,setErr]=useState(""), [ok,setOk]=useState(false);
  const IS = { width:"100%", background:"#0D1424", border:"1.5px solid #1E2A45", borderRadius:10, padding:"10px 14px", color:"#E2E8F0", fontSize:14, outline:"none", fontFamily:"inherit" };
  const LS = { fontSize:11, color:"#64748B", fontWeight:700, marginBottom:6, display:"block", textTransform:"uppercase", letterSpacing:".08em" };
  const save = () => {
    setErr("");
    if(!cur) return setErr("Enter current password.");
    if(cur!==creds.password) return setErr("Current password is incorrect.");
    if(!nu.trim()) return setErr("Username cannot be empty.");
    if(np && np.length<6) return setErr("Password must be at least 6 characters.");
    if(np && np!==cp) return setErr("Passwords do not match.");
    onSave({ username:nu.trim(), password:np||creds.password });
    setOk(true); setTimeout(onClose,1500);
  };
  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:17,marginBottom:22}}>🔐 Change Credentials</div>
        {ok ? (
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:36,marginBottom:10}}>✅</div>
            <div style={{fontWeight:700,color:"#6EE7B7"}}>Credentials updated!</div>
          </div>
        ) : (
          <>
            <div style={{marginBottom:14}}>
              <label style={LS}>Current Password *</label>
              <div style={{position:"relative"}}>
                <input type={showC?"text":"password"} value={cur} onChange={e=>{setCur(e.target.value);setErr("");}} style={{...IS,paddingRight:40}} placeholder="Current password"/>
                <button onClick={()=>setShowC(s=>!s)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#4B5E80"}}>{showC?"🙈":"👁"}</button>
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <label style={LS}>New Username</label>
              <input value={nu} onChange={e=>{setNu(e.target.value);setErr("");}} style={IS} placeholder="New username"/>
            </div>
            <div style={{marginBottom:14}}>
              <label style={LS}>New Password (blank = keep current)</label>
              <div style={{position:"relative"}}>
                <input type={showN?"text":"password"} value={np} onChange={e=>{setNp(e.target.value);setErr("");}} style={{...IS,paddingRight:40}} placeholder="New password"/>
                <button onClick={()=>setShowN(s=>!s)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#4B5E80"}}>{showN?"🙈":"👁"}</button>
              </div>
            </div>
            {np && (
              <div style={{marginBottom:14}}>
                <label style={LS}>Confirm New Password</label>
                <input type="password" value={cp} onChange={e=>{setCp(e.target.value);setErr("");}} style={{...IS,borderColor:cp&&cp!==np?"#FCA5A5":"#1E2A45"}} placeholder="Repeat new password"/>
              </div>
            )}
            {err && <div style={{background:"#3B1A1A",border:"1px solid #FCA5A555",borderRadius:9,padding:"9px 13px",color:"#FCA5A5",fontSize:13,marginBottom:16}}>⚠ {err}</div>}
            <div style={{display:"flex",gap:10,marginTop:6}}>
              <button onClick={onClose} className="btnG" style={{flex:1}}>Cancel</button>
              <button onClick={save} className="btnP" style={{flex:2}}>Save Changes</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AppCustomizer({ appCfg, onSave, onClose }) {
  const [name,setName]=useState(appCfg.name), [logo,setLogo]=useState(appCfg.logo);
  const EMOJIS=["⚡","🚀","🎯","💼","📊","🔥","💡","🏆","⭐","🌟","💎","🛡"];
  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{width:440}}>
        <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:17,marginBottom:22}}>🎨 Customize App</div>
        <div style={{background:"#0D1424",border:"1px solid #1E2A45",borderRadius:12,padding:16,marginBottom:20,display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,#0EA5E9,#6366F1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{logo}</div>
          <div>
            <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:15,color:"#E2E8F0"}}>{name||"App Name"}</div>
            <div style={{fontSize:11,color:"#4B5E80",marginTop:2}}>Preview</div>
          </div>
        </div>
        <div style={{marginBottom:16}}>
          <label style={{fontSize:11,color:"#64748B",fontWeight:700,marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:".08em"}}>App Name</label>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. ISA Performance Dashboard"
            style={{width:"100%",background:"#0D1424",border:"1.5px solid #1E2A45",borderRadius:10,padding:"10px 14px",color:"#E2E8F0",fontSize:14,outline:"none",fontFamily:"inherit"}}/>
        </div>
        <div style={{marginBottom:24}}>
          <label style={{fontSize:11,color:"#64748B",fontWeight:700,marginBottom:10,display:"block",textTransform:"uppercase",letterSpacing:".08em"}}>Choose Logo Icon</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {EMOJIS.map(e=>(
              <button key={e} onClick={()=>setLogo(e)}
                style={{width:44,height:44,borderRadius:10,background:logo===e?"linear-gradient(135deg,#0EA5E9,#6366F1)":"#1E2A45",border:logo===e?"none":"1px solid #2D3E5C",fontSize:22,cursor:"pointer",transition:"all .2s"}}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose} className="btnG" style={{flex:1}}>Cancel</button>
          <button onClick={()=>{onSave({name:name.trim()||appCfg.name,logo});onClose();}} className="btnP" style={{flex:2}}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ creds, setCreds, appCfg, setAppCfg, onLogout }) {
  const [members,    setMembers]    = useState(SEED_MEMBERS);
  const [leads,      setLeads]      = useState(SEED_LEADS);
  const [attendance, setAttendance] = useState(SEED_ATT);
  const [tab,        setTab]        = useState("dashboard");
  const [showAddM,   setShowAddM]   = useState(false);
  const [showAddL,   setShowAddL]   = useState(false);
  const [showCreds,  setShowCreds]  = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [mName,setMName]=useState(""), [mRole,setMRole]=useState(""), [mStatus,setMStatus]=useState("active");
  const [lMember,setLMember]=useState(""), [lCount,setLCount]=useState(""), [lDate,setLDate]=useState(today());
  const now0 = new Date();
  const [aYear,setAYear]=useState(now0.getFullYear()), [aMonth,setAMonth]=useState(now0.getMonth()+1), [aDate,setADate]=useState(today());
  const [rMode,setRMode]=useState("month"), [rSingle,setRSingle]=useState(today());
  const [rStart,setRStart]=useState(mRange().start), [rEnd,setREnd]=useState(mRange().end);
  const [rType,setRType]=useState("both"), [rTarget,setRTarget]=useState("team");
  const [rMember,setRMember]=useState(""), [mSearch,setMSearch]=useState("");
  const printRef = useRef(null);

  const visibleMembers = members.filter(m=>!m.deleted);
  const activeM        = visibleMembers.filter(m=>m.status==="active");
  const inactiveM      = visibleMembers.filter(m=>m.status==="inactive");
  const binMembers     = members.filter(m=>m.deleted);

  const attKey  = (mid,d) => mid+"_"+d;
  const getAtt  = (mid,d) => attendance[attKey(mid,d)] || null;
  const setAtt  = (mid,d,s) => setAttendance(p=>{ const k=attKey(mid,d); if(p[k]===s){const n={...p};delete n[k];return n;} return{...p,[k]:s}; });
  const markAll = (d,s) => { const n={...attendance}; activeM.forEach(m=>{n[attKey(m.id,d)]=s;}); setAttendance(n); };
  const attStats = (mid,dates) => {
    let P=0,A=0,HD=0,L=0,LT=0;
    dates.forEach(d=>{ const v=getAtt(mid,d); if(v==="P")P++; else if(v==="A")A++; else if(v==="HD")HD++; else if(v==="L")L++; else if(v==="LT")LT++; });
    return {P,A,HD,L,LT};
  };

  const addMember = () => {
    if(!mName.trim()) return;
    const av=mName.trim().split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
    const col=COLORS[members.length%COLORS.length];
    setMembers(p=>[...p,{id:nextId(p),name:mName.trim(),role:mRole.trim()||"Member",status:mStatus,avatar:av,color:col,deleted:false}]);
    setMName(""); setMRole(""); setMStatus("active"); setShowAddM(false);
  };
  const addLead = () => {
    if(!lMember||!lCount||!lDate) return;
    setLeads(p=>[...p,{id:nextId(p),memberId:parseInt(lMember),count:parseInt(lCount),date:lDate}]);
    setLCount(""); setLDate(today()); setLMember(""); setShowAddL(false);
  };
  const toggleStatus  = id => setMembers(p=>p.map(m=>m.id===id?{...m,status:m.status==="active"?"inactive":"active"}:m));
  const softDelete    = id => { setMembers(p=>p.map(m=>m.id===id?{...m,deleted:true}:m)); setConfirmDel(null); };
  const restoreMember = id => setMembers(p=>p.map(m=>m.id===id?{...m,deleted:false,status:"inactive"}:m));
  const hardDelete    = id => {
    setMembers(p=>p.filter(m=>m.id!==id));
    setLeads(p=>p.filter(l=>l.memberId!==id));
    const n={...attendance}; Object.keys(n).forEach(k=>{if(k.startsWith(id+"_"))delete n[k];}); setAttendance(n);
  };

  const mDays = daysInMonth(aYear, aMonth);

  const rDates = useMemo(()=>{
    if(rMode==="month"){const{start,end}=mRange();return rangeDays(start,end);}
    if(rMode==="single") return [rSingle];
    return rangeDays(rStart,rEnd);
  },[rMode,rSingle,rStart,rEnd]);

  const rLeads = useMemo(()=>{
    if(!rDates.length) return [];
    const s=rDates[0], e=rDates[rDates.length-1];
    return leads.filter(l=>l.date>=s&&l.date<=e);
  },[leads,rDates]);

  const rMemberObj = visibleMembers.find(m=>m.id===parseInt(rMember))||null;
  const buildSummary = list => list.map(m=>{
    const total=rLeads.filter(l=>l.memberId===m.id).reduce((s,l)=>s+l.count,0);
    const att=attStats(m.id,rDates);
    const rate=rDates.length?Math.round(((att.P+att.HD*.5+att.LT*.75)/rDates.length)*100):0;
    return {member:m,total,att,rate};
  }).sort((a,b)=>b.total-a.total);

  const activeSumm   = buildSummary(activeM);
  const inactiveSumm = buildSummary(inactiveM);
  const totalLeads   = [...activeSumm,...inactiveSumm].reduce((s,r)=>s+r.total,0);
  const topPerf      = [...activeSumm,...inactiveSumm].find(r=>r.total>0);
  const maxBar       = Math.max(1,...[...activeSumm,...inactiveSumm].map(r=>r.total));

  const {start:ms,end:me} = mRange();
  const mLeads   = leads.filter(l=>l.date>=ms&&l.date<=me&&!members.find(m=>m.id===l.memberId)?.deleted);
  const totMonth = mLeads.reduce((s,l)=>s+l.count,0);
  const todLeads = leads.filter(l=>l.date===today()&&!members.find(m=>m.id===l.memberId)?.deleted).reduce((s,l)=>s+l.count,0);
  const todAtt   = activeM.reduce((acc,m)=>{const v=getAtt(m.id,today())||"none";acc[v]=(acc[v]||0)+1;return acc;},{});

  const exportPDF = () => {
    if(!printRef.current) return;
    const w=window.open("","_blank");
    w.document.write("<html><head><title>"+appCfg.name+" Report</title><style>body{font-family:sans-serif;padding:28px;color:#111;font-size:13px}h1{font-size:20px;font-weight:800;margin-bottom:8px}h2{font-size:15px;font-weight:700;margin:20px 0 8px;border-bottom:2px solid #e2e8f0;padding-bottom:4px}table{width:100%;border-collapse:collapse;margin-bottom:14px}th{background:#f8fafc;padding:7px 11px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b}td{padding:7px 11px;border-bottom:1px solid #f1f5f9}.meta{color:#64748b;font-size:12px;margin-bottom:20px}</style></head><body>");
    w.document.write(printRef.current.innerHTML);
    w.document.write("</body></html>"); w.document.close(); setTimeout(()=>{w.focus();w.print();},400);
  };

  const buildPrint = () => {
    const dl=rMode==="month"?mLabel(now0.getFullYear(),now0.getMonth()+1):rMode==="single"?fmtDate(rSingle):fmtDate(rStart)+" - "+fmtDate(rEnd);
    const who=rTarget==="member"&&rMemberObj?rMemberObj.name:"Full Team";
    let h="<h1>"+appCfg.name+" Report</h1><p class='meta'>Period: "+dl+" | Scope: "+who+" | Generated: "+new Date().toLocaleDateString()+"</p>";
    const cols="<tr><th>Member</th><th>Role</th>"+(rType!=="attendance"?"<th>Leads</th><th>Share</th>":"")+(rType!=="leads"?"<th>P</th><th>A</th><th>HD</th><th>L</th><th>LT</th><th>Att%</th>":"")+"</tr>";
    const rows=(list,inact)=>list.map(({member:m,total,att,rate})=>{
      if(rTarget==="member"&&rMemberObj&&m.id!==rMemberObj.id) return "";
      return "<tr><td>"+m.name+(inact?" (Inactive)":"")+"</td><td>"+m.role+"</td>"+(rType!=="attendance"?"<td>"+total+"</td><td>"+(totalLeads?Math.round(total/totalLeads*100):0)+"%</td>":"")+(rType!=="leads"?"<td>"+att.P+"</td><td>"+att.A+"</td><td>"+att.HD+"</td><td>"+att.L+"</td><td>"+att.LT+"</td><td>"+rate+"%</td>":"")+"</tr>";
    }).join("");
    const ar=rows(activeSumm,false); if(ar) h+="<h2>Active Members</h2><table>"+cols+"<tbody>"+ar+"</tbody></table>";
    if(rTarget==="team"){const ir=rows(inactiveSumm,true); if(ir) h+="<h2>Inactive Members</h2><table>"+cols+"<tbody>"+ir+"</tbody></table>";}
    if(rTarget==="member"&&rMemberObj){
      const m=rMemberObj;
      h+="<h2>Daily Breakdown - "+m.name+"</h2><table><tr><th>Date</th><th>Day</th>"+(rType!=="attendance"?"<th>Leads</th>":"")+(rType!=="leads"?"<th>Attendance</th>":"")+"</tr><tbody>";
      rDates.forEach(d=>{
        const lc=rLeads.filter(l=>l.memberId===m.id&&l.date===d).reduce((s,l)=>s+l.count,0);
        const v=getAtt(m.id,d),meta=v?ATT[v]:null;
        h+="<tr><td>"+fmtDate(d)+"</td><td>"+new Date(d).toLocaleDateString("en",{weekday:"long"})+"</td>"+(rType!=="attendance"?"<td>"+(lc||"-")+"</td>":"")+(rType!=="leads"?"<td>"+(meta?meta.label:"-")+"</td>":"")+"</tr>";
      });
      h+="</tbody></table>";
    }
    return h;
  };

  const card = { background:"#111827", border:"1px solid #1E2A45", borderRadius:16 };
  const sc   = { background:"linear-gradient(135deg,#111827,#1A2235)", border:"1px solid #1E2A45", borderRadius:16 };
  const inp  = { background:"#0A0F1E", border:"1px solid #1E2A45", borderRadius:10, padding:"10px 14px", color:"#E2E8F0", fontSize:14, width:"100%", outline:"none", fontFamily:"inherit" };
  const TABS = [["dashboard","📊 Dashboard"],["members","👥 Members"],["attendance","🗓 Attendance"],["leads","📋 Leads"],["report","📈 Reports"],["bin","🗑 Bin"+(binMembers.length?" ("+binMembers.length+")":"")]];

  return (
    <div style={{minHeight:"100vh",background:"#0A0F1E",fontFamily:"'DM Sans','Segoe UI',sans-serif",color:"#E2E8F0",display:"flex",flexDirection:"column"}}>
      <style>{CSS}</style>

      {/* HEADER */}
      <div style={{background:"#0D1424",borderBottom:"1px solid #1E2A45",padding:"13px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:11}}>
          <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#0EA5E9,#6366F1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0,cursor:"pointer"}} onClick={()=>setShowCustom(true)}>{appCfg.logo}</div>
          <div>
            <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:15,letterSpacing:"-.5px",lineHeight:1.2,cursor:"pointer"}} onClick={()=>setShowCustom(true)}>{appCfg.name}</div>
            <div style={{fontSize:10,color:"#4B5E80",marginTop:1}}>Lead Performance & Attendance System</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
          <button className="btnG" onClick={()=>setShowAddM(true)}>+ Member</button>
          <button className="btnP" onClick={()=>setShowAddL(true)}>+ Add Leads</button>
          <button className="upill" onClick={()=>setShowCreds(true)}>
            <div style={{width:24,height:24,borderRadius:6,background:"linear-gradient(135deg,#0EA5E9,#6366F1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",flexShrink:0}}>{creds.username.slice(0,2).toUpperCase()}</div>
            <span>{creds.username}</span>
            <span style={{fontSize:12}}>🔐</span>
          </button>
          <button className="btnLO" onClick={onLogout}>Sign Out</button>
        </div>
      </div>

      {/* TABS */}
      <div style={{padding:"13px 24px 0",display:"flex",gap:5,overflowX:"auto"}}>
        {TABS.map(([k,l])=>(
          <button key={k} className={"tbtn "+(tab===k?"tbtnA":"tbtnI")} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      <div style={{padding:"20px 24px",maxWidth:1180,margin:"0 auto",width:"100%",flex:1}}>

        {/* DASHBOARD */}
        {tab==="dashboard" && (
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:18}}>
              {[
                {icon:"👥",val:visibleMembers.length,lbl:"Total Members",   sub:activeM.length+" active",                 accent:"#6EE7B7"},
                {icon:"🎯",val:totMonth,              lbl:"Leads This Month",sub:"current month",                          accent:"#93C5FD"},
                {icon:"⚡",val:todLeads,              lbl:"Today Leads",     sub:today(),                                  accent:"#FCD34D"},
                {icon:"✅",val:todAtt["P"]||0,       lbl:"Present Today",   sub:(todAtt["A"]||0)+" absent",               accent:"#6EE7B7"},
                {icon:"🕐",val:todAtt["LT"]||0,      lbl:"Late Today",      sub:"arrived late",                           accent:"#FB923C"},
                {icon:"🗓",val:(todAtt["L"]||0)+(todAtt["HD"]||0),lbl:"Leave & Half Day",sub:"L + HD",                   accent:"#C4B5FD"},
              ].map((s,i)=>(
                <div key={i} style={{...sc,padding:"15px 15px 12px",boxShadow:"0 0 20px rgba(14,165,233,.08)"}}>
                  <div style={{fontSize:20,marginBottom:6}}>{s.icon}</div>
                  <div style={{fontSize:26,fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,color:s.accent}}>{s.val}</div>
                  <div style={{fontSize:11,color:"#94A3B8",marginTop:3}}>{s.lbl}</div>
                  <div style={{fontSize:10,color:"#4B5E80",marginTop:2}}>{s.sub}</div>
                </div>
              ))}
            </div>

            <div style={{...card,padding:18,marginBottom:16}}>
              <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:14,marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
                🗓 Today Attendance <span style={{fontSize:12,color:"#4B5E80",fontWeight:400}}>{fmtDate(today())}</span>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {activeM.map(m=>{
                  const v=getAtt(m.id,today()),meta=v?ATT[v]:null;
                  return (
                    <div key={m.id} style={{display:"flex",alignItems:"center",gap:7,background:"#0D1424",borderRadius:10,padding:"8px 12px",border:"1px solid "+(meta?meta.color+"44":"#1E2A45")}}>
                      <div style={{width:26,height:26,borderRadius:7,background:m.color+"22",border:"2px solid "+m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:m.color}}>{m.avatar}</div>
                      <span style={{fontSize:13,fontWeight:600}}>{m.name.split(" ")[0]}</span>
                      {meta
                        ? <span style={{background:meta.bg,color:meta.color,borderRadius:6,padding:"2px 7px",fontSize:10,fontWeight:800}}>{v}</span>
                        : <span style={{background:"#1E2A45",color:"#4B5E80",borderRadius:6,padding:"2px 7px",fontSize:10}}>—</span>
                      }
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{...card,padding:20}}>
              <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:14,marginBottom:14}}>🏆 This Month Leaderboard</div>
              {activeM.map(m=>{
                const tot=mLeads.filter(l=>l.memberId===m.id).reduce((s,l)=>s+l.count,0);
                const mx=Math.max(1,...activeM.map(mm=>mLeads.filter(l=>l.memberId===mm.id).reduce((s,l)=>s+l.count,0)));
                return (
                  <div key={m.id} style={{display:"flex",alignItems:"center",gap:11,marginBottom:11}}>
                    <div style={{width:32,height:32,borderRadius:8,background:m.color+"22",border:"2px solid "+m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:m.color,flexShrink:0}}>{m.avatar}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,marginBottom:3}}>{m.name}</div>
                      <div style={{height:6,background:"#1E2A45",borderRadius:6,overflow:"hidden"}}>
                        <div className="bfill" style={{height:"100%",borderRadius:6,background:"linear-gradient(90deg,"+m.color+","+m.color+"88)",width:(mx?tot/mx*100:0)+"%"}}/>
                      </div>
                    </div>
                    <div style={{fontSize:19,fontWeight:700,color:m.color,minWidth:32,textAlign:"right"}}>{tot}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MEMBERS */}
        {tab==="members" && (
          <div style={{...card,overflow:"hidden"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid #1E2A45",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:15}}>Team Members ({visibleMembers.length})</div>
              <button className="btnP" onClick={()=>setShowAddM(true)}>+ Add Member</button>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:580}}>
                <thead><tr style={{background:"#0D1424"}}>
                  {["ID","Member","Role","Status","Leads","Actions"].map(h=>(
                    <th key={h} style={{padding:"10px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"#4B5E80",textTransform:"uppercase",letterSpacing:".07em"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {visibleMembers.map(m=>{
                    const tot=mLeads.filter(l=>l.memberId===m.id).reduce((s,l)=>s+l.count,0);
                    return (
                      <tr key={m.id} className="row" style={{borderTop:"1px solid #1A2235"}}>
                        <td style={{padding:"12px 16px",color:"#4B5E80",fontSize:13,fontWeight:700}}>#{m.id}</td>
                        <td style={{padding:"12px 16px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{width:30,height:30,borderRadius:8,background:m.color+"22",border:"2px solid "+m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:m.color}}>{m.avatar}</div>
                            <span style={{fontWeight:600,fontSize:14}}>{m.name}</span>
                          </div>
                        </td>
                        <td style={{padding:"12px 16px",color:"#94A3B8",fontSize:13}}>{m.role}</td>
                        <td style={{padding:"12px 16px"}}><span className={m.status==="active"?"bga":"bgi"}>{m.status}</span></td>
                        <td style={{padding:"12px 16px",fontWeight:700,color:m.color,fontSize:16}}>{tot}</td>
                        <td style={{padding:"12px 16px"}}>
                          <div style={{display:"flex",gap:6}}>
                            <button className="btnG" style={{fontSize:12,padding:"5px 10px"}} onClick={()=>toggleStatus(m.id)}>{m.status==="active"?"Deactivate":"Activate"}</button>
                            <button className="btnR" style={{fontSize:12,padding:"5px 10px"}} onClick={()=>setConfirmDel(m.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ATTENDANCE */}
        {tab==="attendance" && (
          <div>
            <div style={{...card,padding:"14px 18px",marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <button className="btnG" style={{padding:"5px 12px",fontSize:17}} onClick={()=>{let mo=aMonth-1,yr=aYear;if(mo<1){mo=12;yr--;}setAMonth(mo);setAYear(yr);}}>‹</button>
                  <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:14,minWidth:150,textAlign:"center"}}>{mLabel(aYear,aMonth)}</div>
                  <button className="btnG" style={{padding:"5px 12px",fontSize:17}} onClick={()=>{let mo=aMonth+1,yr=aYear;if(mo>12){mo=1;yr++;}setAMonth(mo);setAYear(yr);}}>›</button>
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {Object.entries(ATT).map(([k,v])=>(
                    <div key={k} style={{display:"flex",alignItems:"center",gap:4}}>
                      <div style={{width:8,height:8,borderRadius:2,background:v.color}}/>
                      <span style={{fontSize:11,color:"#94A3B8"}}><b style={{color:v.color}}>{k}</b> {v.label}</span>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  <input type="date" value={aDate} onChange={e=>setADate(e.target.value)} style={{...inp,width:145,padding:"6px 10px",fontSize:12}}/>
                  <span style={{fontSize:11,color:"#4B5E80"}}>Mark all:</span>
                  {Object.entries(ATT).map(([k,v])=>(
                    <button key={k} className="mabtn" onClick={()=>markAll(aDate,k)} style={{background:v.bg,color:v.color,border:"1px solid "+v.color+"55"}}>{k}</button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{...card,overflowX:"auto",marginBottom:14}}>
              <table style={{borderCollapse:"collapse",minWidth:660}}>
                <thead><tr style={{background:"#0D1424"}}>
                  <th style={{padding:"9px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:"#4B5E80",textTransform:"uppercase",position:"sticky",left:0,background:"#0D1424",zIndex:2,minWidth:150,borderRight:"1px solid #1A2235"}}>Member</th>
                  {mDays.map(d=>{
                    const day=parseInt(d.split("-")[2]),dow=new Date(d).toLocaleDateString("en",{weekday:"short"}),isT=d===today();
                    return (<th key={d} style={{padding:"6px 1px",textAlign:"center",fontSize:9,fontWeight:700,color:isT?"#0EA5E9":"#4B5E80",minWidth:44,background:isT?"#0EA5E91A":"transparent"}}>
                      <div>{dow}</div><div style={{fontSize:11,fontWeight:800}}>{day}</div>
                    </th>);
                  })}
                  {["P","A","HD","L","LT"].map(k=>(<th key={k} style={{padding:"9px 5px",textAlign:"center",fontSize:10,fontWeight:700,color:ATT[k].color,minWidth:34}}>{k}</th>))}
                </tr></thead>
                <tbody>
                  {activeM.map(m=>{
                    const s=attStats(m.id,mDays);
                    return (
                      <tr key={m.id} className="row" style={{borderTop:"1px solid #1A2235"}}>
                        <td style={{padding:"7px 11px",position:"sticky",left:0,background:"#111827",zIndex:1,borderRight:"1px solid #1A2235"}}>
                          <div style={{display:"flex",alignItems:"center",gap:7}}>
                            <div style={{width:24,height:24,borderRadius:6,background:m.color+"22",border:"2px solid "+m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:m.color,flexShrink:0}}>{m.avatar}</div>
                            <div><div style={{fontSize:12,fontWeight:600}}>{m.name}</div><div style={{fontSize:9,color:"#4B5E80"}}>{m.role}</div></div>
                          </div>
                        </td>
                        {mDays.map(d=>{
                          const v=getAtt(m.id,d),isT=d===today();
                          return (
                            <td key={d} style={{padding:"2px 1px",textAlign:"center",background:isT?"#0EA5E90A":"transparent"}}>
                              <div style={{display:"flex",flexDirection:"column",gap:1,alignItems:"center"}}>
                                {Object.entries(ATT).map(([k,vm])=>(
                                  <button key={k} className="apill" onClick={()=>setAtt(m.id,d,k)}
                                    style={{background:v===k?vm.bg:"transparent",color:v===k?vm.color:"#2D3E5C",border:v===k?"1px solid "+vm.color+"55":"1px solid transparent",opacity:v===k?1:.5}}>{k}</button>
                                ))}
                              </div>
                            </td>
                          );
                        })}
                        <td style={{padding:"7px 5px",textAlign:"center",fontWeight:700,color:"#6EE7B7",fontSize:12}}>{s.P}</td>
                        <td style={{padding:"7px 5px",textAlign:"center",fontWeight:700,color:"#FCA5A5",fontSize:12}}>{s.A}</td>
                        <td style={{padding:"7px 5px",textAlign:"center",fontWeight:700,color:"#FCD34D",fontSize:12}}>{s.HD}</td>
                        <td style={{padding:"7px 5px",textAlign:"center",fontWeight:700,color:"#C4B5FD",fontSize:12}}>{s.L}</td>
                        <td style={{padding:"7px 5px",textAlign:"center",fontWeight:700,color:"#FB923C",fontSize:12}}>{s.LT}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:11}}>
              {activeM.map(m=>{
                const s=attStats(m.id,mDays),tot=mDays.length,rate=tot?((s.P+s.HD*.5+s.LT*.75)/tot*100):0;
                return (
                  <div key={m.id} style={{...sc,padding:"14px 15px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                      <div style={{width:26,height:26,borderRadius:6,background:m.color+"22",border:"2px solid "+m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:m.color}}>{m.avatar}</div>
                      <div><div style={{fontSize:13,fontWeight:700}}>{m.name}</div><div style={{fontSize:10,color:"#4B5E80"}}>{m.role}</div></div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5,marginBottom:8}}>
                      {[["P","Present",s.P,"#6EE7B7"],["A","Absent",s.A,"#FCA5A5"],["HD","Half Day",s.HD,"#FCD34D"],["L","Leave",s.L,"#C4B5FD"],["LT","Late",s.LT,"#FB923C"]].map(([k,lb,val,c])=>(
                        <div key={k} style={{background:c+"11",border:"1px solid "+c+"33",borderRadius:7,padding:"5px 7px",textAlign:"center"}}>
                          <div style={{fontSize:15,fontWeight:700,color:c}}>{val}</div>
                          <div style={{fontSize:9,color:"#64748B",marginTop:1}}>{lb}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{fontSize:10,color:"#4B5E80",display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span>Attendance Rate</span>
                      <span style={{color:rate>=80?"#6EE7B7":rate>=50?"#FCD34D":"#FCA5A5"}}>{Math.round(rate)}%</span>
                    </div>
                    <div style={{height:5,background:"#1E2A45",borderRadius:6,overflow:"hidden"}}>
                      <div className="bfill" style={{height:"100%",borderRadius:6,background:"linear-gradient(90deg,"+m.color+","+m.color+"88)",width:rate+"%"}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LEADS */}
        {tab==="leads" && (
          <div>
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
              <button className="btnP" onClick={()=>setShowAddL(true)}>+ Add Leads</button>
            </div>
            <div style={{...card,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr style={{background:"#0D1424"}}>
                  {["Date","Member","Role","Leads"].map(h=>(
                    <th key={h} style={{padding:"10px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"#4B5E80",textTransform:"uppercase",letterSpacing:".07em"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {[...leads].filter(l=>!members.find(m=>m.id===l.memberId)?.deleted).sort((a,b)=>b.date.localeCompare(a.date)).map(l=>{
                    const m=members.find(x=>x.id===l.memberId);
                    return (
                      <tr key={l.id} className="row" style={{borderTop:"1px solid #1A2235"}}>
                        <td style={{padding:"11px 16px",color:"#94A3B8",fontSize:13}}>{fmtDate(l.date)}</td>
                        <td style={{padding:"11px 16px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            {m && <div style={{width:24,height:24,borderRadius:6,background:m.color+"22",border:"2px solid "+m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:m.color}}>{m.avatar}</div>}
                            <span style={{fontWeight:500,fontSize:13}}>{m?.name||"Unknown"}</span>
                            {m?.status==="inactive" && <span style={{fontSize:9,color:"#FCA5A5",background:"#3B1A1A",borderRadius:10,padding:"1px 6px"}}>Inactive</span>}
                          </div>
                        </td>
                        <td style={{padding:"11px 16px",color:"#64748B",fontSize:13}}>{m?.role||""}</td>
                        <td style={{padding:"11px 16px",fontWeight:700,color:m?.color||"#6EE7B7",fontSize:17}}>{l.count}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORTS */}
        {tab==="report" && (
          <div>
            <div style={{...card,padding:20,marginBottom:16}}>
              <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:15,marginBottom:14}}>📈 Report Builder</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:14,marginBottom:14}}>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:"#4B5E80",textTransform:"uppercase",letterSpacing:".07em",marginBottom:8}}>① Period</div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {[["month","📅 This Month"],["single","📌 Single Date"],["range","📆 Date Range"]].map(([v,l])=>(
                      <button key={v} className={"rbtn "+(rMode===v?"rbtnA":"rbtnI")} onClick={()=>setRMode(v)}>{l}</button>
                    ))}
                    <div style={{marginTop:5}}>
                      {rMode==="single" && <input type="date" value={rSingle} onChange={e=>setRSingle(e.target.value)} style={{...inp,fontSize:13,padding:"7px 10px"}}/>}
                      {rMode==="range"  && <>
                        <input type="date" value={rStart} onChange={e=>setRStart(e.target.value)} style={{...inp,fontSize:13,padding:"7px 10px",marginBottom:6}}/>
                        <input type="date" value={rEnd}   onChange={e=>setREnd(e.target.value)}   style={{...inp,fontSize:13,padding:"7px 10px"}}/>
                      </>}
                    </div>
                  </div>
                </div>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:"#4B5E80",textTransform:"uppercase",letterSpacing:".07em",marginBottom:8}}>② Type</div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {[["both","📊 Leads & Attendance"],["leads","🎯 Leads Only"],["attendance","🗓 Attendance Only"]].map(([v,l])=>(
                      <button key={v} className={"rbtn "+(rType===v?"rbtnA":"rbtnI")} onClick={()=>setRType(v)}>{l}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:"#4B5E80",textTransform:"uppercase",letterSpacing:".07em",marginBottom:8}}>③ Who</div>
                  <div style={{display:"flex",gap:6,marginBottom:8}}>
                    {[["team","👥 Team"],["member","👤 Member"]].map(([v,l])=>(
                      <button key={v} className={"rbtn "+(rTarget===v?"rbtnA":"rbtnI")} onClick={()=>{setRTarget(v);if(v==="team")setRMember("");}}>{l}</button>
                    ))}
                  </div>
                  {rTarget==="member" && <>
                    <input placeholder="Search name or ID..." value={mSearch} onChange={e=>setMSearch(e.target.value)} style={{...inp,fontSize:12,padding:"7px 10px",marginBottom:6}}/>
                    <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:175,overflowY:"auto"}}>
                      {visibleMembers.filter(m=>{const q=mSearch.toLowerCase();return !q||m.name.toLowerCase().includes(q)||String(m.id).includes(q);}).map(m=>(
                        <div key={m.id} className={"chip "+(rMember===String(m.id)?"chipS":"")} onClick={()=>setRMember(String(m.id))}>
                          <div style={{width:22,height:22,borderRadius:5,background:m.color+"22",border:"2px solid "+m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:m.color,flexShrink:0}}>{m.avatar}</div>
                          <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600}}>{m.name}</div><div style={{fontSize:10,color:"#4B5E80"}}>#{m.id}</div></div>
                          {m.status==="inactive" && <span style={{fontSize:9,background:"#3B1A1A",color:"#FCA5A5",borderRadius:6,padding:"1px 5px"}}>Inactive</span>}
                          {rMember===String(m.id) && <span style={{color:"#0EA5E9"}}>✓</span>}
                        </div>
                      ))}
                    </div>
                  </>}
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",paddingTop:12,borderTop:"1px solid #1E2A45"}}>
                <button className="btnPDF" onClick={exportPDF}><span>📄</span> Export PDF</button>
              </div>
            </div>

            <div ref={printRef} style={{display:"none"}} dangerouslySetInnerHTML={{__html:buildPrint()}}/>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:11,marginBottom:16}}>
              {[
                {lbl:"Total Leads",  val:totalLeads,                     c:"#93C5FD"},
                {lbl:"Top Performer",val:topPerf?.member.name||"—",       c:"#6EE7B7",sub:(topPerf?.total||0)+" leads",sm:true},
                {lbl:"Period Days",  val:rDates.length,                   c:"#FCD34D"},
                {lbl:"Active Staff", val:activeM.length,                  c:"#6EE7B7"},
              ].map((s,i)=>(
                <div key={i} style={{...sc,padding:"13px 14px"}}>
                  <div style={{fontSize:10,color:"#4B5E80",textTransform:"uppercase",letterSpacing:".07em",marginBottom:5}}>{s.lbl}</div>
                  <div style={{fontSize:s.sm?14:25,fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,color:s.c}}>{s.val}</div>
                  {s.sub && <div style={{fontSize:10,color:"#4B5E80",marginTop:2}}>{s.sub}</div>}
                </div>
              ))}
            </div>

            {rTarget==="member" && rMemberObj && (() => {
              const m=rMemberObj;
              const byDate=Object.fromEntries(rDates.map(d=>[d,rLeads.filter(l=>l.memberId===m.id&&l.date===d).reduce((s,l)=>s+l.count,0)]));
              const totL=Object.values(byDate).reduce((a,b)=>a+b,0);
              const s=attStats(m.id,rDates);
              const rate=rDates.length?Math.round(((s.P+s.HD*.5+s.LT*.75)/rDates.length)*100):0;
              return (
                <div>
                  <div style={{...card,padding:20,marginBottom:14}}>
                    <div style={{display:"flex",alignItems:"center",gap:13,marginBottom:14,flexWrap:"wrap"}}>
                      <div style={{width:46,height:46,borderRadius:12,background:m.color+"22",border:"3px solid "+m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:m.color,flexShrink:0}}>{m.avatar}</div>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:17}}>{m.name}</div>
                        <div style={{color:"#94A3B8",fontSize:12,marginTop:2}}>{m.role} · #{m.id}</div>
                        <span className={m.status==="active"?"bga":"bgi"} style={{marginTop:5,display:"inline-block"}}>{m.status}</span>
                      </div>
                      <div style={{display:"flex",gap:14}}>
                        {rType!=="attendance" && <div style={{textAlign:"center"}}><div style={{fontSize:25,fontWeight:700,color:m.color}}>{totL}</div><div style={{fontSize:10,color:"#4B5E80"}}>Total Leads</div></div>}
                        {rType!=="leads" && <div style={{textAlign:"center"}}><div style={{fontSize:25,fontWeight:700,color:rate>=80?"#6EE7B7":rate>=50?"#FCD34D":"#FCA5A5"}}>{rate}%</div><div style={{fontSize:10,color:"#4B5E80"}}>Att. Rate</div></div>}
                      </div>
                    </div>
                    {rType!=="leads" && (
                      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:7}}>
                        {[["P","Present",s.P,"#6EE7B7"],["A","Absent",s.A,"#FCA5A5"],["HD","Half Day",s.HD,"#FCD34D"],["L","Leave",s.L,"#C4B5FD"],["LT","Late",s.LT,"#FB923C"]].map(([k,lb,val,c])=>(
                          <div key={k} style={{background:c+"11",border:"1px solid "+c+"33",borderRadius:8,padding:"9px",textAlign:"center"}}>
                            <div style={{fontSize:19,fontWeight:700,color:c}}>{val}</div>
                            <div style={{fontSize:10,color:"#64748B",marginTop:2}}>{lb}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{...card,overflow:"hidden"}}>
                    <div style={{padding:"13px 16px",borderBottom:"1px solid #1E2A45",fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:13}}>📅 Daily Breakdown</div>
                    <table style={{width:"100%",borderCollapse:"collapse"}}>
                      <thead><tr style={{background:"#0D1424"}}>
                        <th style={{padding:"8px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"#4B5E80",textTransform:"uppercase"}}>Date</th>
                        <th style={{padding:"8px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"#4B5E80",textTransform:"uppercase"}}>Day</th>
                        {rType!=="attendance" && <th style={{padding:"8px 16px",textAlign:"center",fontSize:11,fontWeight:700,color:"#4B5E80",textTransform:"uppercase"}}>Leads</th>}
                        {rType!=="leads" && <th style={{padding:"8px 16px",textAlign:"center",fontSize:11,fontWeight:700,color:"#4B5E80",textTransform:"uppercase"}}>Attendance</th>}
                      </tr></thead>
                      <tbody>
                        {rDates.map(d=>{
                          const v=getAtt(m.id,d),meta=v?ATT[v]:null,lc=byDate[d]||0;
                          return (
                            <tr key={d} className="row" style={{borderTop:"1px solid #1A2235"}}>
                              <td style={{padding:"9px 16px",color:"#94A3B8",fontSize:12}}>{fmtDate(d)}</td>
                              <td style={{padding:"9px 16px",color:"#64748B",fontSize:12}}>{new Date(d).toLocaleDateString("en",{weekday:"long"})}</td>
                              {rType!=="attendance" && <td style={{padding:"9px 16px",textAlign:"center",fontWeight:700,color:lc?m.color:"#2D3E5C",fontSize:lc?15:12}}>{lc||"—"}</td>}
                              {rType!=="leads" && <td style={{padding:"9px 16px",textAlign:"center"}}>{meta?<span style={{background:meta.bg,color:meta.color,borderRadius:6,padding:"2px 9px",fontSize:11,fontWeight:800}}>{meta.label}</span>:<span style={{color:"#2D3E5C",fontSize:11}}>Not marked</span>}</td>}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {rTarget==="team" && (
              <div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                  {rType!=="attendance" && (
                    <div style={{...card,padding:18}}>
                      <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:13,marginBottom:12}}>🎯 Lead Performance</div>
                      {activeSumm.map(({member:m,total})=>(
                        <div key={m.id} style={{marginBottom:10}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:13}}><span style={{fontWeight:600}}>{m.name}</span><span style={{color:m.color,fontWeight:700}}>{total}</span></div>
                          <div style={{height:7,background:"#1E2A45",borderRadius:6,overflow:"hidden"}}><div className="bfill" style={{height:"100%",borderRadius:6,background:"linear-gradient(90deg,"+m.color+","+m.color+"66)",width:(maxBar?total/maxBar*100:0)+"%"}}/></div>
                        </div>
                      ))}
                    </div>
                  )}
                  {rType!=="leads" && (
                    <div style={{...card,padding:18}}>
                      <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:13,marginBottom:12}}>🗓 Attendance Summary</div>
                      {activeSumm.map(({member:m,att,rate})=>(
                        <div key={m.id} style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}>
                          <div style={{width:20,height:20,borderRadius:5,background:m.color+"22",border:"2px solid "+m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:m.color,flexShrink:0}}>{m.avatar}</div>
                          <span style={{fontSize:12,fontWeight:600,flex:1}}>{m.name}</span>
                          {[["P","#6EE7B7",att.P],["A","#FCA5A5",att.A],["HD","#FCD34D",att.HD],["L","#C4B5FD",att.L],["LT","#FB923C",att.LT]].map(([k,c,v])=>(
                            <div key={k} style={{textAlign:"center",minWidth:22}}><div style={{fontSize:11,fontWeight:700,color:c}}>{v}</div><div style={{fontSize:8,color:"#4B5E80"}}>{k}</div></div>
                          ))}
                          <span style={{fontSize:11,fontWeight:700,minWidth:30,textAlign:"right",color:rate>=80?"#6EE7B7":rate>=50?"#FCD34D":"#FCA5A5"}}>{rate}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{...card,overflow:"hidden",marginBottom:0}}>
                  <div style={{padding:"13px 16px",borderBottom:"1px solid #1E2A45",fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:13}}>👥 Active Member Report</div>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr style={{background:"#0D1424"}}>
                      <th style={{padding:"8px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:"#4B5E80",textTransform:"uppercase"}}>Member</th>
                      {rType!=="attendance" && <><th style={{padding:"8px 9px",textAlign:"center",fontSize:11,fontWeight:700,color:"#4B5E80",textTransform:"uppercase"}}>Leads</th><th style={{padding:"8px 9px",textAlign:"center",fontSize:11,fontWeight:700,color:"#4B5E80",textTransform:"uppercase"}}>Share</th></>}
                      {rType!=="leads" && <><th style={{padding:"8px 5px",textAlign:"center",fontSize:10,fontWeight:700,color:"#6EE7B7"}}>P</th><th style={{padding:"8px 5px",textAlign:"center",fontSize:10,fontWeight:700,color:"#FCA5A5"}}>A</th><th style={{padding:"8px 5px",textAlign:"center",fontSize:10,fontWeight:700,color:"#FCD34D"}}>HD</th><th style={{padding:"8px 5px",textAlign:"center",fontSize:10,fontWeight:700,color:"#C4B5FD"}}>L</th><th style={{padding:"8px 5px",textAlign:"center",fontSize:10,fontWeight:700,color:"#FB923C"}}>LT</th><th style={{padding:"8px 9px",textAlign:"center",fontSize:11,fontWeight:700,color:"#4B5E80",textTransform:"uppercase"}}>Att%</th></>}
                    </tr></thead>
                    <tbody>
                      {activeSumm.map(({member:m,total,att,rate})=>(
                        <tr key={m.id} className="row" style={{borderTop:"1px solid #1A2235"}}>
                          <td style={{padding:"8px 12px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:20,height:20,borderRadius:5,background:m.color+"22",border:"2px solid "+m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:m.color}}>{m.avatar}</div><div><div style={{fontSize:12,fontWeight:600}}>{m.name}</div><div style={{fontSize:9,color:"#4B5E80"}}>#{m.id}</div></div></div></td>
                          {rType!=="attendance" && <><td style={{padding:"8px 9px",textAlign:"center",fontWeight:700,color:m.color,fontSize:14}}>{total}</td><td style={{padding:"8px 9px",textAlign:"center",color:"#64748B",fontSize:12}}>{totalLeads?Math.round(total/totalLeads*100):0}%</td></>}
                          {rType!=="leads" && <><td style={{padding:"8px 5px",textAlign:"center",fontWeight:700,color:"#6EE7B7",fontSize:12}}>{att.P}</td><td style={{padding:"8px 5px",textAlign:"center",fontWeight:700,color:"#FCA5A5",fontSize:12}}>{att.A}</td><td style={{padding:"8px 5px",textAlign:"center",fontWeight:700,color:"#FCD34D",fontSize:12}}>{att.HD}</td><td style={{padding:"8px 5px",textAlign:"center",fontWeight:700,color:"#C4B5FD",fontSize:12}}>{att.L}</td><td style={{padding:"8px 5px",textAlign:"center",fontWeight:700,color:"#FB923C",fontSize:12}}>{att.LT}</td>
                          <td style={{padding:"8px 9px",textAlign:"center"}}><span style={{background:rate>=80?"#064E3B":rate>=50?"#3B2E0A":"#3B1A1A",color:rate>=80?"#6EE7B7":rate>=50?"#FCD34D":"#FCA5A5",borderRadius:6,padding:"2px 7px",fontSize:11,fontWeight:700}}>{rate}%</span></td></>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {inactiveM.length>0 && (
                  <div className="inact-sec">
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                      <span>🔴</span>
                      <span style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:13,color:"#FCA5A5"}}>Inactive Members — Historical Data</span>
                      <span style={{fontSize:10,color:"#4B5E80",background:"#1E2A45",borderRadius:8,padding:"1px 8px"}}>{inactiveM.length}</span>
                    </div>
                    <table style={{width:"100%",borderCollapse:"collapse"}}>
                      <thead><tr style={{background:"#1A0A0A"}}>
                        <th style={{padding:"8px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:"#4B5E80",textTransform:"uppercase"}}>Member</th>
                        {rType!=="attendance" && <><th style={{padding:"8px 9px",textAlign:"center",fontSize:11,fontWeight:700,color:"#4B5E80",textTransform:"uppercase"}}>Leads</th><th style={{padding:"8px 9px",textAlign:"center",fontSize:11,fontWeight:700,color:"#4B5E80",textTransform:"uppercase"}}>Share</th></>}
                        {rType!=="leads" && <><th style={{padding:"8px 5px",textAlign:"center",fontSize:10,fontWeight:700,color:"#6EE7B7"}}>P</th><th style={{padding:"8px 5px",textAlign:"center",fontSize:10,fontWeight:700,color:"#FCA5A5"}}>A</th><th style={{padding:"8px 5px",textAlign:"center",fontSize:10,fontWeight:700,color:"#FCD34D"}}>HD</th><th style={{padding:"8px 5px",textAlign:"center",fontSize:10,fontWeight:700,color:"#C4B5FD"}}>L</th><th style={{padding:"8px 5px",textAlign:"center",fontSize:10,fontWeight:700,color:"#FB923C"}}>LT</th><th style={{padding:"8px 9px",textAlign:"center",fontSize:11,fontWeight:700,color:"#4B5E80",textTransform:"uppercase"}}>Att%</th></>}
                      </tr></thead>
                      <tbody>
                        {inactiveSumm.map(({member:m,total,att,rate})=>(
                          <tr key={m.id} className="row" style={{borderTop:"1px solid #3B1A1A"}}>
                            <td style={{padding:"8px 12px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:20,height:20,borderRadius:5,background:m.color+"22",border:"2px solid "+m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:m.color}}>{m.avatar}</div><div><div style={{fontSize:12,fontWeight:600,color:"#94A3B8"}}>{m.name}</div><div style={{fontSize:9,color:"#4B5E80"}}>#{m.id}</div></div><span style={{fontSize:9,background:"#3B1A1A",color:"#FCA5A5",borderRadius:6,padding:"1px 5px",fontWeight:700}}>Inactive</span></div></td>
                            {rType!=="attendance" && <><td style={{padding:"8px 9px",textAlign:"center",fontWeight:700,color:m.color,fontSize:14}}>{total}</td><td style={{padding:"8px 9px",textAlign:"center",color:"#64748B",fontSize:12}}>{totalLeads?Math.round(total/totalLeads*100):0}%</td></>}
                            {rType!=="leads" && <><td style={{padding:"8px 5px",textAlign:"center",fontWeight:700,color:"#6EE7B7",fontSize:12}}>{att.P}</td><td style={{padding:"8px 5px",textAlign:"center",fontWeight:700,color:"#FCA5A5",fontSize:12}}>{att.A}</td><td style={{padding:"8px 5px",textAlign:"center",fontWeight:700,color:"#FCD34D",fontSize:12}}>{att.HD}</td><td style={{padding:"8px 5px",textAlign:"center",fontWeight:700,color:"#C4B5FD",fontSize:12}}>{att.L}</td><td style={{padding:"8px 5px",textAlign:"center",fontWeight:700,color:"#FB923C",fontSize:12}}>{att.LT}</td>
                            <td style={{padding:"8px 9px",textAlign:"center"}}><span style={{background:rate>=80?"#064E3B":rate>=50?"#3B2E0A":"#3B1A1A",color:rate>=80?"#6EE7B7":rate>=50?"#FCD34D":"#FCA5A5",borderRadius:6,padding:"2px 7px",fontSize:11,fontWeight:700}}>{rate}%</span></td></>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* BIN */}
        {tab==="bin" && (
          <div>
            <div style={{...card,padding:"14px 18px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:20}}>🗑</span>
              <div>
                <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:14}}>Deleted Members</div>
                <div style={{fontSize:12,color:"#4B5E80",marginTop:2}}>Restore or permanently delete. Deleted members are hidden everywhere.</div>
              </div>
            </div>
            {binMembers.length===0 ? (
              <div style={{...card,padding:40,textAlign:"center"}}>
                <div style={{fontSize:40,marginBottom:12}}>🗑</div>
                <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:16,color:"#4B5E80"}}>Bin is empty</div>
                <div style={{fontSize:13,color:"#2D3E5C",marginTop:6}}>Deleted members will appear here</div>
              </div>
            ) : (
              <div style={{...card,overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr style={{background:"#0D1424"}}>
                    {["Member","Role","All-Time Leads","Actions"].map(h=>(
                      <th key={h} style={{padding:"10px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"#4B5E80",textTransform:"uppercase",letterSpacing:".07em"}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {binMembers.map(m=>{
                      const tot=leads.filter(l=>l.memberId===m.id).reduce((s,l)=>s+l.count,0);
                      return (
                        <tr key={m.id} className="row" style={{borderTop:"1px solid #1A2235",opacity:.8}}>
                          <td style={{padding:"12px 16px"}}>
                            <div style={{display:"flex",alignItems:"center",gap:9}}>
                              <div style={{width:30,height:30,borderRadius:8,background:m.color+"22",border:"2px solid "+m.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:m.color}}>{m.avatar}</div>
                              <div><div style={{fontWeight:600,fontSize:14,color:"#94A3B8"}}>{m.name}</div><div style={{fontSize:10,color:"#4B5E80"}}>#{m.id}</div></div>
                              <span className="bgd">Deleted</span>
                            </div>
                          </td>
                          <td style={{padding:"12px 16px",color:"#64748B",fontSize:13}}>{m.role}</td>
                          <td style={{padding:"12px 16px",fontWeight:700,color:m.color,fontSize:16}}>{tot}</td>
                          <td style={{padding:"12px 16px"}}>
                            <div style={{display:"flex",gap:6}}>
                              <button className="btnGR" style={{fontSize:12,padding:"5px 10px"}} onClick={()=>restoreMember(m.id)}>↩ Restore</button>
                              <button className="btnR"  style={{fontSize:12,padding:"5px 10px"}} onClick={()=>hardDelete(m.id)}>🗑 Delete Forever</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div style={{borderTop:"1px solid #0D1424",padding:"11px 24px",display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:"#0A0F1E"}}>
        <div style={{display:"flex",alignItems:"center",gap:3}}>
          <span style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:14,background:"linear-gradient(135deg,#0EA5E9,#6366F1)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"1px"}}>U-TECH</span>
          <span style={{fontSize:9,color:"#0EA5E9",verticalAlign:"super",fontWeight:700,lineHeight:1}}>®</span>
        </div>
        <span style={{color:"#1E2A45",fontSize:11}}>|</span>
        <span style={{fontSize:11,color:"#2D3E5C"}}>Designed & Developed by U-TECH®</span>
      </div>

      {/* ADD MEMBER MODAL */}
      {showAddM && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowAddM(false)}>
          <div className="modal">
            <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:17,marginBottom:20}}>👥 Add Team Member</div>
            <div style={{marginBottom:13}}><label style={{fontSize:11,color:"#64748B",fontWeight:700,marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:".07em"}}>Full Name *</label><input style={inp} placeholder="e.g. John Smith" value={mName} onChange={e=>setMName(e.target.value)}/></div>
            <div style={{marginBottom:13}}><label style={{fontSize:11,color:"#64748B",fontWeight:700,marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:".07em"}}>Role</label><input style={inp} placeholder="e.g. Sales Lead" value={mRole} onChange={e=>setMRole(e.target.value)}/></div>
            <div style={{marginBottom:22}}><label style={{fontSize:11,color:"#64748B",fontWeight:700,marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:".07em"}}>Status</label><select style={{...inp,cursor:"pointer"}} value={mStatus} onChange={e=>setMStatus(e.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
            <div style={{display:"flex",gap:9}}><button className="btnG" onClick={()=>setShowAddM(false)} style={{flex:1}}>Cancel</button><button className="btnP" onClick={addMember} style={{flex:2}}>Add Member</button></div>
          </div>
        </div>
      )}

      {/* ADD LEAD MODAL */}
      {showAddL && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setShowAddL(false)}>
          <div className="modal">
            <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:17,marginBottom:20}}>🎯 Add Lead Entry</div>
            <div style={{marginBottom:13}}><label style={{fontSize:11,color:"#64748B",fontWeight:700,marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:".07em"}}>Team Member *</label>
              <select style={{...inp,cursor:"pointer"}} value={lMember} onChange={e=>setLMember(e.target.value)}>
                <option value="">Select member...</option>
                {activeM.map(m=>(<option key={m.id} value={m.id}>{m.name}</option>))}
              </select>
            </div>
            <div style={{marginBottom:13}}><label style={{fontSize:11,color:"#64748B",fontWeight:700,marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:".07em"}}>Number of Leads *</label><input style={inp} type="number" min="1" placeholder="e.g. 15" value={lCount} onChange={e=>setLCount(e.target.value)}/></div>
            <div style={{marginBottom:22}}><label style={{fontSize:11,color:"#64748B",fontWeight:700,marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:".07em"}}>Date *</label><input style={inp} type="date" value={lDate} onChange={e=>setLDate(e.target.value)}/></div>
            <div style={{display:"flex",gap:9}}><button className="btnG" onClick={()=>setShowAddL(false)} style={{flex:1}}>Cancel</button><button className="btnP" onClick={addLead} style={{flex:2}}>Save Entry</button></div>
          </div>
        </div>
      )}

      {showCreds  && <ChangeCredsModal creds={creds} onSave={c=>setCreds(c)} onClose={()=>setShowCreds(false)}/>}
      {showCustom && <AppCustomizer appCfg={appCfg} onSave={c=>setAppCfg(c)} onClose={()=>setShowCustom(false)}/>}

      {/* DELETE CONFIRM */}
      {confirmDel && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&setConfirmDel(null)}>
          <div className="modal" style={{maxWidth:360}}>
            <div style={{fontSize:36,textAlign:"center",marginBottom:12}}>⚠️</div>
            <div style={{fontFamily:"'Space Grotesk','DM Sans',sans-serif",fontWeight:700,fontSize:17,textAlign:"center",marginBottom:8}}>Delete Member?</div>
            <div style={{fontSize:13,color:"#94A3B8",textAlign:"center",marginBottom:24,lineHeight:1.6}}>
              This member will be hidden from all sections and moved to the Bin. You can restore them anytime.
            </div>
            <div style={{display:"flex",gap:9}}>
              <button className="btnG" onClick={()=>setConfirmDel(null)} style={{flex:1}}>Cancel</button>
              <button className="btnR" onClick={()=>softDelete(confirmDel)} style={{flex:1,fontWeight:700}}>Move to Bin</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [creds,    setCreds]   = useState(INIT_CREDS);
  const [appCfg,   setAppCfg] = useState(INIT_APP);
  const [loggedIn, setLoggedIn] = useState(false);
  if(!loggedIn) return <Login creds={creds} appCfg={appCfg} onLogin={()=>setLoggedIn(true)}/>;
  return <Dashboard creds={creds} setCreds={setCreds} appCfg={appCfg} setAppCfg={setAppCfg} onLogout={()=>setLoggedIn(false)}/>;
}