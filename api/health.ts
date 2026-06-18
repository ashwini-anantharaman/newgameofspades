import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.json({ ok: true, coach: Boolean(process.env.ANTHROPIC_API_KEY) });
}
