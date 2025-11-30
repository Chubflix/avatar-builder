/**
 * Image Appearance Analysis Tool
 * Shared utility to analyze an image (URL or File/Buffer) and return a concise
 * physical appearance description. No database writes occur here.
 */

type AnalyzeArgs = {
  imageUrl?: string | null;
  file?: File | null;
  /** Optional: constrain analysis to a character scope, for logging/ownership in callers */
  characterId?: string;
};

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini';

function isHttpUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isDataUrl(value: string | null | undefined) {
  if (!value) return false;
  return /^data:image\/(png|jpeg|jpg|webp);base64,/i.test(value);
}

function getMimeTypeFromFilename(name: string): string {
  const ext = name.toLowerCase().split('.').pop() || '';
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

async function callOpenAIVision({ imageUrl, prompt }: { imageUrl: string; prompt: string }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  const body = {
    model: OPENAI_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    temperature: 0.4,
  } as any;

  const res = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${errText}`);
  }

  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error('Failed to parse OpenAI response');
  }
  return text;
}

export async function analyzeImageAppearance(args: AnalyzeArgs): Promise<{ description: string }>
{
  const { imageUrl: rawUrl, file } = args || {};

  const prompt = `Describe only the character's physical appearance visible in the image. Focus on:
- approximate age range, body type, height impression
- face (shape, features), eyes (shape/color), hair (style/color/length)
- skin tone, notable marks (scars, tattoos), accessories
- clothing style, colors, textures, and overall aesthetic
Do not speculate about personality, backstory, or things not visible. Keep it concise (120-180 words).`;

  if (!file && !(isHttpUrl(rawUrl) || isDataUrl(rawUrl))) {
    throw new Error('Provide an image file, a valid HTTP(S) imageUrl, or a data:image/*;base64 URL');
  }

  let description: string;
  if (file) {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    const mime = (file as any).type || getMimeTypeFromFilename((file as any).name || '');
    if (!allowedTypes.includes(mime)) {
      throw new Error('Invalid image type. Allowed: png, jpg, jpeg, webp');
    }
    const size = (file as any).size ?? 0;
    if (size > 8 * 1024 * 1024) {
      throw new Error('Image too large (max 8MB)');
    }
    const arrayBuffer = await (file as any).arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:${mime};base64,${base64}`;
    description = await callOpenAIVision({ imageUrl: dataUrl, prompt });
  } else {
    description = await callOpenAIVision({ imageUrl: rawUrl as string, prompt });
  }

  return { description };
}

export default analyzeImageAppearance;
