import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Same scoring table as the desktop client — single source of truth via API
const ANSWER_SCORES: Record<string, Record<string, number>> = {
  "stress-level": { "1": 10, "2": 25, "3": 50, "4": 70, "5": 90 },
  "anxiety":      { "Not at all": 0, "A little": 15, "Moderately": 40, "Very": 70 },
  "social":       { "Yes": 0, "No": 20 },
  "energy":       { "High": 0, "Medium": 15, "Low": 35 },
  "overwhelm":    { "Not at all": 0, "A little": 15, "Somewhat": 35, "Very": 60 },
  "break":        { "Yes": 0, "No": 20 },
  "sleep":        { "Good": 0, "Fair": 15, "Poor": 35 },
};
const WEIGHTS: Record<string, number> = {
  "stress-level": 0.30,
  "anxiety":      0.20,
  "social":       0.10,
  "energy":       0.10,
  "overwhelm":    0.15,
  "break":        0.05,
  "sleep":        0.10,
};

function computeSurveyScore(
  answers: Record<string, string>,
  sensorScore: number
): number {
  let surveyPart = 0;
  let totalWeight = 0;
  for (const [qId, weight] of Object.entries(WEIGHTS)) {
    if (answers[qId] !== undefined) {
      surveyPart += (ANSWER_SCORES[qId]?.[answers[qId]] ?? 50) * weight;
      totalWeight += weight;
    }
  }
  const surveyScore = totalWeight > 0 ? surveyPart / totalWeight : sensorScore;
  // 60% survey answers, 40% live sensor — same blend as desktop fallback
  return Math.round(Math.max(0, Math.min(100, surveyScore * 0.6 + sensorScore * 0.4)));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { score: sensorScore, factors, surveyAnswers, source } = req.body ?? {};
  if (typeof sensorScore !== "number") return res.status(400).json({ error: "score required" });

  // Compute authoritative score server-side
  const computedScore = surveyAnswers
    ? computeSurveyScore(surveyAnswers as Record<string, string>, sensorScore)
    : sensorScore;

  // Attribute to user if auth token provided
  let userId: string | null = null;
  const authHeader = (req.headers.authorization ?? "") as string;
  if (authHeader.startsWith("Bearer ")) {
    const { data } = await supabase.auth.getUser(authHeader.slice(7));
    userId = data?.user?.id ?? null;
  }

  // Store in telemetry_events — ignore insert error, still return score
  await supabase.from("telemetry_events").insert({
    user_id: userId,
    event: "stress_reading",
    cli: computedScore,
    details: { sensorScore, factors: factors ?? null, surveyAnswers: surveyAnswers ?? null, source: source ?? "desktop" },
  });

  // Return the server-computed score back to the desktop client
  return res.status(200).json({ ok: true, score: computedScore });
}
