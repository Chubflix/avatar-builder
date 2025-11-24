'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react';
import { useApp } from '../context/AppContext';

/**
 * InpaintModal
 * Simple canvas painter to create a white-on-black mask over the init image.
 */
export default function InpaintModal() {
    const { state, dispatch, actions } = useApp();
    const { showInpaintModal, initImage, maskImage } = state;

    const imgRef = useRef(null);
    const canvasRef = useRef(null); // mask canvas (data: white on black)
    const displayCanvasRef = useRef(null); // visualization canvas (red strokes on transparent)
    const containerRef = useRef(null);
    const stageRef = useRef(null);
    const [brushSize, setBrushSize] = useState(40);
    const [mode, setMode] = useState('draw'); // 'draw' | 'erase' | 'pan' | 'polygon'
    const [isDrawing, setIsDrawing] = useState(false);
    const [scale, setScale] = useState(1); // effective scale = baseScale * zoom
    const [baseScale, setBaseScale] = useState(1);
    const [zoom, setZoom] = useState(1);
    const [cursorPos, setCursorPos] = useState({ x: -1000, y: -1000, visible: false });
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
    // Store paired snapshots for mask and display canvases
    const undoStackRef = useRef([]); // each entry: { mask: dataUrl, display: dataUrl }
    const MAX_UNDO = 20;
    const [showBrushMenu, setShowBrushMenu] = useState(false);
    const [showZoomMenu, setShowZoomMenu] = useState(false);
    const [showTint, setShowTint] = useState(true); // mask tint overlay toggle
    // Visual transparency for red overlay in full-brightness mode (CSS-level)
    const DISPLAY_OPACITY = 0.4;
    // Polygon tool state (points in image coordinate space)
    const [polyPoints, setPolyPoints] = useState([]); // [{x,y}, ...]
    const [imgSize, setImgSize] = useState({ w: 0, h: 0 });

    // Responsive flags
    const [isMobile, setIsMobile] = useState(false);
    const [isPortrait, setIsPortrait] = useState(true);
    const toolbarRef = useRef(null);
    const [toolbarHeight, setToolbarHeight] = useState(60);
    const [bottomBarHeight, setBottomBarHeight] = useState(0);

    useEffect(() => {
        if (!showInpaintModal) return;
        const updateLayout = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            // Treat small-height landscapes as mobile too (e.g., 844x390)
            // Consider either small width or small height as mobile
            const smallHeightLandscape = w > h && h <= 500 && w <= 1000;
            const smallShortEdge = Math.min(w, h) <= 480;
            setIsMobile(w <= 768 || smallHeightLandscape || smallShortEdge);
            setIsPortrait(h >= w);
            // measure toolbar height
            if (toolbarRef.current) {
                setToolbarHeight(toolbarRef.current.getBoundingClientRect().height);
            }
        };
        updateLayout();
        window.addEventListener('resize', updateLayout);
        const ro = new ResizeObserver(updateLayout);
        if (toolbarRef.current) ro.observe(toolbarRef.current);
        return () => {
            window.removeEventListener('resize', updateLayout);
            try { ro.disconnect(); } catch (_) {}
        };
    }, [showInpaintModal]);

    // Initialize canvas when image loads
    useEffect(() => {
        if (!showInpaintModal) return;
        // reset drawing state each time modal opens
        setMode('draw');
        setIsDrawing(false);
        setZoom(1);
        setShowBrushMenu(false);
        setShowZoomMenu(false);
        setPolyPoints([]);
    }, [showInpaintModal]);

    const close = () => dispatch({ type: actions.SET_SHOW_INPAINT_MODAL, payload: false });

    // ----- UI styling helpers for selectboxes -----
    const ui = {
        closedBtn(baseWidth = 56, fontSize = 16) {
            return {
                display: 'inline-flex', alignItems: 'center', gap: 8,
                minWidth: baseWidth, padding: '8px 12px',
                textAlign: 'center', fontSize, fontWeight: 700,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 10, cursor: 'pointer', userSelect: 'none',
                color: 'var(--text-primary)', boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.04)'
            };
        },
        popover(gridCols = 1) {
            return {
                position: 'absolute', top: 46, left: 0, background: 'var(--bg-secondary)',
                border: '1px solid var(--border)', borderRadius: 10, padding: 8,
                display: 'grid', gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`, gap: 8,
                zIndex: 100, boxShadow: '0 10px 30px rgba(0,0,0,0.35)', maxHeight: 260,
                overflow: 'auto'
            };
        },
        optionBtn(active = false, fontSize = 16) {
            return {
                padding: '10px 12px', fontSize, borderRadius: 8,
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                background: active ? 'rgba(229, 9, 20, 0.12)' : 'var(--bg-card)',
                color: 'var(--text-primary)', display: 'block', textAlign: 'left'
            };
        },
        optionLeft() { return {}; },
        checkIcon() { return {}; },
    };

    const brushPreviewPx = (v) => {
        // Visual circle size in dropdown; clamp for usability
        const min = 6, max = 24;
        const scaled = (v / 400) * (max - min) + min;
        return Math.max(min, Math.min(max, scaled));
    };

    const setupCanvas = () => {
        const img = imgRef.current;
        const canvas = canvasRef.current;
        const dCanvas = displayCanvasRef.current;
        if (!img || !canvas || !dCanvas) return;

        const w = img.naturalWidth;
        const h = img.naturalHeight;
        canvas.width = w;
        canvas.height = h;
        dCanvas.width = w;
        dCanvas.height = h;
        setImgSize({ w, h });

        const ctx = canvas.getContext('2d');
        const dctx = dCanvas.getContext('2d');
        // Start with black mask (preserve all)
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        // Display canvas starts fully transparent
        dctx.clearRect(0, 0, w, h);

        // If there is existing maskImage, draw it onto canvas
        if (maskImage) {
            const maskImg = new Image();
            maskImg.onload = () => {
                ctx.drawImage(maskImg, 0, 0, w, h);
                // We cannot trivially derive red-only display from a preexisting black/white mask
                // without per-pixel processing; initialize empty display overlay.
                try {
                    undoStackRef.current = [{ mask: canvas.toDataURL('image/png'), display: dCanvas.toDataURL('image/png') }];
                } catch(_) {}
            };
            maskImg.src = maskImage;
        } else {
            // push initial black/transparent state
            try { undoStackRef.current = [{ mask: canvas.toDataURL('image/png'), display: dCanvas.toDataURL('image/png') }]; } catch(_) {}
        }

        // Compute base scale to fit container width (for pointer coordinate mapping)
        requestAnimationFrame(() => {
            if (!containerRef.current) return;
            const containerWidth = containerRef.current.clientWidth;
            const s = Math.min(1, containerWidth / w) || 1; // fit-to-width, don't upscale initially
            setBaseScale(s);
            setScale(s * zoom);
            // Set stage size so it can be zoomed and panned
            if (stageRef.current) {
                stageRef.current.style.width = `${w * s * zoom}px`;
                stageRef.current.style.height = `${h * s * zoom}px`;
                // Set initial virtual gutter as container padding (not stage margin)
                const container = containerRef.current;
                if (container) {
                    const cw = container.clientWidth;
                    const ch = container.clientHeight;
                    const contentW = w * s * zoom;
                    const contentH = h * s * zoom;
                    const gutterX = contentW > cw ? Math.round(cw * 0.5) : 0;
                    const gutterY = contentH > ch ? Math.round(ch * 0.5) : 0;
                    stageRef.current.style.margin = '0';
                    container.style.boxSizing = 'content-box';
                    container.style.padding = `${gutterY}px ${gutterX}px`;
                }
            }
        });
    };

    const getPos = (clientX, clientY) => {
        const imgEl = imgRef.current;
        if (!imgEl) return { x: 0, y: 0 };
        const rect = imgEl.getBoundingClientRect();
        const x = (clientX - rect.left) / scale;
        const y = (clientY - rect.top) / scale;
        return { x, y };
    };

    const startDraw = (clientX, clientY) => {
        if (mode === 'pan') return; // handled separately
        setIsDrawing(true);
        // push snapshot for undo at stroke start (mask + display)
        try {
            const canvas = canvasRef.current;
            const dCanvas = displayCanvasRef.current;
            if (canvas && dCanvas) {
                const snap = { mask: canvas.toDataURL('image/png'), display: dCanvas.toDataURL('image/png') };
                const stack = undoStackRef.current || [];
                stack.push(snap);
                while (stack.length > MAX_UNDO) stack.shift();
                undoStackRef.current = stack;
            }
        } catch(_) {}
        // Force the first dot to render even before state updates
        draw(clientX, clientY, true);
    };

    const stopDraw = () => setIsDrawing(false);

    const draw = (clientX, clientY, force = false) => {
        if (mode === 'pan') return;
        if (!isDrawing && !force) return;
        const { x, y } = getPos(clientX, clientY);
        const canvas = canvasRef.current;
        const dCanvas = displayCanvasRef.current;
        if (!canvas || !dCanvas) return;
        const ctx = canvas.getContext('2d');
        const dctx = dCanvas.getContext('2d');
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = mode === 'erase' ? '#000' : '#fff';
        ctx.fill();

        // Mirror to display canvas as semi-transparent red for draw, or erase from it
        if (mode === 'erase') {
            const prev = dctx.globalCompositeOperation;
            dctx.globalCompositeOperation = 'destination-out';
            dctx.beginPath();
            dctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
            dctx.closePath();
            dctx.fill();
            dctx.globalCompositeOperation = prev;
        } else {
            dctx.beginPath();
            dctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
            dctx.closePath();
            dctx.fillStyle = '#ff0000';
            dctx.fill();
        }
    };

    const handleMouseDown = (e) => {
        // Prevent text selection while dragging
        e.preventDefault();
        if (mode === 'pan' || e.button === 1 || e.button === 2) {
            // Pan mode or middle/right click
            if (!containerRef.current) return;
            setIsPanning(true);
            panStartRef.current = {
                x: e.clientX,
                y: e.clientY,
                scrollLeft: containerRef.current.scrollLeft,
                scrollTop: containerRef.current.scrollTop,
            };
            return;
        }
        if (mode === 'polygon') {
            // Left click adds point; right click handled by context menu handler below
            if (e.button === 0) {
                const { x, y } = getPos(e.clientX, e.clientY);
                setPolyPoints((pts) => [...pts, { x, y }]);
            }
            return;
        }
        startDraw(e.clientX, e.clientY);
    };
    const handleMouseMove = (e) => {
        // Update brush cursor position
        const imgEl = imgRef.current;
        if (imgEl) {
            const rect = imgEl.getBoundingClientRect();
            setCursorPos({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                visible: e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom
            });
        }

        if (isPanning && containerRef.current) {
            const dx = e.clientX - panStartRef.current.x;
            const dy = e.clientY - panStartRef.current.y;
            containerRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
            containerRef.current.scrollTop = panStartRef.current.scrollTop - dy;
            return;
        }
        if (mode !== 'polygon') {
            draw(e.clientX, e.clientY);
        }
    };
    const handleMouseUp = () => stopDraw();
    const handleMouseLeave = () => {
        setCursorPos((p) => ({ ...p, visible: false }));
        setIsPanning(false);
        stopDraw();
    };

    const handleTouchStart = (e) => {
        const t = e.touches[0];
        if (mode === 'pan') {
            if (!containerRef.current) return;
            setIsPanning(true);
            panStartRef.current = {
                x: t.clientX,
                y: t.clientY,
                scrollLeft: containerRef.current.scrollLeft,
                scrollTop: containerRef.current.scrollTop,
            };
            return;
        }
        if (mode === 'polygon') {
            const { x, y } = getPos(t.clientX, t.clientY);
            setPolyPoints((pts) => [...pts, { x, y }]);
            return;
        }
        startDraw(t.clientX, t.clientY);
    };
    const handleTouchMove = (e) => {
        const t = e.touches[0];
        if (isPanning && containerRef.current) {
            const dx = t.clientX - panStartRef.current.x;
            const dy = t.clientY - panStartRef.current.y;
            containerRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
            containerRef.current.scrollTop = panStartRef.current.scrollTop - dy;
            return;
        }
        if (mode !== 'polygon') {
            draw(t.clientX, t.clientY);
        }
    };
    const handleTouchEnd = () => { setIsPanning(false); stopDraw(); };

    // Complete polygon: draw filled shape on mask and clear points
    const completePolygon = useCallback(() => {
        if (!polyPoints || polyPoints.length < 3) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        // push undo snapshot (mask + display)
        try {
            const dCanvas = displayCanvasRef.current;
            const snap = { mask: canvas.toDataURL('image/png'), display: dCanvas?.toDataURL('image/png') };
            const stack = undoStackRef.current || [];
            stack.push(snap);
            while (stack.length > MAX_UNDO) stack.shift();
            undoStackRef.current = stack;
        } catch(_) {}

        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        ctx.moveTo(polyPoints[0].x, polyPoints[0].y);
        for (let i = 1; i < polyPoints.length; i++) {
            ctx.lineTo(polyPoints[i].x, polyPoints[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = '#fff';
        ctx.fill();
        // Draw polygon to display overlay as semi-transparent red
        const dCanvas = displayCanvasRef.current;
        if (dCanvas) {
            const dctx = dCanvas.getContext('2d');
            dctx.save();
            dctx.beginPath();
            dctx.moveTo(polyPoints[0].x, polyPoints[0].y);
            for (let i = 1; i < polyPoints.length; i++) dctx.lineTo(polyPoints[i].x, polyPoints[i].y);
            dctx.closePath();
            dctx.fillStyle = '#ff0000';
            dctx.fill();
            dctx.restore();
        }
        ctx.restore();
        setPolyPoints([]);
    }, [polyPoints]);

    // Cancel current polygon
    const cancelPolygon = useCallback(() => {
        setPolyPoints([]);
    }, []);

    // Zoom helpers
    const applyZoom = (z, pivotClientX = null, pivotClientY = null) => {
        const newZoom = Math.max(0.25, Math.min(4, z));
        const img = imgRef.current;
        const container = containerRef.current;
        const stage = stageRef.current;
        if (!img || !stage) {
            setZoom(newZoom);
            return;
        }

        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const s = baseScale || 1;

        // If a pivot is provided (mouse position), compute ratios within the image rect
        let ratioX = 0.5, ratioY = 0.5; // default center
        let hadPivot = false;
        if (pivotClientX != null && pivotClientY != null) {
            const beforeRect = img.getBoundingClientRect();
            if (beforeRect.width > 0 && beforeRect.height > 0) {
                ratioX = (pivotClientX - beforeRect.left) / beforeRect.width;
                ratioY = (pivotClientY - beforeRect.top) / beforeRect.height;
                // Clamp ratios so wild scroll positions don't explode
                ratioX = Math.max(0, Math.min(1, ratioX));
                ratioY = Math.max(0, Math.min(1, ratioY));
                hadPivot = true;
            }
        }

        // Apply zoom: set sizes/state first
        setZoom(newZoom);
        setScale(s * newZoom);
        stage.style.width = `${w * s * newZoom}px`;
        stage.style.height = `${h * s * newZoom}px`;

        // Adjust scroll to keep pivot under the cursor
        if (container) {
            const cw = container.clientWidth;
            const ch = container.clientHeight;
            const contentW = w * s * newZoom;
            const contentH = h * s * newZoom;

            // Virtual gutter: add padding to container (not margin on stage)
            const gutterX = contentW > cw ? Math.round(cw * 0.5) : 0;
            const gutterY = contentH > ch ? Math.round(ch * 0.5) : 0;
            stage.style.margin = '0';
            container.style.boxSizing = 'content-box';
            container.style.padding = `${gutterY}px ${gutterX}px`;

            // If content smaller than container, snap to origin in that axis
            if (contentW <= cw) container.scrollLeft = 0;
            if (contentH <= ch) container.scrollTop = 0;

            if (hadPivot) {
                // After DOM styles update, measure and compute new scroll deltas
                requestAnimationFrame(() => {
                    const afterRect = img.getBoundingClientRect();
                    const cRect = container.getBoundingClientRect();
                    // Target top-left of image such that pivot stays under pointer
                    const targetLeft = pivotClientX - ratioX * afterRect.width;
                    const targetTop = pivotClientY - ratioY * afterRect.height;
                    // Current offset of image in viewport
                    const currentLeft = afterRect.left;
                    const currentTop = afterRect.top;
                    // Compute deltas in viewport space and convert to scroll adjustments
                    let deltaX = currentLeft - targetLeft;
                    let deltaY = currentTop - targetTop;

                    // Update scroll positions
                    if (!Number.isNaN(deltaX)) container.scrollLeft += deltaX;
                    if (!Number.isNaN(deltaY)) container.scrollTop += deltaY;

                    // Clamp scroll within scrollable range
                    const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
                    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
                    container.scrollLeft = Math.max(0, Math.min(maxScrollLeft, container.scrollLeft));
                    container.scrollTop = Math.max(0, Math.min(maxScrollTop, container.scrollTop));
                });
            }
        }
    };

    // Scroll wheel gestures:
    // - Alt/Option + wheel = brush size (takes precedence, no scroll/zoom)
    // - Ctrl + wheel = zoom at cursor (when Alt is not pressed)
    // Capture handler: perform logic here and block default to avoid scroll chaining
    const handleWheelCapture = useCallback((e) => {
        if (!showInpaintModal) return;
        const isBrushWheel = !!e.altKey; // Alt/Option = brush size
        // Treat Ctrl (Windows/Linux) or Cmd/Meta (macOS) as zoom modifier; Alt must not be pressed
        const isZoomWheel = (e.ctrlKey || e.metaKey) && !e.altKey;

        if (!isBrushWheel && !isZoomWheel) return;

        // Block browser/page scroll and zoom entirely
        e.preventDefault();
        e.stopPropagation();

        if (isBrushWheel) {
            // Smooth multiplicative brush sizing with reliable direction handling
            const dy = typeof e.deltaY === 'number' ? e.deltaY : 0;
            const direction = dy === 0 ? 0 : (dy < 0 ? 1 : -1); // up = increase
            const factor = direction > 0 ? 1.05 : direction < 0 ? 0.95 : 1;

            setBrushSize((s) => {
                let next = Math.round(s * factor);
                if (direction !== 0 && next === s) {
                    next = s + (direction > 0 ? 1 : -1);
                }
                return Math.max(1, Math.min(400, next));
            });
            return;
        }

        // Zoom around mouse cursor position
        const step = 0.1;
        const targetZoom = e.deltaY < 0 ? (zoomRef.current + step) : (zoomRef.current - step);
        applyZoom(targetZoom, e.clientX, e.clientY);
    }, [showInpaintModal, applyZoom]); // Only include stable dependencies



    const zoomRef = useRef(zoom);
    useEffect(() => {
        zoomRef.current = zoom;
    }, [zoom]);

    // Attach a native capture-phase wheel listener to the container so our
    // gesture logic runs even when React synthetic events are bypassed or
    // when the browser would otherwise treat the listener as passive.
    useEffect(() => {
        if (!showInpaintModal) return;
        const container = containerRef.current;
        if (!container) return;
        try {
            container.addEventListener('wheel', handleWheelCapture, { passive: false, capture: true });
        } catch (_) {
            // Some older browsers may not support options object; fallback
            container.addEventListener('wheel', handleWheelCapture, false);
        }
        return () => {
            try {
                container.removeEventListener('wheel', handleWheelCapture, { capture: true });
            } catch (_) {
                container.removeEventListener('wheel', handleWheelCapture, false);
            }
        };
    }, [showInpaintModal, handleWheelCapture]);

    const handleSave = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const data = canvas.toDataURL('image/png');
        dispatch({ type: actions.SET_MASK_IMAGE, payload: data });
        close();
    };

    const handleReset = () => {
        if (!window.confirm('Reset the mask to a blank (black) canvas?')) return;
        const canvas = canvasRef.current;
        const dCanvas = displayCanvasRef.current;
        if (!canvas || !dCanvas) return;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const dctx = dCanvas.getContext('2d');
        dctx.clearRect(0, 0, dCanvas.width, dCanvas.height);
        try {
            const snap = { mask: canvas.toDataURL('image/png'), display: dCanvas.toDataURL('image/png') };
            undoStackRef.current = [snap];
        } catch(_) {}
        setPolyPoints([]);
    };

    const handleUndo = () => {
        const stack = undoStackRef.current || [];
        if (stack.length <= 1) return; // keep at least one state
        // Restore the most recent snapshot pair
        const last = stack.pop();
        if (!last) return;
        try {
            const canvas = canvasRef.current;
            const dCanvas = displayCanvasRef.current;
            if (!canvas || !dCanvas) return;
            const maskImg = new Image();
            maskImg.onload = () => {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);
            };
            const dispImg = new Image();
            dispImg.onload = () => {
                const dctx = dCanvas.getContext('2d');
                dctx.clearRect(0, 0, dCanvas.width, dCanvas.height);
                dctx.drawImage(dispImg, 0, 0, dCanvas.width, dCanvas.height);
            };
            maskImg.src = last.mask;
            dispImg.src = last.display;
        } catch(_) {}
    };

    // Global listeners to ensure tools unpress properly even when cursor leaves window
    useEffect(() => {
        if (!showInpaintModal) return;
        const onUp = () => { setIsPanning(false); stopDraw(); };
        const onBlur = () => { setIsPanning(false); stopDraw(); };
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchend', onUp);
        window.addEventListener('blur', onBlur);
        return () => {
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchend', onUp);
            window.removeEventListener('blur', onBlur);
        };
    }, [showInpaintModal]);

    // Keyboard shortcuts within modal
    useEffect(() => {
        if (!showInpaintModal) return;
        const onKey = (e) => {
            // Avoid when focused on an input/textarea/contenteditable
            const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
            const editable = tag === 'input' || tag === 'textarea' || (e.target && e.target.isContentEditable);
            if (editable) return;

            // Reset zoom to 100% with Ctrl+0 / Cmd+0
            if ((e.ctrlKey || e.metaKey) && (e.key === '0')) {
                e.preventDefault();
                applyZoom(1);
                return;
            }

            // Zoom + / - (support both main keyboard and numpad, shift required for '+')
            if (e.key === '+' || (e.key === '=' && e.shiftKey)) {
                e.preventDefault();
                applyZoom(zoom + 0.25);
                return;
            }
            if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                applyZoom(zoom - 0.25);
                return;
            }
            // Brush size , and .
            if (e.key === ',') {
                e.preventDefault();
                setBrushSize((s) => Math.max(1, s - 4));
                return;
            }
            if (e.key === '.') {
                e.preventDefault();
                setBrushSize((s) => Math.min(400, s + 4));
                return;
            }
            // Tools: s=draw, d=pan, e=erase
            if (e.key === 's' || e.key === 'S') { e.preventDefault(); setMode('draw'); return; }
            if (e.key === 'd' || e.key === 'D') { e.preventDefault(); setMode('pan'); return; }
            if (e.key === 'e' || e.key === 'E') { e.preventDefault(); setMode('erase'); return; }
            // Polygon mode shortcuts
            if (e.key === 'p' || e.key === 'P') { e.preventDefault(); setMode('polygon'); return; }
            if (mode === 'polygon') {
                if (e.key === 'Enter') { e.preventDefault(); completePolygon(); return; }
                if (e.key === 'Escape') { e.preventDefault(); cancelPolygon(); return; }
                if (e.key === 'Backspace') { e.preventDefault(); setPolyPoints((pts) => pts.slice(0, -1)); return; }
            }
            // Undo: u or Cmd/Ctrl+Z
            if (e.key === 'u' || e.key === 'U' || ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z'))) {
                e.preventDefault();
                handleUndo();
                return;
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [showInpaintModal, zoom, mode, completePolygon, cancelPolygon]);

    if (!showInpaintModal) return null;
    if (!initImage) return null;

    return (
        <div
            className="modal-overlay"
            onClick={close}
            style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', zIndex: 20000, padding: 0 }}
        >
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ position: 'relative', width: '100vw', height: '100vh', maxWidth: '100vw', maxHeight: '100vh', borderRadius: 0, paddingTop: toolbarHeight }}
            >
                {/* Toolbar */}
                {(!isMobile) && (
                    <div ref={toolbarRef}
                        style={{
                            position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', zIndex: 2
                        }}
                    >
                        {/* Brush size: - [n] + (restyled) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
                            <button className="btn btn-secondary" title="Smaller brush" onClick={() => setBrushSize((s) => Math.max(1, s - 4))} type="button">
                                <i className="fa fa-minus"></i>
                            </button>
                            <span
                                onClick={() => { setShowBrushMenu((v) => !v); setShowZoomMenu(false); }}
                                style={ui.closedBtn(64, 15)}
                                title="Click to choose brush size"
                            >
                                {brushSize}
                            </span>
                            {showBrushMenu && (
                                <div
                                    style={ui.popover(1)}
                                    onMouseLeave={() => setShowBrushMenu(false)}
                                >
                                    {[8,12,16,24,32,40,48,64,80,96,128,160,200,240,300,400].map(v => (
                                        <button
                                            key={v}
                                            className="btn"
                                            style={ui.optionBtn(brushSize===v, 15)}
                                            onClick={() => { setBrushSize(v); setShowBrushMenu(false); }}
                                            type="button"
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <button className="btn btn-secondary" title="Larger brush" onClick={() => setBrushSize((s) => Math.min(400, s + 4))} type="button">
                                <i className="fa fa-plus"></i>
                            </button>
                        </div>

                        {/* Zoom: - [n] + (restyled) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
                            <button className="btn btn-secondary" title="Zoom out" onClick={() => applyZoom(zoom - 0.25)} type="button">
                                <i className="fa fa-search-minus"></i>
                            </button>
                            <span
                                onClick={() => { setShowZoomMenu((v) => !v); setShowBrushMenu(false); }}
                                style={ui.closedBtn(68, 15)}
                                title="Click to choose zoom"
                            >
                                {Math.round(zoom * 100)}%
                            </span>
                            {showZoomMenu && (
                                <div
                                    style={ui.popover(1)}
                                    onMouseLeave={() => setShowZoomMenu(false)}
                                >
                                    {[25,50,75,100,125,150,200,300,400].map(p => (
                                        <button
                                            key={p}
                                            className="btn"
                                            style={ui.optionBtn(Math.round(zoom*100)===p, 15)}
                                            onClick={() => { applyZoom(p/100); setShowZoomMenu(false); }}
                                            type="button"
                                        >
                                            {p}%
                                        </button>
                                    ))}
                                </div>
                            )}
                            <button className="btn btn-secondary" title="Zoom in" onClick={() => applyZoom(zoom + 0.25)} type="button">
                                <i className="fa fa-search-plus"></i>
                            </button>
                        </div>

                        {/* spacer */}
                        <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

                        {/* Draw / Erase / Drag */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button
                                className={`btn btn-secondary ${mode === 'draw' ? 'active' : ''}`}
                                style={mode === 'draw' ? { borderBottom: '3px solid var(--accent)' } : { borderBottom: '3px solid transparent' }}
                                title="Draw"
                                onClick={() => { setPolyPoints([]); setMode('draw'); }}
                                type="button"
                            >
                                <i className="fa fa-paint-brush"></i>
                            </button>
                            <button
                                className={`btn btn-secondary ${mode === 'erase' ? 'active' : ''}`}
                                style={mode === 'erase' ? { borderBottom: '3px solid var(--accent)' } : { borderBottom: '3px solid transparent' }}
                                title="Erase"
                                onClick={() => { setPolyPoints([]); setMode('erase'); }}
                                type="button"
                            >
                                <i className="fa fa-eraser"></i>
                            </button>
                            <button
                                className={`btn btn-secondary ${mode === 'polygon' ? 'active' : ''}`}
                                style={mode === 'polygon' ? { borderBottom: '3px solid var(--accent)' } : { borderBottom: '3px solid transparent' }}
                                title="Polygon Tool (click to create points, double-click/Enter to apply)"
                                onClick={() => setMode('polygon')}
                                type="button"
                            >
                                <i className="fa fa-puzzle-piece"></i>
                            </button>
                            <button
                                className={`btn btn-secondary ${mode === 'pan' ? 'active' : ''}`}
                                style={mode === 'pan' ? { borderBottom: '3px solid var(--accent)' } : { borderBottom: '3px solid transparent' }}
                                title="Drag/Pan"
                                onClick={() => { setPolyPoints([]); setMode('pan'); }}
                                type="button"
                            >
                                <i className="fa fa-hand-paper-o"></i>
                            </button>
                        </div>

                        {/* spacer */}
                        <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

                        {/* Toggle Tint (show full brightness) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button
                                className={`btn btn-secondary ${!showTint ? 'active' : ''}`}
                                style={!showTint ? { borderBottom: '3px solid var(--accent)' } : { borderBottom: '3px solid transparent' }}
                                title={showTint ? 'Show image at full brightness' : 'Dim image with tint'}
                                onClick={() => setShowTint((v) => !v)}
                                type="button"
                            >
                                <i className="fa fa-sun-o"></i>
                            </button>
                        </div>

                        {/* Polygon actions (visible when building polygon) */}
                        {mode === 'polygon' && polyPoints.length >= 1 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button className="btn btn-secondary" title="Undo last point" onClick={() => setPolyPoints((pts) => pts.slice(0, -1))} type="button">
                                    <i className="fa fa-step-backward"></i>
                                </button>
                                <button className="btn btn-secondary" title="Cancel polygon" onClick={cancelPolygon} type="button">
                                    <i className="fa fa-ban"></i>
                                </button>
                                <button className="btn btn-secondary" disabled={polyPoints.length < 3} title="Complete polygon" onClick={completePolygon} type="button">
                                    <i className="fa fa-check-square-o"></i>
                                </button>
                            </div>
                        )}

                        {/* Undo / Reset on desktop */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button className="btn btn-secondary" title="Undo" onClick={handleUndo} type="button">
                                <i className="fa fa-undo"></i>
                            </button>
                            <button className="btn btn-secondary" title="Reset" onClick={handleReset} type="button">
                                <i className="fa fa-refresh"></i>
                            </button>
                        </div>

                        {/* grow */}
                        <div style={{ flex: 1 }} />

                        {/* Close / Save */}
                        <button className="btn btn-secondary" onClick={close} type="button" title="Close">
                            <i className="fa fa-times"></i>
                        </button>
                        <button className="btn btn-primary" onClick={handleSave} type="button" title="Save Mask">
                            <i className="fa fa-check"></i>
                        </button>
                    </div>
                )}

                {/* Mobile toolbars */}
                {isMobile && isPortrait && (
                    <div ref={toolbarRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '8px 10px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', zIndex: 2 }}>
                        {/* Line 1: Brush and Zoom selectors (large tappable numbers, single-column dropdown, no icons) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                            <div style={{ position: 'relative' }}>
                                <span
                                    onClick={() => { setShowBrushMenu((v) => !v); setShowZoomMenu(false); }}
                                    style={ui.closedBtn(64, 18)}
                                    title="Tap to choose brush size"
                                >
                                    {brushSize}
                                </span>
                                {showBrushMenu && (
                                    <div style={ui.popover(1)} onMouseLeave={() => setShowBrushMenu(false)}>
                                        {[8,12,16,24,32,40,48,64,80,96,128,160,200,240,300,400].map(v => (
                                            <button key={v} className="btn" style={ui.optionBtn(brushSize===v, 18)} onClick={() => { setBrushSize(v); setShowBrushMenu(false); }} type="button">{v}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div style={{ position: 'relative' }}>
                                <span
                                    onClick={() => { setShowZoomMenu((v) => !v); setShowBrushMenu(false); }}
                                    style={ui.closedBtn(76, 18)}
                                    title="Tap to choose zoom"
                                >
                                    {Math.round(zoom * 100)}%
                                </span>
                                {showZoomMenu && (
                                    <div style={ui.popover(1)} onMouseLeave={() => setShowZoomMenu(false)}>
                                        {[25,50,75,100,125,150,200,300,400].map(p => (
                                            <button key={p} className="btn" style={ui.optionBtn(Math.round(zoom*100)===p, 18)} onClick={() => { applyZoom(p/100); setShowZoomMenu(false); }} type="button">{p}%</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Line 2: Tools */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <button className={`btn btn-secondary ${mode === 'draw' ? 'active' : ''}`} style={mode === 'draw' ? { borderBottom: '3px solid var(--accent)' } : { borderBottom: '3px solid transparent' }} title="Draw" onClick={() => { setPolyPoints([]); setMode('draw'); }} type="button"><i className="fa fa-paint-brush"></i></button>
                            <button className={`btn btn-secondary ${mode === 'erase' ? 'active' : ''}`} style={mode === 'erase' ? { borderBottom: '3px solid var(--accent)' } : { borderBottom: '3px solid transparent' }} title="Erase" onClick={() => { setPolyPoints([]); setMode('erase'); }} type="button"><i className="fa fa-eraser"></i></button>
                            <button className={`btn btn-secondary ${mode === 'polygon' ? 'active' : ''}`} style={mode === 'polygon' ? { borderBottom: '3px solid var(--accent)' } : { borderBottom: '3px solid transparent' }} title="Polygon" onClick={() => setMode('polygon')} type="button"><i className="fa fa-puzzle-piece"></i></button>
                            <button className={`btn btn-secondary ${mode === 'pan' ? 'active' : ''}`} style={mode === 'pan' ? { borderBottom: '3px solid var(--accent)' } : { borderBottom: '3px solid transparent' }} title="Pan" onClick={() => { setPolyPoints([]); setMode('pan'); }} type="button"><i className="fa fa-hand-paper-o"></i></button>
                            {/* Toggle Tint (full brightness) */}
                            <button
                                className={`btn btn-secondary ${!showTint ? 'active' : ''}`}
                                style={!showTint ? { borderBottom: '3px solid var(--accent)' } : { borderBottom: '3px solid transparent' }}
                                title={showTint ? 'Show image at full brightness' : 'Dim image with tint'}
                                onClick={() => setShowTint((v) => !v)}
                                type="button"
                            >
                                <i className="fa fa-sun-o"></i>
                            </button>
                        </div>
                    </div>
                )}

                {isMobile && !isPortrait && (
                    <>
                        {/* Left sidebar: Brush, Zoom, Tools */}
                        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 76, padding: 8, borderRight: '1px solid var(--border)', background: 'var(--bg-secondary)', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
                            <div style={{ position: 'relative' }}>
                                <span onClick={() => { setShowBrushMenu((v) => !v); setShowZoomMenu(false); }} style={{ ...ui.closedBtn(64, 16), width: '100%', justifyContent: 'center' }} title="Tap to choose brush size">{brushSize}</span>
                                {showBrushMenu && (
                                    <div style={{ ...ui.popover(1), left: 0 }} onMouseLeave={() => setShowBrushMenu(false)}>
                                        {[8,12,16,24,32,40,48,64,80,96,128,160,200,240,300,400].map(v => (
                                            <button key={v} className="btn" style={ui.optionBtn(brushSize===v, 18)} onClick={() => { setBrushSize(v); setShowBrushMenu(false); }} type="button">{v}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div style={{ position: 'relative' }}>
                                <span onClick={() => { setShowZoomMenu((v) => !v); setShowBrushMenu(false); }} style={{ ...ui.closedBtn(64, 16), width: '100%', justifyContent: 'center' }} title="Tap to choose zoom">{Math.round(zoom * 100)}%</span>
                                {showZoomMenu && (
                                    <div style={{ ...ui.popover(1), left: 0 }} onMouseLeave={() => setShowZoomMenu(false)}>
                                        {[25,50,75,100,125,150,200,300,400].map(p => (
                                            <button key={p} className="btn" style={ui.optionBtn(Math.round(zoom*100)===p, 18)} onClick={() => { applyZoom(p/100); setShowZoomMenu(false); }} type="button">{p}%</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                                <button className={`btn btn-secondary ${mode === 'draw' ? 'active' : ''}`} style={mode === 'draw' ? { borderBottom: '3px solid var(--accent)' } : { borderBottom: '3px solid transparent' }} title="Draw" onClick={() => { setPolyPoints([]); setMode('draw'); }} type="button"><i className="fa fa-paint-brush"></i></button>
                                <button className={`btn btn-secondary ${mode === 'erase' ? 'active' : ''}`} style={mode === 'erase' ? { borderBottom: '3px solid var(--accent)' } : { borderBottom: '3px solid transparent' }} title="Erase" onClick={() => { setPolyPoints([]); setMode('erase'); }} type="button"><i className="fa fa-eraser"></i></button>
                                <button className={`btn btn-secondary ${mode === 'polygon' ? 'active' : ''}`} style={mode === 'polygon' ? { borderBottom: '3px solid var(--accent)' } : { borderBottom: '3px solid transparent' }} title="Polygon" onClick={() => setMode('polygon')} type="button"><i className="fa fa-puzzle-piece"></i></button>
                                <button className={`btn btn-secondary ${mode === 'pan' ? 'active' : ''}`} style={mode === 'pan' ? { borderBottom: '3px solid var(--accent)' } : { borderBottom: '3px solid transparent' }} title="Pan" onClick={() => { setPolyPoints([]); setMode('pan'); }} type="button"><i className="fa fa-hand-paper-o"></i></button>
                                {/* Toggle Tint (full brightness) */}
                                <button
                                    className={`btn btn-secondary ${!showTint ? 'active' : ''}`}
                                    style={!showTint ? { borderBottom: '3px solid var(--accent)' } : { borderBottom: '3px solid transparent' }}
                                    title={showTint ? 'Show image at full brightness' : 'Dim image with tint'}
                                    onClick={() => setShowTint((v) => !v)}
                                    type="button"
                                >
                                    <i className="fa fa-sun-o"></i>
                                </button>
                            </div>
                        </div>
                        {/* Right sidebar: Undo, Reset, Cancel, Save */}
                        <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 76, padding: 8, borderLeft: '1px solid var(--border)', background: 'var(--bg-secondary)', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                            <button className="btn btn-secondary" title="Undo" onClick={handleUndo} type="button"><i className="fa fa-undo"></i></button>
                            <button className="btn btn-secondary" title="Reset" onClick={handleReset} type="button"><i className="fa fa-refresh"></i></button>
                            <div style={{ flex: 1 }} />
                            <button className="btn btn-secondary" onClick={close} type="button" title="Cancel"><i className="fa fa-times"></i></button>
                            <button className="btn btn-primary" onClick={handleSave} type="button" title="Save Mask"><i className="fa fa-check"></i></button>
                        </div>
                    </>
                )}

                {/* Canvas area */}
                <div
                    ref={containerRef}
                    style={{ position: 'absolute', top: (isMobile && !isPortrait) ? 0 : toolbarHeight, bottom: isMobile && isPortrait ? 64 : 0, left: (isMobile && !isPortrait) ? 76 : 0, right: (isMobile && !isPortrait) ? 76 : 0, overflow: 'auto', cursor: (mode === 'pan' || isPanning) ? 'grabbing' : 'crosshair', userSelect: 'none', display: 'grid', placeItems: 'center', padding: 0, overscrollBehavior: 'contain', WebkitOverflowScrolling: 'auto' }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={() => { setIsPanning(false); stopDraw(); }}
                    onMouseLeave={handleMouseLeave}
                    onContextMenu={(e) => {
                        if (mode === 'polygon') {
                            e.preventDefault();
                            setPolyPoints((pts) => pts.slice(0, -1));
                        } else {
                            e.preventDefault();
                        }
                    }}
                    onDoubleClick={(e) => { if (mode === 'polygon') { e.preventDefault(); completePolygon(); } }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <div ref={stageRef} style={{ position: 'relative' }}>
                        <img
                            ref={imgRef}
                            src={initImage}
                            alt="Init"
                            style={{ width: '100%', height: 'auto', display: 'block', userSelect: 'none', pointerEvents: 'none' }}
                            onLoad={setupCanvas}
                        />
                        <canvas
                            ref={canvasRef}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: 'auto',
                                touchAction: 'none',
                                // Mask canvas used for data and dim overlay
                                opacity: showTint ? 0.5 : 0,
                                mixBlendMode: 'normal',
                                filter: 'none',
                            }}
                        />
                        <canvas
                            ref={displayCanvasRef}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: 'auto',
                                touchAction: 'none',
                                opacity: showTint ? 0 : DISPLAY_OPACITY,
                                pointerEvents: 'none'
                            }}
                        />
                        {/* Polygon preview overlay */}
                        {mode === 'polygon' && polyPoints.length > 0 && (
                            <svg
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 'auto', pointerEvents: 'none' }}
                                viewBox={`0 0 ${imgSize.w} ${imgSize.h}`}
                                preserveAspectRatio="none"
                            >
                                {/* lines */}
                                <polyline
                                    points={polyPoints.map(p => `${p.x},${p.y}`).join(' ')}
                                    fill="none"
                                    stroke="var(--accent)"
                                    strokeWidth={2 / (baseScale * zoom)}
                                />
                                {/* points */}
                                {polyPoints.map((p, idx) => (
                                    <circle key={idx} cx={p.x} cy={p.y} r={4 / (baseScale * zoom)} fill="var(--accent)" />
                                ))}
                            </svg>
                        )}
                        {/* Brush cursor overlay */}
                        {cursorPos.visible && mode !== 'pan' && mode !== 'polygon' && (
                            <div
                                style={{
                                    position: 'absolute',
                                    left: cursorPos.x - (brushSize * scale) / 2,
                                    top: cursorPos.y - (brushSize * scale) / 2,
                                    width: brushSize * scale,
                                    height: brushSize * scale,
                                    borderRadius: '50%',
                                    border: `2px dashed ${mode === 'erase' ? '#ff6b6b' : '#4cd137'}`,
                                    pointerEvents: 'none',
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* Mobile Portrait Bottom Bar: Undo, Reset, Cancel, Save */}
                {isMobile && isPortrait && (
                    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 10px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', zIndex: 2 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-secondary" title="Undo" onClick={handleUndo} type="button"><i className="fa fa-undo"></i></button>
                            <button className="btn btn-secondary" title="Reset" onClick={handleReset} type="button"><i className="fa fa-refresh"></i></button>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-secondary" onClick={close} type="button" title="Cancel"><i className="fa fa-times"></i></button>
                            <button className="btn btn-primary" onClick={handleSave} type="button" title="Save Mask"><i className="fa fa-check"></i></button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
