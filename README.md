# UrLocalEdu

UrLocalEdu is a local-first React + Vite + TypeScript educational platform. The first built-in subject pack is **Genetics**, preserving the GeneticsEdu materials, Punnett simulator, pedigree editor, disease reference, flashcards, quizzes, glossary, import workflow and localStorage recovery.

> Active frontend entrypoint: `index.html` imports `/src/main.tsx`; active app code lives in `src/*`. Older root-level TSX files are legacy duplicates and are not part of the Vite/TypeScript build.

## Install and run

```bash
npm install
npm run server
npm run dev
```

Run both in development:

```bash
npm run dev:full
```

## Backend-only AI secrets

Do **not** create `VITE_GEMINI_API_KEY`, `VITE_GROQ_API_KEY`, `VITE_MISTRAL_API_KEY`, or any frontend secret. Provider keys are read only by the Express backend from `.env`.

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Core AI env contract:

```bash
AI_PROVIDER=gemini
AI_PROVIDER_FALLBACK=groq
AI_ALLOW_PROVIDER_FALLBACK=true
AI_ALLOW_MOCK_FALLBACK=true
AI_DEBUG=true
AI_TIMEOUT_MS=60000
AI_MAX_RETRIES=1

GEMINI_API_KEY=
GEMINI_MODEL_PRIMARY=gemini-3.5-flash
GEMINI_MODEL_FALLBACK=gemini-3.1-flash-lite
GEMINI_MODEL=gemini-3.5-flash

GROQ_API_KEY=
GROQ_MODEL_PRIMARY=llama-3.3-70b-versatile
GROQ_MODEL_FALLBACK=

MISTRAL_API_KEY=
MISTRAL_MODEL_PRIMARY=mistral-large-latest
MISTRAL_MODEL_FALLBACK=mistral-small-latest
```

## AI providers

Supported providers: `gemini`, `groq`, `mistral`, `mock`.

OpenAI is not used by the provider layer, env contract, docs, or package dependencies. Groq uses its OpenAI-compatible HTTP endpoint directly with `fetch`; no OpenAI SDK is required.

Fallback order:

1. selected/provider primary model;
2. selected/provider fallback model;
3. `AI_PROVIDER_FALLBACK` when `AI_ALLOW_PROVIDER_FALLBACK=true`;
4. explicit mock fallback only when `AI_ALLOW_MOCK_FALLBACK=true`.

Every AI response includes provider/model/mode/fallbackChain/fallbackReason metadata. Mock fallback is visible and never silently masks provider failure.

## AI diagnostics

```bash
curl http://localhost:8787/api/health
curl http://localhost:8787/api/ai/health
curl http://localhost:8787/api/ai/models
curl -X POST http://localhost:8787/api/ai/test \
  -H "Content-Type: application/json" \
  -d '{"provider":"mock","prompt":"Ответь одним словом: OK"}'
```

`/api/ai/test` returns `{ ok, data, meta }`. The legacy `/api/debug/ai-test` remains as an alias for compatibility.

## Gemini 400 troubleshooting

The Gemini provider uses REST `generateContent` with:

- `systemInstruction.parts[].text`;
- `contents[{ role: "user", parts: [{ text }] }]`;
- `generationConfig.temperature` and `maxOutputTokens`;
- `responseMimeType: "application/json"` only for JSON tasks, with retry without MIME type if the model rejects it.

Common 400 causes:

- bad model name;
- model unavailable in the key/project region;
- model does not support `generateContent` or `responseMimeType`;
- project/API key restrictions;
- invalid request body.

When `AI_DEBUG=true`, server logs safe body previews without API keys.

## Import pipeline

The Import page supports TXT/MD via `File.text()`, PDF via lazy `pdfjs-dist`, DOCX via lazy `mammoth`, local draft splitting, AI split via `/api/split`, AI extraction via `/api/extract`, summary via `/api/summarize`, preview/edit of sections and selected save of terms, diseases, cards, tests and notes.

## Storage migration

Legacy GeneticsEdu localStorage keys (`genetics_*`) are backed up to `urlocaledu:backup:<timestamp>:genetics-legacy-all` and migrated into `urlocaledu:v1:*` keys. Corrupted JSON keys are backed up before removal. Default workspace/course is Genetics.

## Routes

Legacy routes remain available: `/`, `/materials`, `/sources`, `/flashcards`, `/quizzes`, `/glossary`, `/diseases`, `/simulator`, `/pedigree`, `/assistant`, `/aigen`, `/editor`, `/import`.

New routes: `/courses`, `/settings`, `/ai`.

## Testing

```bash
npm run typecheck
npm run build
```

If no real provider keys are configured, use `provider=mock` for API contract tests. Real Gemini/Groq/Mistral runtime verification requires corresponding backend `.env` keys.
