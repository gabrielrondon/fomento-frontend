import { useState, useEffect, useRef } from "react";
import {
  createSkill as createSkillAPI,
  deleteSkill as deleteSkillAPI,
  downloadSkillMarkdown,
  listSkills,
  runSkill as runSkillAPI,
  updateSkill as updateSkillAPI,
} from "./skillsApi";
import { fetchQualitySummary } from "./qualityApi";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
const ACTOR_STORAGE_KEY = "fomentos_actor_id";

function getActorId() {
  const existing = localStorage.getItem(ACTOR_STORAGE_KEY);
  if (existing) return existing;
  const created = `actor_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  localStorage.setItem(ACTOR_STORAGE_KEY, created);
  return created;
}

const MOCK_OPS = [
  { id: 1, name: "FINEP - Inovacred 4.0", entity: "FINEP", type: "Crédito", value: "R$ 2M–20M", deadline: "2026-04-15", match: 94, tags: ["Inovação", "P&D", "Agro"], desc: "Financiamento para inovação em empresas de receita até R$300M. Taxa subsidiada TJLP + 2%a.a." },
  { id: 2, name: "BNDES Agro Inovação", entity: "BNDES", type: "Subvenção", value: "R$ 500K–5M", deadline: "2026-05-20", match: 91, tags: ["Agro", "Sustentabilidade", "Digital"], desc: "Apoio à digitalização e rastreabilidade na cadeia agropecuária." },
  { id: 3, name: "Fundo Clima - Adaptação", entity: "BNDES", type: "Crédito", value: "R$ 1M–50M", deadline: "2026-06-01", match: 87, tags: ["Clima", "ESG", "Agro"], desc: "Financiamento para projetos de resiliência climática no agronegócio." },
  { id: 4, name: "FINEP - Startup Conecta", entity: "FINEP", type: "Venture", value: "R$ 1M–10M", deadline: "2026-03-30", match: 82, tags: ["Startup", "Deeptech", "Token"], desc: "Investimento direto em startups de base tecnológica com equity e conversível." },
  { id: 5, name: "Programa ABC+", entity: "MAPA/BNDES", type: "Crédito", value: "R$ 150K–5M", deadline: "2026-07-01", match: 78, tags: ["Sustentável", "Carbono", "Agro"], desc: "Crédito para agricultura de baixa emissão de carbono, taxa de 7%a.a." },
  { id: 6, name: "EMBRAPII - Agritech", entity: "EMBRAPII", type: "Subvenção", value: "Até R$ 3M", deadline: "2026-04-30", match: 74, tags: ["P&D", "Parceria", "Agro"], desc: "Projetos cooperativos em unidades EMBRAPII focadas em agritech e bioeconomia." },
];

const DASH_APPS = [
  { id: 1, fund: "FINEP - Inovacred 4.0", status: "em_revisao", progress: 65, next: "Enviar demonstrativo financeiro", deadline: "15 Mar", notifs: 2 },
  { id: 2, fund: "BNDES Agro Inovação", status: "rascunho", progress: 30, next: "Completar plano de negócios", deadline: "20 Mai", notifs: 0 },
  { id: 3, fund: "Fundo Clima - Adaptação", status: "enviado", progress: 100, next: "Aguardando análise", deadline: "01 Jun", notifs: 1 },
];

const SM = { rascunho: { l: "Rascunho", c: "#666" }, em_revisao: { l: "Em Revisão", c: "#F5A623" }, enviado: { l: "Enviado", c: "#00E676" } };

function Particles({ intensity = 1 }) {
  const ref = useRef(null);
  const anim = useRef(null);
  const pts = useRef([]);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    const n = Math.floor(40 * intensity);
    pts.current = Array.from({ length: n }, () => ({ x: Math.random() * c.width, y: Math.random() * c.height, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, r: Math.random() * 1.5 + 0.5, o: Math.random() * 0.4 + 0.1 }));
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      const p = pts.current;
      for (const pt of p) { pt.x += pt.vx; pt.y += pt.vy; if (pt.x < 0) pt.x = c.width; if (pt.x > c.width) pt.x = 0; if (pt.y < 0) pt.y = c.height; if (pt.y > c.height) pt.y = 0; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fillStyle = "rgba(0,230,118," + pt.o + ")"; ctx.fill(); }
      for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) { const dx = p[i].x - p[j].x, dy = p[i].y - p[j].y, d = Math.sqrt(dx * dx + dy * dy); if (d < 120) { ctx.beginPath(); ctx.moveTo(p[i].x, p[i].y); ctx.lineTo(p[j].x, p[j].y); ctx.strokeStyle = "rgba(0,230,118," + (0.06 * (1 - d / 120)) + ")"; ctx.stroke(); } }
      anim.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(anim.current); window.removeEventListener("resize", resize); };
  }, [intensity]);
  return <canvas ref={ref} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}

function Scan({ steps, step }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
      <div style={{ position: "relative", width: 160, height: 160 }}>
        {[0, 10, 20].map(i => <div key={i} style={{ position: "absolute", inset: i, borderRadius: "50%", border: "1px solid rgba(0,230,118," + (0.15 - i * 0.003) + ")" }} />)}
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "conic-gradient(from 0deg, transparent 0%, rgba(0,230,118,0.15) 30%, transparent 35%)", animation: "spin 2s linear infinite" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, color: "#00E676" }}>{step + 1}/{steps.length}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 280 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, opacity: i <= step ? 1 : 0.3, transition: "opacity 0.5s" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: i <= step ? "#00E676" : "#333", boxShadow: i === step ? "0 0 12px #00E676" : "none", transition: "all 0.5s" }} />
            <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: i <= step ? "#ccc" : "#555", letterSpacing: 0.5 }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OppCard({ opp, selected, onToggle, disabled }) {
  const [hov, setHov] = useState(false);
  const a = selected || hov;
  return (
    <div onClick={() => !disabled && onToggle(opp.id)} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ position: "relative", cursor: disabled && !selected ? "not-allowed" : "pointer", opacity: disabled && !selected ? 0.35 : 1, transition: "all 0.5s cubic-bezier(0.16,1,0.3,1)", transform: a ? "scale(1.02)" : "scale(1)" }}>
      <div style={{ position: "absolute", inset: -2, borderRadius: 16, background: selected ? "linear-gradient(135deg, rgba(0,230,118,0.3), rgba(0,230,118,0.05))" : "transparent", transition: "all 0.4s", filter: selected ? "blur(0)" : "blur(4px)" }} />
      <div style={{ position: "relative", background: a ? "linear-gradient(135deg, rgba(0,230,118,0.06), rgba(0,230,118,0.02))" : "rgba(255,255,255,0.02)", border: "1px solid " + (selected ? "rgba(0,230,118,0.4)" : a ? "rgba(0,230,118,0.15)" : "rgba(255,255,255,0.05)"), borderRadius: 14, padding: "24px 28px", transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)", backdropFilter: "blur(20px)", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 20, right: 24, width: 48, height: 48 }}>
          <svg width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" /><circle cx="24" cy="24" r="20" fill="none" stroke={opp.match > 85 ? "#00E676" : opp.match > 70 ? "#F5A623" : "#666"} strokeWidth="3" strokeDasharray={opp.match * 1.256 + " 999"} strokeLinecap="round" transform="rotate(-90 24 24)" /><text x="24" y="28" textAnchor="middle" fill="#fff" fontSize="12" fontFamily="Syne" fontWeight="700">{opp.match}</text></svg>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 12 }}>
          <span style={{ fontSize: 10, color: "#888", letterSpacing: 1.5, textTransform: "uppercase" }}>{opp.entity}</span>
          <span style={{ fontSize: 10, color: "#555" }}>·</span>
          <span style={{ fontSize: 10, color: opp.type === "Subvenção" ? "#00E676" : "#F5A623", letterSpacing: 1 }}>{opp.type}</span>
        </div>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 8px", lineHeight: 1.3, paddingRight: 56 }}>{opp.name}</h3>
        <p style={{ fontSize: 13, color: "#777", margin: "0 0 16px", lineHeight: 1.5, maxHeight: a ? 60 : 0, overflow: "hidden", transition: "max-height 0.4s ease" }}>{opp.desc}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 600, color: "#00E676" }}>{opp.value}</span>
          <span style={{ fontSize: 11, color: "#555" }}>Prazo: {new Date(opp.deadline).toLocaleDateString("pt-BR")}</span>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
          {opp.tags.map(t => <span key={t} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: "rgba(0,230,118,0.06)", color: "#00E676", letterSpacing: 0.5 }}>{t}</span>)}
        </div>
        {selected && <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: "linear-gradient(180deg, #00E676, transparent)", borderRadius: "14px 0 0 14px" }} />}
      </div>
    </div>
  );
}

function DashCard({ app }) {
  const s = SM[app.status];
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: "20px 24px", cursor: "pointer", transition: "all 0.3s", position: "relative" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,230,118,0.2)"; e.currentTarget.style.background = "rgba(0,230,118,0.03)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}>
      {app.notifs > 0 && <div style={{ position: "absolute", top: 16, right: 16, width: 20, height: 20, borderRadius: "50%", background: "#FF5252", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700, animation: "pulse 2s infinite" }}>{app.notifs}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.c }} />
        <span style={{ fontSize: 11, color: s.c, letterSpacing: 1, textTransform: "uppercase" }}>{s.l}</span>
      </div>
      <h4 style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 12px" }}>{app.fund}</h4>
      <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, marginBottom: 8 }}>
        <div style={{ height: "100%", width: app.progress + "%", background: s.c, borderRadius: 2, transition: "width 1s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: "#666" }}>{app.next}</span>
        <span style={{ fontSize: 11, color: "#555" }}>{app.deadline}</span>
      </div>
    </div>
  );
}

export default function App() {
  const [actorId] = useState(() => getActorId());
  const [pg, setPg] = useState("landing");
  const [txt, setTxt] = useState("");
  const [fn, setFn] = useState("");
  const [ss, setSs] = useState(0);
  const [sel, setSel] = useState([]);
  const [fi, setFi] = useState(false);
  const [dt, setDt] = useState("apps");
  const [stripe, setStripe] = useState(false);
  const [wa, setWa] = useState("");
  const [waOk, setWaOk] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [opps, setOpps] = useState(MOCK_OPS);
  const [aiClassNote, setAiClassNote] = useState("");
  const [advisor, setAdvisor] = useState(null);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [skillName, setSkillName] = useState("");
  const [skillProject, setSkillProject] = useState("");
  const [skillEdital, setSkillEdital] = useState("");
  const [skills, setSkills] = useState([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [skillsError, setSkillsError] = useState("");
  const [runBySkill, setRunBySkill] = useState({});
  const [runningSkillID, setRunningSkillID] = useState("");
  const [adminApiKey, setAdminApiKey] = useState(() => localStorage.getItem("fomento_admin_api_key") || "");
  const [quality, setQuality] = useState(null);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [qualityError, setQualityError] = useState("");
  const [qualityRecentLimit, setQualityRecentLimit] = useState(20);
  const [ctxMeta, setCtxMeta] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fr = useRef(null);

  useEffect(() => { setFi(false); const t = setTimeout(() => setFi(true), 50); return () => clearTimeout(t); }, [pg]);
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/v1/project-contexts/current?actor_id=${encodeURIComponent(actorId)}`, { headers: { "X-Actor-ID": actorId } });
        if (!res.ok) return;
        const ctx = await res.json();
        setCtxMeta(ctx);
        if (ctx?.project_context) setTxt(ctx.project_context);
        if (ctx?.document?.file_name) setFn(ctx.document.file_name);
      } catch {
        // noop
      }
    };
    load();
  }, [actorId]);

  useEffect(() => {
    const load = async () => {
      setSkillsLoading(true);
      setSkillsError("");
      try {
        const items = await listSkills(actorId);
        setSkills(items);
      } catch {
        setSkillsError("Não foi possível carregar skills agora.");
      } finally {
        setSkillsLoading(false);
      }
    };
    load();
  }, [actorId]);

  const steps = ["Analisando perfil do projeto…", "Cruzando com bases FINEP/BNDES…", "Calculando aderência…", "Ranqueando oportunidades…", "Preparando resultados…"];

  const persistProjectContext = async (contextText) => {
    const normalized = (contextText || "").trim();
    if (!normalized) return;
    const res = await fetch(`${API_BASE}/v1/project-contexts/upsert`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Actor-ID": actorId },
      body: JSON.stringify({
        actor_id: actorId,
        project_context: normalized,
      }),
    });
    if (!res.ok) throw new Error("persist_project_context_failed");
    const saved = await res.json();
    setCtxMeta(saved);
  };

  const handlePickedFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("actor_id", actorId);
      if (txt.trim()) form.append("project_context", txt.trim());
      const res = await fetch(`${API_BASE}/v1/project-documents/upload`, {
        method: "POST",
        headers: { "X-Actor-ID": actorId },
        body: form,
      });
      if (!res.ok) throw new Error("upload_failed");
      const data = await res.json();
      const ctx = data?.context || {};
      setFn(ctx?.document?.file_name || file.name);
      setTxt(ctx?.project_context || `[Arquivo: ${file.name}]`);
      setCtxMeta(ctx);
    } catch {
      setFn(file.name);
      setTxt(`[Arquivo: ${file.name}]`);
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    handlePickedFile(file);
  };

  const classifySources = async (projectContext) => {
    const uniqueSources = [...new Set(MOCK_OPS.map(o => (o.entity || "").split("/")[0].trim().toUpperCase()))].filter(Boolean);
    const res = await fetch(`${API_BASE}/v1/ai/classify-sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_context: projectContext,
        sources: uniqueSources,
      }),
    });
    if (!res.ok) throw new Error("ai_classification_failed");
    return res.json();
  };

  const go = async () => {
    if (!txt.trim() && !fn) return;
    setPg("scan"); setSs(0); let s = 0;
    const iv = setInterval(() => { s++; if (s >= steps.length) { clearInterval(iv); setTimeout(() => setPg("results"), 600); } else setSs(s); }, 1200);
    try {
      const context = txt.trim() || `[Arquivo: ${fn}]`;
      await persistProjectContext(context);
      const ai = await classifySources(context);
      const scoreBySource = new Map((ai.classifications || []).map(c => [String(c.source || "").toUpperCase(), Number(c.score || 0)]));
      const adjusted = MOCK_OPS.map((o) => {
        const sourceKey = (o.entity || "").split("/")[0].trim().toUpperCase();
        const srcScore = scoreBySource.get(sourceKey);
        if (!srcScore && srcScore !== 0) return o;
        const delta = Math.round((srcScore - 70) / 7);
        return { ...o, match: Math.max(1, Math.min(99, o.match + delta)) };
      });
      setOpps(adjusted);
      setAiClassNote(ai.general_notes || "");
    } catch {
      setOpps(MOCK_OPS);
      setAiClassNote("");
    }
  };

  const tog = (id) => setSel(p => p.includes(id) ? p.filter(x => x !== id) : p.length >= 3 ? p : [...p, id]);
  const sorted = [...opps].sort((a, b) => b.match - a.match);
  const rankingNote = aiClassNote || `Priorizamos ${sorted.slice(0, 2).map((o) => o.name).join(" e ")} por maior aderência prática ao contexto enviado e melhor viabilidade de submissão.`;
  const ps = { opacity: fi ? 1 : 0, transform: fi ? "translateY(0)" : "translateY(12px)", transition: "all 0.6s cubic-bezier(0.16,1,0.3,1)" };

  const runAdvisor = async () => {
    const selectedOpps = sorted.filter(o => sel.includes(o.id)).map(o => o.name);
    const selectedSources = [...new Set(sorted.filter(o => sel.includes(o.id)).map(o => o.entity.split("/")[0].trim().toUpperCase()))];
    const context = txt.trim() || ctxMeta?.project_context || `Projeto baseado nas oportunidades selecionadas: ${selectedOpps.join(", ")}`;
    setAdvisorLoading(true);
    try {
      const res = await fetch(`${API_BASE}/v1/ai/project-advisor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_context: context,
          selected_sources: selectedSources,
          selected_opportunities: selectedOpps,
        }),
      });
      if (!res.ok) throw new Error("ai_project_advisor_failed");
      const data = await res.json();
      setAdvisor(data);
    } catch {
      setAdvisor({
        overall_assessment: "Não foi possível gerar análise avançada agora. Verifique o backend e tente novamente.",
        strengths: [],
        gaps: [],
        next_steps: ["Tentar novamente em alguns segundos."],
      });
    } finally {
      setAdvisorLoading(false);
    }
  };

  const sendConsultorChat = async () => {
    const message = chatInput.trim();
    if (!message) return;
    const selectedOpps = sorted.filter(o => sel.includes(o.id)).map(o => o.name);
    const selectedSources = [...new Set(sorted.filter(o => sel.includes(o.id)).map(o => o.entity.split("/")[0].trim().toUpperCase()))];
    const context = txt.trim() || ctxMeta?.project_context || `Projeto baseado nas oportunidades selecionadas: ${selectedOpps.join(", ")}`;

    setChatMessages((prev) => [...prev, { role: "user", text: message }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch(`${API_BASE}/v1/ai/consultor-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_context: context,
          selected_sources: selectedSources,
          selected_opportunities: selectedOpps,
          user_message: message,
        }),
      });
      if (!res.ok) throw new Error("ai_consultor_chat_failed");
      const data = await res.json();
      setChatMessages((prev) => [...prev, { role: "assistant", text: data.answer || "Sem resposta no momento." }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", text: "Não consegui responder agora. Tente novamente em instantes." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const buildSkillMarkdown = (s) => `# Skill ${s.name}

## Objetivo
Gerenciar a aplicação do projeto "${s.project}" no edital "${s.edital}".

## Instruções Operacionais
- Monitorar atualizações de prazo e requisitos do edital diariamente.
- Notificar mudanças críticas de documentação e critérios.
- Sugerir melhorias incrementais para elevar aderência da aplicação.
- Acionar o agente RoundHound para executar próximos passos do pipeline.
`;

  const downloadSkill = async (s) => {
    try {
      if (s.id) {
        const blob = await downloadSkillMarkdown(actorId, s.id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${String(s.name || "skill").toLowerCase().replace(/\s+/g, "-")}.md`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
    } catch {
      // fallback below
    }
    const blob = new Blob([buildSkillMarkdown(s)], { type: "text/markdown;charset=utf-8" });
    const fallbackURL = URL.createObjectURL(blob);
    const fallbackA = document.createElement("a");
    fallbackA.href = fallbackURL;
    fallbackA.download = `${String(s.name || "skill").toLowerCase().replace(/\s+/g, "-")}.md`;
    fallbackA.click();
    URL.revokeObjectURL(fallbackURL);
  };

  const createSkill = async () => {
    const name = skillName.trim();
    const project = skillProject.trim();
    const edital = skillEdital.trim();
    if (!name || !project || !edital) return;
    try {
      const item = await createSkillAPI(actorId, { name, project, edital, status: "Rascunho", notifications: true });
      setSkills((prev) => [item, ...prev]);
      setSkillName("");
      setSkillProject("");
      setSkillEdital("");
    } catch {
      setSkillsError("Falha ao salvar skill.");
    }
  };

  const runSkillAction = async (skill, mode) => {
    const selectedOpps = sorted.filter(o => sel.includes(o.id)).map(o => o.name);
    const selectedSources = [...new Set(sorted.filter(o => sel.includes(o.id)).map(o => o.entity.split("/")[0].trim().toUpperCase()))];
    const context = txt.trim() || ctxMeta?.project_context || `Projeto baseado nas oportunidades selecionadas: ${selectedOpps.join(", ")}`;
    setRunningSkillID(skill.id);
    try {
      const out = await runSkillAPI(actorId, skill.id, {
        run_mode: mode,
        project_context: context,
        selected_sources: selectedSources,
        selected_opportunities: selectedOpps,
      });
      setRunBySkill((prev) => ({ ...prev, [skill.id]: out }));
      const saved = await updateSkillAPI(actorId, skill.id, { status: "Ativa" });
      setSkills((prev) => prev.map((s) => s.id === skill.id ? saved : s));
      if (mode === "cloud") setStripe(true);
    } catch {
      setSkillsError("Falha ao executar skill.");
    } finally {
      setRunningSkillID("");
    }
  };

  const toggleSkillNotifications = async (skill) => {
    try {
      const saved = await updateSkillAPI(actorId, skill.id, { notifications: !skill.notifications });
      setSkills((prev) => prev.map((s) => s.id === skill.id ? saved : s));
    } catch {
      setSkillsError("Falha ao atualizar skill.");
    }
  };

  const removeSkill = async (skill) => {
    try {
      await deleteSkillAPI(actorId, skill.id);
      setSkills((prev) => prev.filter((s) => s.id !== skill.id));
    } catch {
      setSkillsError("Falha ao remover skill.");
    }
  };

  const loadQualitySummary = async () => {
    if (!adminApiKey.trim()) {
      setQualityError("Informe a API key admin para carregar a telemetria.");
      return;
    }
    setQualityLoading(true);
    setQualityError("");
    try {
      localStorage.setItem("fomento_admin_api_key", adminApiKey.trim());
      const out = await fetchQualitySummary(adminApiKey.trim(), qualityRecentLimit);
      setQuality(out);
    } catch {
      setQualityError("Falha ao carregar telemetria. Verifique a API key.");
    } finally {
      setQualityLoading(false);
    }
  };

  const Logo = ({ size = 40 }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setPg("landing")}>
      <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg, #00E676, #00C853)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 24px rgba(0,230,118,0.2)" }}>
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none"><path d="M12 2L4 7v10l8 5 8-5V7l-8-5z" stroke="#000" strokeWidth="2" /><path d="M12 7v10M7 9.5l5 3 5-3" stroke="#000" strokeWidth="1.5" strokeLinecap="round" /></svg>
      </div>
      <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: size * 0.45, color: "#fff", letterSpacing: -0.5 }}>fomentos</span>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: "'IBM Plex Sans', sans-serif", position: "relative", overflow: "hidden" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');*{box-sizing:border-box;margin:0;padding:0}@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}::placeholder{color:#444}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#222;border-radius:2px}input:focus,textarea:focus{outline:none}`}</style>
      <Particles intensity={pg === "scan" ? 2.5 : pg === "landing" ? 1 : 0.5} />

      {pg === "landing" && (
        <div style={{ ...ps, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "40px 20px", position: "relative", zIndex: 1 }}>
          <div style={{ animation: "float 4s ease-in-out infinite", marginBottom: 48 }}><Logo size={56} /></div>
          <p style={{ fontSize: 14, color: "#555", maxWidth: 400, textAlign: "center", lineHeight: 1.7, marginBottom: 48, fontWeight: 300, letterSpacing: 0.3 }}>Descreva ou envie seu projeto.<br/>Vamos encontrar o fomento certo.</p>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{ width: "100%", maxWidth: 560, position: "relative" }}
          >
            {dragOver && (
              <div style={{ position: "absolute", inset: 0, borderRadius: 14, border: "1px dashed rgba(0,230,118,0.6)", background: "rgba(0,230,118,0.08)", zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <span style={{ fontSize: 13, color: "#8ce6b0", letterSpacing: 0.4 }}>Solte o arquivo aqui para anexar</span>
              </div>
            )}
            <textarea value={txt} onChange={e => setTxt(e.target.value)} placeholder="Descreva seu projeto — setor, tecnologia, estágio, objetivo…" rows={3}
              style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid " + (dragOver ? "rgba(0,230,118,0.45)" : "rgba(255,255,255,0.08)"), borderRadius: 14, padding: "20px 24px", color: "#fff", fontSize: 15, fontFamily: "'IBM Plex Sans', sans-serif", resize: "none", lineHeight: 1.6, transition: "border-color 0.3s" }}
              onFocus={e => e.target.style.borderColor = "rgba(0,230,118,0.3)"} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
              <div>
                <input type="file" ref={fr} onChange={e => handlePickedFile(e.target.files?.[0])} style={{ display: "none" }} accept=".pdf,.doc,.docx,.txt" />
                <button disabled={uploading} onClick={() => fr.current?.click()} style={{ background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 14px", color: "#666", fontSize: 12, cursor: uploading ? "default" : "pointer", transition: "all 0.3s", display: "flex", alignItems: "center", gap: 6, opacity: uploading ? 0.7 : 1 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,230,118,0.3)"; e.currentTarget.style.color = "#aaa"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#666"; }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                  {uploading ? "Enviando..." : (fn || "Anexar projeto")}
                </button>
              </div>
              <button onClick={go} disabled={!txt.trim() && !fn} style={{ background: (txt.trim() || fn) ? "linear-gradient(135deg, #00E676, #00C853)" : "rgba(255,255,255,0.05)", border: "none", borderRadius: 10, padding: "10px 28px", color: (txt.trim() || fn) ? "#000" : "#444", fontSize: 14, fontWeight: 600, cursor: (txt.trim() || fn) ? "pointer" : "default", fontFamily: "'Syne', sans-serif", letterSpacing: 0.5, transition: "all 0.3s", boxShadow: (txt.trim() || fn) ? "0 0 24px rgba(0,230,118,0.2)" : "none" }}>Buscar →</button>
            </div>
          </div>
          <button onClick={() => setPg("register")} style={{ position: "absolute", bottom: 32, background: "none", border: "none", color: "#444", fontSize: 12, cursor: "pointer", letterSpacing: 0.5 }}>Já tem conta? <span style={{ color: "#00E676" }}>Entrar</span></button>
        </div>
      )}

      {pg === "scan" && (
        <div style={{ ...ps, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", position: "relative", zIndex: 1 }}>
          <Scan steps={steps} step={ss} />
        </div>
      )}

      {pg === "results" && (
        <div style={{ ...ps, minHeight: "100vh", position: "relative", zIndex: 1, padding: "32px 20px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Logo size={32} />
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 12, color: "#555" }}>{sel.length}/3</span>
              <button onClick={() => sel.length > 0 && setPg("register")} style={{ background: sel.length > 0 ? "#00E676" : "rgba(255,255,255,0.05)", border: "none", borderRadius: 8, padding: "8px 20px", color: sel.length > 0 ? "#000" : "#444", fontSize: 13, fontWeight: 600, cursor: sel.length > 0 ? "pointer" : "default", fontFamily: "'Syne', sans-serif", transition: "all 0.3s" }}>Continuar →</button>
            </div>
          </div>
          {sel.length > 0 && <div style={{ maxWidth: 720, margin: "0 auto 32px", display: "flex", gap: 8, flexWrap: "wrap", animation: "slideUp 0.3s ease" }}>
            {sel.map(id => { const o = sorted.find(x => x.id === id); return <div key={id} onClick={() => tog(id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 8, background: "rgba(0,230,118,0.08)", border: "1px solid rgba(0,230,118,0.2)", cursor: "pointer" }}><span style={{ fontSize: 12, color: "#00E676" }}>{o?.name}</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00E676" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></div>; })}
          </div>}
          <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 11, color: "#444", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>{sorted.length} oportunidades detectadas — selecione até 3</p>
            <div style={{ fontSize: 12, color: "#7bcf9a", background: "rgba(0,230,118,0.05)", border: "1px solid rgba(0,230,118,0.15)", borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>{rankingNote}</div>
            {sorted.map((o, i) => <div key={o.id} style={{ animation: "slideUp 0.5s ease " + (i * 0.1) + "s both" }}><OppCard opp={o} selected={sel.includes(o.id)} onToggle={tog} disabled={sel.length >= 3 && !sel.includes(o.id)} /></div>)}
          </div>
        </div>
      )}

      {pg === "register" && (
        <div style={{ ...ps, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", position: "relative", zIndex: 1, padding: "40px 20px" }}>
          <Logo size={40} />
          <div style={{ width: "100%", maxWidth: 400, marginTop: 48, display: "flex", flexDirection: "column", gap: 16 }}>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>Crie sua conta</h2>
            <p style={{ fontSize: 13, color: "#555", textAlign: "center", marginBottom: 16 }}>Acesse o dashboard para aplicar e acompanhar.</p>
            {["Nome completo", "Email", "CNPJ (opcional)", "Senha"].map((ph, i) => <input key={i} type={ph === "Senha" ? "password" : ph === "Email" ? "email" : "text"} placeholder={ph} style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "14px 18px", color: "#fff", fontSize: 14, fontFamily: "'IBM Plex Sans', sans-serif", transition: "border-color 0.3s" }} onFocus={e => e.target.style.borderColor = "rgba(0,230,118,0.3)"} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />)}
            <button onClick={() => setPg("dashboard")} style={{ width: "100%", background: "linear-gradient(135deg, #00E676, #00C853)", border: "none", borderRadius: 10, padding: "14px", color: "#000", fontSize: 15, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: "pointer", boxShadow: "0 0 24px rgba(0,230,118,0.2)", marginTop: 8 }}>Acessar Demo →</button>
          </div>
        </div>
      )}

      {pg === "dashboard" && (
        <div style={{ ...ps, minHeight: "100vh", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 10, background: "rgba(5,5,5,0.8)" }}>
            <Logo size={28} />
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button onClick={() => setPg("landing")} style={{ background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "6px 14px", color: "#888", fontSize: 12, cursor: "pointer" }}>+ Nova busca</button>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,230,118,0.1)", border: "1px solid rgba(0,230,118,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: "#00E676" }}>G</div>
            </div>
          </div>
          <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Bom dia, Gabriel</h1>
              <p style={{ fontSize: 13, color: "#555" }}>3 aplicações ativas · 3 notificações pendentes</p>
            </div>
            <div style={{ display: "flex", gap: 0, marginBottom: 32, borderBottom: "1px solid rgba(255,255,255,0.05)", overflowX: "auto" }}>
              {[["apps", "Aplicações"], ["round", "Roundhouse AI"], ["skills", "Skills"], ["qa", "Qualidade IA"], ["notifs", "Notificações"], ["config", "Config"]].map(([k, l]) => <button key={k} onClick={() => setDt(k)} style={{ background: "none", border: "none", borderBottom: "2px solid " + (dt === k ? "#00E676" : "transparent"), padding: "10px 20px", color: dt === k ? "#fff" : "#555", fontSize: 13, cursor: "pointer", fontWeight: dt === k ? 500 : 400, transition: "all 0.3s", whiteSpace: "nowrap" }}>{l}</button>)}
            </div>

            {dt === "apps" && <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "slideUp 0.3s ease" }}>
              {DASH_APPS.map(a => <DashCard key={a.id} app={a} />)}
              <div onClick={() => setStripe(true)} style={{ background: "linear-gradient(135deg, rgba(245,166,35,0.08), rgba(245,166,35,0.02))", border: "1px solid rgba(245,166,35,0.15)", borderRadius: 14, padding: "24px 28px", cursor: "pointer", transition: "all 0.3s", marginTop: 16 }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(245,166,35,0.3)"} onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(245,166,35,0.15)"}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div><h4 style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: "#F5A623", marginBottom: 4 }}>Upgrade para Pro</h4><p style={{ fontSize: 12, color: "#777" }}>Ilimitado + WhatsApp + IA avançada</p></div>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: "#F5A623" }}>R$97<span style={{ fontSize: 12, fontWeight: 400, color: "#888" }}>/mês</span></span>
                </div>
              </div>
            </div>}

            {dt === "round" && <div style={{ animation: "slideUp 0.3s ease" }}>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: 28, minHeight: 400, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
                  <p style={{ fontSize: 12, color: "#666" }}>Análise do projeto com base nas fontes e oportunidades selecionadas.</p>
                  <button onClick={runAdvisor} disabled={advisorLoading} style={{ background: advisorLoading ? "rgba(255,255,255,0.06)" : "#00E676", border: "none", borderRadius: 8, padding: "8px 14px", color: advisorLoading ? "#666" : "#000", fontSize: 12, fontWeight: 700, cursor: advisorLoading ? "default" : "pointer" }}>{advisorLoading ? "Analisando..." : "Gerar Análise IA"}</button>
                </div>
                {ctxMeta?.document?.file_name && (
                  <div style={{ fontSize: 12, color: "#8ce6b0", marginBottom: 12, padding: "8px 10px", borderRadius: 8, background: "rgba(0,230,118,0.05)", border: "1px solid rgba(0,230,118,0.12)" }}>
                    Documento ativo: <strong>{ctxMeta.document.file_name}</strong>
                  </div>
                )}
                <div style={{ fontSize: 12, color: "#88929a", marginBottom: 12, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  Para respostas mais críticas e menos genéricas, inclua no contexto: <strong>setor</strong>, <strong>objetivo</strong>, <strong>estágio</strong> e <strong>prazo/orçamento</strong>.
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
                  {advisor ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ background: "rgba(0,230,118,0.04)", borderRadius: 12, padding: "14px 16px" }}>
                        <p style={{ fontSize: 12, color: "#8eddb0", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Visão Geral</p>
                        <p style={{ fontSize: 13, color: "#ddd", lineHeight: 1.6 }}>{advisor.overall_assessment}</p>
                      </div>
                      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
                        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 12 }}>
                          <p style={{ fontSize: 11, color: "#00E676", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Pontos Fortes</p>
                          <ul style={{ paddingLeft: 16, margin: 0 }}>{(advisor.strengths || []).slice(0, 4).map((s, i) => <li key={i} style={{ fontSize: 12, color: "#ccc", marginBottom: 4 }}>{s}</li>)}</ul>
                        </div>
                        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 12 }}>
                          <p style={{ fontSize: 11, color: "#F5A623", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Gaps</p>
                          <ul style={{ paddingLeft: 16, margin: 0 }}>{(advisor.gaps || []).slice(0, 4).map((s, i) => <li key={i} style={{ fontSize: 12, color: "#ccc", marginBottom: 4 }}>{s}</li>)}</ul>
                        </div>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 12 }}>
                        <p style={{ fontSize: 11, color: "#7fb0ff", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Próximos Passos</p>
                        <ol style={{ paddingLeft: 16, margin: 0 }}>{(advisor.next_steps || []).slice(0, 5).map((s, i) => <li key={i} style={{ fontSize: 12, color: "#ccc", marginBottom: 4 }}>{s}</li>)}</ol>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ background: "rgba(0,230,118,0.04)", borderRadius: "4px 14px 14px 14px", padding: "16px 20px", maxWidth: "85%" }}><p style={{ fontSize: 13, color: "#ccc", lineHeight: 1.6 }}>Clique em <strong style={{ color: "#00E676" }}>Gerar Análise IA</strong> para avaliar o projeto e receber próximos passos com base nas fontes selecionadas.</p></div>
                      <div style={{ background: "rgba(0,230,118,0.04)", borderRadius: "4px 14px 14px 14px", padding: "16px 20px", maxWidth: "85%" }}><p style={{ fontSize: 13, color: "#ccc", lineHeight: 1.6 }}>A análise ajusta foco por aderência de funding e sugere ações práticas para aumentar chance de aprovação.</p></div>
                    </>
                  )}
                </div>
                {chatMessages.length > 0 && (
                  <div style={{ maxHeight: 220, overflowY: "auto", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "10px 0", marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    {chatMessages.map((m, i) => (
                      <div key={i} style={{ fontSize: 12, color: m.role === "assistant" ? "#d7e6dc" : "#98a0a6", lineHeight: 1.5 }}>
                        <span style={{ color: "#00E676", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginRight: 6 }}>{m.role === "assistant" ? "IA" : "Você"}</span>
                        {m.text}
                      </div>
                    ))}
                    {chatLoading && <div style={{ fontSize: 12, color: "#777" }}>Consultor IA está respondendo...</div>}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16 }}>
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        sendConsultorChat();
                      }
                    }}
                    placeholder="Pergunte ao Roundhouse…"
                    style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 13 }}
                    onFocus={e => e.target.style.borderColor = "rgba(0,230,118,0.3)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                  />
                  <button disabled={chatLoading || !chatInput.trim()} onClick={sendConsultorChat} style={{ background: "#00E676", opacity: chatLoading || !chatInput.trim() ? 0.55 : 1, border: "none", borderRadius: 10, padding: "0 16px", cursor: chatLoading || !chatInput.trim() ? "default" : "pointer", display: "flex", alignItems: "center" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button>
                </div>
              </div>
            </div>}

            {dt === "skills" && <div style={{ animation: "slideUp 0.3s ease", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: 20 }}>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Criar Skill do Cliente</h3>
                <p style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>Crie skills para projeto e edital com notificações e acionamento do agente RoundHound.</p>
                {skillsError && <p style={{ fontSize: 12, color: "#ff6b6b", marginBottom: 10 }}>{skillsError}</p>}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}>
                  <input value={skillName} onChange={e => setSkillName(e.target.value)} placeholder="Nome da Skill" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 12 }} />
                  <input value={skillProject} onChange={e => setSkillProject(e.target.value)} placeholder="Projeto" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 12 }} />
                  <input value={skillEdital} onChange={e => setSkillEdital(e.target.value)} placeholder="Edital/Aplicação" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 12 }} />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <button onClick={() => createSkill()} style={{ background: "#00E676", border: "none", borderRadius: 8, padding: "8px 12px", color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Salvar Skill</button>
                  <button onClick={() => downloadSkill({ name: skillName || "nova-skill", project: skillProject || "projeto", edital: skillEdital || "edital" })} style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "8px 12px", color: "#bbb", fontSize: 12, cursor: "pointer" }}>Baixar .md</button>
                </div>
              </div>

              {skillsLoading && <p style={{ fontSize: 12, color: "#777" }}>Carregando skills...</p>}
              {skills.map((s) => (
                <div key={s.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <h4 style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700 }}>{s.name}</h4>
                    <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 999, background: s.status === "Ativa" ? "rgba(0,230,118,0.12)" : "rgba(245,166,35,0.12)", color: s.status === "Ativa" ? "#00E676" : "#F5A623", textTransform: "uppercase", letterSpacing: 1 }}>{s.status}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#777", marginBottom: 10 }}>{s.project} · {s.edital}</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => downloadSkill(s)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "7px 10px", color: "#bbb", fontSize: 12, cursor: "pointer" }}>Baixar</button>
                    <button onClick={() => runSkillAction(s, "cloud")} style={{ background: "#F5A623", border: "none", borderRadius: 8, padding: "7px 10px", color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Rodar no RoundHound Cloud (Pro)</button>
                    <button onClick={() => runSkillAction(s, "agent")} style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "7px 10px", color: "#bbb", fontSize: 12, cursor: "pointer" }}>Ligar no Agente RoundHound</button>
                    <button onClick={() => toggleSkillNotifications(s)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "7px 10px", color: "#bbb", fontSize: 12, cursor: "pointer" }}>{s.notifications ? "Desativar alertas" : "Ativar alertas"}</button>
                    <button onClick={() => removeSkill(s)} style={{ background: "none", border: "1px solid rgba(255,120,120,0.35)", borderRadius: 8, padding: "7px 10px", color: "#ff8484", fontSize: 12, cursor: "pointer" }}>Remover</button>
                  </div>
                  <p style={{ fontSize: 11, color: "#666", marginTop: 8 }}>Notificações de edital e melhorias: <strong style={{ color: "#a8b6ad" }}>{s.notifications ? "ativas" : "inativas"}</strong> {runningSkillID === s.id ? " · executando..." : ""}</p>
                  {runBySkill[s.id]?.overview && <p style={{ fontSize: 11, color: "#F5A623", marginTop: 6 }}>{runBySkill[s.id].overview}</p>}
                </div>
              ))}
              {!skillsLoading && skills.length === 0 && <p style={{ fontSize: 12, color: "#666" }}>Nenhuma skill criada ainda.</p>}
            </div>}

            {dt === "qa" && <div style={{ animation: "slideUp 0.3s ease", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: 20 }}>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Telemetria de Qualidade da IA</h3>
                <p style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>Painel interno com score médio, taxa de rewrite e eventos recentes dos endpoints de IA.</p>
                {qualityError && <p style={{ fontSize: 12, color: "#ff6b6b", marginBottom: 10 }}>{qualityError}</p>}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}>
                  <input type="password" value={adminApiKey} onChange={e => setAdminApiKey(e.target.value)} placeholder="X-API-Key admin" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 12 }} />
                  <input type="number" min={1} max={200} value={qualityRecentLimit} onChange={e => setQualityRecentLimit(Math.max(1, Math.min(200, Number(e.target.value) || 20)))} placeholder="Recent limit" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 12 }} />
                  <button onClick={loadQualitySummary} style={{ background: "#00E676", border: "none", borderRadius: 8, padding: "8px 12px", color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{qualityLoading ? "Carregando..." : "Atualizar Telemetria"}</button>
                </div>
              </div>

              {quality && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "14px 16px" }}><p style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>Eventos</p><p style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700 }}>{quality.total_events}</p></div>
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "14px 16px" }}><p style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>Threshold</p><p style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700 }}>{quality.threshold}</p></div>
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "14px 16px" }}><p style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>Endpoints</p><p style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700 }}>{quality.endpoints?.length || 0}</p></div>
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "14px 16px" }}><p style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>Recentes</p><p style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700 }}>{quality.recent?.length || 0}</p></div>
              </div>}

              {quality && <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: 16 }}>
                <h4 style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Resumo por Endpoint</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(quality.endpoints || []).map((ep) => (
                    <div key={ep.endpoint} style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 12px", background: "rgba(255,255,255,0.01)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: "#ddd" }}>{ep.endpoint}</span>
                        <span style={{ fontSize: 12, color: "#8eddb0" }}>avg {ep.average_score}</span>
                      </div>
                      <p style={{ fontSize: 11, color: "#777" }}>total {ep.total} · below {ep.below_threshold} · rewrites {ep.rewrites} · rate {Number(ep.rewrite_rate || 0) * 100}%</p>
                    </div>
                  ))}
                  {(quality.endpoints || []).length === 0 && <p style={{ fontSize: 12, color: "#666" }}>Sem dados ainda.</p>}
                </div>
              </div>}

              {quality && <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: 16 }}>
                <h4 style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Eventos Recentes</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(quality.recent || []).map((ev) => (
                    <div key={ev.id} style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 12px", background: "rgba(255,255,255,0.01)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: "#ddd" }}>{ev.endpoint}</span>
                        <span style={{ fontSize: 12, color: Number(ev.score) >= Number(quality.threshold) ? "#00E676" : "#F5A623" }}>{ev.score}/{quality.threshold}</span>
                      </div>
                      <p style={{ fontSize: 11, color: "#777" }}>rewrite: {ev.rewritten ? "sim" : "não"} · faltou: {(ev.missing || []).length ? ev.missing.join(", ") : "ok"} · {new Date(ev.created_at).toLocaleString("pt-BR")}</p>
                    </div>
                  ))}
                  {(quality.recent || []).length === 0 && <p style={{ fontSize: 12, color: "#666" }}>Sem eventos recentes.</p>}
                </div>
              </div>}
            </div>}

            {dt === "notifs" && <div style={{ display: "flex", flexDirection: "column", gap: 8, animation: "slideUp 0.3s ease" }}>
              {[{ t: "Há 2h", m: "FINEP Inovacred: Prazo do demonstrativo financeiro em 12 dias", c: "#F5A623" }, { t: "Há 1d", m: "Fundo Clima: Aplicação recebida, em análise", c: "#00E676" }, { t: "Há 3d", m: "FINEP Inovacred: Nova exigência documental no edital", c: "#FF5252" }, { t: "Há 5d", m: "BNDES Agro: Rascunho salvo", c: "#555" }].map((n, i) =>
                <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: "16px 20px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", animation: "slideUp 0.3s ease " + (i * 0.05) + "s both" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 6, flexShrink: 0, background: n.c }} />
                  <div><p style={{ fontSize: 13, color: "#ccc", lineHeight: 1.5 }}>{n.m}</p><span style={{ fontSize: 11, color: "#555" }}>{n.t}</span></div>
                </div>
              )}
              <div style={{ marginTop: 24, padding: "24px 28px", borderRadius: 14, background: "rgba(37,211,102,0.04)", border: "1px solid rgba(37,211,102,0.15)" }}>
                <h4 style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "#25D366", marginBottom: 8 }}>Alertas WhatsApp</h4>
                <p style={{ fontSize: 12, color: "#666", marginBottom: 16 }}>Lembretes de prazos e atualizações direto no WhatsApp.</p>
                {waOk ? <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#25D366" }} /><span style={{ fontSize: 13, color: "#25D366" }}>Conectado: {wa}</span><button onClick={() => { setWaOk(false); setWa(""); }} style={{ background: "none", border: "none", color: "#555", fontSize: 11, cursor: "pointer", marginLeft: 8 }}>Alterar</button></div>
                : <div style={{ display: "flex", gap: 8 }}><input value={wa} onChange={e => setWa(e.target.value)} placeholder="+55 11 99999-9999" style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(37,211,102,0.2)", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 13 }} /><button onClick={() => wa && setWaOk(true)} style={{ background: "#25D366", border: "none", borderRadius: 8, padding: "0 16px", color: "#000", fontSize: 13, fontWeight: 600, fontFamily: "'Syne', sans-serif", cursor: "pointer" }}>Ativar</button></div>}
              </div>
            </div>}

            {dt === "config" && <div style={{ animation: "slideUp 0.3s ease", maxWidth: 480 }}>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: 28 }}>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 700, marginBottom: 24 }}>Plano & Pagamento</h3>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1, padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "2px solid rgba(0,230,118,0.3)" }}>
                    <div style={{ fontSize: 11, color: "#00E676", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>Atual</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Demo</div>
                    <div style={{ fontSize: 12, color: "#555" }}>3 buscas/mês</div>
                  </div>
                  <div onClick={() => setStripe(true)} style={{ flex: 1, padding: 20, borderRadius: 12, background: "rgba(245,166,35,0.04)", border: "1px solid rgba(245,166,35,0.15)", cursor: "pointer", transition: "all 0.3s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(245,166,35,0.4)"} onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(245,166,35,0.15)"}>
                    <div style={{ fontSize: 11, color: "#F5A623", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>Upgrade</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: "#F5A623", marginBottom: 4 }}>Pro</div>
                    <div style={{ fontSize: 12, color: "#555" }}>Ilimitado + IA</div>
                  </div>
                </div>
              </div>
            </div>}
          </div>

          {stripe && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(8px)" }} onClick={() => setStripe(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#0a0a0a", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", padding: "36px 32px", width: "100%", maxWidth: 400, animation: "slideUp 0.3s ease", margin: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
                <div><h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Plano Pro</h3><p style={{ fontSize: 13, color: "#888" }}>Mensal</p></div>
                <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: "#F5A623" }}>R$97<span style={{ fontSize: 13, fontWeight: 400, color: "#666" }}>/mês</span></span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                {["Buscas e aplicações ilimitadas", "Roundhouse IA avançado", "Alertas WhatsApp prioritários", "Revisão automática de docs", "Suporte dedicado"].map((f, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00E676" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg><span style={{ fontSize: 13, color: "#ccc" }}>{f}</span></div>)}
              </div>
              <button style={{ width: "100%", background: "linear-gradient(135deg, #F5A623, #E09D18)", border: "none", borderRadius: 10, padding: "14px", color: "#000", fontSize: 15, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>Assinar com Stripe</button>
              <button onClick={() => setStripe(false)} style={{ width: "100%", background: "none", border: "none", color: "#555", fontSize: 12, marginTop: 12, cursor: "pointer" }}>Talvez depois</button>
            </div>
          </div>}
        </div>
      )}
    </div>
  );
}
