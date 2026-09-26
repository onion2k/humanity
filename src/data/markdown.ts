// Renders the one piece of markdown the export uses, *italics* for the names of
// works, and refuses everything else. Passing other syntax through would print
// stray asterisks and brackets on the page, and passing HTML through would let
// copy inject markup.

export interface Rendered {
  html: string;
  text: string;
}

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ESCAPES[c] ?? c);
}

/** Renders *italics*, escaping everything else. Throws on any other markdown. */
export function renderInline(source: string): Rendered {
  if (/[`[\]_#]|\*\*/.test(source)) {
    throw new Error(`Unsupported markdown in "${source}": only *italics* are allowed`);
  }
  const parts = source.split("*");
  if (parts.length % 2 === 0) throw new Error(`Unclosed *italics* in "${source}"`);
  let html = "";
  let text = "";
  parts.forEach((part, i) => {
    const italic = i % 2 === 1;
    if (italic && part.trim() === "") throw new Error(`Empty *italics* in "${source}"`);
    html += italic ? `<em>${escapeHtml(part)}</em>` : escapeHtml(part);
    text += part;
  });
  return { html, text };
}
