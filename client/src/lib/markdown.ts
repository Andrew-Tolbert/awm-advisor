export function applyInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code class="bg-muted text-foreground px-1 rounded text-xs">$1</code>');
}

function isTableRow(line: string): boolean {
  return line.startsWith('|') && line.endsWith('|') && line.includes('|');
}

function isSeparatorRow(line: string): boolean {
  return /^\|[\s\-:|]+\|$/.test(line);
}

function parseTableCells(line: string): string[] {
  return line.split('|').slice(1, -1).map((c) => c.trim());
}

function renderTable(rows: string[]): string {
  if (rows.length < 2) {
    return rows
      .map((r) => `<p class="text-sm text-foreground mb-1">${applyInline(r)}</p>`)
      .join('\n');
  }
  const headerCells = parseTableCells(rows[0]);
  const hasSep = rows.length > 1 && isSeparatorRow(rows[1]);
  const bodyStart = hasSep ? 2 : 1;

  let html =
    '<div class="overflow-x-auto my-2"><table class="min-w-full text-sm border border-border rounded">';
  html += '<thead><tr>';
  for (const cell of headerCells) {
    html += `<th class="text-left font-semibold px-2 py-1 bg-muted text-foreground">${applyInline(cell)}</th>`;
  }
  html += '</tr></thead><tbody>';
  for (let i = bodyStart; i < rows.length; i++) {
    if (isSeparatorRow(rows[i])) continue;
    const cells = parseTableCells(rows[i]);
    html += '<tr>';
    for (const cell of cells) {
      const isNumeric = /^[$\-\d.,%()+]+$/.test(cell.trim());
      html += `<td class="px-2 py-1 border-t border-border ${isNumeric ? 'text-right tabular-nums' : ''}">${applyInline(cell)}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table></div>';
  return html;
}

export function renderMarkdown(md: string): string {
  const lines = md.split('\n');
  const html: string[] = [];
  let inList = false;
  let tableBuffer: string[] = [];

  const closeList = () => {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (isTableRow(trimmed)) {
      closeList();
      tableBuffer.push(trimmed);
      continue;
    }
    if (tableBuffer.length > 0) {
      html.push(renderTable(tableBuffer));
      tableBuffer = [];
    }

    if (!trimmed) continue;

    if (trimmed === '---' || trimmed === '***') {
      closeList();
      html.push('<hr class="my-3 border-border" />');
    } else if (/^\d+\.\s/.test(trimmed)) {
      closeList();
      const text = trimmed.replace(/^\d+\.\s/, '');
      html.push(`<p class="text-sm text-foreground mb-1 ml-4">${applyInline(text)}</p>`);
    } else if (trimmed.startsWith('### ')) {
      closeList();
      html.push(
        `<h4 class="text-sm font-bold text-[#0E1928] mt-3 mb-1">${applyInline(trimmed.slice(4))}</h4>`,
      );
    } else if (trimmed.startsWith('## ')) {
      closeList();
      html.push(
        `<h3 class="text-base font-bold text-[#0E1928] mt-4 mb-1">${applyInline(trimmed.slice(3))}</h3>`,
      );
    } else if (trimmed.startsWith('# ')) {
      closeList();
      html.push(
        `<h2 class="text-lg font-bold text-[#0E1928] mt-4 mb-2">${applyInline(trimmed.slice(2))}</h2>`,
      );
    } else if (trimmed.startsWith('- ')) {
      if (!inList) {
        html.push('<ul class="space-y-0.5 my-1 list-disc pl-5">');
        inList = true;
      }
      html.push(
        `<li class="text-sm text-foreground leading-relaxed">${applyInline(trimmed.slice(2))}</li>`,
      );
    } else if (trimmed.startsWith('> ')) {
      closeList();
      html.push(
        `<blockquote class="border-l-2 border-[#0E1928]/40 pl-3 text-sm italic text-muted-foreground my-2">${applyInline(trimmed.slice(2))}</blockquote>`,
      );
    } else {
      closeList();
      html.push(`<p class="text-sm text-foreground mb-1">${applyInline(trimmed)}</p>`);
    }
  }
  if (tableBuffer.length > 0) html.push(renderTable(tableBuffer));
  if (inList) html.push('</ul>');
  return html.join('\n');
}
