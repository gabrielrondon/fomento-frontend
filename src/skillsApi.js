const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

export async function listSkills(actorId) {
  const res = await fetch(`${API_BASE}/v1/skills?actor_id=${encodeURIComponent(actorId)}`, {
    headers: { "X-Actor-ID": actorId },
  });
  if (!res.ok) throw new Error("skills_list_failed");
  const data = await res.json();
  return data.items || [];
}

export async function createSkill(actorId, payload) {
  const res = await fetch(`${API_BASE}/v1/skills`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Actor-ID": actorId },
    body: JSON.stringify({
      actor_id: actorId,
      name: payload.name,
      project: payload.project,
      edital: payload.edital,
      status: payload.status || "Rascunho",
      notifications: payload.notifications ?? true,
    }),
  });
  if (!res.ok) throw new Error("skill_create_failed");
  return res.json();
}

export async function updateSkill(actorId, skillId, payload) {
  const res = await fetch(`${API_BASE}/v1/skills/${encodeURIComponent(skillId)}?actor_id=${encodeURIComponent(actorId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "X-Actor-ID": actorId },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("skill_update_failed");
  return res.json();
}

export async function deleteSkill(actorId, skillId) {
  const res = await fetch(`${API_BASE}/v1/skills/${encodeURIComponent(skillId)}?actor_id=${encodeURIComponent(actorId)}`, {
    method: "DELETE",
    headers: { "X-Actor-ID": actorId },
  });
  if (!res.ok) throw new Error("skill_delete_failed");
}

export async function runSkill(actorId, skillId, payload = {}) {
  const res = await fetch(`${API_BASE}/v1/skills/${encodeURIComponent(skillId)}/run?actor_id=${encodeURIComponent(actorId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Actor-ID": actorId },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("skill_run_failed");
  return res.json();
}

export async function downloadSkillMarkdown(actorId, skillId) {
  const res = await fetch(`${API_BASE}/v1/skills/${encodeURIComponent(skillId)}/download?actor_id=${encodeURIComponent(actorId)}`, {
    headers: { "X-Actor-ID": actorId },
  });
  if (!res.ok) throw new Error("skill_download_failed");
  return res.blob();
}

export async function listProjects(actorId) {
  const res = await fetch(`${API_BASE}/v1/projects?actor_id=${encodeURIComponent(actorId)}`, {
    headers: { "X-Actor-ID": actorId },
  });
  if (!res.ok) throw new Error("projects_list_failed");
  const data = await res.json();
  return data.items || [];
}

export async function getSkillRecommendation(actorId, projectId) {
  const res = await fetch(`${API_BASE}/v1/skills/recommendations?actor_id=${encodeURIComponent(actorId)}&project_id=${encodeURIComponent(projectId)}`, {
    headers: { "X-Actor-ID": actorId },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("skill_recommendation_fetch_failed");
  return res.json();
}

export async function runSkillRecommendation(actorId, payload = {}) {
  const res = await fetch(`${API_BASE}/v1/skills/recommendations/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Actor-ID": actorId },
    body: JSON.stringify({
      actor_id: actorId,
      project_id: payload.project_id || "",
      project_context: payload.project_context || "",
      force: payload.force === true,
    }),
  });
  if (!res.ok) throw new Error("skill_recommendation_run_failed");
  return res.json();
}
