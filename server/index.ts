import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { assistantRequestSchema, extractRequestSchema, generateRequestSchema } from './ai/schemas.ts';
import { getProvider, runAssistant, runExtract, runGenerate } from './ai/providers.ts';

const app = express();
const port = Number(process.env.PORT || 8787);

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '3mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, provider: getProvider(), hasGeminiKey: Boolean(process.env.GEMINI_API_KEY), hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY) });
});

app.post('/api/assistant', async (req, res) => {
  const parsed = assistantRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const result = await runAssistant(parsed.data);
  res.json(result);
});

app.post('/api/generate', async (req, res) => {
  const parsed = generateRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const result = await runGenerate(parsed.data);
  res.json({ items: result.items, provider: result.provider });
});

app.post('/api/extract', async (req, res) => {
  const parsed = extractRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const result = await runExtract(parsed.data.text, parsed.data.tasks);
  res.json(result);
});

app.listen(port, () => {
  const provider = getProvider();
  console.log(`[GeneticsEdu API] http://localhost:${port} provider=${provider}`);
});
