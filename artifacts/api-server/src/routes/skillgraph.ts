import { Router, type IRouter } from "express";
import {
  AnalyzeJobDescriptionBody,
  AnalyzeJobDescriptionResponse,
  AnalyzeSkillGraphBody,
  AnalyzeSkillGraphResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenced?.[1]?.trim() ?? text.trim();
}

async function generateStructuredJson(
  prompt: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("AI provider is not configured");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
          maxOutputTokens: 8192,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`AI provider returned ${response.status}`);
  }

  const payload = (await response.json()) as GeminiResponse;
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("AI provider returned an empty response");
  }

  return JSON.parse(extractJson(text));
}

function profileSummary(
  skills: Array<{ name: string; level: string; score: number; status: string }>,
) {
  return skills
    .map(
      (skill) =>
        `${skill.name}: ${skill.level} (${skill.score}/100, ${skill.status})`,
    )
    .join("\n");
}

router.post("/skillgraph/analyze", async (req, res) => {
  const parsed = AnalyzeSkillGraphBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please provide a career and assessed skills." });
    return;
  }

  const { career, skills } = parsed.data;
  const prompt = `You are a careful career intelligence assistant. Analyze a self-assessed profile for the target career "${career}".

Profile:
${profileSummary(skills)}

Return ONLY valid JSON matching this exact shape:
{
  "readiness": number from 0 to 100,
  "strongSkills": string[],
  "developingSkills": string[],
  "priorityGaps": string[],
  "whyGapsMatter": string,
  "recommendedFocus": string,
  "nextActions": string[],
  "roadmap": [{"week": number, "topic": string, "why": string, "skills": string[], "activity": string, "effort": string}],
  "projects": [{"title": string, "difficulty": string, "description": string, "skills": string[], "why": string, "stack": string[], "outcome": string}]
}
Keep the advice practical, specific to the target career, and encouraging. Create 6 roadmap weeks and 3 projects. This is guidance based on self-assessment, not a validated employment prediction.`;

  try {
    const data = AnalyzeSkillGraphResponse.parse(
      await generateStructuredJson(prompt, AbortSignal.timeout(25_000)),
    );
    res.json(data);
  } catch (error) {
    req.log.error({ err: error }, "SkillGraph analysis failed");
    res.status(502).json({ error: "AI analysis is temporarily unavailable. Please try again." });
  }
});

router.post("/skillgraph/job-analyze", async (req, res) => {
  const parsed = AnalyzeJobDescriptionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Please provide a job description with at least 50 characters.",
    });
    return;
  }

  const { career, skills, jobDescription } = parsed.data;
  const prompt = `You are a careful career intelligence assistant. Compare this user's current self-assessed profile with a real job description for the target career "${career}".

Profile:
${profileSummary(skills)}

Job description:
${jobDescription}

Return ONLY valid JSON matching this exact shape:
{
  "role": string,
  "requiredSkills": string[],
  "preferredSkills": string[],
  "technologies": string[],
  "experienceExpectations": string,
  "keywords": string[],
  "covered": string[],
  "partiallyCovered": string[],
  "missing": string[],
  "recommendedActions": string[]
}
Be factual and transparent. This is career guidance only. Do not claim guaranteed employment, ATS scores, interviews, or job matching.`;

  try {
    const data = AnalyzeJobDescriptionResponse.parse(
      await generateStructuredJson(prompt, AbortSignal.timeout(25_000)),
    );
    res.json(data);
  } catch (error) {
    req.log.error({ err: error }, "Job description analysis failed");
    res.status(502).json({ error: "Job analysis is temporarily unavailable. Please try again." });
  }
});

export default router;