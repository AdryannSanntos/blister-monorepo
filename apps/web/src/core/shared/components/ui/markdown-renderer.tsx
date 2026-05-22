'use client';

import * as React from 'react';
import { cn } from 'src/core/shared/utils';

// ─── token types ─────────────────────────────────────────────────────────────

type Token =
  | { t: 'h1' | 'h2' | 'h3' | 'h4'; children: InlineToken[] }
  | { t: 'p'; children: InlineToken[] }
  | { t: 'blockquote'; children: InlineToken[] }
  | { t: 'hr' }
  | { t: 'pre'; lang: string; code: string }
  | { t: 'ul'; items: InlineToken[][] }
  | { t: 'ol'; items: InlineToken[][] }
  | { t: 'blank' };

type InlineToken =
  | { i: 'text'; v: string }
  | { i: 'strong'; v: string }
  | { i: 'em'; v: string }
  | { i: 'code'; v: string }
  | { i: 'link'; href: string; label: string }
  | { i: 'img'; src: string; alt: string };

// ─── inline parser ────────────────────────────────────────────────────────────

function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let i = 0;
  while (i < text.length) {
    // image ![alt](src)
    if (text[i] === '!' && text[i + 1] === '[') {
      const close = text.indexOf('](', i + 2);
      if (close !== -1) {
        const end = text.indexOf(')', close + 2);
        if (end !== -1) {
          tokens.push({ i: 'img', alt: text.slice(i + 2, close), src: text.slice(close + 2, end) });
          i = end + 1;
          continue;
        }
      }
    }
    // link [label](href)
    if (text[i] === '[') {
      const close = text.indexOf('](', i + 1);
      if (close !== -1) {
        const end = text.indexOf(')', close + 2);
        if (end !== -1) {
          tokens.push({ i: 'link', label: text.slice(i + 1, close), href: text.slice(close + 2, end) });
          i = end + 1;
          continue;
        }
      }
    }
    // inline code `code`
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) {
        tokens.push({ i: 'code', v: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    // bold **text** or __text__
    if ((text[i] === '*' && text[i + 1] === '*') || (text[i] === '_' && text[i + 1] === '_')) {
      const delim = text.slice(i, i + 2);
      const end = text.indexOf(delim, i + 2);
      if (end !== -1) {
        tokens.push({ i: 'strong', v: text.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    // italic *text* or _text_
    if (text[i] === '*' || text[i] === '_') {
      const delim = text[i];
      const end = text.indexOf(delim, i + 1);
      if (end !== -1 && text[end + 1] !== delim) {
        tokens.push({ i: 'em', v: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    // accumulate plain text
    const last = tokens[tokens.length - 1];
    if (last?.i === 'text') {
      last.v += text[i];
    } else {
      tokens.push({ i: 'text', v: text[i] });
    }
    i++;
  }
  return tokens;
}

// ─── block parser ─────────────────────────────────────────────────────────────

function parseBlocks(markdown: string): Token[] {
  const lines = markdown.split('\n');
  const tokens: Token[] = [];
  let j = 0;

  while (j < lines.length) {
    const line = lines[j];

    // fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      j++;
      while (j < lines.length && !lines[j].startsWith('```')) {
        codeLines.push(lines[j]);
        j++;
      }
      tokens.push({ t: 'pre', lang, code: codeLines.join('\n') });
      j++;
      continue;
    }

    // headings
    const hm = line.match(/^(#{1,4})\s+(.*)/);
    if (hm) {
      const level = hm[1].length as 1 | 2 | 3 | 4;
      tokens.push({ t: `h${level}` as 'h1' | 'h2' | 'h3' | 'h4', children: parseInline(hm[2]) });
      j++;
      continue;
    }

    // hr
    if (/^[-*_]{3,}$/.test(line.trim())) {
      tokens.push({ t: 'hr' });
      j++;
      continue;
    }

    // unordered list
    if (/^[-*+] /.test(line)) {
      const items: InlineToken[][] = [];
      while (j < lines.length && /^[-*+] /.test(lines[j])) {
        items.push(parseInline(lines[j].slice(2)));
        j++;
      }
      tokens.push({ t: 'ul', items });
      continue;
    }

    // ordered list
    if (/^\d+\. /.test(line)) {
      const items: InlineToken[][] = [];
      while (j < lines.length && /^\d+\. /.test(lines[j])) {
        items.push(parseInline(lines[j].replace(/^\d+\. /, '')));
        j++;
      }
      tokens.push({ t: 'ol', items });
      continue;
    }

    // blockquote
    if (line.startsWith('> ')) {
      const bqLines: string[] = [];
      while (j < lines.length && lines[j].startsWith('> ')) {
        bqLines.push(lines[j].slice(2));
        j++;
      }
      tokens.push({ t: 'blockquote', children: parseInline(bqLines.join('\n')) });
      continue;
    }

    // blank
    if (line.trim() === '') {
      tokens.push({ t: 'blank' });
      j++;
      continue;
    }

    // paragraph
    const pLines: string[] = [];
    while (j < lines.length && lines[j].trim() !== '' && !lines[j].startsWith('#') && !lines[j].startsWith('```') && !lines[j].startsWith('> ') && !/^[-*+] /.test(lines[j]) && !/^\d+\. /.test(lines[j])) {
      pLines.push(lines[j]);
      j++;
    }
    tokens.push({ t: 'p', children: parseInline(pLines.join('\n')) });
  }

  return tokens;
}

// ─── inline renderer ──────────────────────────────────────────────────────────

function renderInline(tokens: InlineToken[], key: string) {
  return tokens.map((tok, i) => {
    switch (tok.i) {
      case 'strong': return <strong key={`${key}-${i}`}>{tok.v}</strong>;
      case 'em':     return <em key={`${key}-${i}`}>{tok.v}</em>;
      case 'code':   return <code key={`${key}-${i}`}>{tok.v}</code>;
      case 'link':
        return (
          <a key={`${key}-${i}`} href={tok.href} target="_blank" rel="noopener noreferrer">
            {tok.label}
          </a>
        );
      case 'img':
        // eslint-disable-next-line @next/next/no-img-element
        return <img key={`${key}-${i}`} src={tok.src} alt={tok.alt} />;
      default:
        return (
          <span key={`${key}-${i}`}>
            {tok.v.split('\n').map((part, partIndex) => (
              <React.Fragment key={`${key}-${i}-${partIndex}`}>
                {partIndex > 0 ? <br /> : null}
                {part}
              </React.Fragment>
            ))}
          </span>
        );
    }
  });
}

// ─── component ───────────────────────────────────────────────────────────────

interface Props {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: Props) {
  const tokens = parseBlocks(content);

  return (
    <div className={cn('md-prose', className)}>
      {tokens.map((tok, idx) => {
        const k = String(idx);
        switch (tok.t) {
          case 'h1': return <h1 key={k}>{renderInline(tok.children, k)}</h1>;
          case 'h2': return <h2 key={k}>{renderInline(tok.children, k)}</h2>;
          case 'h3': return <h3 key={k}>{renderInline(tok.children, k)}</h3>;
          case 'h4': return <h4 key={k}>{renderInline(tok.children, k)}</h4>;
          case 'p':  return <p key={k}>{renderInline(tok.children, k)}</p>;
          case 'blockquote': return <blockquote key={k}>{renderInline(tok.children, k)}</blockquote>;
          case 'hr': return <hr key={k} />;
          case 'pre':
            return (
              <pre key={k}>
                <code className={tok.lang ? `language-${tok.lang}` : undefined}>
                  {tok.code}
                </code>
              </pre>
            );
          case 'ul':
            return (
              <ul key={k}>
                {tok.items.map((item, ii) => (
                  <li key={ii}>{renderInline(item, `${k}-${ii}`)}</li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={k}>
                {tok.items.map((item, ii) => (
                  <li key={ii}>{renderInline(item, `${k}-${ii}`)}</li>
                ))}
              </ol>
            );
          case 'blank': return null;
          default: return null;
        }
      })}
    </div>
  );
}
