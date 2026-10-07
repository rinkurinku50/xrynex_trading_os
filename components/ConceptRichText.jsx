import { createElement, Fragment } from 'react';
import RichMediaPreview from '@/components/RichMediaPreview';

const BODY_PREFIX = 'concept-rich-text:v1:';
const FONT_SIZES = new Set(['12px', '14px', '16px', '18px', '24px', '32px']);

export function readConceptDocument(body) {
  if (typeof body !== 'string' || !body.startsWith(BODY_PREFIX)) return null;
  try {
    const document = JSON.parse(body.slice(BODY_PREFIX.length));
    return document?.type === 'doc' && Array.isArray(document.content) ? document : null;
  } catch {
    return null;
  }
}

export function toConceptEditorDocument(body) {
  const savedDocument = readConceptDocument(body);
  if (savedDocument) return savedDocument;

  const lines = String(body || '').replace(/\r\n?/g, '\n').split('\n');
  return {
    type: 'doc',
    content: lines.map((line) => ({
      type: 'paragraph',
      ...(line ? { content: [{ type: 'text', text: line }] } : {}),
    })),
  };
}

export function serializeConceptDocument(document) {
  return `${BODY_PREFIX}${JSON.stringify(document)}`;
}

function renderNode(node, key) {
  if (!node) return null;
  if (node.type === 'text') {
    const content = renderText(node.text || '', key, (node.marks || []).some((mark) => mark.type === 'code'));
    return (node.marks || []).reduce((content, mark, index) => {
      const markKey = `${key}-mark-${index}`;
      if (mark.type === 'bold') return createElement('strong', { key: markKey }, content);
      if (mark.type === 'italic') return createElement('em', { key: markKey }, content);
      if (mark.type === 'underline') return createElement('u', { key: markKey }, content);
      if (mark.type === 'strike') return createElement('s', { key: markKey }, content);
      if (mark.type === 'code') return createElement('code', { key: markKey }, content);
      if (mark.type === 'textStyle') {
        const color = /^#[\da-f]{6}$/i.test(mark.attrs?.color || '') ? mark.attrs.color : undefined;
        const fontSize = FONT_SIZES.has(mark.attrs?.fontSize) ? mark.attrs.fontSize : undefined;
        return createElement('span', { key: markKey, style: { color, fontSize } }, content);
      }
      return content;
    }, content);
  }

  const children = (node.content || []).map((child, index) => renderNode(child, `${key}-${index}`));
  switch (node.type) {
    case 'paragraph': return createElement('p', { key }, children);
    case 'heading': {
      const level = Math.max(1, Math.min(6, Number(node.attrs?.level) || 2));
      return createElement(`h${level}`, { key }, children);
    }
    case 'bulletList': return createElement('ul', { key, className: 'list-disc pl-5' }, children);
    case 'orderedList': return createElement('ol', { key, className: 'list-decimal pl-5' }, children);
    case 'listItem': return createElement('li', { key }, children);
    case 'blockquote': return createElement('blockquote', { key, className: 'border-l-2 border-line pl-3 text-muted' }, children);
    case 'codeBlock': return createElement('pre', { key, className: 'overflow-x-auto rounded-md bg-ink p-3' }, createElement('code', null, children));
    case 'hardBreak': return createElement('br', { key });
    case 'horizontalRule': return createElement('hr', { key, className: 'border-line' });
    default: return createElement('span', { key }, children);
  }
}

function renderText(text, key, isCode) {
  if (isCode) return text;
  const parts = [];
  const urlPattern = /https?:\/\/[^\s<>"']+/gi;
  let position = 0;
  let match;

  while ((match = urlPattern.exec(text))) {
    let url = match[0];
    const trailing = url.match(/[.,!?;:]+$/)?.[0] || '';
    url = url.slice(0, url.length - trailing.length);
    if (match.index > position) parts.push(text.slice(position, match.index));
    if (url) parts.push(<RichMediaPreview key={`${key}-url-${match.index}`} url={url} />);
    if (trailing) parts.push(trailing);
    position = match.index + match[0].length;
  }

  if (!parts.length) return text;
  if (position < text.length) parts.push(text.slice(position));
  return createElement(Fragment, { key }, parts.map((part, index) => typeof part === 'string'
    ? createElement(Fragment, { key: `${key}-text-${index}` }, part)
    : part));
}

export default function ConceptRichText({ body, className = '' }) {
  const document = readConceptDocument(body) || (body ? toConceptEditorDocument(body) : null);
  if (!document) return <div className={`whitespace-pre-line ${className}`}>No detailed notes have been added yet.</div>;

  return <div className={`space-y-2 ${className}`}>{document.content.map((node, index) => renderNode(node, `node-${index}`))}</div>;
}