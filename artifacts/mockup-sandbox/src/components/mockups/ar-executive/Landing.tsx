import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2, Clock, FileText, TrendingUp, TrendingDown,
  DollarSign, AlertTriangle, ChevronRight, Play, Check,
  BarChart3, Activity, Zap, Target, Award, Timer, RefreshCw
} from "lucide-react";

// ── Seed data ────────────────────────────────────────────────────────────────
const SEED_CLAIMS = [
  { id: "CLM-2025004", patient: "Christopher Anderson", payer: "WellCare",    amount: 1737.22, denial: "CO-96", aging: 384, priority: "Critical" },
  { id: "CLM-2025006", patient: "Robert Gonzalez",      payer: "Medicare",    amount: 5911.97, denial: "CO-29", aging: 128, priority: "High"     },
  { id: "CLM-2025008", patient: "Daniel Martinez",      payer: "Optum",       amount: 11531.49,denial: null,   aging: 206, priority: "Critical" },
  { id: "CLM-2025012", patient: "Patricia White",       payer: "Aetna",       amount: 3284.50, denial: "CO-197",aging: 91, priority: "High"     },
  { id: "CLM-2025015", patient: "James Wilson",         payer: "Cigna",       amount: 8920.00, denial: "PR-2", aging: 310, priority: "Critical" },
  { id: "CLM-2025019", patient: "Maria Garcia",         payer: "BCBS",        amount: 2150.75, denial: "CO-22",aging: 65,  priority: "Medium"   },
  { id: "CLM-2025023", patient: "Linda Johnson",        payer: "Humana",      amount: 6780.00, denial: null,   aging: 155, priority: "High"     },
  { id: "CLM-2025027", patient: "Michael Brown",        payer: "UnitedHealth",amount: 990.40,  denial: "CO-16",aging: 48,  priority: "Medium"   },
  { id: "CLM-2025031", patient: "Barbara Davis",        payer: "Medicaid",    amount: 4500.00, denial: "CO-29",aging: 272, priority: "High"     },
  { id: "CLM-2025035", patient: "David Miller",         payer: "Tricare",     amount: 14220.00,denial: null,   aging: 189, priority: "Critical" },
  { id: "CLM-2025039", patient: "Susan Taylor",         payer: "Aetna",       amount: 3670.00, denial: "CO-96",aging: 77,  priority: "Medium"   },
  { id: "CLM-2025043", patient: "Joseph Anderson",      payer: "WellCare",    amount: 7890.50, denial: "CO-22",aging: 340, priority: "Critical" },
];

type ClaimStatus = "completed" | "in-progress" | "pending";

interface Claim {
  id: string; patient: string; payer: string; amount: number;
  denial: string | null; aging: number; priority: string;
  status: ClaimStatus; startedAt?: number; completedAt?: number;
  note?: string;
}

const priorityColor: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 border border-red-200",
  High:     "bg-orange-100 text-orange-700 border border-orange-200",
  Medium:   "bg-yellow-100 text-yellow-700 border border-yellow-200",
};

const pctColor = (pct: number) =>
  pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-500" : "text-red-500";

function fmt(n: number) {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

// ── Mini sparkline component ─────────────────────────────────────────────────
function Sparkline({ data, color = "#3b82f6" }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 80, h = 28;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={(data.length - 1) / (data.length - 1) * w} cy={h - (data[data.length - 1] / max) * h} r="3" fill={color} />
    </svg>
  );
}

// ── Progress Ring ─────────────────────────────────────────────────────────────
function Ring({ pct, size = 60, stroke = 6, color = "#3b82f6", label }: {
  pct: number; size?: number; stroke?: number; color?: string; label?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }} />
      {label && <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        className="rotate-90" style={{ fontSize: 12, fill: "#374151", fontWeight: 700, transform: `rotate(90deg) translate(0, -${size}px)` }} />}
    </svg>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function Landing() {
  const [claims, setClaims] = useState<Claim[]>(() =>
    SEED_CLAIMS.map((c, i) => ({
      ...c,
      status: (i < 3 ? "completed" : i < 5 ? "in-progress" : "pending") as ClaimStatus,
      startedAt: i < 5 ? Date.now() - (i < 3 ? 7200000 : 1800000) : undefined,
      completedAt: i < 3 ? Date.now() - 3600000 : undefined,
    }))
  );

  const [elapsed, setElapsed] = useState(0);
  const [hourlyData] = useState([2, 3, 1, 4, 3, 5, 2, 4, 3, 6, 5, 4]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeNote, setActiveNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  const startClaim = useCallback((id: string) => {
    setClaims(prev => prev.map(c =>
      c.id === id && c.status === "pending"
        ? { ...c, status: "in-progress", startedAt: Date.now() }
        : c
    ));
    showToast("Claim marked In Progress ✔");
  }, []);

  const completeClaim = useCallback((id: string) => {
    const note = activeNote.trim() || "Claim reviewed and actioned.";
    setClaims(prev => prev.map(c =>
      c.id === id && c.status === "in-progress"
        ? { ...c, status: "completed", completedAt: Date.now(), note }
        : c
    ));
    setActiveNote("");
    setSelectedId(null);
    showToast("Claim completed! 🎉");
  }, [activeNote]);

  const completed  = claims.filter(c => c.status === "completed");
  const inProgress = claims.filter(c => c.status === "in-progress");
  const pending    = claims.filter(c => c.status === "pending");
  const total      = claims.length;

  const completedAmt  = completed.reduce((s, c) => s + c.amount, 0);
  const inProgressAmt = inProgress.reduce((s, c) => s + c.amount, 0);
  const pendingAmt    = pending.reduce((s, c) => s + c.amount, 0);
  const totalAmt      = claims.reduce((s, c) => s + c.amount, 0);
  const completedPct  = Math.round((completed.length / total) * 100);

  const today = new Date().toLocaleDateString("en-US", { weekday:"long", month:"short", day:"numeric" });
  const todayTime = new Date().toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" });

  const selectedClaim = claims.find(c => c.id === selectedId);

  return (
    <div className="min-h-screen bg-slate-50 font-sans" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Top Nav ── */}
      <div className="bg-slate-900 px-6 py-0 flex items-center justify-between h-14 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="text-white font-bold text-base tracking-tight">NovaArc Health</span>
          <span className="text-slate-500 text-xs ml-1">AI-Powered RCM</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-800 rounded-full px-3 py-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 text-xs">Live Session</span>
          </div>
          <div className="text-slate-400 text-xs">{today} · {todayTime}</div>
          <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-white text-xs font-bold">AE</div>
          <div className="text-white text-sm font-medium">AR Executive</div>
        </div>
      </div>

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">AR Executive Workboard</h1>
            <p className="text-slate-500 text-sm mt-0.5">Real-time claim progress · Track completions as you work</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <Timer size={12} />
              <span>Session active {Math.floor(elapsed / 60)}m {elapsed % 60}s</span>
            </div>
            <button className="flex items-center gap-1.5 text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700 transition">
              <RefreshCw size={12} /> Refresh Queue
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 space-y-4 max-w-[1320px] mx-auto">

        {/* ── Summary KPI Row ── */}
        <div className="grid grid-cols-4 gap-4">

          {/* Total */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Total Claims</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{total}</p>
                <p className="text-slate-400 text-xs mt-1">{fmt(totalAmt)} total AR</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-2">
                <FileText size={20} className="text-blue-600" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Daily target</span><span className="font-semibold text-slate-700">{completedPct}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-700"
                  style={{ width: `${completedPct}%` }} />
              </div>
            </div>
          </div>

          {/* Completed */}
          <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-emerald-50 opacity-30 rounded-xl" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-emerald-600 text-xs font-medium uppercase tracking-wide">Completed</p>
                <p className="text-3xl font-bold text-emerald-700 mt-1">{completed.length}</p>
                <p className="text-emerald-500 text-xs mt-1">{fmt(completedAmt)} AR cleared</p>
              </div>
              <div className="bg-emerald-100 rounded-lg p-2">
                <CheckCircle2 size={20} className="text-emerald-600" />
              </div>
            </div>
            <div className="relative mt-3 flex items-center gap-2">
              <Sparkline data={[...hourlyData.slice(0, completed.length % 12 + 2)]} color="#059669" />
              <span className="text-emerald-600 text-xs font-semibold flex items-center gap-0.5">
                <TrendingUp size={10} /> {completedPct}% done
              </span>
            </div>
          </div>

          {/* In Progress */}
          <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-amber-50 opacity-30 rounded-xl" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-amber-600 text-xs font-medium uppercase tracking-wide">In Progress</p>
                <p className="text-3xl font-bold text-amber-700 mt-1">{inProgress.length}</p>
                <p className="text-amber-500 text-xs mt-1">{fmt(inProgressAmt)} being worked</p>
              </div>
              <div className="bg-amber-100 rounded-lg p-2">
                <Activity size={20} className="text-amber-600" />
              </div>
            </div>
            <div className="relative mt-3 flex gap-1">
              {inProgress.slice(0, 5).map(c => (
                <div key={c.id} title={c.patient}
                  className="h-1.5 flex-1 bg-amber-400 rounded-full animate-pulse" />
              ))}
              {Array.from({ length: Math.max(0, 5 - inProgress.length) }).map((_, i) => (
                <div key={i} className="h-1.5 flex-1 bg-amber-100 rounded-full" />
              ))}
            </div>
          </div>

          {/* Yet to Start */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Yet to Start</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{pending.length}</p>
                <p className="text-slate-400 text-xs mt-1">{fmt(pendingAmt)} queued</p>
              </div>
              <div className="bg-slate-100 rounded-lg p-2">
                <Clock size={20} className="text-slate-500" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              {pending.slice(0, 3).map(c => (
                <span key={c.id} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${priorityColor[c.priority]}`}>
                  {c.priority}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main body: Claim Queue + Detail ── */}
        <div className="grid grid-cols-[1fr_380px] gap-4">

          {/* Left — Claim Queue */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target size={15} className="text-blue-600" />
                <span className="text-sm font-semibold text-slate-800">Claim Work Queue</span>
                <span className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-full font-medium">{total} claims</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Completed</span>
                <span className="flex items-center gap-1 ml-2"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />In Progress</span>
                <span className="flex items-center gap-1 ml-2"><span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />Pending</span>
              </div>
            </div>

            {/* Table header */}
            <div className="grid text-[11px] font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 px-4 py-2 border-b border-slate-100"
              style={{ gridTemplateColumns: "24px 1fr 110px 80px 80px 90px 130px" }}>
              <div />
              <div>Claim / Patient</div>
              <div>Payer</div>
              <div>Amount</div>
              <div>Aging</div>
              <div>Priority</div>
              <div>Action</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-50 overflow-y-auto" style={{ maxHeight: 368 }}>
              {[...completed, ...inProgress, ...pending].map((claim) => {
                const isSelected = selectedId === claim.id;
                const statusDot = claim.status === "completed"
                  ? "bg-emerald-400" : claim.status === "in-progress"
                  ? "bg-amber-400 animate-pulse" : "bg-slate-300";
                const rowBg = claim.status === "completed"
                  ? "bg-emerald-50/40" : claim.status === "in-progress"
                  ? "bg-amber-50/40" : isSelected
                  ? "bg-blue-50/60" : "hover:bg-slate-50";

                return (
                  <div key={claim.id}
                    className={`grid items-center px-4 py-2.5 cursor-pointer transition-colors ${rowBg} ${isSelected ? "ring-1 ring-inset ring-blue-200" : ""}`}
                    style={{ gridTemplateColumns: "24px 1fr 110px 80px 80px 90px 130px" }}
                    onClick={() => setSelectedId(isSelected ? null : claim.id)}>

                    {/* Status dot */}
                    <div className={`w-2 h-2 rounded-full ${statusDot}`} />

                    {/* Claim / patient */}
                    <div>
                      <div className="text-xs font-semibold text-blue-700 leading-tight">{claim.id}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[160px]">{claim.patient}</div>
                    </div>

                    {/* Payer */}
                    <div className="text-xs text-slate-700 truncate">{claim.payer}</div>

                    {/* Amount */}
                    <div className="text-xs font-semibold text-slate-800">{fmt(claim.amount)}</div>

                    {/* Aging */}
                    <div className={`text-xs font-medium ${claim.aging > 180 ? "text-red-600" : claim.aging > 90 ? "text-amber-600" : "text-slate-600"}`}>
                      {claim.aging}d
                    </div>

                    {/* Priority */}
                    <div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${priorityColor[claim.priority]}`}>
                        {claim.priority}
                      </span>
                    </div>

                    {/* Action button */}
                    <div onClick={e => e.stopPropagation()}>
                      {claim.status === "pending" && (
                        <button onClick={() => startClaim(claim.id)}
                          className="flex items-center gap-1 text-[11px] bg-blue-600 text-white px-2.5 py-1 rounded-lg hover:bg-blue-700 transition font-medium">
                          <Play size={10} /> Start Working
                        </button>
                      )}
                      {claim.status === "in-progress" && (
                        <button onClick={() => { setSelectedId(claim.id); }}
                          className="flex items-center gap-1 text-[11px] bg-amber-500 text-white px-2.5 py-1 rounded-lg hover:bg-amber-600 transition font-medium">
                          <Check size={10} /> Mark Complete
                        </button>
                      )}
                      {claim.status === "completed" && (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                          <CheckCircle2 size={12} /> Done
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right — Detail Panel + Performance */}
          <div className="space-y-4">

            {/* Claim detail / complete panel */}
            {selectedClaim ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className={`px-4 py-3 border-b flex items-center justify-between
                  ${selectedClaim.status === "completed" ? "bg-emerald-50 border-emerald-100"
                    : selectedClaim.status === "in-progress" ? "bg-amber-50 border-amber-100"
                    : "bg-blue-50 border-blue-100"}`}>
                  <div>
                    <div className="text-xs font-bold text-slate-700">{selectedClaim.id}</div>
                    <div className="text-[11px] text-slate-500">{selectedClaim.patient} · {selectedClaim.payer}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold
                    ${selectedClaim.status === "completed" ? "bg-emerald-100 text-emerald-700"
                      : selectedClaim.status === "in-progress" ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-600"}`}>
                    {selectedClaim.status === "in-progress" ? "In Progress" : selectedClaim.status === "completed" ? "Completed" : "Pending"}
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["Charge Amount", fmt(selectedClaim.amount)],
                      ["Aging", `${selectedClaim.aging} days`],
                      ["Denial Code", selectedClaim.denial || "None"],
                      ["Priority", selectedClaim.priority],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-slate-50 rounded-lg px-3 py-2">
                        <div className="text-[10px] text-slate-500">{k}</div>
                        <div className="text-xs font-semibold text-slate-800 mt-0.5">{v}</div>
                      </div>
                    ))}
                  </div>

                  {selectedClaim.status === "in-progress" && (
                    <>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Action Note</label>
                        <textarea
                          className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 text-slate-700 placeholder:text-slate-400"
                          rows={3} placeholder="Describe the action taken (e.g., called payer, submitted appeal...)"
                          value={activeNote} onChange={e => setActiveNote(e.target.value)} />
                      </div>
                      <button onClick={() => completeClaim(selectedClaim.id)}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-emerald-700 transition">
                        <CheckCircle2 size={15} /> Mark Claim Complete
                      </button>
                    </>
                  )}

                  {selectedClaim.status === "completed" && selectedClaim.note && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                      <div className="text-[10px] font-semibold text-emerald-700 mb-0.5">Action Note</div>
                      <div className="text-xs text-emerald-800">{selectedClaim.note}</div>
                    </div>
                  )}

                  {selectedClaim.status === "pending" && (
                    <button onClick={() => startClaim(selectedClaim.id)}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-blue-700 transition">
                      <Play size={15} /> Start Working This Claim
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <FileText size={22} className="text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-600">Select a Claim</p>
                <p className="text-xs text-slate-400 mt-1">Click any row to view detail or mark complete</p>
              </div>
            )}

            {/* Today's Performance */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <BarChart3 size={14} className="text-blue-600" />
                <span className="text-sm font-semibold text-slate-800">Today's Performance</span>
              </div>
              <div className="p-4 space-y-3">
                {/* Big completion ring */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Ring pct={completedPct} size={72} stroke={7} color="#059669" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-base font-bold text-slate-800">{completedPct}%</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    {[
                      { label: "Completed", count: completed.length, color: "bg-emerald-500", pct: (completed.length / total) * 100 },
                      { label: "In Progress", count: inProgress.length, color: "bg-amber-400", pct: (inProgress.length / total) * 100 },
                      { label: "Remaining", count: pending.length, color: "bg-slate-200", pct: (pending.length / total) * 100 },
                    ].map(({ label, count, color, pct: p }) => (
                      <div key={label}>
                        <div className="flex justify-between text-[11px] text-slate-500 mb-0.5">
                          <span>{label}</span><span className="font-semibold text-slate-700">{count}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${p}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mini KPIs */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {[
                    { label: "AR Cleared", val: fmt(completedAmt), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Avg Aging", val: `${Math.round(claims.reduce((s,c)=>s+c.aging,0)/total)}d`, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
                    { label: "High Risk", val: claims.filter(c=>c.priority==="Critical").length.toString(), icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
                    { label: "Appeals", val: claims.filter(c=>c.denial).length.toString(), icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
                  ].map(({ label, val, icon: Icon, color, bg }) => (
                    <div key={label} className={`${bg} rounded-lg px-3 py-2 flex items-center gap-2`}>
                      <Icon size={13} className={color} />
                      <div>
                        <div className="text-[10px] text-slate-500">{label}</div>
                        <div className={`text-sm font-bold ${color}`}>{val}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Hourly throughput */}
                <div className="pt-1">
                  <div className="text-[10px] text-slate-500 font-medium mb-2 uppercase tracking-wide">Hourly Throughput</div>
                  <div className="flex items-end gap-1 h-10">
                    {hourlyData.map((v, i) => (
                      <div key={i} className="flex-1 flex flex-col justify-end">
                        <div className={`rounded-sm transition-all ${i === hourlyData.length - 1 ? "bg-blue-500" : "bg-slate-200"}`}
                          style={{ height: `${(v / Math.max(...hourlyData)) * 36}px` }} />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                    <span>8am</span><span>12pm</span><span>Now</span>
                  </div>
                </div>

                {/* Badge */}
                {completedPct >= 50 && (
                  <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 rounded-lg px-3 py-2">
                    <Award size={14} className="text-blue-600" />
                    <span className="text-xs text-blue-700 font-medium">
                      {completedPct >= 75 ? "Outstanding pace! 🏆" : "On track for today's target 🎯"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 z-50">
          <CheckCircle2 size={15} className="text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  );
}
