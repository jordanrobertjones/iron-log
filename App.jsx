import React, { useState, useEffect, useCallback, useRef } from "react";
import { auth, googleProvider } from "./firebase";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { loadUserData, saveUserData, updateField } from "./db";
import {
  ALTS, DEFAULT_EX, DAY_SLOTS, DAYS_META, DK, GOALS,
  SEED_W, SEED_C,
  fS, pS, fD, getProg, nxDay, getCoach, mkCSV, getExForSlot
} from "./data";

const PC = { up: "#45B764", down: "#E8453C", momentum: "#2D7DD2", steady: "#888", none: "#555" };
const PL = { up: "GO UP", down: "HOLD", momentum: "BUILDING", steady: "STEADY" };
const CC = { up: "#45B764", caution: "#F59E0B", steady: "#2D7DD2", info: "#888" };

const pill = a => ({ padding: "6px 14px", background: a ? "#282828" : "transparent", border: `1px solid ${a ? "#444" : "#282828"}`, borderRadius: 20, color: a ? "#F0EDE8" : "#555", fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" });
const inp = { padding: "10px 4px", background: "#1E1E1E", border: "1px solid #2A2A2A", borderRadius: 8, color: "#F0EDE8", fontSize: 17, fontWeight: 600, textAlign: "center", fontFamily: "monospace", outline: "none", boxSizing: "border-box", width: "100%" };

export default function App() {
  const [user, setUser] = useState(undefined); // undefined=loading, null=logged out
  const [data, setData] = useState(() => JSON.parse(JSON.stringify(SEED_W)));
  const [cardio, setCardio] = useState(() => JSON.parse(JSON.stringify(SEED_C)));
  const [goal, setGoal] = useState("full");
  const [swaps, setSwaps] = useState({});
  const [tab, setTab] = useState(() => nxDay(SEED_W));
  const [sub, setSub] = useState("log");
  const [cur, setCur] = useState({});
  const [oc, setOc] = useState({});
  const [toast, setToast] = useState(null);
  const [rests, setRests] = useState({});
  const [sws2, setSws2] = useState({});
  const [showG, setShowG] = useState(false);
  const [swapOpen, setSwapOpen] = useState(null);
  const [customName, setCustomName] = useState("");
  const riR = useRef({});
  const swR = useRef({});
  const [cf, setCf] = useState({ distance: "", time: "", speed: "", calories: "", hr: "", notes: "" });

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u || null));
    return unsub;
  }, []);

  // Load user data from Firestore when logged in
  useEffect(() => {
    if (!user) return;
    (async () => {
      const d = await loadUserData(user.uid);
      if (d) {
        if (d.workouts && Object.keys(d.workouts).length) { setData(d.workouts); setTab(nxDay(d.workouts)); }
        if (d.cardio?.length) setCardio(d.cardio);
        if (d.goal) setGoal(d.goal);
        if (d.swaps) setSwaps(d.swaps);
      } else {
        // First time user -- save seed data
        await saveUserData(user.uid, { workouts: SEED_W, cardio: SEED_C, goal: "full", swaps: {} });
      }
    })();
  }, [user]);

  // Cleanup timers
  useEffect(() => () => {
    Object.values(riR.current).forEach(clearInterval);
    Object.values(swR.current).forEach(clearInterval);
  }, []);

  const flash = m => { setToast(m); setTimeout(() => setToast(null), 2200); };

  const persist = async (w, c) => {
    if (!user) return;
    await saveUserData(user.uid, { workouts: w, cardio: c });
  };

  const getLast = useCallback((dk, eid) => {
    const ss = data[dk]; if (!ss) return null;
    for (let i = ss.length - 1; i >= 0; i--) { const e = ss[i].exercises?.[eid]; if (e?.weight != null) return e; }
    return null;
  }, [data]);

  const upd = (dk, eid, f, v) => setCur(p => ({ ...p, [dk]: { ...(p[dk] || {}), [eid]: { ...(p[dk]?.[eid] || {}), [f]: v } } }));
  const startRest = id => { if (riR.current[id]) clearInterval(riR.current[id]); setRests(p => ({ ...p, [id]: 60 })); riR.current[id] = setInterval(() => { setRests(p => { const n = (p[id] || 0) - 1; if (n <= 0) { clearInterval(riR.current[id]); delete riR.current[id]; return { ...p, [id]: 0 }; } return { ...p, [id]: n }; }); }, 1000); };
  const startSW = (eid, si) => { const k = `${eid}-${si}`; if (swR.current[k]) clearInterval(swR.current[k]); setSws2(p => ({ ...p, [k]: { on: true, s: 0 } })); swR.current[k] = setInterval(() => { setSws2(p => { const c = p[k]; if (!c) return p; return { ...p, [k]: { ...c, s: c.s + 1 } }; }); }, 1000); };
  const stopSW = (eid, si, dk) => { const k = `${eid}-${si}`; if (swR.current[k]) { clearInterval(swR.current[k]); delete swR.current[k]; } setSws2(p => { const c = p[k]; if (!c) return p; upd(dk, eid, `set${si}`, String(c.s)); return { ...p, [k]: { on: false, s: c.s } }; }); };

  const doSwap = async (dk, slotIdx, newId) => {
    const ns = { ...swaps, [`${dk}-${slotIdx}`]: newId };
    setSwaps(ns); setSwapOpen(null); setCustomName("");
    if (user) await updateField(user.uid, "swaps", ns);
    flash(`Swapped to ${DEFAULT_EX[newId]?.name || newId}`);
  };

  const doCustomSwap = (dk, slotIdx) => {
    if (!customName.trim()) return;
    const cid = "custom-" + customName.trim().toLowerCase().replace(/[^a-z0-9]/g, "-");
    const origSlot = DAY_SLOTS[dk][slotIdx];
    const orig = DEFAULT_EX[origSlot];
    DEFAULT_EX[cid] = { id: cid, name: customName.trim(), target: orig?.target || "3x8-12", sets: orig?.sets || 3, range: orig?.range || [6, 12], unit: orig?.unit || "lbs", timed: false, exhaust: false, cue: "Custom exercise", notes: "", video: "" };
    doSwap(dk, slotIdx, cid);
  };

  const save = async dk => {
    const slots = DAY_SLOTS[dk]; const se = {}; let has = false;
    slots.forEach((_, i) => { const ex = getExForSlot(swaps, dk, i); const c2 = cur[dk]?.[ex.id]; if (!c2) return; const w = parseFloat(c2.weight) || 0; const sets = Array.from({ length: ex.sets }, (_, j) => ex.timed ? pS(c2[`set${j}`]) : (parseFloat(c2[`set${j}`]) || 0)); if (w > 0 || sets.some(s => s > 0)) { has = true; se[ex.id] = { weight: w, sets }; } });
    if (!has) { flash("Enter numbers!"); return; }
    const nd = { ...data, [dk]: [...(data[dk] || []), { date: new Date().toISOString(), exercises: se }] };
    setData(nd); await persist(nd, cardio);
    flash("Saved!"); setCur(p => ({ ...p, [dk]: {} }));
  };

  const saveC = async () => {
    if (!cf.distance && !cf.time) { flash("Enter distance or time!"); return; }
    const nc = [...cardio, { date: new Date().toISOString(), ...cf }];
    setCardio(nc); await persist(data, nc);
    flash("Run saved!"); setCf({ distance: "", time: "", speed: "", calories: "", hr: "", notes: "" });
  };

  const xport = () => {
    const csv = mkCSV(data, cardio, swaps);
    const b = new Blob([csv], { type: "text/csv" }); const u = URL.createObjectURL(b);
    const a = document.createElement("a"); a.href = u; a.download = `iron-log-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(u); flash("CSV downloaded!");
  };

  const chGoal = async g => { setGoal(g); setShowG(false); if (user) await updateField(user.uid, "goal", g); };

  const handleSignIn = async () => {
    try { await signInWithPopup(auth, googleProvider); }
    catch (e) { console.error(e); flash("Sign-in failed. Try again."); }
  };

  // Loading auth
  if (user === undefined) return (
    <div style={{ fontFamily: "system-ui", background: "#0C0C0C", color: "#666", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 14 }}>Loading...</div>
    </div>
  );

  // Login screen
  if (user === null) return (
    <div style={{ fontFamily: "system-ui", background: "#0C0C0C", color: "#F0EDE8", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20, padding: 40 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "#555" }}>Iron Log</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, textAlign: "center" }}>Your gym. Your data. Any device.</h1>
      <p style={{ color: "#888", fontSize: 14, textAlign: "center", maxWidth: 300, lineHeight: 1.6 }}>Track weights, get progression suggestions, and coach your runs. Syncs across phone and computer.</p>
      <button onClick={handleSignIn} style={{ padding: "14px 28px", background: "#fff", border: "none", borderRadius: 12, color: "#000", fontSize: 15, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
        Sign in with Google
      </button>
    </div>
  );

  // Main app (logged in)
  const isC = tab === "CARDIO", isH = tab === "HISTORY", dm = DAYS_META[tab], nd = nxDay(data);
  const coach = getCoach(cardio, goal);
  const gLabel = GOALS.find(g => g.id === goal)?.label || "";

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,sans-serif", background: "#0C0C0C", color: "#F0EDE8", minHeight: "100vh", maxWidth: 480, margin: "0 auto", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ padding: "16px 20px 10px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "#555" }}>Iron Log</div>
          <h1 style={{ fontSize: 19, fontWeight: 700, margin: "4px 0 0" }}>{isC ? "Treadmill" : isH ? "All History" : dm ? `${dm.name}: ${dm.sub}` : ""}</h1>
        </div>
        <button onClick={() => signOut(auth)} style={{ padding: "4px 10px", background: "transparent", border: "1px solid #333", borderRadius: 6, color: "#555", fontSize: 10, fontFamily: "inherit", cursor: "pointer", marginTop: 4 }}>Sign out</button>
      </div>

      {dm && !isC && !isH && (
        <div style={{ margin: "0 20px 4px", padding: "9px 14px", borderRadius: 10, background: (tab === nd ? dm.color : "#666") + "18", border: `1px solid ${tab === nd ? dm.color : "#666"}33`, fontSize: 13, fontWeight: 600, color: tab === nd ? dm.color : "#888" }}>{tab === nd ? `Up for ${dm.name} today` : `Next: Day ${nd}`}</div>
      )}

      {/* Nav */}
      <div style={{ display: "flex", borderBottom: "1px solid #1A1A1A", position: "sticky", top: 0, background: "#0C0C0C", zIndex: 50 }}>
        {DK.map(k => <button key={k} onClick={() => { setTab(k); setSub("log"); }} style={{ flex: 1, padding: "12px 0", background: "none", border: "none", borderBottom: tab === k ? `3px solid ${DAYS_META[k].color}` : "3px solid transparent", color: tab === k ? "#F0EDE8" : "#555", fontSize: 13, fontWeight: tab === k ? 700 : 500, fontFamily: "inherit", cursor: "pointer" }}>{k}</button>)}
        <button onClick={() => { setTab("CARDIO"); setSub("log"); }} style={{ flex: 1, padding: "12px 0", background: "none", border: "none", borderBottom: isC ? "3px solid #F59E0B" : "3px solid transparent", color: isC ? "#F0EDE8" : "#555", fontSize: 13, fontWeight: isC ? 700 : 500, fontFamily: "inherit", cursor: "pointer" }}>Run</button>
        <button onClick={() => setTab("HISTORY")} style={{ flex: 1, padding: "12px 0", background: "none", border: "none", borderBottom: isH ? "3px solid #888" : "3px solid transparent", color: isH ? "#F0EDE8" : "#555", fontSize: 13, fontWeight: isH ? 700 : 500, fontFamily: "inherit", cursor: "pointer" }}>Log</button>
      </div>

      {/* ═══ WEIGHTS ═══ */}
      {dm && !isC && !isH && (
        <div>
          <div style={{ display: "flex", gap: 6, padding: "10px 20px" }}>
            <button style={pill(sub === "log")} onClick={() => setSub("log")}>Today</button>
            <button style={pill(sub === "history")} onClick={() => setSub("history")}>Past</button>
          </div>
          {sub === "log" && <div style={{ padding: "8px 20px" }}>
            {DAY_SLOTS[tab].map((slotId, slotIdx) => {
              const ex = getExForSlot(swaps, tab, slotIdx);
              const last = getLast(tab, ex.id), p = getProg(ex, last), isO = oc[ex.id], c2 = cur[tab]?.[ex.id] || {}, rest = rests[ex.id];
              const swapKey = `${tab}-${slotIdx}`, isSwapped = !!swaps[swapKey], origId = slotId, alts = ALTS[origId] || [];

              return (
                <div key={slotIdx} style={{ background: "#141414", borderRadius: 12, marginBottom: 10, borderLeft: `4px solid ${dm.color}`, overflow: "hidden" }}>
                  <div style={{ padding: "12px 14px 6px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                        {ex.name}
                        {isSwapped && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#F59E0B22", color: "#F59E0B", fontWeight: 700 }}>SWAPPED</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "#555", marginTop: 1 }}>{ex.target}{ex.timed ? " (timed)" : ""}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {last && p.t !== "none" && <span style={{ padding: "2px 7px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: PC[p.t] + "22", color: PC[p.t] }}>{PL[p.t]}</span>}
                      <button onClick={() => setSwapOpen(swapOpen === swapKey ? null : swapKey)} style={{ padding: "4px 6px", background: "#ffffff08", border: "1px solid #ffffff15", borderRadius: 6, color: "#666", fontSize: 10, fontFamily: "inherit", cursor: "pointer" }}>&#8644;</button>
                    </div>
                  </div>

                  {swapOpen === swapKey && (
                    <div style={{ margin: "0 14px 8px", padding: "10px", background: "#0A0A0A", borderRadius: 8, border: "1px solid #2A2A2A" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 6 }}>Swap exercise (history preserved)</div>
                      {isSwapped && <button onClick={async () => { const ns = { ...swaps }; delete ns[swapKey]; setSwaps(ns); if (user) await updateField(user.uid, "swaps", ns); setSwapOpen(null); flash(`Back to ${DEFAULT_EX[origId]?.name}`); }} style={{ display: "block", width: "100%", padding: "8px 10px", marginBottom: 4, background: "#45B76415", border: "1px solid #45B76430", borderRadius: 6, color: "#45B764", fontSize: 12, fontFamily: "inherit", cursor: "pointer", textAlign: "left", fontWeight: 600 }}>Restore: {DEFAULT_EX[origId]?.name}</button>}
                      {alts.map(alt => (
                        <button key={alt.id} onClick={() => doSwap(tab, slotIdx, alt.id)} style={{ display: "block", width: "100%", padding: "8px 10px", marginBottom: 4, background: ex.id === alt.id ? "#2A2A2A" : "transparent", border: "1px solid #222", borderRadius: 6, color: ex.id === alt.id ? "#F0EDE8" : "#999", fontSize: 12, fontFamily: "inherit", cursor: "pointer", textAlign: "left" }}>{alt.name} <span style={{ color: "#555", fontSize: 10 }}>-- {alt.cue}</span></button>
                      ))}
                      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        <input type="text" placeholder="Custom exercise" value={customName} onChange={e => setCustomName(e.target.value)} style={{ flex: 1, padding: "8px", background: "#1E1E1E", border: "1px solid #2A2A2A", borderRadius: 6, color: "#F0EDE8", fontSize: 12, fontFamily: "inherit", outline: "none" }} />
                        <button onClick={() => doCustomSwap(tab, slotIdx)} style={{ padding: "8px 12px", background: "#2D7DD222", border: "1px solid #2D7DD244", borderRadius: 6, color: "#2D7DD2", fontSize: 11, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>Add</button>
                      </div>
                    </div>
                  )}

                  {last && <div style={{ padding: "2px 14px 6px", fontSize: 12, color: "#666" }}>Last: {last.weight > 0 ? `${last.weight}${ex.unit === "sec" ? "lbs" : ex.unit} -- ` : ""}{ex.timed ? last.sets.map(fS).join(", ") : last.sets.join(", ") + " reps"}</div>}
                  <div style={{ padding: "8px 12px", margin: "0 14px 8px", borderRadius: 8, fontSize: 12, lineHeight: 1.5, background: PC[p.t] + "10", color: PC[p.t], border: `1px solid ${PC[p.t]}20` }}>{p.m}</div>
                  <div style={{ display: "flex", gap: 8, padding: "0 14px 6px", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#555", fontWeight: 600, minWidth: 42 }}>Weight</span>
                    <input type="number" inputMode="decimal" placeholder={last ? String(last.weight) : "0"} value={c2.weight || ""} onChange={e => upd(tab, ex.id, "weight", e.target.value)} style={{ ...inp, fontSize: 16, padding: "10px 8px", flex: 1 }} />
                    <span style={{ fontSize: 11, color: "#444", minWidth: 24 }}>{ex.unit === "sec" ? "lbs" : ex.unit}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, padding: "0 14px 8px", alignItems: "flex-end" }}>
                    {Array.from({ length: ex.sets }).map((_, i) => {
                      const isMax = i === ex.sets - 1 && ex.exhaust, swk = `${ex.id}-${i}`, sw = sws2[swk];
                      return (
                        <div key={i} style={{ flex: 1 }}>
                          <div style={{ fontSize: 10, color: isMax ? "#F59E0B" : "#444", textAlign: "center", fontWeight: isMax ? 700 : 600, marginBottom: 3 }}>{isMax ? "MAX" : `SET ${i + 1}`}</div>
                          {ex.timed ? (
                            <div>
                              <input type="text" inputMode="text" placeholder={last?.sets?.[i] != null ? fS(last.sets[i]) : "-"} value={sw?.on ? fS(sw.s) : (sw && !sw.on ? fS(sw.s) : (c2[`set${i}`] || ""))} onChange={e => { if (!sw?.on) upd(tab, ex.id, `set${i}`, e.target.value); }} readOnly={!!sw?.on} style={{ ...inp, background: sw?.on ? "#0d1f0d" : "#1E1E1E", border: `1px solid ${sw?.on ? "#45B76444" : "#2A2A2A"}`, color: sw?.on ? "#45B764" : "#F0EDE8" }} />
                              <button onClick={() => { if (sw?.on) stopSW(ex.id, i, tab); else { if (sw) setSws2(p => { const n = { ...p }; delete n[swk]; return n; }); startSW(ex.id, i); } }} style={{ width: "100%", marginTop: 3, padding: "5px", background: sw?.on ? "#E8453C22" : "#45B76422", border: `1px solid ${sw?.on ? "#E8453C44" : "#45B76444"}`, borderRadius: 6, color: sw?.on ? "#E8453C" : "#45B764", fontSize: 10, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>{sw?.on ? "STOP" : sw ? "RESTART" : "START"}</button>
                            </div>
                          ) : (
                            <input type="number" inputMode="numeric" placeholder={last?.sets?.[i] != null ? String(last.sets[i]) : "-"} value={c2[`set${i}`] || ""} onChange={e => upd(tab, ex.id, `set${i}`, e.target.value)} style={inp} />
                          )}
                        </div>
                      );
                    })}
                    {!ex.timed && <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 1 }}><button onClick={() => startRest(ex.id)} style={{ padding: "8px", background: "#F59E0B22", border: "1px solid #F59E0B44", borderRadius: 6, color: "#F59E0B", fontSize: 10, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>60s</button></div>}
                  </div>
                  {ex.timed && <div style={{ display: "flex", justifyContent: "center", padding: "0 14px 6px" }}><button onClick={() => startRest(ex.id)} style={{ padding: "5px 14px", background: "#F59E0B22", border: "1px solid #F59E0B44", borderRadius: 6, color: "#F59E0B", fontSize: 10, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>60s REST</button></div>}
                  {rest > 0 && <div style={{ padding: "6px 14px", margin: "0 14px 6px", borderRadius: 8, fontSize: 18, fontWeight: 700, textAlign: "center", fontFamily: "monospace", background: "#F59E0B10", border: "1px solid #F59E0B25", color: "#F59E0B" }}>Rest: {rest}s</div>}
                  {rest === 0 && rests.hasOwnProperty(ex.id) && <div style={{ padding: "6px 14px", margin: "0 14px 6px", borderRadius: 8, fontSize: 18, fontWeight: 700, textAlign: "center", fontFamily: "monospace", background: "#45B76410", border: "1px solid #45B76425", color: "#45B764" }}>GO!</div>}
                  <div style={{ padding: "8px 14px", fontSize: 11, color: isO ? "#999" : "#665", lineHeight: isO ? 1.7 : 1.4, borderTop: "1px solid #1A1A1A", whiteSpace: isO ? "pre-line" : "normal", background: isO ? "#0A0A0A" : "transparent" }}>
                    <div onClick={() => setOc(p => ({ ...p, [ex.id]: !p[ex.id] }))} style={{ cursor: "pointer" }}>{isO ? ex.notes : `💡 ${ex.cue}`}{!isO && <span style={{ color: "#333", marginLeft: 4, fontSize: 10 }}>tap</span>}</div>
                    {isO && ex.video && <a href={ex.video} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 8, padding: "6px 12px", background: "#E8453C22", border: "1px solid #E8453C44", borderRadius: 6, color: "#E8453C", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>Watch Form Videos</a>}
                  </div>
                </div>
              );
            })}
            <button onClick={() => save(tab)} style={{ display: "block", width: "100%", padding: "14px", background: dm.color, border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", marginTop: 4 }}>Save Workout</button>
          </div>}

          {sub === "history" && <div style={{ padding: "8px 20px" }}>
            {!(data[tab]?.length) ? <div style={{ textAlign: "center", padding: 36, color: "#444", fontSize: 13 }}>No sessions yet.</div> :
              [...data[tab]].reverse().map((s, i) => (
                <div key={i} style={{ padding: "10px 14px", background: "#141414", borderRadius: 10, marginBottom: 6, fontSize: 12, lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 700, marginBottom: 3 }}>{fD(s.date)}</div>
                  {Object.entries(s.exercises || {}).map(([eid, d]) => {
                    const exDef = DEFAULT_EX[eid];
                    return <div key={eid} style={{ color: "#777" }}>{exDef?.name || eid}: {d.weight > 0 ? `${d.weight}${exDef?.unit === "sec" ? "lbs" : exDef?.unit || "lbs"} -- ` : ""}{exDef?.timed ? d.sets.map(fS).join(", ") : d.sets.join(", ") + " reps"}</div>;
                  })}
                </div>
              ))}
          </div>}
        </div>
      )}

      {/* ═══ RUN ═══ */}
      {isC && (
        <div>
          <div style={{ padding: "10px 20px 0" }}>
            <button onClick={() => setShowG(!showG)} style={{ width: "100%", padding: "10px 14px", background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 10, color: "#F0EDE8", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between" }}>
              <span>Goal: {gLabel}</span><span style={{ color: "#555", fontSize: 11 }}>{showG ? "close" : "change"}</span>
            </button>
            {showG && <div style={{ marginTop: 6, background: "#141414", borderRadius: 10, border: "1px solid #2A2A2A", overflow: "hidden" }}>{GOALS.map(g => <button key={g.id} onClick={() => chGoal(g.id)} style={{ display: "block", width: "100%", padding: "12px 14px", background: goal === g.id ? "#2A2A2A" : "transparent", border: "none", borderBottom: "1px solid #1A1A1A", color: goal === g.id ? "#F0EDE8" : "#888", fontSize: 13, fontFamily: "inherit", cursor: "pointer", textAlign: "left", fontWeight: goal === g.id ? 600 : 400 }}>{g.label}</button>)}</div>}
          </div>
          <div style={{ margin: "10px 20px", padding: "14px", background: (CC[coach.type] || "#888") + "12", border: `1px solid ${CC[coach.type] || "#888"}25`, borderRadius: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: CC[coach.type] || "#888", marginBottom: 6 }}>{coach.title}</div>
            <div style={{ fontSize: 12, lineHeight: 1.6, color: "#CCC" }}>{coach.msg}</div>
            {coach.trend && <div style={{ fontSize: 11, color: "#888", marginTop: 8, paddingTop: 8, borderTop: "1px solid #ffffff08" }}>{coach.trend}</div>}
          </div>
          <div style={{ display: "flex", gap: 8, padding: "0 20px 8px" }}>
            <div style={{ flex: 1, padding: "10px", background: "#141414", borderRadius: 8, textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 700 }}>{coach.weekMiles.toFixed(1)}</div><div style={{ fontSize: 10, color: "#555" }}>mi/week</div></div>
            <div style={{ flex: 1, padding: "10px", background: "#141414", borderRadius: 8, textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 700 }}>{coach.weekRuns}</div><div style={{ fontSize: 10, color: "#555" }}>runs</div></div>
            <div style={{ flex: 1, padding: "10px", background: "#141414", borderRadius: 8, textAlign: "center" }}><div style={{ fontSize: 18, fontWeight: 700 }}>{coach.avgPace > 0 ? coach.avgPace.toFixed(1) : "-"}</div><div style={{ fontSize: 10, color: "#555" }}>min/mi</div></div>
          </div>
          <div style={{ display: "flex", gap: 6, padding: "6px 20px" }}>
            <button style={pill(sub === "log")} onClick={() => setSub("log")}>Log Run</button>
            <button style={pill(sub === "history")} onClick={() => setSub("history")}>Past Runs</button>
          </div>
          {sub === "log" && <div style={{ padding: "8px 20px" }}>
            {cardio.length > 0 && <div style={{ padding: "8px 12px", marginBottom: 10, borderRadius: 8, fontSize: 12, background: "#ffffff06", color: "#888", border: "1px solid #ffffff0a" }}>Last ({fD(cardio[cardio.length - 1].date)}): {cardio[cardio.length - 1].distance || "?"} mi in {cardio[cardio.length - 1].time || "?"} min{cardio[cardio.length - 1].speed ? ` -- ${cardio[cardio.length - 1].speed}` : ""}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[["Distance (mi)", "distance", "2.55", "decimal"], ["Time (min)", "time", "30", "decimal"], ["Speed", "speed", "5.3 mph"], ["Calories", "calories", "300", "decimal"], ["Max HR", "hr", "178", "numeric"]].map(([l, k, ph, im]) => (
                <div key={k} style={{ marginBottom: 4 }}>
                  <label style={{ fontSize: 11, color: "#555", fontWeight: 600, marginBottom: 3, display: "block" }}>{l}</label>
                  <input type={im ? "number" : "text"} inputMode={im || "text"} placeholder={ph} value={cf[k]} onChange={e => setCf(f => ({ ...f, [k]: e.target.value }))} style={{ width: "100%", padding: "10px", background: "#1E1E1E", border: "1px solid #2A2A2A", borderRadius: 8, color: "#F0EDE8", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 6, marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: "#555", fontWeight: 600, marginBottom: 3, display: "block" }}>Notes</label>
              <textarea placeholder="How did it feel?" value={cf.notes} onChange={e => setCf(f => ({ ...f, notes: e.target.value }))} style={{ width: "100%", padding: "10px", background: "#1E1E1E", border: "1px solid #2A2A2A", borderRadius: 8, color: "#F0EDE8", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", minHeight: 70, resize: "vertical" }} />
            </div>
            <button onClick={saveC} style={{ display: "block", width: "100%", padding: "14px", background: "#F59E0B", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>Save Run</button>
          </div>}
          {sub === "history" && <div style={{ padding: "8px 20px" }}>
            {!cardio.length ? <div style={{ textAlign: "center", padding: 36, color: "#444", fontSize: 13 }}>No runs yet.</div> :
              [...cardio].reverse().slice(0, 30).map((r, i) => (
                <div key={i} style={{ padding: "10px 14px", background: "#141414", borderRadius: 10, marginBottom: 6, fontSize: 12, lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 700, marginBottom: 3 }}>{fD(r.date)}{parseFloat(r.time) >= 45 && <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: "#F59E0B22", color: "#F59E0B", marginLeft: 6 }}>LONG</span>}</div>
                  <div style={{ color: "#777" }}>{r.distance && `${r.distance} mi`}{r.time && ` in ${r.time} min`}{r.speed && ` -- ${r.speed}`}{r.hr && ` -- HR ${r.hr}`}</div>
                  {r.notes && <div style={{ color: "#555", fontStyle: "italic", marginTop: 4 }}>{r.notes}</div>}
                </div>
              ))}
          </div>}
        </div>
      )}

      {/* ═══ HISTORY ═══ */}
      {isH && (
        <div style={{ padding: "8px 20px" }}>
          <button onClick={xport} style={{ display: "block", width: "100%", padding: "12px", background: "transparent", border: "1px solid #333", borderRadius: 10, color: "#888", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", marginBottom: 12 }}>Export All Data as CSV</button>
          {(() => {
            const all = [];
            for (const dk of DK) (data[dk] || []).forEach(s => all.push({ ...s, dk, tp: "w" }));
            cardio.forEach(r => all.push({ ...r, tp: "c" }));
            all.sort((a, b) => new Date(b.date) - new Date(a.date));
            if (!all.length) return <div style={{ textAlign: "center", padding: 36, color: "#444", fontSize: 13 }}>No workouts yet.</div>;
            return all.slice(0, 50).map((it, i) => (
              <div key={i} style={{ padding: "10px 14px", background: "#141414", borderRadius: 10, marginBottom: 6, fontSize: 12, lineHeight: 1.6 }}>
                <div style={{ fontWeight: 700, marginBottom: 3 }}>
                  {fD(it.date)}
                  {it.tp === "w" && <span style={{ padding: "2px 7px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: DAYS_META[it.dk].color + "22", color: DAYS_META[it.dk].color, marginLeft: 6 }}>{DAYS_META[it.dk].name}</span>}
                  {it.tp === "c" && <span style={{ padding: "2px 7px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: "#F59E0B22", color: "#F59E0B", marginLeft: 6 }}>Run</span>}
                </div>
                {it.tp === "w" && Object.entries(it.exercises || {}).map(([eid, d]) => {
                  const exDef = DEFAULT_EX[eid];
                  return <div key={eid} style={{ color: "#777" }}>{exDef?.name || eid}: {d.weight > 0 ? `${d.weight}${exDef?.unit === "sec" ? "lbs" : exDef?.unit || "lbs"} -- ` : ""}{exDef?.timed ? d.sets.map(fS).join(", ") : d.sets.join(", ") + " reps"}</div>;
                })}
                {it.tp === "c" && (
                  <div>
                    <div style={{ color: "#777" }}>{it.distance && `${it.distance} mi`}{it.time && ` in ${it.time} min`}{it.speed && ` -- ${it.speed}`}</div>
                    {it.notes && <div style={{ color: "#555", fontStyle: "italic", marginTop: 3 }}>{it.notes}</div>}
                  </div>
                )}
              </div>
            ));
          })()}
        </div>
      )}

      {toast && <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "#2A2A2A", color: "#fff", padding: "10px 22px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 100, boxShadow: "0 4px 20px rgba(0,0,0,0.6)" }}>{toast}</div>}
    </div>
  );
}
