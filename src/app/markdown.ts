/**
 * Minimal markdown renderer for DEVLOG.md — headings, lists, bold, inline
 * code, fenced code, links, hr. Devlog is first-party content; still, all
 * text is escaped before any markup is applied.
 *
 * One devlog-specific extension: `[decision]` / `[finding]` / `[insight]` /
 * `[setback]` at the start of a line render as colored tags.
 */

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const TAGS = ["decision", "finding", "insight", "setback"];

function inline(s: string): string {
  let out = escapeHtml(s);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(
    /\[([^\]]+)\]\((https?:[^)]+)\)/g,
    '<a href="$2" rel="noopener" target="_blank">$1</a>',
  );
  for (const t of TAGS)
    out = out.replace(
      new RegExp(`^\\[${t}\\]`, "i"),
      `<span class="log-tag ${t}">${t}</span>`,
    );
  return out;
}

export function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let inCode = false;
  let inList = false;

  const closeList = () => {
    if (inList) { html.push("</ul>"); inList = false; }
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      closeList();
      html.push(inCode ? "</code></pre>" : "<pre><code>");
      inCode = !inCode;
      continue;
    }
    if (inCode) { html.push(escapeHtml(line)); continue; }

    const h = line.match(/^(#{1,3})\s+(.*)/);
    if (h) {
      closeList();
      const level = h[1].length;
      html.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }
    if (/^---+\s*$/.test(line)) { closeList(); html.push("<hr>"); continue; }
    const li = line.match(/^[-*]\s+(.*)/);
    if (li) {
      if (!inList) { html.push("<ul>"); inList = true; }
      html.push(`<li>${inline(li[1])}</li>`);
      continue;
    }
    if (line.trim() === "") { closeList(); continue; }
    closeList();
    html.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  if (inCode) html.push("</code></pre>");
  return html.join("\n");
}
