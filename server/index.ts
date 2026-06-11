import 'dotenv/config';
import express from 'express';
import { parseAiTestRequest, parseAssistantRequest, parseCoursePlanRequest, parseExtractRequest, parseGenerateRequest, parseSplitRequest, parseSummaryRequest } from './ai/schemas.ts';
import { getAiHealth, getConfiguredProvider, getProviderModelsWithLive, runAssistant, runCoursePlan, runExtract, runGenerate, runSplit, runSummary, testAiProvider } from './ai/providers.ts';

const app = express();
const port = Number(process.env.PORT || 8787);

app.use(express.json({ limit: '12mb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

const safeError = (error: unknown) => error instanceof Error ? error.message : String(error || 'unknown_error');
const invalid = (res: express.Response, error: string) => res.status(400).json({ ok: false, error: { message: error } });

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ...getAiHealth(), serverTime: new Date().toISOString() });
});

app.get('/api/ai/health', (_req, res) => {
  const data = { ...getAiHealth(), serverTime: new Date().toISOString() };
  res.json({ ok: true, data, meta: { provider: data.provider, model: data.models[data.provider]?.primary || 'unknown', mode: 'primary', usedFallback: false, fallbackChain: [], durationMs: 0 } });
});

app.get('/api/ai/models', async (_req, res) => {
  try { res.json({ ok: true, data: await getProviderModelsWithLive(), meta: { provider: getConfiguredProvider(), model: 'models', mode: 'primary', usedFallback: false, fallbackChain: [], durationMs: 0 } }); }
  catch (error) { res.status(500).json({ ok: false, error: { message: safeError(error) } }); }
});

app.get('/api/debug/provider-models', async (_req, res) => res.json(await getProviderModelsWithLive()));

app.post('/api/ai/test', async (req, res) => {
  const parsed = parseAiTestRequest(req.body);
  if (!parsed.ok) return invalid(res, parsed.error);
  const result = await testAiProvider(parsed.data.provider, parsed.data.prompt, parsed.data.preferredModel);
  res.status(result.ok ? 200 : 502).json({ ok: result.ok, data: { answer: result.text || '' }, meta: result.meta, error: result.error });
});

app.post('/api/debug/ai-test', async (req, res) => {
  const parsed = parseAiTestRequest(req.body);
  const data = parsed.ok ? parsed.data : { provider: 'auto' as const, prompt: 'Ответь одним словом: OK', preferredModel: undefined };
  const result = await testAiProvider(data.provider, data.prompt, data.preferredModel);
  res.json({ ok: result.ok, data: { answer: result.text || '' }, meta: result.meta, error: result.error, answer: result.text, provider: result.meta.provider, model: result.meta.model, fallbackUsed: result.meta.usedFallback, fallbackReason: result.meta.fallbackReason, fallbackChain: result.meta.fallbackChain });
});

app.post('/api/assistant', async (req, res) => {
  const parsed = parseAssistantRequest(req.body);
  if (!parsed.ok) return invalid(res, parsed.error);
  const result = await runAssistant(parsed.data);
  res.status(result.ok ? 200 : 502).json(result);
});

app.post('/api/generate', async (req, res) => {
  const parsed = parseGenerateRequest(req.body);
  if (!parsed.ok) return invalid(res, parsed.error);
  const result = await runGenerate(parsed.data);
  res.status(result.ok ? 200 : 502).json(result);
});

app.post('/api/extract', async (req, res) => {
  const parsed = parseExtractRequest(req.body);
  if (!parsed.ok) return invalid(res, parsed.error);
  const result = await runExtract(parsed.data);
  res.status(result.ok ? 200 : 502).json(result);
});

app.post('/api/split', async (req, res) => {
  const parsed = parseSplitRequest(req.body);
  if (!parsed.ok) return invalid(res, parsed.error);
  const result = await runSplit(parsed.data);
  res.status(result.ok ? 200 : 502).json(result);
});

app.post('/api/summarize', async (req, res) => {
  const parsed = parseSummaryRequest(req.body);
  if (!parsed.ok) return invalid(res, parsed.error);
  const result = await runSummary(parsed.data);
  res.status(result.ok ? 200 : 502).json(result);
});

app.post('/api/course/plan', async (req, res) => {
  const parsed = parseCoursePlanRequest(req.body);
  if (!parsed.ok) return invalid(res, parsed.error);
  const result = await runCoursePlan(parsed.data);
  res.status(result.ok ? 200 : 502).json(result);
});

app.listen(port, () => {
  const health = getAiHealth();
  console.log(`[UrLocalEdu API] http://localhost:${port} provider=${health.provider} fallback=${health.fallbackProvider || 'none'} mockFallback=${health.mockFallbackEnabled}`);
  if (health.provider === 'gemini' && !health.hasGeminiKey) console.warn('[UrLocalEdu API] AI_PROVIDER=gemini but GEMINI_API_KEY is missing.');
  if (health.provider === 'groq' && !health.hasGroqKey) console.warn('[UrLocalEdu API] AI_PROVIDER=groq but GROQ_API_KEY is missing.');
  if (health.provider === 'mistral' && !health.hasMistralKey) console.warn('[UrLocalEdu API] AI_PROVIDER=mistral but MISTRAL_API_KEY is missing.');
});
