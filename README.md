# GeneticsEdu

React + Vite + TypeScript learning app for general and medical genetics. The app has a Vite frontend and a separate server-side AI broker so provider secrets are never sent to the browser.

## 1. Installation

```bash
npm install
```

If your corporate or CI network blocks the npm registry, fix registry/proxy access first and rerun the command. Missing `node_modules` will cause `vite not found`, `tsx not found`, React JSX type errors, and failed builds.

## 2. Frontend

```bash
npm run dev
```

The frontend calls `/api/assistant`, `/api/generate`, and `/api/extract`. In development Vite proxies `/api/*` to the backend at `http://localhost:8787`.

## 3. Backend

Create a backend-only `.env` file:

```bash
cp .env.example .env
```

Run the API server:

```bash
npm run server
```

Health check:

```bash
curl http://localhost:8787/api/health
```

Expected shape:

```json
{
  "ok": true,
  "configuredProvider": "mock",
  "providerOrder": ["gemini", "groq", "mistral", "mock"],
  "hasGeminiKey": false,
  "hasGroqKey": false,
  "hasMistralKey": false,
  "geminiModels": ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"],
  "serverTime": "...",
  "note": "health checks configuration only; use /api/debug/ai-test for live provider test"
}
```

## 4. Run the whole project

```bash
npm run dev:full
```

For debugging, prefer two terminals: one for `npm run server`, one for `npm run dev`.

## 5. Supported AI providers

OpenAI is no longer used by the provider broker. The supported providers are:

- `gemini`
- `groq`
- `mistral`
- `mock`

Provider secrets must be stored only in backend `.env`. Do **not** create `VITE_GEMINI_API_KEY`, `VITE_GROQ_API_KEY`, or `VITE_MISTRAL_API_KEY`: Vite exposes `VITE_*` variables to browser code.

## 6. Gemini setup

`.env` only:

```bash
AI_PROVIDER=gemini
AI_PROVIDER_ORDER=gemini,groq,mistral,mock
GEMINI_API_KEY=your-server-side-key
GEMINI_MODEL_PRIMARY=gemini-3.5-flash
GEMINI_MODEL_FALLBACK=gemini-3.1-flash-lite
GEMINI_MODEL_LEGACY_FALLBACK=gemini-flash-latest
PORT=8787
```

The Gemini provider uses REST `generateContent` with the minimal `contents[].parts[].text` payload and the `x-goog-api-key` header. If a model returns 400/404/429/5xx, the broker tries the next Gemini model and then the next provider in `AI_PROVIDER_ORDER`.

## 7. Groq setup

`.env` only:

```bash
AI_PROVIDER=groq
AI_PROVIDER_ORDER=groq,gemini,mistral,mock
GROQ_API_KEY=your-server-side-key
GROQ_MODEL_PRIMARY=llama-3.3-70b-versatile
GROQ_MODEL_FALLBACK=llama-3.1-8b-instant
PORT=8787
```

Groq is called through its OpenAI-compatible chat completions endpoint directly with `fetch`; no OpenAI SDK or OpenAI provider is used.

## 8. Mistral setup

`.env` only:

```bash
AI_PROVIDER=mistral
AI_PROVIDER_ORDER=mistral,gemini,groq,mock
MISTRAL_API_KEY=your-server-side-key
MISTRAL_MODEL_PRIMARY=mistral-large-latest
MISTRAL_MODEL_FALLBACK=mistral-small-latest
PORT=8787
```

Mistral is called through `https://api.mistral.ai/v1/chat/completions` with `fetch`.

## 9. Fallback behavior

Fallback happens in two layers:

1. Inside a provider: primary model → fallback model(s).
2. Between providers: according to `AI_PROVIDER_ORDER`.
3. If all real providers fail or are not configured: `mock`.

Every AI response includes `provider`, `model`, `fallbackUsed`, `fallbackReason`, and `fallbackChain`, so 400 BadRequest, missing keys, rate limits, and model failures are visible without exposing keys.

## 10. Debug endpoints

Debug endpoints are available outside `NODE_ENV=production`:

```bash
curl http://localhost:8787/api/debug/provider-models
curl -X POST http://localhost:8787/api/debug/ai-test \
  -H "Content-Type: application/json" \
  -d '{"provider":"auto","prompt":"Ответь одним словом: работает?"}'
```

Use `/api/debug/ai-test` to verify that a live provider works before testing the UI.

## 11. PDF/DOCX/TXT import

The Import page supports:

- `.txt` and `.md` via browser file reading;
- `.pdf` via lazy `pdfjs-dist` import inside the PDF extraction function;
- `.docx` via lazy `mammoth` import inside the DOCX extraction function;
- manual paste fallback if extraction fails.

AI import buttons call backend `/api/extract` or `/api/generate` and show provider/model/fallback diagnostics. If the backend is unavailable, frontend fallback keeps studying workflows usable offline.

## 12. Punnett simulator

The simulator supports classic crosses, AB0/Rh, sex-linked and mitochondrial inheritance, complementary interaction, epistasis, polygenic inheritance, linked genes and recombination frequency. Large squares are hidden by default and summarized with ratios.

## 13. Pedigrees

The pedigree editor provides an SVG canvas, add/edit/delete person, relationships, child/parent helpers, auto-layout, zoom/pan, save/load, SVG export, JSON import/export, presets, inheritance heuristics, and optional AI explanation through `/api/assistant`.

## 14. User data export/import

Use the Editor / Pro settings page to export/import user data JSON and reset local data. Storage access uses safe load/save helpers to avoid crashes on corrupted localStorage JSON.

## 15. Common errors

- `vite not found`: run `npm install` successfully.
- `tsx not found`: run `npm install`; `tsx` is a dev dependency used by `npm run server`.
- Gemini `400 BadRequest`: inspect `/api/debug/ai-test`; the broker shows the exact safe error and tries fallback models/providers.
- `PDF extraction failed`: ensure `pdfjs-dist` installed; otherwise paste text manually.
- `DOCX extraction failed`: ensure `mammoth` installed; otherwise paste text manually.
- `/api/health` unavailable: start `npm run server` and verify `PORT=8787`.
- CORS/proxy issues: check `CORS_ORIGIN` in `.env` and Vite `/api` proxy in `vite.config.ts`.
- npm registry blocked: fix npm registry/proxy policy; builds cannot be verified without dependencies.
