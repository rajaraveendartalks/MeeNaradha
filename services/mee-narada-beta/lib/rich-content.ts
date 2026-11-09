/** Versioned, allowlisted editor documents. Legacy editorial text stays supported. */
export type RichMark = { type: string; attrs?: Record<string, unknown> };
export type RichNode = { type: string; text?: string; attrs?: Record<string, unknown>; marks?: RichMark[]; content?: RichNode[] };
export const RICH_PREFIX = "MNRICH1:";
/** Insert a single ad between complete paragraphs only in sufficiently long articles. */
export function articleAdIndex(document:RichNode):number{
 const nodes=document.content||[],paragraphs=nodes.map((row,index)=>row.type==='paragraph'?index:-1).filter(index=>index>=0);
 const length=(node:RichNode):number=>(node.text||'').length+(node.content||[]).reduce((total,child)=>total+length(child),0);
 return paragraphs.length>=5&&length(document)>=900?paragraphs[2]:-1;
}
const allowedNodes = new Set(["doc","paragraph","text","heading","blockquote","bulletList","orderedList","listItem","hardBreak","horizontalRule","codeBlock","image","youtube"]);
const allowedMarks = new Set(["bold","italic","underline","strike","code","link","textStyle"]);
export function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try { const url = new URL(value); return ["https:","http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function youtubeId(value: unknown): string | null {
  const safe = safeHttpUrl(value); if (!safe) return null;
  const url = new URL(safe); let id = "";
  if (["youtu.be","www.youtu.be"].includes(url.hostname)) id = url.pathname.slice(1).split("/")[0];
  else if (["youtube.com","www.youtube.com","m.youtube.com","youtube-nocookie.com","www.youtube-nocookie.com"].includes(url.hostname)) id = url.searchParams.get("v") || url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1] || "";
  return /^[\w-]{11}$/.test(id) ? id : null;
}
export function safeColor(value: unknown): string | undefined {
  return typeof value === "string" && /^(?:#[0-9a-f]{3,8}|red|blue|green|orange|purple|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\))$/i.test(value) ? value : undefined;
}
function normalize(value: unknown, depth = 0, budget = { nodes: 0 }): RichNode | null {
  if (!value || typeof value !== "object" || depth > 24 || ++budget.nodes > 12000) return null;
  const source = value as Record<string, unknown>;
  if (typeof source.type !== "string" || !allowedNodes.has(source.type)) return null;
  const node: RichNode = { type: source.type };
  if (node.type === "text") { if (typeof source.text !== "string") return null; node.text = source.text; }
  if (Array.isArray(source.content)) node.content = source.content.map(child => normalize(child, depth + 1, budget)).filter((child): child is RichNode => Boolean(child));
  const attrs = source.attrs && typeof source.attrs === "object" ? source.attrs as Record<string, unknown> : {};
  if (node.type === "heading") node.attrs = { level: attrs.level === 3 ? 3 : 2 };
  if (node.type === "orderedList") node.attrs = { start: typeof attrs.start === "number" && attrs.start > 0 ? Math.floor(attrs.start) : 1 };
  if (node.type === "image") { const src = safeHttpUrl(attrs.src); if (!src) return null; node.attrs = { src, alt: typeof attrs.alt === "string" ? attrs.alt.slice(0,1000) : "", title: typeof attrs.title === "string" ? attrs.title.slice(0,1000) : null }; }
  if (node.type === "youtube") { const id = youtubeId(attrs.src); if (!id) return null; node.attrs = { src: "https://www.youtube.com/watch?v=" + id, width: 640, height: 360 }; }
  if (Array.isArray(source.marks)) node.marks = source.marks.flatMap(value => {
    if (!value || typeof value !== "object") return [];
    const mark = value as Record<string, unknown>; if (typeof mark.type !== "string" || !allowedMarks.has(mark.type)) return [];
    const ma = mark.attrs && typeof mark.attrs === "object" ? mark.attrs as Record<string, unknown> : {};
    if (mark.type === "link") { const href = safeHttpUrl(ma.href); return href ? [{ type: "link", attrs: { href, target: "_blank", rel: "noopener noreferrer" } }] : []; }
    if (mark.type === "textStyle") { const color = safeColor(ma.color); return color ? [{ type: "textStyle", attrs: { color } }] : []; }
    return [{ type: mark.type }];
  });
  return node;
}
function legacyInline(text: string): RichNode[] {
  const pattern = /(\*\*[^*\n]+\*\*|__[^_\n]+__|\[color:(?:red|blue|green|orange|purple)\][\s\S]*?\[\/color\]|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g;
  return text.split(pattern).filter(Boolean).map(part => {
    if (part.startsWith("**") && part.endsWith("**")) return { type:"text", text:part.slice(2,-2), marks:[{type:"bold"}] };
    if (part.startsWith("__") && part.endsWith("__")) return { type:"text", text:part.slice(2,-2), marks:[{type:"underline"}] };
    const color = part.match(/^\[color:(red|blue|green|orange|purple)\]([\s\S]*)\[\/color\]$/);
    if (color) return { type:"text", text:color[2], marks:[{type:"textStyle",attrs:{color:({red:"#cf233d",blue:"#2164c4",green:"#18794e",orange:"#ba6100",purple:"#793cb5"} as Record<string,string>)[color[1]]}}] };
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link && safeHttpUrl(link[2])) return { type:"text",text:link[1],marks:[{type:"link",attrs:{href:safeHttpUrl(link[2])}}] };
    return {type:"text",text:part};
  });
}
export function articleDocument(value: string): RichNode {
  if (value.startsWith(RICH_PREFIX) && value.length < 2_000_000) {
    try { const doc = normalize(JSON.parse(value.slice(RICH_PREFIX.length))); if (doc?.type === "doc") return doc; } catch { /* Show malformed stored data as text rather than interpret HTML. */ }
  }
  const content: RichNode[] = value.replace(/\r\n/g,"\n").split(/\n\s*\n/).filter(block => block.trim()).map(block => {
    const text = block.trim(), video = text.match(/^\[youtube\]\s*(https?:\/\/\S+)\s*\[\/youtube\]$/i);
    if (video && youtubeId(video[1])) return {type:"youtube",attrs:{src:"https://www.youtube.com/watch?v="+youtubeId(video[1]),width:640,height:360}};
    if (text.startsWith("### ")) return {type:"heading",attrs:{level:3},content:legacyInline(text.slice(4))};
    if (text.startsWith("## ")) return {type:"heading",attrs:{level:2},content:legacyInline(text.slice(3))};
    const lines=text.split("\n");
    if (lines.every(line=>/^[-*] /.test(line))) return {type:"bulletList",content:lines.map(line=>({type:"listItem",content:[{type:"paragraph",content:legacyInline(line.slice(2))}]}))};
    if (lines.every(line=>/^\d+\. /.test(line))) return {type:"orderedList",attrs:{start:1},content:lines.map(line=>({type:"listItem",content:[{type:"paragraph",content:legacyInline(line.replace(/^\d+\. /,""))}]}))};
    return {type:"paragraph",content:lines.flatMap((line,index)=>[...(index?[{type:"hardBreak"}]:[]),...legacyInline(line)])};
  });
  return {type:"doc",content:content.length?content:[{type:"paragraph"}]};
}
export function encodeDocument(doc: unknown): string {
  const normalized = normalize(doc); if (!normalized || normalized.type !== "doc") throw Error("The article could not be saved. Please reload the editor.");
  const encoded = RICH_PREFIX + JSON.stringify(normalized); if (encoded.length > 1_900_000) throw Error("This article is too large. Use the Media Library for images.");
  return encoded;
}
export function articleText(value: string): string {
  const walk=(node:RichNode):string => node.type==="text" ? node.text||"" : (node.content||[]).map(walk).join(["doc","bulletList","orderedList"].includes(node.type)?"\n":" ");
  return walk(articleDocument(value)).trim();
}
export function articleHasContent(value: string): boolean {
  const walk=(node:RichNode):boolean => Boolean(node.text?.trim()) || ["image","youtube"].includes(node.type) || Boolean(node.content?.some(walk));
  return walk(articleDocument(value));
}
export function preferredArticleBody(...values:(string|null|undefined)[]):string { return values.find((value):value is string=>Boolean(value)&&articleHasContent(value!))||""; }
