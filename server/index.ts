import 'dotenv/config';
import express from 'express';
import { parseAssistantRequest, parseExtractRequest, parseGenerateRequest } from './ai/schemas.ts';
import { getProvider, runAssistant, runExtract, runGenerate } from './ai/providers.ts';

const app = express();
const port = Number(process.env.PORT || 8787);

app.use(express.json({ limit: '3mb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, provider: getProvider(), hasGeminiKey: Boolean(process.env.GEMINI_API_KEY), hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY) });
});

app.post('/api/assistant', async (req, res) => {
  const parsed = parseAssistantRequest(req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const result = await runAssistant(parsed.data);
  res.json(result);
});

app.post('/api/generate', async (req, res) => {
  const parsed = parseGenerateRequest(req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const result = await runGenerate(parsed.data);
  res.json({ items: result.items, provider: result.provider });
});

app.post('/api/extract', async (req, res) => {
  const parsed = parseExtractRequest(req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const result = await runExtract(parsed.data.text, parsed.data.tasks);
  res.json(result);
});

app.listen(port, () => {
  const provider = getProvider();
  console.log(`[GeneticsEdu API] http://localhost:${port} provider=${provider}`);
});
