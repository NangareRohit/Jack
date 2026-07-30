import React, { useState, useMemo } from "react";
import {
  Smartphone, ShieldCheck, ShieldAlert, Mail, RefreshCw, AlertTriangle,
  CheckCircle2, Send, User, Users, X, Bell, ChevronRight, Radio, Lock
} from "lucide-react";

const todayStr = () => new Date().toISOString().slice(0, 10);

const seedEmployees = [
  { id: "E101", name: "Aarav Sharma", dept: "Sales",     email: "aarav.sharma@yourcompany.com", sim1: "9820011223", op1: "Airtel", sim2: "9820011224", op2: "Jio",     crm: "9820011223", lastReconciled: "2026-06-28" },
  { id: "E102", name: "Priya Nair",   dept: "Collections",email: "priya.nair@yourcompany.com",   sim1: "9920033445", op1: "Vi",     sim2: "9920033446", op2: "Airtel", crm: "9920033446", lastReconciled: "2026-06-27" },
  { id: "E103", name: "Rohan Mehta",  dept: "Sales",     email: "rohan.mehta@yourcompany.com",  sim1: "9769988776", op1: "Jio",    sim2: "9769988777", op2: "Vi",      crm: "8007712233", lastReconciled: null },
  { id: "E104", name: "Sana Iqbal",   dept: "Support",   email: "sana.iqbal@yourcompany.com",   sim1: "9004455667", op1: "Airtel", sim2: "9004455668", op2: "Jio",     crm: "9004455667", lastReconciled: "2026-06-30" },
  { id: "E105", name: "Vivek Rao",    dept: "Collections",email: "vivek.rao@yourcompany.com",    sim1: "9322299881", op1: "Jio",    sim2: "9322299882", op2: "Airtel", crm: "9322299882", lastReconciled: null },
];

// Sends a real email through the user's connected Gmail account via the
// Anthropic API + Gmail MCP connector. Returns { ok, summary }.
async function sendGmail({ to, subject, body }) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content:
              `Use the Gmail tool to send an email right now. ` +
              `To: ${to}\nSubject: ${subject}\nBody:\n${body}\n\n` +
              `Send it exactly as written, then reply with one short confirmation sentence.`,
          },
        ],
        mcp_servers: [
          { type: "url", url: "https://gmailmcp.googleapis.com/mcp/v1", name: "gmail" },
        ],
      }),
    });
    const data = await res.json();
    const toolCalls = (data.content || []).filter((b) => b.type === "mcp_tool_use");
    const toolResults = (data.content || []).filter((b) => b.type === "mcp_tool_result");
    const texts = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join(" ");
    const errored = toolResults.some((b) => b.is_error) || (data.error != null);
    if (errored) {
      const errText = data.error?.message || "Gmail reported an error sending this message.";
      return { ok: false, summary: errText };
    }
    if (toolCalls.length === 0) {
      return { ok: false, summary: texts || "Gmail tool was not invoked — check the connector is enabled." };
    }
    return { ok: true, summary: texts || "Email sent." };
  } catch (err) {
    return { ok: false, summary: `Request failed: ${err.message}` };
  }
}

function computeStatus(emp) {
  const active = emp.crm === emp.sim1 || emp.crm === emp.sim2;
  return active ? "active" : "blocked";
}

function isCurrentMonth(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
}

const styles = `
.simhub { --bg:#0B1220; --panel:#101a2b; --panel2:#0d1626; --line:#1e2a3d; --text:#e7edf5; --muted:#8a97ab;
  --cyan:#22d3ee; --cyan-dim:#0e5866; --green:#34d399; --green-dim:#123a2c; --red:#f87171; --red-dim:#3a1418;
  --amber:#fbbf24; --amber-dim:#3a2c0c;
  background:var(--bg); color:var(--text); font-family:'IBM Plex Sans',Inter,system-ui,sans-serif;
  min-height:100%; border-radius:14px; overflow:hidden; }
.simhub *{ box-sizing:border-box; }
.simhub .mono{ font-family:'IBM Plex Mono',ui-monospace,monospace; letter-spacing:0.02em; }
.sh-topbar{ display:flex; align-items:center; justify-content:space-between; padding:18px 26px;
  border-bottom:1px solid var(--line); background:linear-gradient(180deg, rgba(34,211,238,0.06), transparent); }
.sh-brand{ display:flex; align-items:center; gap:12px; }
.sh-brand-mark{ width:34px; height:34px; border-radius:9px; background:linear-gradient(145deg,var(--cyan),#0891b2);
  display:flex; align-items:center; justify-content:center; color:#04222a; flex-shrink:0; }
.sh-brand-title{ font-family:'Space Grotesk',sans-serif; font-weight:600; font-size:16px; letter-spacing:0.01em; }
.sh-brand-sub{ font-size:11.5px; color:var(--muted); margin-top:1px; }
.sh-tabs{ display:flex; gap:6px; background:var(--panel2); padding:4px; border-radius:10px; border:1px solid var(--line); }
.sh-tab{ display:flex; align-items:center; gap:7px; padding:8px 14px; border-radius:7px; font-size:13px; font-weight:500;
  color:var(--muted); cursor:pointer; border:none; background:transparent; transition:all .15s; }
.sh-tab.on{ background:var(--panel); color:var(--text); box-shadow:0 0 0 1px var(--line) inset; }
.sh-body{ padding:24px 26px 34px; }
.sh-grid-stats{ display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:22px; }
.sh-stat{ background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:16px 18px; }
.sh-stat-label{ font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:var(--muted); margin-bottom:8px; }
.sh-stat-val{ font-family:'Space Grotesk',sans-serif; font-size:26px; font-weight:600; }
.sh-panel{ background:var(--panel); border:1px solid var(--line); border-radius:12px; overflow:hidden; margin-bottom:20px; }
.sh-panel-head{ display:flex; align-items:center; justify-content:between; justify-content:space-between; padding:16px 18px; border-bottom:1px solid var(--line); }
.sh-panel-title{ font-family:'Space Grotesk',sans-serif; font-size:14.5px; font-weight:600; display:flex; align-items:center; gap:8px; }
.sh-btn{ display:flex; align-items:center; gap:7px; padding:9px 15px; border-radius:8px; font-size:13px; font-weight:600;
  border:none; cursor:pointer; transition:transform .1s, filter .15s; }
.sh-btn:hover{ filter:brightness(1.12); }
.sh-btn:active{ transform:scale(0.98); }
.sh-btn-primary{ background:var(--cyan); color:#04222a; }
.sh-btn-ghost{ background:transparent; color:var(--text); border:1px solid var(--line); }
.sh-btn-danger{ background:var(--red); color:#2a0708; }
.sh-table{ width:100%; border-collapse:collapse; font-size:13px; }
.sh-table th{ text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:0.06em; color:var(--muted);
  padding:10px 16px; border-bottom:1px solid var(--line); font-weight:600; }
.sh-table td{ padding:12px 16px; border-bottom:1px solid var(--line); vertical-align:middle; }
.sh-table tr:last-child td{ border-bottom:none; }
.sh-chip{ display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:100px; font-size:11.5px; font-weight:600; }
.sh-chip.active{ background:var(--green-dim); color:var(--green); }
.sh-chip.blocked{ background:var(--red-dim); color:var(--red); }
.sh-chip.pending{ background:var(--amber-dim); color:var(--amber); }
.sh-sim-cell{ display:flex; flex-direction:column; gap:2px; }
.sh-sim-num{ font-size:13px; }
.sh-sim-op{ font-size:10.5px; color:var(--muted); }
.sh-icon-btn{ background:transparent; border:1px solid var(--line); border-radius:7px; padding:6px 8px; color:var(--muted); cursor:pointer; }
.sh-icon-btn:hover{ color:var(--cyan); border-color:var(--cyan); }
.sh-modal-backdrop{ position:fixed; inset:0; background:rgba(3,7,15,0.72); display:flex; align-items:center; justify-content:center; z-index:50; padding:20px; }
.sh-modal{ background:var(--panel); border:1px solid var(--line); border-radius:14px; width:100%; max-width:460px; overflow:hidden; }
.sh-modal-head{ padding:18px 22px; border-bottom:1px solid var(--line); display:flex; align-items:center; justify-content:space-between; }
.sh-modal-body{ padding:20px 22px; }
.sh-field{ margin-bottom:14px; }
.sh-field label{ display:block; font-size:12px; color:var(--muted); margin-bottom:6px; }
.sh-field input, .sh-field select, .sh-field textarea{
  width:100%; background:var(--panel2); border:1px solid var(--line); color:var(--text); border-radius:8px;
  padding:9px 11px; font-size:13.5px; font-family:inherit; }
.sh-field input:focus, .sh-field select:focus, .sh-field textarea:focus{ outline:none; border-color:var(--cyan); }
.sh-notif{ display:flex; gap:10px; padding:11px 16px; border-bottom:1px solid var(--line); font-size:12.5px; }
.sh-notif:last-child{ border-bottom:none; }
.sh-notif-icon{ width:26px; height:26px; border-radius:7px; background:var(--cyan-dim); color:var(--cyan);
  display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.sh-employee-card{ background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:22px; margin-bottom:18px; }
.sh-sim-slot{ background:var(--panel2); border:1px solid var(--line); border-radius:10px; padding:16px 18px; display:flex;
  align-items:center; gap:14px; }
.sh-sim-slot-icon{ width:40px; height:40px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.sh-banner{ display:flex; gap:12px; align-items:flex-start; padding:14px 16px; border-radius:10px; margin-bottom:18px; font-size:13px; }
.sh-banner.danger{ background:var(--red-dim); border:1px solid rgba(248,113,113,0.35); }
.sh-banner.info{ background:var(--cyan-dim); border:1px solid rgba(34,211,238,0.3); }
.sh-empty{ padding:40px 20px; text-align:center; color:var(--muted); font-size:13px; }
`;

function Toast({ text, onDone }) {
  React.useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{
      position: "fixed", bottom: 22, right: 22, background: "#101a2b", border: "1px solid #22d3ee",
      color: "#e7edf5", padding: "12px 16px", borderRadius: 10, fontSize: 13, maxWidth: 320,
      boxShadow: "0 8px 30px rgba(0,0,0,0.4)", zIndex: 100, display: "flex", gap: 10, alignItems: "flex-start"
    }}>
      <Mail size={16} color="#22d3ee" style={{ marginTop: 2, flexShrink: 0 }} />
      <span>{text}</span>
    </div>
  );
}

export default function SimManagementDashboard() {
  const [role, setRole] = useState("admin");
  const [employees, setEmployees] = useState(seedEmployees);
  const [notifications, setNotifications] = useState([
    { id: 1, text: "Monthly reconciliation reminder scheduled for all employees.", ts: "Jul 1" },
  ]);
  const [tickets, setTickets] = useState([]);
  const [editing, setEditing] = useState(null);
  const [selectedEmpId, setSelectedEmpId] = useState(seedEmployees[0].id);
  const [showSpamForm, setShowSpamForm] = useState(false);
  const [toast, setToast] = useState(null);
  const [crmDraft, setCrmDraft] = useState("");
  const [runoEmail, setRunoEmail] = useState("runo-team@yourcompany.com");
  const [itAdminEmail, setItAdminEmail] = useState("it-admin@yourcompany.com");
  const [sending, setSending] = useState(false);
  const [testSendResult, setTestSendResult] = useState(null);

  const pushNotif = (text, meta = {}) =>
    setNotifications((n) => [{ id: Date.now() + Math.random(), text, ts: "Just now", ...meta }, ...n]);

  async function sendTestEmail() {
    setSending(true);
    setTestSendResult(null);
    const r = await sendGmail({
      to: itAdminEmail,
      subject: "SIM Allocation Dashboard — test email",
      body: "This is a test email from the SIM Allocation Control dashboard to confirm the Gmail connection is working.",
    });
    setTestSendResult(r);
    pushNotif(`Test email to ${itAdminEmail}: ${r.ok ? "delivered" : "failed"} — ${r.summary}`, { failed: !r.ok });
    setSending(false);
  }

  const selectedEmp = employees.find((e) => e.id === selectedEmpId);
  const needsReconcile = selectedEmp ? !isCurrentMonth(selectedEmp.lastReconciled) : false;
  const [reconcileOpen, setReconcileOpen] = useState(true);

  const stats = useMemo(() => {
    const blocked = employees.filter((e) => computeStatus(e) === "blocked").length;
    const pending = employees.filter((e) => !isCurrentMonth(e.lastReconciled)).length;
    return { total: employees.length, blocked, active: employees.length - blocked, pending };
  }, [employees]);

  async function saveAllocation(form) {
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === form.id
          ? { ...e, sim1: form.sim1, op1: form.op1, sim2: form.sim2, op2: form.op2 }
          : e
      )
    );
    setEditing(null);
    setSending(true);
    setToast(`Sending notification emails via Gmail…`);

    const runoResult = await sendGmail({
      to: runoEmail,
      subject: `SIM allocation update — ${form.name} (${form.id})`,
      body:
        `Please update the following SIM mapping in Runo:\n\n` +
        `Employee: ${form.name} (${form.id})\n` +
        `SIM1: ${form.sim1} (${form.op1})\n` +
        `SIM2: ${form.sim2} (${form.op2})\n\n` +
        `Sent automatically by the SIM Allocation dashboard.`,
    });
    pushNotif(
      `Runo team email (${runoEmail}) for ${form.name} — SIM1 ${form.sim1} / SIM2 ${form.sim2}: ${runoResult.ok ? "sent" : "failed"} — ${runoResult.summary}`,
      { failed: !runoResult.ok }
    );

    const empRecord = employees.find((e) => e.id === form.id);
    const empResult = await sendGmail({
      to: empRecord?.email || `${form.id}@yourcompany.com`,
      subject: "Your SIM allocation has been updated",
      body:
        `Hi ${form.name},\n\n` +
        `Your registered SIM numbers have been updated in the SIM Allocation system:\n\n` +
        `SIM1: ${form.sim1} (${form.op1})\n` +
        `SIM2: ${form.sim2} (${form.op2})\n\n` +
        `Please make sure Runo uses one of these numbers, or your CRM access may be auto-blocked.`,
    });
    pushNotif(
      `Employee email (${empRecord?.email}) to ${form.name}: ${empResult.ok ? "sent" : "failed"} — ${empResult.summary}`,
      { failed: !empResult.ok }
    );

    setSending(false);
    setToast(
      runoResult.ok && empResult.ok
        ? `Allocation saved. Emails delivered to Runo team and to ${form.name}.`
        : `Allocation saved, but one or more emails failed — check the notification log.`
    );
  }

  async function submitCrmUpdate() {
    if (!crmDraft.trim()) return;
    const newCrm = crmDraft.trim();
    setEmployees((prev) =>
      prev.map((e) => (e.id === selectedEmpId ? { ...e, crm: newCrm } : e))
    );
    const matches = newCrm === selectedEmp.sim1 || newCrm === selectedEmp.sim2;
    setCrmDraft("");
    if (!matches) {
      setToast("This number doesn't match your allotted SIM1/SIM2. Your Runo/CRM access has been blocked.");
      setSending(true);
      const r = await sendGmail({
        to: itAdminEmail,
        subject: `Auto-block: ${selectedEmp.name} (${selectedEmp.id}) using unregistered number`,
        body:
          `${selectedEmp.name} (${selectedEmp.id}) set their active Runo/CRM number to ${newCrm}, ` +
          `which matches neither SIM1 (${selectedEmp.sim1}) nor SIM2 (${selectedEmp.sim2}) on file.\n\n` +
          `Their CRM/Runo access has been automatically blocked pending correction.`,
      });
      pushNotif(
        `Auto-block: ${selectedEmp.name} used ${newCrm} (matches neither SIM1/SIM2). IT alert email: ${r.ok ? "sent" : "failed"} — ${r.summary}`,
        { failed: !r.ok }
      );
      setSending(false);
    } else {
      setToast("Calling number confirmed against allotted SIM. Access active.");
    }
  }

  async function raiseSpam(reason, whichSim) {
    setTickets((t) => [
      { id: Date.now(), empId: selectedEmp.id, name: selectedEmp.name, sim: whichSim, reason, status: "Open" },
      ...t,
    ]);
    setShowSpamForm(false);
    setToast("Submitting spam report via Gmail…");
    setSending(true);
    const simLabel = whichSim === "sim1" ? "SIM1" : "SIM2";
    const r = await sendGmail({
      to: itAdminEmail,
      subject: `Spam/mismatch report — ${selectedEmp.name} (${selectedEmp.id}) — ${simLabel}`,
      body:
        `${selectedEmp.name} (${selectedEmp.id}) raised a spam/mismatch report for ${simLabel} ` +
        `(${whichSim === "sim1" ? selectedEmp.sim1 : selectedEmp.sim2}).\n\nReason given:\n${reason}`,
    });
    pushNotif(
      `Spam report — ${selectedEmp.name}, ${simLabel}. IT alert email: ${r.ok ? "sent" : "failed"} — ${r.summary}`,
      { failed: !r.ok }
    );
    setToast(r.ok ? "Spam report submitted to IT team." : "Spam report saved, but the alert email failed to send.");
    setSending(false);
  }

  function confirmReconciliation(matches) {
    if (matches) {
      setEmployees((prev) =>
        prev.map((e) => (e.id === selectedEmpId ? { ...e, lastReconciled: todayStr() } : e))
      );
      pushNotif(`${selectedEmp.name} confirmed monthly SIM reconciliation — SIM1/SIM2 verified correct.`);
      setToast("Reconciliation confirmed for this month.");
      setReconcileOpen(false);
    } else {
      setShowSpamForm(true);
      setReconcileOpen(false);
    }
  }

  return (
    <div className="simhub">
      <style>{styles}</style>

      <div className="sh-topbar">
        <div className="sh-brand">
          <div className="sh-brand-mark"><Radio size={18} /></div>
          <div>
            <div className="sh-brand-title">SIM Allocation Control</div>
            <div className="sh-brand-sub">HRMS · IT Asset &amp; Telephony Compliance</div>
          </div>
        </div>
        <div className="sh-tabs">
          <button className={`sh-tab ${role === "admin" ? "on" : ""}`} onClick={() => setRole("admin")}>
            <Users size={14} /> IT Admin
          </button>
          <button className={`sh-tab ${role === "employee" ? "on" : ""}`} onClick={() => { setRole("employee"); setReconcileOpen(needsReconcile); }}>
            <User size={14} /> Employee (HRMS)
          </button>
        </div>
      </div>

      <div className="sh-body">
        {role === "admin" ? (
          <>
            <div className="sh-grid-stats">
              <div className="sh-stat">
                <div className="sh-stat-label">Employees Tracked</div>
                <div className="sh-stat-val">{stats.total}</div>
              </div>
              <div className="sh-stat">
                <div className="sh-stat-label">Active / Matched</div>
                <div className="sh-stat-val" style={{ color: "var(--green)" }}>{stats.active}</div>
              </div>
              <div className="sh-stat">
                <div className="sh-stat-label">Auto-Blocked</div>
                <div className="sh-stat-val" style={{ color: "var(--red)" }}>{stats.blocked}</div>
              </div>
              <div className="sh-stat">
                <div className="sh-stat-label">Reconciliation Pending</div>
                <div className="sh-stat-val" style={{ color: "var(--amber)" }}>{stats.pending}</div>
              </div>
            </div>

            <div className="sh-panel">
              <div className="sh-panel-head">
                <div className="sh-panel-title"><Mail size={16} /> Gmail Notification Settings</div>
                <span style={{ fontSize: 11.5, color: "var(--muted)" }}>Emails are sent live via your connected Gmail account</span>
              </div>
              <div style={{ padding: "16px 18px", display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "end" }}>
                <div className="sh-field" style={{ marginBottom: 0 }}>
                  <label>Runo team email</label>
                  <input value={runoEmail} onChange={(e) => setRunoEmail(e.target.value)} placeholder="runo-team@yourcompany.com" />
                </div>
                <div className="sh-field" style={{ marginBottom: 0 }}>
                  <label>IT admin alert email</label>
                  <input value={itAdminEmail} onChange={(e) => setItAdminEmail(e.target.value)} placeholder="it-admin@yourcompany.com" />
                </div>
                <button className="sh-btn sh-btn-ghost" disabled={sending} onClick={sendTestEmail}>
                  <Send size={14} /> {sending ? "Sending…" : "Send test email"}
                </button>
              </div>
              {testSendResult && (
                <div style={{ padding: "0 18px 16px" }}>
                  <div className={`sh-banner ${testSendResult.ok ? "info" : "danger"}`} style={{ margin: 0 }}>
                    {testSendResult.ok ? <CheckCircle2 size={16} color="#22d3ee" /> : <AlertTriangle size={16} color="#f87171" />}
                    <div>{testSendResult.summary}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="sh-panel">
              <div className="sh-panel-head">
                <div className="sh-panel-title"><Smartphone size={16} /> SIM Allocation Register</div>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Runo sync is triggered automatically on save</span>
              </div>
              <table className="sh-table">
                <thead>
                  <tr>
                    <th>Employee</th><th>SIM 1</th><th>SIM 2</th><th>Active CRM Number</th><th>Status</th><th>Reconciled</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((e) => {
                    const status = computeStatus(e);
                    const rec = isCurrentMonth(e.lastReconciled);
                    return (
                      <tr key={e.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{e.name}</div>
                          <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{e.id} · {e.dept}</div>
                        </td>
                        <td>
                          <div className="sh-sim-cell">
                            <span className="sh-sim-num mono">{e.sim1}</span>
                            <span className="sh-sim-op">{e.op1}</span>
                          </div>
                        </td>
                        <td>
                          <div className="sh-sim-cell">
                            <span className="sh-sim-num mono">{e.sim2}</span>
                            <span className="sh-sim-op">{e.op2}</span>
                          </div>
                        </td>
                        <td><span className="mono">{e.crm}</span></td>
                        <td>
                          {status === "active" ? (
                            <span className="sh-chip active"><ShieldCheck size={12} /> Active</span>
                          ) : (
                            <span className="sh-chip blocked"><ShieldAlert size={12} /> Blocked</span>
                          )}
                        </td>
                        <td>
                          {rec ? (
                            <span className="sh-chip active"><CheckCircle2 size={12} /> Done</span>
                          ) : (
                            <span className="sh-chip pending"><AlertTriangle size={12} /> Pending</span>
                          )}
                        </td>
                        <td>
                          <button className="sh-icon-btn" onClick={() => setEditing(e)} title="Edit allocation">
                            <ChevronRight size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="sh-panel">
              <div className="sh-panel-head">
                <div className="sh-panel-title"><Bell size={16} /> Notification Log (Email Simulation)</div>
              </div>
              <div>
                {notifications.length === 0 ? (
                  <div className="sh-empty">No notifications yet.</div>
                ) : notifications.slice(0, 8).map((n) => (
                  <div className="sh-notif" key={n.id}>
                    <div className="sh-notif-icon" style={n.failed ? { background: "var(--red-dim)", color: "var(--red)" } : undefined}>
                      {n.failed ? <AlertTriangle size={13} /> : <Mail size={13} />}
                    </div>
                    <div>
                      <div>{n.text}</div>
                      <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 3 }}>{n.ts}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {tickets.length > 0 && (
              <div className="sh-panel">
                <div className="sh-panel-head">
                  <div className="sh-panel-title"><AlertTriangle size={16} /> Spam Reports Raised</div>
                </div>
                <table className="sh-table">
                  <thead><tr><th>Employee</th><th>SIM</th><th>Reason</th><th>Status</th></tr></thead>
                  <tbody>
                    {tickets.map((t) => (
                      <tr key={t.id}>
                        <td>{t.name}</td>
                        <td>{t.sim === "sim1" ? "SIM 1" : "SIM 2"}</td>
                        <td>{t.reason}</td>
                        <td><span className="sh-chip pending">{t.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="sh-field" style={{ maxWidth: 320, marginBottom: 20 }}>
              <label>Viewing as employee</label>
              <select value={selectedEmpId} onChange={(e) => { setSelectedEmpId(e.target.value); setReconcileOpen(!isCurrentMonth(employees.find(x=>x.id===e.target.value)?.lastReconciled)); }}>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name} — {e.id}</option>)}
              </select>
            </div>

            {selectedEmp && (
              <>
                {computeStatus(selectedEmp) === "blocked" && (
                  <div className="sh-banner danger">
                    <ShieldAlert size={18} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <strong>Your CRM access is blocked.</strong> The active calling number on file doesn't match
                      your allotted SIM1 or SIM2. Update the correct SIM in Runo, or raise a spam request if this
                      number is unauthorized.
                    </div>
                  </div>
                )}

                <div className="sh-employee-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                    <div>
                      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 600 }}>{selectedEmp.name}</div>
                      <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{selectedEmp.id} · {selectedEmp.dept}</div>
                    </div>
                    <button className="sh-btn sh-btn-ghost" onClick={() => setShowSpamForm(true)}>
                      <AlertTriangle size={14} /> Report spam / mismatch
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
                    <div className="sh-sim-slot">
                      <div className="sh-sim-slot-icon" style={{ background: "var(--cyan-dim)", color: "var(--cyan)" }}><Smartphone size={18} /></div>
                      <div>
                        <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>SIM 1</div>
                        <div className="mono" style={{ fontSize: 15, fontWeight: 600 }}>{selectedEmp.sim1}</div>
                        <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{selectedEmp.op1}</div>
                      </div>
                    </div>
                    <div className="sh-sim-slot">
                      <div className="sh-sim-slot-icon" style={{ background: "var(--cyan-dim)", color: "var(--cyan)" }}><Smartphone size={18} /></div>
                      <div>
                        <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>SIM 2</div>
                        <div className="mono" style={{ fontSize: 15, fontWeight: 600 }}>{selectedEmp.sim2}</div>
                        <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{selectedEmp.op2}</div>
                      </div>
                    </div>
                  </div>

                  <div className="sh-field">
                    <label>Number currently active in Runo / personal CRM</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        className="mono"
                        placeholder={selectedEmp.crm}
                        value={crmDraft}
                        onChange={(e) => setCrmDraft(e.target.value)}
                      />
                      <button className="sh-btn sh-btn-primary" onClick={submitCrmUpdate}><Send size={13} /> Update</button>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>
                      Currently on file: <span className="mono">{selectedEmp.crm}</span>. If this ever doesn't match SIM1 or SIM2 above, access is auto-blocked.
                    </div>
                  </div>
                </div>

                <div className="sh-panel">
                  <div className="sh-panel-head">
                    <div className="sh-panel-title"><RefreshCw size={16} /> Monthly Reconciliation</div>
                    <span className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>
                      Last confirmed: {selectedEmp.lastReconciled || "never"}
                    </span>
                  </div>
                  <div style={{ padding: "16px 18px" }}>
                    {isCurrentMonth(selectedEmp.lastReconciled) ? (
                      <div className="sh-chip active"><CheckCircle2 size={12} /> Reconciled for this month</div>
                    ) : (
                      <button className="sh-btn sh-btn-primary" onClick={() => setReconcileOpen(true)}>
                        <RefreshCw size={14} /> Reconcile now
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {editing && (
        <div className="sh-modal-backdrop">
          <div className="sh-modal">
            <div className="sh-modal-head">
              <div className="sh-panel-title"><Lock size={15} /> Allocate SIM — {editing.name}</div>
              <button className="sh-icon-btn" onClick={() => setEditing(null)}><X size={15} /></button>
            </div>
            <AllocateForm emp={editing} onCancel={() => setEditing(null)} onSave={saveAllocation} />
          </div>
        </div>
      )}

      {showSpamForm && selectedEmp && (
        <div className="sh-modal-backdrop">
          <div className="sh-modal">
            <div className="sh-modal-head">
              <div className="sh-panel-title"><AlertTriangle size={15} /> Report spam / mismatch</div>
              <button className="sh-icon-btn" onClick={() => setShowSpamForm(false)}><X size={15} /></button>
            </div>
            <SpamForm onCancel={() => setShowSpamForm(false)} onSubmit={raiseSpam} />
          </div>
        </div>
      )}

      {role === "employee" && selectedEmp && reconcileOpen && needsReconcile && (
        <div className="sh-modal-backdrop">
          <div className="sh-modal">
            <div className="sh-modal-head">
              <div className="sh-panel-title"><RefreshCw size={15} /> Monthly SIM Reconciliation Required</div>
            </div>
            <div className="sh-modal-body">
              <p style={{ fontSize: 13.5, marginTop: 0, marginBottom: 16, color: "var(--muted)" }}>
                Please confirm the SIM numbers registered against your name are correct before continuing.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
                <div className="sh-sim-slot">
                  <div className="sh-sim-slot-icon" style={{ background: "var(--cyan-dim)", color: "var(--cyan)" }}><Smartphone size={16} /></div>
                  <div>
                    <div style={{ fontSize: 10.5, color: "var(--muted)" }}>SIM 1</div>
                    <div className="mono" style={{ fontWeight: 600 }}>{selectedEmp.sim1}</div>
                  </div>
                </div>
                <div className="sh-sim-slot">
                  <div className="sh-sim-slot-icon" style={{ background: "var(--cyan-dim)", color: "var(--cyan)" }}><Smartphone size={16} /></div>
                  <div>
                    <div style={{ fontSize: 10.5, color: "var(--muted)" }}>SIM 2</div>
                    <div className="mono" style={{ fontWeight: 600 }}>{selectedEmp.sim2}</div>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="sh-btn sh-btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => confirmReconciliation(true)}>
                  <CheckCircle2 size={14} /> Confirm, correct
                </button>
                <button className="sh-btn sh-btn-danger" style={{ flex: 1, justifyContent: "center" }} onClick={() => confirmReconciliation(false)}>
                  <AlertTriangle size={14} /> Not correct
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast text={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

function AllocateForm({ emp, onCancel, onSave }) {
  const [sim1, setSim1] = useState(emp.sim1);
  const [op1, setOp1] = useState(emp.op1);
  const [sim2, setSim2] = useState(emp.sim2);
  const [op2, setOp2] = useState(emp.op2);

  return (
    <div className="sh-modal-body">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="sh-field">
          <label>SIM 1 number</label>
          <input className="mono" value={sim1} onChange={(e) => setSim1(e.target.value)} />
        </div>
        <div className="sh-field">
          <label>SIM 1 operator</label>
          <select value={op1} onChange={(e) => setOp1(e.target.value)}>
            <option>Airtel</option><option>Jio</option><option>Vi</option><option>BSNL</option>
          </select>
        </div>
        <div className="sh-field">
          <label>SIM 2 number</label>
          <input className="mono" value={sim2} onChange={(e) => setSim2(e.target.value)} />
        </div>
        <div className="sh-field">
          <label>SIM 2 operator</label>
          <select value={op2} onChange={(e) => setOp2(e.target.value)}>
            <option>Airtel</option><option>Jio</option><option>Vi</option><option>BSNL</option>
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
        <button className="sh-btn sh-btn-primary" style={{ flex: 1, justifyContent: "center" }}
          onClick={() => onSave({ id: emp.id, name: emp.name, sim1, op1, sim2, op2 })}>
          <Mail size={14} /> Save &amp; notify Runo team
        </button>
        <button className="sh-btn sh-btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function SpamForm({ onCancel, onSubmit }) {
  const [sim, setSim] = useState("sim1");
  const [reason, setReason] = useState("");
  return (
    <div className="sh-modal-body">
      <div className="sh-field">
        <label>Which SIM is affected?</label>
        <select value={sim} onChange={(e) => setSim(e.target.value)}>
          <option value="sim1">SIM 1</option>
          <option value="sim2">SIM 2</option>
        </select>
      </div>
      <div className="sh-field">
        <label>Describe the issue</label>
        <textarea rows={3} placeholder="e.g. Receiving spam/unwanted calls on this number..."
          value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button className="sh-btn sh-btn-primary" style={{ flex: 1, justifyContent: "center" }}
          disabled={!reason.trim()}
          onClick={() => reason.trim() && onSubmit(reason.trim(), sim)}>
          <Send size={14} /> Submit to IT
        </button>
        <button className="sh-btn sh-btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
