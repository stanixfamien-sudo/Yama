import { GoogleGenAI } from "@google/genai";
import { InferenceClient } from "@huggingface/inference";
import { createClient } from "@supabase/supabase-js";

type Mode = "chat" | "image" | "retouch" | "files" | "homework" | "learn";

type HistoryMessage = {
  role: "user" | "model";
  content: string;
};

type Attachment = {
  name?: string;
  mimeType: string;
  data: string;
};

type Body = {
  mode?: Mode;
  prompt?: string;
  history?: HistoryMessage[];
  attachments?: Attachment[];
  imageData?: string;
  imageMimeType?: string;
};

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const HF_IMAGE_MODEL =
  process.env.HF_IMAGE_MODEL || "black-forest-labs/FLUX.1-Krea-dev";
const HF_EDIT_MODEL =
  process.env.HF_EDIT_MODEL || "black-forest-labs/FLUX.2-dev";

function json(data: unknown, status = 200, origin = "*") {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

function getOrigin(request: Request) {
  const configured = process.env.APP_ORIGIN;
  if (configured) return configured;
  return request.headers.get("origin") || "*";
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing server environment variable: ${name}`);
  return value;
}

function dataUrlToBytes(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image data URL.");
  const mimeType = match[1];
  const bytes = Uint8Array.from(atob(match[2]), (char) => char.charCodeAt(0));
  return { mimeType, bytes };
}

async function requireUser(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new Response(JSON.stringify({ error: "Authentication required." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = authorization.slice("Bearer ".length);
  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const supabaseKey =
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseKey) {
    throw new Error(
      "Missing server environment variable: SUPABASE_PUBLISHABLE_KEY"
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new Response(JSON.stringify({ error: "Invalid session." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return data.user;
}

function buildGeminiContents(body: Body) {
  const history = (body.history || []).map((message) => ({
    role: message.role,
    parts: [{ text: message.content }],
  }));

  const parts: Array<Record<string, unknown>> = [];
  if (body.prompt?.trim()) parts.push({ text: body.prompt.trim() });

  for (const attachment of body.attachments || []) {
    parts.push({
      inlineData: {
        mimeType: attachment.mimeType,
        data: attachment.data.replace(/^data:[^;]+;base64,/, ""),
      },
    });
  }

  if (!parts.length) parts.push({ text: "Aide-moi." });

  return [...history, { role: "user", parts }];
}

async function runGemini(body: Body) {
  const ai = new GoogleGenAI({ apiKey: requiredEnv("GEMINI_API_KEY") });

  const systemInstruction = [
    "Tu es Yama AI.",
    "Tu aides avec bienveillance, clarté et précision.",
    "Tu utilises uniquement le contexte fourni par l'application.",
    "Tu ne prends pas de décision importante à la place de l'utilisateur.",
  ].join(" ");

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: buildGeminiContents(body),
    config: {
      systemInstruction,
      temperature: 0.7,
      maxOutputTokens: 1800,
    },
  });

  return { type: "text", text: response.text || "" };
}

async function runHuggingFace(body: Body) {
  const hf = new InferenceClient(requiredEnv("HF_TOKEN"));

  if (body.mode === "image") {
    const prompt = body.prompt?.trim();
    if (!prompt) throw new Error("An image prompt is required.");

    const image = await hf.textToImage({
      model: HF_IMAGE_MODEL,
      inputs: prompt,
    });

    const bytes = new Uint8Array(await image.arrayBuffer());
    const base64 = btoa(String.fromCharCode(...bytes));
    const mimeType = image.type || "image/png";

    return {
      type: "image",
      mimeType,
      dataUrl: `data:${mimeType};base64,${base64}`,
    };
  }

  if (body.mode === "retouch") {
    if (!body.imageData) throw new Error("An image is required for retouching.");

    const { mimeType, bytes } = dataUrlToBytes(body.imageData);
    const prompt =
      body.prompt?.trim() ||
      "Improve the image naturally while preserving the main subject.";

    const image = await hf.imageTextToImage({
      model: HF_EDIT_MODEL,
      inputs: prompt,
      image: new Blob([bytes], { type: body.imageMimeType || mimeType }),
    });

    const outputBytes = new Uint8Array(await image.arrayBuffer());
    const outputBase64 = btoa(String.fromCharCode(...outputBytes));
    const outputMime = image.type || "image/png";

    return {
      type: "image",
      mimeType: outputMime,
      dataUrl: `data:${outputMime};base64,${outputBase64}`,
    };
  }

  throw new Error("Unsupported Hugging Face mode.");
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": getOrigin(request),
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

export async function POST(request: Request) {
  const origin = getOrigin(request);

  try {
    await requireUser(request);

    const body = (await request.json()) as Body;
    const mode = body.mode || "chat";

    if (!["chat", "image", "retouch", "files", "homework", "learn"].includes(mode)) {
      return json({ error: "Unsupported mode." }, 400, origin);
    }

    if (mode === "image" || mode === "retouch") {
      return json(await runHuggingFace(body), 200, origin);
    }

    return json(await runGemini(body), 200, origin);
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("Yama AI error:", error);
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Yama AI could not complete the request.",
      },
      500,
      origin
    );
  }
}
