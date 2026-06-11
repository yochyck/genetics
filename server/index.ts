import 'dotenv/config';
import express from 'express';
import { parseAssistantRequest, parseExtractRequest, parseGenerateRequest } from './ai/schemas.ts';
import { getConfiguredProvider, providerDiagnostics, providerModels, runAssistant, runDebugAiTest, runExtract, runGenerate } from './ai/providers.ts';

const app = express();
const port = Number(process.env.PORT || 8787);
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '5mb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ...providerDiagnostics(), serverTime: new Date().toISOString(), note: 'health checks configuration only; use /api/debug/ai-test for live provider test' });
});

app.get('/api/debug/provider-models', async (_req, res) => {
  if (isProduction) return res.status(404).json({ ok: false, error: 'debug endpoints are disabled in production' });
  const diagnostics = providerModels();
  res.json(diagnostics);
});

app.post('/api/debug/ai-test', async (req, res) => {
  if (isProduction) return res.status(404).json({ ok: false, error: 'debug endpoints are disabled in production' });
  const provider = typeof req.body?.provider === 'string' ? req.body.provider : 'auto';
  const prompt = typeof req.body?.prompt === 'string' && req.body.prompt.trim() ? req.body.prompt.slice(0, 4000) : 'Ответь одним словом: работает?';
  const preferredModel = typeof req.body?.preferredModel === 'string' ? req.body.preferredModel : undefined;
  const result = await runDebugAiTest(provider, prompt, preferredModel);
  res.json(result);
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
  res.json(result);
});

app.post('/api/extract', async (req, res) => {
  const parsed = parseExtractRequest(req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const result = await runExtract(parsed.data);
  res.json(result);
});

app.listen(port, () => {
  const diagnostics = providerDiagnostics();
  console.log(`[GeneticsEdu API] http://localhost:${port} configuredProvider=${getConfiguredProvider()} order=${diagnostics.providerOrder.join('>')}`);
  if (diagnostics.configuredProvider === 'gemini' && !diagnostics.hasGeminiKey) console.warn('[GeneticsEdu API] AI_PROVIDER=gemini but GEMINI_API_KEY is missing; broker will continue through AI_PROVIDER_ORDER.');
  if (diagnostics.configuredProvider === 'groq' && !diagnostics.hasGroqKey) console.warn('[GeneticsEdu API] AI_PROVIDER=groq but GROQ_API_KEY is missing; broker will continue through AI_PROVIDER_ORDER.');
  if (diagnostics.configuredProvider === 'mistral' && !diagnostics.hasMistralKey) console.warn('[GeneticsEdu API] AI_PROVIDER=mistral but MISTRAL_API_KEY is missing; broker will continue through AI_PROVIDER_ORDER.');
});
