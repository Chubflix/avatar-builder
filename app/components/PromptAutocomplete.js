'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './PromptAutocomplete.css';
import { useApp } from '../context/AppContext';

function getCurrentToken(text, caret) {
  const before = text.slice(0, caret);
  const sepIdx = Math.max(before.lastIndexOf(','), before.lastIndexOf('\n'), before.lastIndexOf(' '));
  const start = sepIdx === -1 ? 0 : sepIdx + 1;
  let token = before.slice(start).trimStart();
  const leadingSpaces = before.slice(start).length - token.length;
  return { token, start: start + leadingSpaces };
}

function replaceCurrentToken(text, caret, replacement) {
  const { token, start } = getCurrentToken(text, caret);
  const end = caret;
  const before = text.slice(0, start);
  const after = text.slice(end);
  // Ensure comma separation styling like "tag, " if not end-of-line and not already comma
  let insert = replacement;
  const needsComma = after.trim().length === 0 || after.trim().startsWith(',') ? false : true;
  if (needsComma) insert += ', ';
  return before + insert + after.replace(/^\s*/, '');
}

function useCaretPosition(textareaRef, value) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const compute = () => {
      const ta = textareaRef.current;
      if (!ta) return;
      const { selectionStart } = ta;

      const div = document.createElement('div');
      const style = window.getComputedStyle(ta);
      [
        'fontFamily','fontSize','fontWeight','letterSpacing','textTransform','textAlign','whiteSpace',
        'wordWrap','lineHeight','padding','border','boxSizing','width','height'
      ].forEach((prop) => {
        div.style[prop] = style[prop];
      });
      div.style.position = 'absolute';
      div.style.visibility = 'hidden';
      div.style.whiteSpace = 'pre-wrap';
      div.style.wordWrap = 'break-word';
      div.style.overflow = 'auto';
      // Match the width so wrapping matches
      div.style.width = `${ta.clientWidth}px`;

      const text = ta.value.substring(0, selectionStart);
      const span = document.createElement('span');
      span.textContent = '\u200b';
      div.textContent = text;
      div.appendChild(span);
      document.body.appendChild(div);
      const spanRect = span.getBoundingClientRect();
      const mirrorRect = div.getBoundingClientRect();
      const taRect = ta.getBoundingClientRect();

      const left = taRect.left + (spanRect.left - mirrorRect.left);
      const top = taRect.top + (spanRect.top - mirrorRect.top);
      setPos({ top, left });
      document.body.removeChild(div);
    };

    compute();

    const ta = textareaRef.current;
    if (!ta) return;

    const listeners = [
      ['keyup', compute],
      ['input', compute],
      ['click', compute],
      ['focus', compute],
    ];
    listeners.forEach(([e, fn]) => ta.addEventListener(e, fn));
    const onResize = () => compute();
    const onScroll = () => compute();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      listeners.forEach(([e, fn]) => ta.removeEventListener(e, fn));
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [textareaRef, value]);

  return pos;
}

export default function PromptAutocomplete({ textareaRef, value, onSelect }) {
  const { state } = useApp();
  const enabled = state?.tagAutocompleteEnabled !== false; // default to true
  // If disabled, render nothing and attach no listeners
  if (!enabled) return null;

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [activeIdx, setActiveIdx] = useState(0);
  const [prefix, setPrefix] = useState('');
  const wrapRef = useRef(null);
  const suppressOpenRef = useRef(false); // set when Escape closes; cleared on input
  const lastPrefixRef = useRef('');
  const [mounted, setMounted] = useState(false);

  const caretPos = useCaretPosition(textareaRef, value);

  useEffect(() => {
    // mark as mounted to safely use document for portals
    setMounted(true);
  }, []);

  const fetchItems = async (pref, off = 0, { resetActive = true } = {}) => {
    try {
      const pageSize = (typeof window !== 'undefined' && window.innerWidth <= 768) ? 5 : 3;
      const url = `/api/tags?prefix=${encodeURIComponent(pref)}&limit=${pageSize}&offset=${off}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.tags || []);
      setTotal(data.total || 0);
      setOffset(off);
      if (resetActive) setActiveIdx(0);
    } catch (_) { /* ignore */ }
  };

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;

    const computeAndMaybeOpen = (source) => {
      if (suppressOpenRef.current && (source === 'click' || source === 'focus')) {
        return; // don't reopen until user types
      }
      const caret = ta.selectionStart;
      const { token } = getCurrentToken(ta.value, caret);
      const pref = token.toLowerCase();
      if (pref && /^[a-z0-9_:-]+$/.test(pref)) {
        setPrefix(pref);
        setOpen(true);
        const isNewPrefix = pref !== lastPrefixRef.current;
        lastPrefixRef.current = pref;
        fetchItems(pref, 0, { resetActive: isNewPrefix });
      } else {
        setOpen(false);
        setItems([]);
        setTotal(0);
        setOffset(0);
      }
    };

    const onInput = () => {
      // user typed; allow reopening again
      suppressOpenRef.current = false;
      computeAndMaybeOpen('input');
    };
    const onClick = () => computeAndMaybeOpen('click');
    const onFocus = () => computeAndMaybeOpen('focus');

    ta.addEventListener('input', onInput);
    ta.addEventListener('click', onClick);
    ta.addEventListener('focus', onFocus);
    return () => {
      ta.removeEventListener('input', onInput);
      ta.removeEventListener('click', onClick);
      ta.removeEventListener('focus', onFocus);
    };
  }, [textareaRef]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!open) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (items[activeIdx]) {
          e.preventDefault();
          handleChoose(items[activeIdx].tag);
        }
      } else if (e.key === 'Escape') {
        suppressOpenRef.current = true; // prevent immediate reopen on focus/click
        setOpen(false);
      }
    };
    const ta = textareaRef.current;
    if (!ta) return;
    ta.addEventListener('keydown', onKeyDown);
    return () => ta.removeEventListener('keydown', onKeyDown);
  }, [open, items, activeIdx, textareaRef]);

  const handleChoose = (tag) => {
    if (!textareaRef.current) return;
    const ta = textareaRef.current;
    const caret = ta.selectionStart;
    const newText = replaceCurrentToken(ta.value, caret, tag);
    onSelect(newText);
    setOpen(false);
  };

  // close when clicking outside
  useEffect(() => {
    const onDocClick = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target) && e.target !== textareaRef.current) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [textareaRef]);

  if (!open || items.length === 0) return null;

  // Desktop positioning: near caret, popover shown above the caret; Mobile handled by CSS docking
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  let style = {};
  let wrapClass = 'prompt-ac-wrap';
  if (!isMobile) {
    const maxWidth = 340; // matches CSS
    const padding = 8;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const clampedLeft = Math.min(Math.max(padding, caretPos.left), vw - maxWidth - padding);
    style = { top: `${caretPos.top}px`, left: `${clampedLeft}px` };
    wrapClass += ' above';
  }

  const content = (
    <div className={wrapClass} style={style} ref={wrapRef}>
      <div className="prompt-ac-list">
        {items.map((it, idx) => (
          <div
            key={it.tag}
            className={`prompt-ac-item ${idx === activeIdx ? 'active' : ''}`}
            onMouseEnter={() => setActiveIdx(idx)}
            onMouseDown={(e) => { e.preventDefault(); handleChoose(it.tag); }}
          >
            <span>{it.tag}</span>
            {!isMobile && <small>{it.count.toLocaleString()}</small>}
          </div>
        ))}
          {/* Desktop: top-centered header with always-visible Next button */}
          {!isMobile && (
              <div className="prompt-ac-footer">
                  {(() => {
                      const pageSize = (typeof window !== 'undefined' && window.innerWidth <= 768) ? 5 : 3;
                      const hasMore = offset + items.length < total;
                      return (
                          <button
                              className="prompt-ac-more"
                              disabled={!hasMore}
                              onMouseDown={(e) => {
                                  e.preventDefault();
                                  if (!hasMore) return;
                                  fetchItems(prefix, offset + pageSize, { resetActive: true });
                              }}
                              type="button"
                          >
                              more
                          </button>
                      );
                  })()}
              </div>
          )}
        {/* Mobile footer: show icon-only next button only when there are more */}
        {isMobile && (
          <div className="prompt-ac-footer">
            {offset + items.length < total && (
              <button
                className="prompt-ac-more"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const pageSize = (typeof window !== 'undefined' && window.innerWidth <= 768) ? 5 : 3;
                  fetchItems(prefix, offset + pageSize, { resetActive: true });
                }}
                type="button"
              >
                <i className="fa fa-arrow-circle-o-right" aria-hidden="true"></i>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return mounted ? createPortal(content, document.body) : null;
}
