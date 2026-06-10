# GeneticsEdu

React + Vite + TypeScript learning app for general and medical genetics. The app has a Vite frontend and a separate server-side API layer for AI providers so secrets are never sent to the browser.

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
{"ok":true,"provider":"mock","hasGeminiKey":false,"hasOpenAIKey":false}
```

## 4. Run the whole project

```bash
npm run dev:full
```

For debugging, prefer two terminals: one for `npm run server`, one for `npm run dev`.

## 5. Gemini setup

`.env` only:

```bash
AI_PROVIDER=gemini
GEMINI_API_KEY=your-server-side-key
GEMINI_MODEL=gemini-3.5-flash
PORT=8787
```

If `AI_PROVIDER=gemini` but `GEMINI_API_KEY` is empty, the backend prints a warning and falls back to `mock`.

## 6. OpenAI setup

`.env` only:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=your-server-side-key
OPENAI_MODEL=gpt-5.5
PORT=8787
```

If `AI_PROVIDER=openai` but `OPENAI_API_KEY` is empty, the backend prints a warning and falls back to `mock`.

## 7. Why keys must not be in frontend

Do **not** create `VITE_GEMINI_API_KEY` or `VITE_OPENAI_API_KEY`. Vite exposes `VITE_*` variables to browser code. Provider secrets must stay in server-side `.env`; frontend should only call local endpoints such as `/api/assistant`.

If the backend is unavailable, frontend assistant and generation functions automatically use local retrieval/mock logic, so studying still works offline.

## 8. PDF/DOCX/TXT import

The Import page supports:

- `.txt` and `.md` via browser file reading;
- `.pdf` via lazy `pdfjs-dist` import inside the PDF extraction function;
- `.docx` via lazy `mammoth` import inside the DOCX extraction function;
- manual paste fallback if extraction fails.

If PDF/DOCX extraction fails, paste text manually and use section splitting plus local/AI extraction actions.

## 9. Punnett simulator

The simulator supports classic crosses, AB0/Rh, sex-linked and mitochondrial inheritance, complementary interaction, epistasis, polygenic inheritance, linked genes and recombination frequency. Large squares are hidden by default and summarized with ratios.

## 10. Pedigrees

The pedigree editor provides an SVG canvas, add/edit/delete person, relationships, child/parent helpers, auto-layout, zoom/pan, save/load, SVG export, JSON import/export, presets, inheritance heuristics, and optional AI explanation through `/api/assistant`.

## 11. User data export/import

Use the Editor / Pro settings page to export/import user data JSON and reset local data. Storage access uses safe load/save helpers to avoid crashes on corrupted localStorage JSON.

## 12. Common errors

- `vite not found`: run `npm install` successfully.
- `tsx not found`: run `npm install`; `tsx` is a dev dependency used by `npm run server`.
- `PDF extraction failed`: ensure `pdfjs-dist` installed; otherwise paste text manually.
- `DOCX extraction failed`: ensure `mammoth` installed; otherwise paste text manually.
- `/api/health` unavailable: start `npm run server` and verify `PORT=8787`.
- CORS/proxy issues: check `CORS_ORIGIN` in `.env` and Vite `/api` proxy in `vite.config.ts`.
- npm registry blocked: fix npm registry/proxy policy; builds cannot be verified without dependencies.
