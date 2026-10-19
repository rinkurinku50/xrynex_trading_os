'use client';

import { useEffect, useRef, useState } from 'react';
import { DeleteButton, Modal, RecordForm } from '@/components/Form';
import ConceptIcon, { conceptIconOptions } from '@/components/ConceptIcon';
import ConceptRichText from '@/components/ConceptRichText';
import { LuExpand, LuGripVertical, LuMinus, LuMoveDiagonal2, LuPlus, LuRotateCcw, LuStar, LuUndo2 } from 'react-icons/lu';

const fields = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'icon', label: 'Navigation icon', type: 'select', options: conceptIconOptions, iconPreview: true },
  { name: 'subtitle', label: 'Summary', type: 'text' },
  { name: 'body', label: 'Detailed notes', type: 'richtext' },
  { name: 'show_in_nav', label: 'Show in Knowledge Base navigation', type: 'checkbox' },
];

const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const cardAccents = ['#55d59a', '#55cce0', '#78aef5', '#eacb71'];
const cardRowHeight = 270;
const cardPreviewHeight = 250;
const maxCardHeight = 4000;

function findScrollContainer(element) {
  let ancestor = element.parentElement;
  while (ancestor && ancestor !== element.ownerDocument.body) {
    const overflowY = getComputedStyle(ancestor).overflowY;
    if (/(auto|scroll)/.test(overflowY) && ancestor.scrollHeight > ancestor.clientHeight) return ancestor;
    ancestor = ancestor.parentElement;
  }
  return element.ownerDocument.scrollingElement || element.ownerDocument.documentElement;
}

function getSiblingLayouts(board, card) {
  const boardRect = board.getBoundingClientRect();
  return [...board.querySelectorAll('[data-concept-card]')]
    .filter((other) => other !== card)
    .map((other) => {
      const rect = other.getBoundingClientRect();
      return {
        id: Number(other.dataset.conceptId),
        left: rect.left - boardRect.left,
        top: rect.top - boardRect.top,
        width: rect.width,
        height: rect.height,
      };
    });
}

function boardHasCollision(board, card, left, top, width = card.offsetWidth, height = card.offsetHeight) {
  const candidate = { left, top, right: left + width, bottom: top + height };
  return getSiblingLayouts(board, card).some((other) => {
    const rect = { ...other, right: other.left + other.width, bottom: other.top + other.height };
    return candidate.left < rect.right && candidate.right > rect.left
      && candidate.top < rect.bottom && candidate.bottom > rect.top;
  });
}

function reflowCardsBelow(board, activeCard, activePosition, width, height, siblingLayouts = getSiblingLayouts(board, activeCard)) {
  const gap = 12;
  const occupied = [{
    left: activePosition.left,
    right: activePosition.left + width,
    top: activePosition.top,
    bottom: activePosition.top + height,
  }];
  const placements = [];
  const orderedSiblings = [...siblingLayouts].sort((first, second) => first.top - second.top || first.left - second.left);

  for (const sibling of orderedSiblings) {
    const originalTop = sibling.top;
    let top = originalTop;
    let collisions = [];
    do {
      collisions = occupied.filter((other) => (
        sibling.left < other.right + gap
        && sibling.left + sibling.width > other.left - gap
        && top < other.bottom + gap
        && top + sibling.height > other.top - gap
      ));
      if (collisions.length) top = Math.max(top, ...collisions.map((other) => other.bottom + gap));
    } while (collisions.length);

    placements.push({ ...sibling, originalTop, top, positionY: Math.round(top) });
    occupied.push({
      left: sibling.left,
      right: sibling.left + sibling.width,
      top,
      bottom: top + sibling.height,
    });
  }

  return placements;
}

function resolveCardDrop(board, card, left, top, width, height, siblingLayouts, pointerX, pointerY) {
  const overlaps = siblingLayouts.filter((sibling) => (
    left < sibling.left + sibling.width
    && left + width > sibling.left
    && top < sibling.top + sibling.height
    && top + height > sibling.top
  ));
  if (!overlaps.length) {
    return { left, top, siblings: siblingLayouts.map((sibling) => ({ ...sibling, originalTop: sibling.top, positionY: Math.round(sibling.top) })) };
  }

  const draggedCenter = { x: left + width / 2, y: top + height / 2 };
  const target = overlaps.sort((first, second) => {
    const firstDistance = Math.hypot(first.left + first.width / 2 - draggedCenter.x, first.top + first.height / 2 - draggedCenter.y);
    const secondDistance = Math.hypot(second.left + second.width / 2 - draggedCenter.x, second.top + second.height / 2 - draggedCenter.y);
    return firstDistance - secondDistance;
  })[0];
  const gap = 12;
  const maximumLeft = Math.max(0, board.clientWidth - width);
  const candidates = [
    { side: 'left', left: target.left - width - gap, top: target.top, distance: Math.abs(pointerX - target.left) },
    { side: 'right', left: target.left + target.width + gap, top: target.top, distance: Math.abs(pointerX - (target.left + target.width)) },
    { side: 'above', left: Math.min(target.left, maximumLeft), top: target.top - height - gap, distance: Math.abs(pointerY - target.top) },
    { side: 'below', left: Math.min(target.left, maximumLeft), top: target.top + target.height + gap, distance: Math.abs(pointerY - (target.top + target.height)) },
  ].filter((candidate) => (
    candidate.left >= 0
    && candidate.left + width <= board.clientWidth
    && candidate.top >= 0
  ));
  const slot = candidates.sort((first, second) => first.distance - second.distance)[0]
    || { left: Math.min(target.left, maximumLeft), top: target.top + target.height + gap };

  return {
    left: slot.left,
    top: slot.top,
    siblings: reflowCardsBelow(board, card, { left: slot.left, top: slot.top }, width, height, siblingLayouts),
  };
}

export default function KnowledgeBase({ concepts }) {
  const [rows, setRows] = useState(concepts);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [draggingId, setDraggingId] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [adjustingId, setAdjustingId] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [undoing, setUndoing] = useState(false);
  const dragRef = useRef(null);
  const resizeRef = useRef(null);
  const boardRefs = useRef([]);
  const hasFavorites = rows.some((concept) => concept.isFavorite);
  const hasOtherConcepts = rows.some((concept) => !concept.isFavorite);

  useEffect(() => setRows(concepts), [concepts]);

  function captureLayout(sourceRows = rows) {
    return sourceRows.map((row) => ({
      id: row.id,
      positionX: row.positionX ?? null,
      positionY: row.positionY ?? null,
      cardWidth: row.cardWidth ?? null,
      cardHeight: row.cardHeight ?? null,
    }));
  }

  function rememberLayout(layout) {
    setUndoStack((current) => [...current, layout].slice(-25));
  }

  async function toggleFavorite(concept) {
    const isFavorite = !concept.isFavorite;
    setError('');
    setRows((current) => current.map((row) => row.id === concept.id ? { ...row, isFavorite } : row));
    setSelected((current) => current?.id === concept.id ? { ...current, isFavorite } : current);
    try {
      const response = await fetch(`/api/concepts/${concept.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: isFavorite }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not update favorite.');
      setRows((current) => current.map((row) => row.id === concept.id ? result : row));
      setSelected((current) => current?.id === concept.id ? { ...result, viewWidth: current.viewWidth, viewHeight: current.viewHeight, viewMode: current.viewMode } : current);
    } catch (favoriteError) {
      setRows((current) => current.map((row) => row.id === concept.id ? concept : row));
      setSelected((current) => current?.id === concept.id ? { ...concept, viewWidth: current.viewWidth, viewHeight: current.viewHeight, viewMode: current.viewMode } : current);
      setError(favoriteError.message);
    }
  }

  async function savePosition(id, position, previousLayout) {
    const response = await fetch(`/api/concepts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position_x: position.positionX, position_y: position.positionY }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not save card position.');
    setRows((current) => current.map((row) => row.id === id ? result : row));
    setSelected((current) => current?.id === id ? { ...result, viewWidth: current.viewWidth, viewHeight: current.viewHeight, viewMode: current.viewMode } : current);
    if (previousLayout) rememberLayout(previousLayout);
  }

  async function saveCardUpdates(updates, previousLayout) {
    const results = await Promise.all(updates.map(async ({ id, patch }) => {
      const response = await fetch(`/api/concepts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save card layout.');
      return result;
    }));
    setRows((current) => current.map((row) => results.find((result) => result.id === row.id) || row));
    setSelected((current) => {
      const result = results.find((row) => row.id === current?.id);
      return result ? { ...result, viewWidth: current.viewWidth, viewHeight: current.viewHeight, viewMode: current.viewMode } : current;
    });
    if (previousLayout) rememberLayout(previousLayout);
  }

  function startResize(event, concept) {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    const card = event.currentTarget.closest('[data-concept-card]');
    const board = card?.parentElement;
    if (!card || !board) return;
    const cardRect = card.getBoundingClientRect();
    const boardRect = board.getBoundingClientRect();
    const scrollContainer = findScrollContainer(card);
    resizeRef.current = {
      id: concept.id,
      concept,
      previousLayout: captureLayout(),
      board,
      card,
      siblings: getSiblingLayouts(board, card),
      left: Math.max(0, cardRect.left - boardRect.left),
      top: Math.max(0, cardRect.top - boardRect.top),
      startX: event.clientX,
      startY: event.clientY,
      scrollContainer,
      startScrollTop: scrollContainer.scrollTop,
      latestClientX: event.clientX,
      latestClientY: event.clientY,
      width: Math.round(cardRect.width),
      height: Math.round(cardRect.height),
      moved: false,
      longPressed: false,
      size: null,
    };
    const resize = resizeRef.current;
    resize.timer = window.setTimeout(() => {
      if (resizeRef.current !== resize || resize.moved) return;
      resize.longPressed = true;
      setAdjustingId((current) => current === concept.id ? null : concept.id);
    }, 550);
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingId(concept.id);
    event.preventDefault();
    event.stopPropagation();
  }

  function applyResize(resize) {
    if (resizeRef.current !== resize || resize.longPressed || !resize.moved) return;
    const deltaX = resize.latestClientX - resize.startX;
    const deltaY = resize.latestClientY - resize.startY + resize.scrollContainer.scrollTop - resize.startScrollTop;
    const maximumWidth = Math.max(1, Math.min(1200, resize.board.clientWidth - resize.left));
    const minimumWidth = Math.min(240, maximumWidth);
    const width = Math.max(minimumWidth, Math.min(maximumWidth, resize.width + deltaX));
    const height = Math.max(220, Math.min(maxCardHeight, resize.height + deltaY));
    const maximumLeft = Math.max(0, resize.board.clientWidth - width);
    const positionX = maximumLeft ? resize.left / maximumLeft : 0;
    const siblings = reflowCardsBelow(
      resize.board,
      resize.card,
      { left: resize.left, top: resize.top },
      width,
      height,
      resize.siblings,
    );
    const size = {
      cardWidth: Math.round(width),
      cardHeight: Math.round(height),
      positionX,
      positionY: Math.round(resize.top),
      siblings,
      pushed: siblings.filter((sibling) => Math.round(sibling.originalTop) !== sibling.positionY),
    };
    if (resize.size && resize.size.cardWidth === size.cardWidth && resize.size.cardHeight === size.cardHeight) return;
    resize.size = size;
    setRows((current) => current.map((row) => {
      if (row.id === resize.id) return { ...row, ...size };
      const sibling = siblings.find((layout) => layout.id === row.id);
      return sibling ? { ...row, positionY: sibling.positionY } : row;
    }));
  }

  function autoScrollResize() {
    const resize = resizeRef.current;
    if (!resize || !resize.moved || resize.longPressed) return;
    const edge = 72;
    const documentScroller = resize.scrollContainer === resize.scrollContainer.ownerDocument.scrollingElement;
    const bounds = documentScroller
      ? { top: 0, bottom: window.innerHeight }
      : resize.scrollContainer.getBoundingClientRect();
    let scrollStep = 0;
    if (resize.latestClientY > bounds.bottom - edge) {
      scrollStep = Math.min(12, Math.max(1, Math.ceil((resize.latestClientY - (bounds.bottom - edge)) * 0.18)));
    } else if (resize.latestClientY < bounds.top + edge) {
      scrollStep = -Math.min(12, Math.max(1, Math.ceil((bounds.top + edge - resize.latestClientY) * 0.18)));
    }
    if (!scrollStep) {
      resize.autoScrollFrame = null;
      return;
    }
    resize.scrollContainer.scrollTop += scrollStep;
    applyResize(resize);
    resize.autoScrollFrame = window.requestAnimationFrame(autoScrollResize);
  }

  function resizeCard(event) {
    const resize = resizeRef.current;
    if (!resize || resize.longPressed) return;
    resize.latestClientX = event.clientX;
    resize.latestClientY = event.clientY;
    const deltaX = resize.latestClientX - resize.startX;
    const deltaY = resize.latestClientY - resize.startY;
    if (!resize.moved && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
      resize.moved = true;
      window.clearTimeout(resize.timer);
    }
    if (!resize.moved) return;
    applyResize(resize);
    const isDocumentScroller = resize.scrollContainer === resize.scrollContainer.ownerDocument.scrollingElement;
    const bounds = isDocumentScroller ? { top: 0, bottom: window.innerHeight } : resize.scrollContainer.getBoundingClientRect();
    const nearEdge = resize.latestClientY < bounds.top + 72 || resize.latestClientY > bounds.bottom - 72;
    if (nearEdge && !resize.autoScrollFrame) {
      resize.autoScrollFrame = window.requestAnimationFrame(autoScrollResize);
    } else if (!nearEdge && resize.autoScrollFrame) {
      window.cancelAnimationFrame(resize.autoScrollFrame);
      resize.autoScrollFrame = null;
    }
  }

  function finishResize() {
    const resize = resizeRef.current;
    if (resize?.timer) window.clearTimeout(resize.timer);
    if (resize?.autoScrollFrame) window.cancelAnimationFrame(resize.autoScrollFrame);
    resizeRef.current = null;
    setDraggingId(null);
    if (!resize?.size || resize.longPressed) return;
    saveCardUpdates([
      {
        id: resize.id,
        patch: {
          card_width: resize.size.cardWidth,
          card_height: resize.size.cardHeight,
          position_x: resize.size.positionX,
          position_y: resize.size.positionY,
        },
      },
      ...resize.size.pushed.map((sibling) => ({ id: sibling.id, patch: { position_y: sibling.positionY } })),
    ], resize.previousLayout).catch((resizeError) => {
      setRows((current) => current.map((row) => row.id === resize.id ? resize.concept : row));
      setError(resizeError.message);
    });
  }

  function toggleAdjustments(concept) {
    setAdjustingId((current) => current === concept.id ? null : concept.id);
  }

  async function adjustCard(concept, dimension, direction, event) {
    const card = event.currentTarget.closest('[data-concept-card]');
    const board = card?.parentElement;
    if (!card || !board) return;
    const cardRect = card.getBoundingClientRect();
    const boardRect = board.getBoundingClientRect();
    const width = dimension === 'width'
      ? Math.max(Math.min(240, board.clientWidth), Math.min(board.clientWidth, (concept.cardWidth || Math.round(cardRect.width)) + direction * 48))
      : Math.round(cardRect.width);
    const height = dimension === 'height'
      ? Math.max(220, Math.min(maxCardHeight, (concept.cardHeight || Math.round(cardRect.height)) + direction * 36))
      : Math.round(cardRect.height);
    const left = cardRect.left - boardRect.left;
    const top = cardRect.top - boardRect.top;
    const siblings = reflowCardsBelow(board, card, { left, top }, width, height);
    const maxLeft = Math.max(0, board.clientWidth - width);
    const patch = {
      card_width: width,
      card_height: height,
      position_x: maxLeft ? left / maxLeft : 0,
      position_y: Math.round(top),
    };
    const previousRows = rows;
    const previousLayout = captureLayout(previousRows);
    setRows((current) => current.map((row) => {
      if (row.id === concept.id) {
        return { ...row, cardWidth: width, cardHeight: height, positionX: patch.position_x, positionY: patch.position_y };
      }
      const sibling = siblings.find((layout) => layout.id === row.id);
      return sibling ? { ...row, positionY: sibling.positionY } : row;
    }));
    try {
      await saveCardUpdates([
        { id: concept.id, patch },
        ...siblings.filter((sibling) => Math.round(sibling.originalTop) !== sibling.positionY)
          .map((sibling) => ({ id: sibling.id, patch: { position_y: sibling.positionY } })),
      ], previousLayout);
    } catch (adjustError) {
      setRows(previousRows);
      setError(adjustError.message);
    }
  }

  function openConcept(concept, event) {
    openConceptView(concept, event, false);
  }

  function openConceptView(concept, event, fullView) {
    setAdjustingId(null);
    const rect = event.currentTarget.closest('[data-concept-card]')?.getBoundingClientRect();
    setSelected({
      ...concept,
      viewWidth: Math.round(rect?.width || concept.cardWidth || 480),
      viewHeight: Math.round(rect?.height || concept.cardHeight || 320),
      viewMode: fullView ? 'full' : 'card',
    });
  }

  function updatePosition(id, position) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...position } : row));
  }

  function startDrag(event, concept) {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    const card = event.currentTarget.closest('[data-concept-card]');
    const board = card?.parentElement;
    if (!card || !board) return;
    const boardRect = board.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    dragRef.current = {
      id: concept.id,
      previousLayout: captureLayout(),
      card,
      board,
      boardRect,
      offsetX: event.clientX - cardRect.left,
      offsetY: event.clientY - cardRect.top,
      siblings: getSiblingLayouts(board, card),
      lastPosition: {
        left: cardRect.left - boardRect.left,
        top: cardRect.top - boardRect.top,
      },
      position: null,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingId(concept.id);
    event.preventDefault();
  }

  function moveCard(event) {
    const drag = dragRef.current;
    if (!drag) return;
    const boardRect = drag.board.getBoundingClientRect();
    const maxLeft = Math.max(0, drag.board.clientWidth - drag.card.offsetWidth);
    const left = Math.max(0, Math.min(event.clientX - boardRect.left - drag.offsetX, maxLeft));
    const top = Math.max(0, event.clientY - boardRect.top - drag.offsetY);
    const nextPosition = resolveCardDrop(
      drag.board,
      drag.card,
      left,
      top,
      drag.card.offsetWidth,
      drag.card.offsetHeight,
      drag.siblings,
      event.clientX - boardRect.left,
      event.clientY - boardRect.top,
    );
    drag.lastPosition = nextPosition;
    const location = {
      positionX: maxLeft ? nextPosition.left / maxLeft : 0,
      positionY: Math.round(nextPosition.top),
      pushed: nextPosition.siblings.filter((sibling) => Math.round(sibling.originalTop) !== sibling.positionY),
    };
    drag.position = location;
    setRows((current) => current.map((row) => {
      if (row.id === drag.id) return { ...row, ...location };
      const sibling = nextPosition.siblings.find((layout) => layout.id === row.id);
      return sibling ? { ...row, positionY: sibling.positionY } : row;
    }));
  }

  function finishDrag() {
    const drag = dragRef.current;
    dragRef.current = null;
    setDraggingId(null);
    if (!drag?.position) return;
    saveCardUpdates([
      { id: drag.id, patch: { position_x: drag.position.positionX, position_y: drag.position.positionY } },
      ...drag.position.pushed.map((sibling) => ({ id: sibling.id, patch: { position_y: sibling.positionY } })),
    ], drag.previousLayout).catch((saveError) => setError(saveError.message));
  }

  function nudgeCard(event, concept) {
    const steps = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (!steps[event.key]) return;
    event.preventDefault();
    const card = event.currentTarget.closest('[data-concept-card]');
    const board = card?.parentElement;
    if (!card || !board) return;
    const cardRect = card.getBoundingClientRect();
    const boardRect = board.getBoundingClientRect();
    const maxLeft = Math.max(0, board.clientWidth - card.offsetWidth);
    const [horizontal, vertical] = steps[event.key];
    const left = Math.max(0, Math.min(cardRect.left - boardRect.left + horizontal * 20, maxLeft));
    const top = Math.max(0, cardRect.top - boardRect.top + vertical * 20);
    if (boardHasCollision(board, card, left, top)) return;
    const previousLayout = captureLayout();
    const position = { positionX: maxLeft ? left / maxLeft : 0, positionY: Math.round(top) };
    updatePosition(concept.id, position);
    savePosition(concept.id, position, previousLayout).catch((saveError) => setError(saveError.message));
  }

  async function resetLayout() {
    setError('');
    setResetting(true);
    const previousLayout = captureLayout();
    try {
      const results = await Promise.all(rows.map(async (concept) => {
        const response = await fetch(`/api/concepts/${concept.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position_x: null, position_y: null, card_width: null, card_height: null }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not reset card positions.');
        return result;
      }));
      setRows(results);
      rememberLayout(previousLayout);
    } catch (resetError) {
      setError(resetError.message);
    } finally {
      setResetting(false);
    }
  }

  async function undoLayout() {
    const previousLayout = undoStack.at(-1);
    if (!previousLayout || undoing) return;
    setError('');
    setUndoing(true);
    try {
      const results = await Promise.all(previousLayout.map(async (layout) => {
        const response = await fetch(`/api/concepts/${layout.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            position_x: layout.positionX,
            position_y: layout.positionY,
            card_width: layout.cardWidth,
            card_height: layout.cardHeight,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not undo layout change.');
        return result;
      }));
      setRows((current) => current.map((row) => results.find((result) => result.id === row.id) || row));
      setUndoStack((current) => current.slice(0, -1));
    } catch (undoError) {
      setError(undoError.message);
    } finally {
      setUndoing(false);
    }
  }

  function conceptCard(concept, index, isFavoriteBoard) {
    const defaultX = (index % 3) / 2;
    const defaultY = Math.floor(index / 3) * cardRowHeight + 12;
    const positionX = typeof concept.positionX === 'number' ? concept.positionX : defaultX;
    const positionY = typeof concept.positionY === 'number' ? concept.positionY : defaultY;
    const previewHeight = concept.cardHeight || cardPreviewHeight;
    return (
      <article
        key={concept.id}
        id={slug(concept.name)}
        data-concept-card
        data-concept-id={concept.id}
        className={`knowledge-card ${draggingId === concept.id ? 'knowledge-card-dragging' : ''}`}
        style={{ left: `${positionX * 100}%`, top: `${positionY}px`, transform: `translateX(-${positionX * 100}%)`, width: concept.cardWidth ? `${concept.cardWidth}px` : undefined, height: `${previewHeight}px`, '--card-height': `${previewHeight}px`, '--card-accent': cardAccents[index % cardAccents.length] }}
      >
        <div className="knowledge-card-accent" />
        <div className="knowledge-card-header">
          <button
            type="button"
            className="knowledge-card-grip"
            aria-label={`Move ${concept.name}`}
            title="Drag to arrange; use arrow keys for fine positioning"
            onPointerDown={(event) => startDrag(event, concept)}
            onPointerMove={moveCard}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            onLostPointerCapture={finishDrag}
            onKeyDown={(event) => nudgeCard(event, concept)}
          >
            <LuGripVertical aria-hidden />
          </button>
          <button type="button" className="knowledge-card-title" onClick={(event) => openConcept(concept, event)}>
            <span className="knowledge-card-icon"><ConceptIcon icon={concept.icon} /></span>
            <span className="knowledge-card-heading">
              <span className="knowledge-card-name">{concept.name}</span>
              <span className="knowledge-card-subtitle">{concept.subtitle || 'Knowledge note'}</span>
            </span>
          </button>
          <button
            type="button"
            className="knowledge-card-full-view"
            aria-label={`Open ${concept.name} in full view`}
            title="Open full view"
            onClick={(event) => openConceptView(concept, event, true)}
          >
            <LuExpand aria-hidden />
          </button>
          <button
            type="button"
            aria-label={concept.isFavorite ? `Remove ${concept.name} from favorites` : `Add ${concept.name} to favorites`}
            aria-pressed={Boolean(concept.isFavorite)}
            title={concept.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            className={`knowledge-card-favorite ${concept.isFavorite ? 'is-favorite' : ''}`}
            onClick={() => toggleFavorite(concept)}
          >
            <LuStar className="h-4 w-4" fill={concept.isFavorite ? 'currentColor' : 'none'} aria-hidden />
          </button>
        </div>
        <div className="knowledge-card-content">
          {concept.body ? (
            <ConceptRichText body={concept.body} className="knowledge-card-copy text-sm leading-6 text-text" />
          ) : (
            <span className="text-[12px] text-muted">Open this note to add details.</span>
          )}
        </div>
        <div className="knowledge-card-footer">
          <span>{isFavoriteBoard ? 'FAVORITE' : 'KNOWLEDGE NOTE'}</span>
          {concept.showInNav && <span className="knowledge-card-tag">IN NAVIGATION</span>}
        </div>
        <button
          type="button"
          className="knowledge-card-resizer"
          aria-label={`Resize ${concept.name}`}
          title="Drag the corner to resize"
          aria-expanded={adjustingId === concept.id}
          aria-controls={`knowledge-size-adjust-${concept.id}`}
          onPointerDown={(event) => startResize(event, concept)}
          onPointerMove={resizeCard}
          onPointerUp={finishResize}
          onPointerCancel={finishResize}
          onLostPointerCapture={finishResize}
          onClick={(event) => event.detail === 0 && toggleAdjustments(concept)}
        >
          <LuMoveDiagonal2 aria-hidden />
        </button>
        {adjustingId === concept.id && (
          <div id={`knowledge-size-adjust-${concept.id}`} className="knowledge-size-adjustments" role="group" aria-label={`Adjust ${concept.name} size`}>
            <div className="knowledge-size-adjust-row knowledge-width-adjustments">
              <span>Width</span>
              <button type="button" aria-label={`Decrease ${concept.name} width`} onClick={(event) => adjustCard(concept, 'width', -1, event)}><LuMinus aria-hidden /></button>
              <button type="button" aria-label={`Increase ${concept.name} width`} onClick={(event) => adjustCard(concept, 'width', 1, event)}><LuPlus aria-hidden /></button>
            </div>
            <div className="knowledge-size-adjust-row">
              <span>Height</span>
              <button type="button" aria-label={`Decrease ${concept.name} height`} onClick={(event) => adjustCard(concept, 'height', -1, event)}><LuMinus aria-hidden /></button>
              <button type="button" aria-label={`Increase ${concept.name} height`} onClick={(event) => adjustCard(concept, 'height', 1, event)}><LuPlus aria-hidden /></button>
            </div>
          </div>
        )}
      </article>
    );
  }

  function conceptBoard(items, isFavoriteBoard) {
    const storedBottom = items.reduce((bottom, concept, index) => {
      const y = typeof concept.positionY === 'number' ? concept.positionY : Math.floor(index / 3) * cardRowHeight + 12;
      return Math.max(bottom, y + (concept.cardHeight || cardPreviewHeight));
    }, 0);
    const height = Math.max(290, storedBottom + 20);
    return (
      <div
        ref={(element) => { boardRefs.current[isFavoriteBoard ? 0 : 1] = element; }}
        className="knowledge-board"
        style={{ minHeight: `${height}px` }}
      >
        {items.map((concept, index) => conceptCard(concept, index, isFavoriteBoard))}
      </div>
    );
  }

  function close() {
    setSelected(null);
    setEditing(false);
  }

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="rounded-lg border border-loss/30 bg-loss/10 px-3 py-2 text-[13px] text-loss">{error}</p>}
      <section className="knowledge-section" aria-labelledby="concept-favorites-heading">
        <div className="knowledge-section-heading">
          <LuStar className="h-4 w-4 text-gold" fill="currentColor" aria-hidden />
          <h2 id="concept-favorites-heading" className="text-[15px] font-semibold text-text">Favorites</h2>
          <span className="knowledge-count">{rows.filter((concept) => concept.isFavorite).length}</span>
        </div>
        {rows.some((concept) => concept.isFavorite) ? (
          conceptBoard(rows.filter((concept) => concept.isFavorite), true)
        ) : (
          <p className="knowledge-empty">Star a concept to keep it close at hand.</p>
        )}
      </section>

      <section className="knowledge-section" aria-labelledby="concept-all-heading">
        <div className="knowledge-section-heading knowledge-section-heading-spread">
          <div className="flex items-center gap-2">
            <h2 id="concept-all-heading" className="text-[15px] font-semibold text-text">All concepts</h2>
            <span className="knowledge-count">{rows.filter((concept) => !concept.isFavorite).length}</span>
          </div>
          <div className="knowledge-layout-actions">
            <button type="button" className="knowledge-reset" onClick={undoLayout} disabled={!undoStack.length || resetting || undoing} title="Undo last layout change">
              <LuUndo2 aria-hidden /> {undoing ? 'Undoing...' : 'Undo'}
            </button>
            <button type="button" className="knowledge-reset" onClick={resetLayout} disabled={resetting || undoing || !rows.length}>
              <LuRotateCcw aria-hidden /> {resetting ? 'Resetting...' : 'Reset layout'}
            </button>
          </div>
        </div>
        {rows.some((concept) => !concept.isFavorite) ? (
          conceptBoard(rows.filter((concept) => !concept.isFavorite), false)
        ) : (
          <p className="knowledge-empty">Nothing in the knowledge base yet.</p>
        )}
      </section>

      <Modal
        open={Boolean(selected)}
        onClose={close}
        size={editing ? 'max-w-4xl' : selected?.viewMode === 'full' ? 'max-w-6xl' : 'max-w-none'}
        dialogClassName={selected && !editing ? `knowledge-detail-dialog ${selected.viewMode === 'full' ? 'knowledge-full-view-dialog' : ''}` : ''}
        bodyClassName={selected && !editing ? 'knowledge-detail-body' : ''}
        overlayClassName={selected && !editing ? 'knowledge-detail-overlay' : ''}
        dialogStyle={selected && !editing && selected.viewMode !== 'full' ? {
          width: `${selected.viewWidth}px`,
          height: `${selected.viewHeight}px`,
          maxWidth: 'calc(100vw - 2rem)',
          maxHeight: 'calc(100dvh - 5rem)',
        } : undefined}
        title={editing ? `Edit ${selected?.name}` : selected?.name || 'Concept details'}
      >
        {selected && editing ? (
          <RecordForm
            endpoint={`/api/concepts/${selected.id}`}
            fields={fields}
            initial={{ ...selected, show_in_nav: selected.showInNav }}
            method="PATCH"
            submitLabel="Save changes"
            onDone={(updated) => {
              setSelected((current) => ({ ...updated, viewWidth: current?.viewWidth, viewHeight: current?.viewHeight, viewMode: current?.viewMode }));
              setRows((current) => current.map((row) => row.id === updated.id ? updated : row));
              setEditing(false);
            }}
          />
        ) : selected ? (
          <div className="space-y-5">
            <div>
              <p className="text-[13px] uppercase tracking-wide text-muted">{selected.subtitle || 'Knowledge base entry'}</p>
              <ConceptRichText body={selected.body} className="mt-3 text-[14px] leading-7 text-text/90" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <DeleteButton endpoint={`/api/concepts/${selected.id}`} label="Delete concept" onDone={close} />
              <div className="flex items-center gap-2">
                <button type="button" className="btn" onClick={() => toggleFavorite(selected)}>
                  {selected.isFavorite ? '★ Favorited' : '☆ Add favorite'}
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setEditing(true)}>
                  Edit concept
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
