import { GoogleGenAI } from "@google/genai";
import { InferenceClient } from "@huggingface/inference";
import { createClient } from "@supabase/supabase-js";

type Mode = "chat" | "image" | "retouch" | "files" | "homework" | "learn";
type HistoryMessage = { role: "user" | "model"; content: string };
type Attachment = { name?: string; mimeType: string; data: string };
type Body = { mode?: Mode; prompt?: string; history?: HistoryMessage[]; attachments?: Attachment[]; imageData?: string; imageMimeType?: string };

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const MISTRAL_MODEL = process.env.MISTRAL_MODEL || "mistral-small-latest";
const GEMINI_IMAGE_ANALYSIS_MODEL = process.env.GEMINI_IMAGE_ANALYSIS_MODEL || GEMINI_MODEL;
const HF_IMAGE_MODEL = process.env.HF_IMAGE_MODEL || "black-forest-labs/FLUX.1-Krea-dev";
const HF_EDIT_MODEL = process.env.HF_EDIT_MODEL || "black-forest-labs/FLUX.2-dev";

function json(data: unknown, status = 200, origin = "*") { return Response.json(data, { status, headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "POST, OPTIONS" } }); }
function getOrigin(request: Request) { return process.env.APP_ORIGIN || request.headers.get("origin") || "*"; }
function requiredEnv(name: string) { const value = process.env[name]; if (!value) throw new Error(`Missing server environment variable: ${name}`); return value; }
function dataUrlToBytes(dataUrl: string) { const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/); if (!match) throw new Error("Invalid image data URL."); return { mimeType: match[1], bytes: Uint8Array.from(atob(match[2]), c => c.charCodeAt(0)) }; }
function bytesToBase64(bytes: Uint8Array) { let binary = ""; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length))); return btoa(binary); }

async function requireUser(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new Response(JSON.stringify({ error: "Authentication required." }), { status: 401, headers: { "Content-Type": "application/json" } });
  const token = authorization.slice(7);
  const supabase = createClient(requiredEnv("SUPABASE_URL"), process.env.SUPABASE_PUBLISHABLE_KEY || requiredEnv("SUPABASE_ANON_KEY"));
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Response(JSON.stringify({ error: "Invalid session." }), { status: 401, headers: { "Content-Type": "application/json" } });
  return data.user;
}

function buildGeminiContents(body: Body) {
  const history = (body.history || []).map(message => ({ role: message.role, parts: [{ text: message.content }] }));
  const parts: Array<Record<string, unknown>> = [];
  if (body.prompt?.trim()) parts.push({ text: body.prompt.trim() });
  for (const attachment of body.attachments || []) parts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data.replace(/^data:[^;]+;base64,/, "") } });
  if (!parts.length) parts.push({ text: "Aide-moi." });
  return [...history, { role: "user", parts }];
}

async function runGemini(body: Body) {
  const ai = new GoogleGenAI({ apiKey: requiredEnv("GEMINI_API_KEY") });
  const response = await ai.models.generateContent({ model: body.imageData ? GEMINI_IMAGE_ANALYSIS_MODEL : GEMINI_MODEL, contents: buildGeminiContents(body), config: { systemInstruction: "Tu es Yama AI. Tu aides avec bienveillance, clarté et précision. Pour les devoirs et l'apprentissage, explique les étapes plutôt que de donner seulement la réponse.", temperature: 0.7, maxOutputTokens: 1800 } });
  return { type: "text", text: response.text || "" };
}

async function runMistral(body: Body) {
  const apiKey = requiredEnv("MISTRAL_API_KEY");
  const content: Array<Record<string, unknown>> = [{ type: "text", text: body.prompt?.trim() || "Analyse ce contenu et aide-moi." }];
  if (body.imageData) content.push({ type: "image_url", image_url: body.imageData });
  for (const attachment of body.attachments || []) if (attachment.mimeType.startsWith("image/")) content.push({ type: "image_url", image_url: attachment.data });
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: MISTRAL_MODEL, messages: [{ role: "system", content: "Tu es Mistral, le moteur d'analyse de Yama. Analyse précisément les images et documents visuels et retourne une réponse claire en français." }, { role: "user", content }], temperature: 0.3, max_tokens: 1800 }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || data?.error?.message || "Mistral API error.");
  return { type: "text", text: data.choices?.[0]?.message?.content || "" };
}

async function runHuggingFace(body: Body) {
  const hf = new InferenceClient(requiredEnv("HF_TOKEN"));
  if (body.mode === "image") {
    if (!body.prompt?.trim()) throw new Error("An image prompt is required.");
    const image = await hf.textToImage({ model: HF_IMAGE_MODEL, inputs: body.prompt.trim() });
    const bytes = new Uint8Array(await image.arrayBuffer()); const mimeType = image.type || "image/png";
    return { type: "image", mimeType, dataUrl: `data:${mimeType};base64,${bytesToBase64(bytes)}` };
  }
  if (body.mode === "retouch") {
    if (!body.imageData) throw new Error("An image is required for retouching.");
    const { bytes } = dataUrlToBytes(body.imageData); const prompt = body.prompt?.trim() || "Improve the image naturally while preserving the main subject.";
    const image = await hf.imageTextToImage({ model: HF_EDIT_MODEL, inputs: bytesToBase64(bytes), parameters: { prompt } });
    const output = new Uint8Array(await image.arrayBuffer()); const mimeType = image.type || "image/png";
    return { type: "image", mimeType, dataUrl: `data:${mimeType};base64,${bytesToBase64(output)}` };
  }
  throw new Error("Unsupported Hugging Face mode.");
}

async function runMultiAI(body: Body) {
  const hasImage = Boolean(body.imageData || body.attachments?.some(a => a.mimeType.startsWith("image/")));
  const wantsVisualAnalysis = hasImage && (body.mode === "files" || body.mode === "homework" || body.mode === "learn" || body.mode === "chat");
  if (wantsVisualAnalysis && process.env.MISTRAL_API_KEY) return runMistral(body);
  return runGemini(body);
}

export async function OPTIONS(request: Request) { return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": getOrigin(request), "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "POST, OPTIONS" } }); }

export async function POST(request: Request) {
  const origin = getOrigin(request);
  try {
    await requireUser(request);
    const body = (await request.json()) as Body; const mode = body.mode || "chat";
    if (!["chat", "image", "retouch", "files", "homework", "learn"].includes(mode)) return json({ error: "Unsupported mode." }, 400, origin);
    if (mode === "image" || mode === "retouch") return json(await runHuggingFace(body), 200, origin);
    return json(await runMultiAI(body), 200, origin);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Yama AI error:", error);
    return json({ error: error instanceof Error ? error.message : "Yama AI could not complete the request." }, 500, origin);
  }
}
