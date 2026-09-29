import type { Box, TextElement } from '../domain/document.ts';

// Deliberately conservative estimates, not browser/font measurements. The engine
// can therefore run in Node, a worker, or a future export process.
export function estimateTextWidth(text: string, size: number, mono = false): number {
  return Array.from(text).reduce((width, character) => {
    let em = 0.62;
    if (/\p{Mark}/u.test(character)) em = 0;
    else if ((character.codePointAt(0) ?? 0) > 0x2e80) em = 1.08;
    else if (!mono) {
      if (/\p{Mark}/u.test(character)) em = 0;
      else if (/\s/u.test(character)) em = 0.3;
      else if (/[ilI.,!':;|]/u.test(character)) em = 0.32;
      else if (/[MW@%&]/u.test(character)) em = 0.98;
      else if ((character.codePointAt(0) ?? 0) > 0x2e80) em = 1.08;
      else if (/[A-Z]/u.test(character)) em = 0.76;
      else em = 0.64;
    }
    return width + em * size;
  }, 0);
}

export function wrapText(text: string, width: number, size: number, mono = false): string[] {
  const paragraphs = text.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    let line = '';
    for (const word of paragraph.split(/\s+/u)) {
      const candidate = line ? `${line} ${word}` : word;
      if (estimateTextWidth(candidate, size, mono) <= width) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = '';
      // Long unbroken words are split rather than overflowing the paper.
      for (const character of Array.from(word)) {
        if (line && estimateTextWidth(line + character, size, mono) > width) {
          lines.push(line);
          line = '';
        }
        line += character;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

export function fitText(
  id: string,
  text: string,
  box: Box,
  preferredSize: number,
  font: 'sans' | 'mono',
): TextElement {
  const mono = font === 'mono';
  const leading = mono ? 1.5 : 1.06;
  let fontSize = preferredSize;
  let lines = wrapText(text, box.width, fontSize, mono);
  while (fontSize > 1 && lines.length * fontSize * leading > box.height) {
    fontSize = Math.max(1, fontSize - 1);
    lines = wrapText(text, box.width, fontSize, mono);
  }
  // Many explicit line breaks can require a sub-unit size. Keep the document
  // geometrically valid rather than letting type escape the export boundary.
  if (lines.length * fontSize * leading > box.height) {
    fontSize = Math.max(0.1, box.height / (lines.length * leading));
    lines = wrapText(text, box.width, fontSize, mono);
  }
  return {
    kind: 'text', id, box, lines, font, fontSize,
    lineHeight: fontSize * leading,
    letterSpacing: mono ? 0 : -fontSize * 0.045,
    weight: mono ? 400 : 500,
  };
}
