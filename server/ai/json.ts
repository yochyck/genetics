export function stripMarkdownFences(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

export function normalizeAiJsonText(text: string): string {
  return stripMarkdownFences(text).replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim();
}

export function safeJsonParse(text: string): unknown | null {
  try { return JSON.parse(text); } catch { return null; }
}

function findBalanced(text: string, open: string, close: string): string | null {
  const start = text.indexOf(open);
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

export function extractJsonObject(text: string): unknown | null {
  const normalized = normalizeAiJsonText(text);
  const direct = safeJsonParse(normalized);
  if (direct && typeof direct === 'object' && !Array.isArray(direct)) return direct;
  const balanced = findBalanced(normalized, '{', '}');
  return balanced ? safeJsonParse(balanced) : null;
}

export function extractJsonArray(text: string): unknown | null {
  const normalized = normalizeAiJsonText(text);
  const direct = safeJsonParse(normalized);
  if (Array.isArray(direct)) return direct;
  const balanced = findBalanced(normalized, '[', ']');
  return balanced ? safeJsonParse(balanced) : null;
}

export function dedupeByNormalizedKey<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyFn(item).toLowerCase().replace(/\s+/g, ' ').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
