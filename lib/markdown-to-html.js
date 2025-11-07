const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
const boldPattern = /\*\*(.+?)\*\*/g;
const italicPattern = /\*(.+?)\*/g;
const codePattern = /`([^`]+)`/g;

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function transformInline(text) {
  let html = escapeHtml(text);
  html = html.replace(linkPattern, (_, label, url) => {
    const safeUrl = url.trim();
    const attrs = safeUrl.startsWith('mailto:') ? '' : ' target="_blank" rel="noopener"';
    return `<a href="${safeUrl}"${attrs}>${label.trim()}</a>`;
  });
  html = html.replace(boldPattern, '<strong>$1</strong>');
  html = html.replace(italicPattern, '<em>$1</em>');
  html = html.replace(codePattern, '<code>$1</code>');
  return html;
}

function closeListIfOpen(buffer, state) {
  if (state.inList) {
    buffer.push('</ul>');
    state.inList = false;
  }
}

export function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const buffer = [];
  const state = { inList: false };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      closeListIfOpen(buffer, state);
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      closeListIfOpen(buffer, state);
      buffer.push('<hr />');
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      closeListIfOpen(buffer, state);
      const level = headingMatch[1].length;
      const content = transformInline(headingMatch[2].trim());
      buffer.push(`<h${level}>${content}</h${level}>`);
      continue;
    }

    const listMatch = trimmed.match(/^[-*+]\s+(.*)$/);
    if (listMatch) {
      if (!state.inList) {
        buffer.push('<ul>');
        state.inList = true;
      }
      buffer.push(`<li>${transformInline(listMatch[1])}</li>`);
      continue;
    }

    closeListIfOpen(buffer, state);
    buffer.push(`<p>${transformInline(trimmed)}</p>`);
  }

  closeListIfOpen(buffer, state);
  return buffer.join('\n');
}
