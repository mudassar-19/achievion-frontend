// GET an Employee AI route only when the AI is on (Batch 4). The status call makes no AI request; asking it first means a
// server without AI keys shows its calm "AI is off" line without a failing 503 request on every page view.
import api from "@/lib/api";

export async function aiGet(path) {
  const st = await api.get("/api/workspace/ai/status", { silent: true });
  if (!st.configured) throw Object.assign(new Error("AI is not configured."), { status: 503, data: { code: "ai_off" } });
  return api.get(path, { silent: true });
}
