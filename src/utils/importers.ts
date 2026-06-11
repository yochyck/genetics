import { CourseSection } from '../types';
import { generateFromAI } from '../ai/generation';

export type SplitMode = 'auto' | 'byHeadings' | 'byParagraphs' | 'byPages' | 'manual';
export type ImportedPage = { pageNumber: number; text: string };
export type ImportedDraft = { title: string; text: string; sections: CourseSection[]; tags: string[]; headings: string[]; pages: ImportedPage[] };

const browserImport = <T>(specifier: string) => new Function('s', 'return import(s)')(specifier) as Promise<T>;
export async function extractTextFromTxt(file: File) { return file.text(); }
export async function extractTextFromPdf(file: File, onProgress?: (message: string) => void): Promise<{ text: string; pages: ImportedPage[] }> {
  const pdfjs = await browserImport<typeof import('pdfjs-dist')>('pdfjs-dist');
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: ImportedPage[] = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    onProgress?.(`страница ${pageNumber} из ${doc.numPages}`);
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str || '').join(' ').replace(/\s+/g, ' ').trim();
    pages.push({ pageNumber, text });
  }
  return { text: pages.map((p) => `\n\n[page:${p.pageNumber}]\n${p.text}`).join('\n'), pages };
}
export async function extractTextFromDocx(file: File) { const mammoth = await browserImport<typeof import('mammoth/mammoth.browser')>('mammoth/mammoth.browser'); const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() }); return result.value; }
export function normalizeExtractedText(text: string) { return text.replace(/\r/g, '\n').replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim(); }
export function extractTagsFromText(text: string) { const words = (text.toLowerCase().match(/[а-яёa-z-]{5,}/g) || []).filter((w) => !['который','которая','генетика','раздел','текст'].includes(w)); return Array.from(new Set(words)).slice(0, 8); }
export function findHeadings(text: string) { return text.split('\n').map((x) => x.trim()).filter((line) => /^(#{1,3}\s+|[А-ЯЁA-Z][^.!?]{3,90}$|\d+(\.\d+)*\.?\s+)/.test(line)).slice(0, 40); }
function section(id: string, title: string, content: string, index: number, tags: string[], sourcePages?: string): CourseSection { return { id, topicId:'user', manualId:'user', title:title.trim()||`Раздел ${index+1}`, content:content.trim(), order:index+1, keyTerms:extractTagsFromText(content).slice(0,5), tags, sourcePages, relatedDiseaseIds:[], relatedFlashcardIds:[], relatedQuizIds:[] }; }
export function splitTextIntoSections(text: string, mode: SplitMode, tags = ['user']): CourseSection[] {
  const normalized = normalizeExtractedText(text); const base = Date.now();
  let chunks: Array<{title:string; content:string; sourcePages?:string}> = [];
  if (mode === 'byPages') chunks = normalized.split(/\n\n\[page:(\d+)\]\n/g).reduce<Array<{title:string; content:string; sourcePages?:string}>>((acc, part, i, arr) => { if (i % 2 === 1) acc.push({ title:`Страница ${part}`, content:arr[i+1]||'', sourcePages:part }); return acc; }, []);
  else if (mode === 'byHeadings' || mode === 'auto') { const blocks = normalized.split(/\n(?=#{1,3}\s|[А-ЯЁA-Z][^.!?\n]{3,90}\n|\d+(?:\.\d+)*\.?\s+)/).map(x=>x.trim()).filter(Boolean); chunks = blocks.length>1 ? blocks.map((b)=>({title:b.split('\n')[0].replace(/^#+\s*/, '').slice(0,90), content:b})) : []; }
  if (!chunks.length && mode !== 'manual') chunks = normalized.split(/\n\s*\n/).filter(x=>x.trim().length>80).map((b,i)=>({title:b.split('\n')[0].slice(0,90)||`Фрагмент ${i+1}`, content:b}));
  if (!chunks.length) chunks = [{ title:'Импортированный материал', content: normalized }];
  return chunks.map((c,i)=>section(`user-sec-${base}-${i}`, c.title, c.content, i, tags, c.sourcePages));
}
export function prepareImportedMaterialDraft(title: string, text: string, mode: SplitMode, pages: ImportedPage[] = []): ImportedDraft { const normalized = normalizeExtractedText(text); const tags = ['user', ...extractTagsFromText(normalized).slice(0,3)]; return { title, text: normalized, sections: splitTextIntoSections(normalized, mode, tags), tags, headings: findHeadings(normalized), pages }; }
export async function improveSectionsWithAI(text: string, currentSections: CourseSection[]) { const result = await generateFromAI('summary', text, undefined, currentSections.length || 6); return result.apiAvailable ? currentSections.map((s,i)=>({ ...s, keyTerms: extractTagsFromText(`${s.content} ${JSON.stringify(result.items[i] || '')}`).slice(0,6) })) : currentSections; }
