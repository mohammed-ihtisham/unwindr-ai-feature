import fs from "fs";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Configuration for Gemini API
type GenConfig = {
  apiKey: string;
  model?: string;
  maxOutputTokens?: number;
  timeoutMs?: number;
};

// Load configuration from config.json file
function loadConfig(): GenConfig {
  const cfgPath = path.resolve(process.cwd(), "config.json");
  if (!fs.existsSync(cfgPath)) {
    throw new Error(
      "Missing config.json at project root. Copy config.json.template → config.json and add your Gemini API key."
    );
  }
  const raw = fs.readFileSync(cfgPath, "utf-8");
  const cfg = JSON.parse(raw) as GenConfig;
  if (!cfg.apiKey || typeof cfg.apiKey !== "string") {
    throw new Error("config.json is missing a valid 'apiKey'.");
  }
  return {
    model: "gemini-2.5-flash-lite",
    maxOutputTokens: 256,
    timeoutMs: 20_000,
    ...cfg,
  };
}

const CFG = loadConfig();
const genAI = new GoogleGenerativeAI(CFG.apiKey);

// Utility to add timeout to promises
async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let to: NodeJS.Timeout | undefined;
  const timeout = new Promise<T>((_, rej) => {
    to = setTimeout(() => rej(new Error("LLM timeout exceeded")), ms);
  });
  try {
    const result = await Promise.race([p, timeout]);
    return result as T;
  } finally {
    if (to) clearTimeout(to);
  }
}

// Parse JSON from AI response, handling code fences
function parseJsonLoose(text: string): any {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;
  return JSON.parse(candidate);
}

// Call Gemini API with JSON response format and retry logic
export async function callGeminiJSON(prompt: string): Promise<any> {
  const model = genAI.getGenerativeModel({
    model: CFG.model ?? "gemini-2.5-flash-lite",
    generationConfig: {
      maxOutputTokens: CFG.maxOutputTokens ?? 256,
      responseMimeType: "application/json",
    },
  });

  const attemptOnce = async () => {
    const res = await model.generateContent(prompt);
    const text = res.response.text();
    return parseJsonLoose(text);
  };

  // Retry logic with exponential backoff
  const maxRetries = 2;
  let tryCount = 0;
  while (true) {
    try {
      const json = await withTimeout(attemptOnce(), CFG.timeoutMs ?? 20_000);
      return json;
    } catch (err: any) {
      if (tryCount >= maxRetries) {
        const reason = err?.message ?? String(err);
        throw new Error(`LLM call failed after ${maxRetries + 1} attempts: ${reason}`);
      }
      const delayMs = 300 * Math.pow(2, tryCount);
      await new Promise((r) => setTimeout(r, delayMs));
      tryCount += 1;
    }
  }
}

// Call Gemini API for plain text responses (not used in main pipeline)
export async function callGeminiText(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: CFG.model ?? "gemini-2.5-flash-lite",
    generationConfig: {
      maxOutputTokens: CFG.maxOutputTokens ?? 256,
    },
  });

  const once = async () => {
    const res = await model.generateContent(prompt);
    return res.response.text();
  };

  return withTimeout(once(), CFG.timeoutMs ?? 20_000);
}
