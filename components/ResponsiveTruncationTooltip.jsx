'use client';

import { useEffect } from 'react';

const truncatedTextSelector = '.truncate, [class*="line-clamp-"]';

export default function ResponsiveTruncationTooltip() {
  useEffect(() => {
    let activeTarget = null;
    let tooltip = null;
    let previousDescription = null;

    function closeTooltip() {
      tooltip?.remove();
      if (activeTarget) {
        if (previousDescription) activeTarget.setAttribute('aria-describedby', previousDescription);
        else activeTarget.removeAttribute('aria-describedby');
      }
      activeTarget = null;
      tooltip = null;
      previousDescription = null;
    }

    function getTruncatedTarget(eventTarget) {
      if (!(eventTarget instanceof Element)) return null;
      if (!window.matchMedia('(max-width: 1023px)').matches) return null;

      const target = eventTarget.closest(truncatedTextSelector);
      if (!target || target.closest('[aria-expanded]')) return null;
      if (target.scrollWidth <= target.clientWidth + 1 && target.scrollHeight <= target.clientHeight + 1) return null;
      return target;
    }

    function positionTooltip() {
      if (!tooltip || !activeTarget) return;
      const targetRect = activeTarget.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const margin = 12;
      const left = Math.max(margin, Math.min(targetRect.left, window.innerWidth - tooltipRect.width - margin));
      let top = targetRect.bottom + 8;
      if (top + tooltipRect.height > window.innerHeight - margin) {
        top = Math.max(margin, targetRect.top - tooltipRect.height - 8);
      }
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    }

    function showTooltip(target) {
      const text = (target.innerText || target.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) return;
      closeTooltip();
      activeTarget = target;
      previousDescription = target.getAttribute('aria-describedby');
      tooltip = document.createElement('div');
      tooltip.id = 'responsive-truncated-text-tooltip';
      tooltip.className = 'responsive-truncated-text-tooltip';
      tooltip.setAttribute('role', 'tooltip');
      tooltip.textContent = text;
      target.setAttribute('aria-describedby', [previousDescription, tooltip.id].filter(Boolean).join(' '));
      document.body.appendChild(tooltip);
      positionTooltip();
    }

    function onClick(event) {
      const target = getTruncatedTarget(event.target);
      if (target) showTooltip(target);
      else closeTooltip();
    }

    function onPointerOver(event) {
      if (event.pointerType === 'touch') return;
      const target = getTruncatedTarget(event.target);
      if (target && target !== activeTarget) showTooltip(target);
    }

    function onPointerOut(event) {
      if (event.pointerType === 'touch' || !activeTarget) return;
      const target = event.target instanceof Element ? event.target.closest(truncatedTextSelector) : null;
      if (target !== activeTarget) return;
      if (event.relatedTarget instanceof Node && activeTarget.contains(event.relatedTarget)) return;
      closeTooltip();
    }

    function onFocusIn(event) {
      const target = getTruncatedTarget(event.target);
      if (target) showTooltip(target);
    }

    function onFocusOut(event) {
      if (activeTarget && event.target instanceof Element && activeTarget.contains(event.target)) closeTooltip();
    }

    function onEscape(event) {
      if (event.key === 'Escape') closeTooltip();
    }

    document.addEventListener('click', onClick);
    document.addEventListener('pointerover', onPointerOver);
    document.addEventListener('pointerout', onPointerOut);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    document.addEventListener('keydown', onEscape);
    document.addEventListener('scroll', closeTooltip, true);
    window.addEventListener('resize', closeTooltip);

    return () => {
      closeTooltip();
      document.removeEventListener('click', onClick);
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('pointerout', onPointerOut);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('keydown', onEscape);
      document.removeEventListener('scroll', closeTooltip, true);
      window.removeEventListener('resize', closeTooltip);
    };
  }, []);

  return null;
}