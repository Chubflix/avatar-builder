'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';

/**
 * InpaintModal
 * Simple canvas painter to create a white-on-black mask over the init image.
 */
export default function InpaintModal() {
    const { state, dispatch, actions } = useApp();
    const { showInpaintModal, initImage, maskImage } = state;

    const imgRef = useRef(null);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const stageRef = useRef(null);
    const [brushSize, setBrushSize] = useState(40);
    const [isErasing, setIsErasing] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [scale, setScale] = useState(1); // effective scale = baseScale * zoom
    const [baseScale, setBaseScale] = useState(1);
    const [zoom, setZoom] = useState(1);
    const [cursorPos, setCursorPos] = useState({ x: -1000, y: -1000, visible: false });
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

    // Initialize canvas when image loads
    useEffect(() => {
        if (!showInpaintModal) return;
        // reset drawing state each time modal opens
        setIsErasing(false);
        setIsDrawing(false);
        setZoom(1);
    }, [showInpaintModal]);

    const close = () => dispatch({ type: actions.SET_SHOW_INPAINT_MODAL, payload: false });

    const setupCanvas = () => {
        const img = imgRef.current;
        const canvas = canvasRef.current;
        if (!img || !canvas) return;

        const w = img.naturalWidth;
        const h = img.naturalHeight;
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        // Start with black mask (preserve all)
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);

        // If there is existing maskImage, draw it onto canvas
        if (maskImage) {
            const maskImg = new Image();
            maskImg.onload = () => {
                ctx.drawImage(maskImg, 0, 0, w, h);
            };
            maskImg.src = maskImage;
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
        setIsDrawing(true);
        draw(clientX, clientY);
    };

    const stopDraw = () => setIsDrawing(false);

    const draw = (clientX, clientY) => {
        if (!isDrawing) return;
        const { x, y } = getPos(clientX, clientY);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = isErasing ? '#000' : '#fff';
        ctx.fill();
    };

    const handleMouseDown = (e) => {
        if (e.button === 1 || e.button === 2) {
            // Middle or right click to pan
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
        draw(e.clientX, e.clientY);
    };
    const handleMouseUp = () => stopDraw();
    const handleMouseLeave = () => {
        setCursorPos((p) => ({ ...p, visible: false }));
        setIsPanning(false);
        stopDraw();
    };

    const handleTouchStart = (e) => {
        const t = e.touches[0];
        startDraw(t.clientX, t.clientY);
    };
    const handleTouchMove = (e) => {
        const t = e.touches[0];
        draw(t.clientX, t.clientY);
    };
    const handleTouchEnd = () => stopDraw();

    // Zoom helpers
    const applyZoom = (z) => {
        const newZoom = Math.max(0.25, Math.min(4, z));
        setZoom(newZoom);
        const img = imgRef.current;
        if (!img || !stageRef.current) return;
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const s = baseScale || 1;
        setScale(s * newZoom);
        stageRef.current.style.width = `${w * s * newZoom}px`;
        stageRef.current.style.height = `${h * s * newZoom}px`;
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const data = canvas.toDataURL('image/png');
        dispatch({ type: actions.SET_MASK_IMAGE, payload: data });
        close();
    };

    const handleReset = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    if (!showInpaintModal) return null;
    if (!initImage) return null;

    return (
        <div className="modal-overlay" onClick={close}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh' }}>
                <h3>Inpaint Mask</h3>
                <div className="form-group" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <label className="form-label" style={{ margin: 0 }}>Brush Size</label>
                    <input
                        type="range"
                        min={4}
                        max={200}
                        step={1}
                        value={brushSize}
                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                        style={{ flex: 1 }}
                    />
                    <span style={{ width: 40, textAlign: 'right' }}>{brushSize}</span>
                    <button className="btn btn-secondary" onClick={() => setIsErasing(!isErasing)} type="button">
                        <i className={`fa ${isErasing ? 'fa-paint-brush' : 'fa-eraser'}`}></i> {isErasing ? 'Paint' : 'Erase'}
                    </button>
                    <button className="btn btn-secondary" onClick={handleReset} type="button">
                        <i className="fa fa-refresh"></i> Reset
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <label className="form-label" style={{ margin: 0 }}>Zoom</label>
                        <button className="btn btn-secondary" type="button" onClick={() => applyZoom(zoom - 0.25)} title="Zoom out">-</button>
                        <input
                            type="range"
                            min={0.25}
                            max={4}
                            step={0.05}
                            value={zoom}
                            onChange={(e) => applyZoom(parseFloat(e.target.value))}
                            style={{ width: 140 }}
                        />
                        <button className="btn btn-secondary" type="button" onClick={() => applyZoom(zoom + 0.25)} title="Zoom in">+</button>
                        <span style={{ width: 48, textAlign: 'right' }}>{Math.round(zoom * 100)}%</span>
                    </div>
                </div>

                <div
                    ref={containerRef}
                    style={{ position: 'relative', width: '100%', height: 'auto', overflow: 'auto', maxHeight: '70vh', cursor: isPanning ? 'grabbing' : 'crosshair' }}
                    onMouseUp={() => setIsPanning(false)}
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
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 'auto', touchAction: 'none', opacity: 0.5 }}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseLeave}
                            onContextMenu={(e) => e.preventDefault()}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                        />
                        {/* Brush cursor overlay */}
                        {cursorPos.visible && (
                            <div
                                style={{
                                    position: 'absolute',
                                    left: cursorPos.x - (brushSize * scale) / 2,
                                    top: cursorPos.y - (brushSize * scale) / 2,
                                    width: brushSize * scale,
                                    height: brushSize * scale,
                                    borderRadius: '50%',
                                    border: `2px dashed ${isErasing ? '#ff6b6b' : '#4cd137'}`,
                                    pointerEvents: 'none',
                                }}
                            />
                        )}
                    </div>
                </div>

                <div className="modal-actions">
                    <button className="btn-reset" onClick={close}>
                        Cancel
                    </button>
                    <button className="btn-generate" onClick={handleSave}>
                        Save Mask
                    </button>
                </div>
                <p className="settings-hint" style={{ marginTop: 8 }}>
                    Tip: Paint the areas you want the model to modify. White = change, Black = keep.
                </p>
            </div>
        </div>
    );
}
