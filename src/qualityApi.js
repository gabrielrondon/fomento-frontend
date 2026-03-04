const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

export async function fetchQualitySummary(apiKey, recentLimit = 20) {
  const res = await fetch(`${API_BASE}/v1/ai/quality/summary?recent_limit=${encodeURIComponent(String(recentLimit))}`, {
    headers: { "X-API-Key": apiKey },
  });
  if (!res.ok) throw new Error("quality_summary_failed");
  return res.json();
}
