'use client';

import React, {useState, useRef, useEffect} from 'react';
import {useApp} from '../context/AppContext';
import './CharacterStudioModal.css';
import {calculateRegions} from "@/app/utils/mask-calculator";

// OpenPose keypoint definitions (17 keypoints)
const KEYPOINT_NAMES = [
    'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
    'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
    'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
];

// Skeleton connections (bone lines)
const SKELETON_CONNECTIONS = [
    [0, 1], [0, 2], [1, 3], [2, 4], // Face
    [0, 5], [0, 6], // Neck to shoulders
    [5, 6], // Shoulders
    [5, 7], [7, 9], // Left arm
    [6, 8], [8, 10], // Right arm
    [5, 11], [6, 12], // Shoulders to hips
    [11, 12], // Hips
    [11, 13], [13, 15], // Left leg
    [12, 14], [14, 16] // Right leg
];

// Preset poses (normalized coordinates 0-1)
const PRESET_POSES = {
    standing: {
        name: 'Standing',
        emoji: '🧍',
        keypoints: [
            [0.5, 0.15], // nose
            [0.48, 0.14], [0.52, 0.14], // eyes
            [0.46, 0.14], [0.54, 0.14], // ears
            [0.42, 0.28], [0.58, 0.28], // shoulders
            [0.38, 0.45], [0.62, 0.45], // elbows
            [0.35, 0.60], [0.65, 0.60], // wrists
            [0.44, 0.55], [0.56, 0.55], // hips
            [0.43, 0.75], [0.57, 0.75], // knees
            [0.42, 0.95], [0.58, 0.95] // ankles
        ]
    },
    warrior: {
        name: 'Warrior',
        emoji: '⚔️',
        keypoints: [
            [0.5, 0.12], // nose
            [0.48, 0.11], [0.52, 0.11], // eyes
            [0.46, 0.11], [0.54, 0.11], // ears
            [0.40, 0.25], [0.60, 0.25], // shoulders
            [0.35, 0.30], [0.68, 0.18], // elbows (raised right arm)
            [0.32, 0.48], [0.75, 0.12], // wrists (sword raised)
            [0.42, 0.52], [0.58, 0.52], // hips
            [0.40, 0.72], [0.60, 0.72], // knees
            [0.38, 0.92], [0.62, 0.92] // ankles
        ]
    },
    sitting: {
        name: 'Sitting',
        emoji: '🪑',
        keypoints: [
            [0.5, 0.20], // nose
            [0.48, 0.19], [0.52, 0.19], // eyes
            [0.46, 0.19], [0.54, 0.19], // ears
            [0.42, 0.32], [0.58, 0.32], // shoulders
            [0.38, 0.48], [0.62, 0.48], // elbows
            [0.35, 0.62], [0.65, 0.62], // wrists
            [0.44, 0.58], [0.56, 0.58], // hips
            [0.40, 0.75], [0.60, 0.75], // knees (bent)
            [0.38, 0.82], [0.62, 0.82] // ankles
        ]
    },
    dancing: {
        name: 'Dancing',
        emoji: '💃',
        keypoints: [
            [0.5, 0.13], // nose
            [0.48, 0.12], [0.52, 0.12], // eyes
            [0.46, 0.12], [0.54, 0.12], // ears
            [0.38, 0.26], [0.62, 0.26], // shoulders
            [0.30, 0.22], [0.70, 0.40], // elbows (arms up)
            [0.25, 0.15], [0.72, 0.55], // wrists
            [0.42, 0.54], [0.58, 0.54], // hips
            [0.40, 0.73], [0.62, 0.70], // knees (asymmetric)
            [0.38, 0.93], [0.65, 0.88] // ankles
        ]
    },
    running: {
        name: 'Running',
        emoji: '🏃',
        keypoints: [
            [0.5, 0.14], // nose (leaning forward)
            [0.48, 0.13], [0.52, 0.13], // eyes
            [0.46, 0.13], [0.54, 0.13], // ears
            [0.42, 0.27], [0.58, 0.27], // shoulders
            [0.50, 0.40], [0.58, 0.18], // elbows (arms pumping)
            [0.55, 0.52], [0.60, 0.12], // wrists
            [0.44, 0.54], [0.56, 0.54], // hips
            [0.38, 0.70], [0.60, 0.78], // knees (running stride)
            [0.32, 0.85], [0.62, 0.95] // ankles
        ]
    }
};

// Regional prompting zone metadata (prompts, tags, etc.)
const REGION_METADATA = {
    background: {
        id: 'background',
        name: 'Background',
        emoji: '🌄',
        defaultPrompt: 'scenic landscape, detailed background',
        tags: ['outdoor', 'indoor', 'nature', 'city']
    },
    body: {
        id: 'body',
        name: 'Body',
        emoji: '👕',
        defaultPrompt: 'detailed clothing, fabric texture',
        tags: ['armor', 'dress', 'casual', 'formal']
    },
    face: {
        id: 'face',
        name: 'Face',
        emoji: '😊',
        defaultPrompt: 'detailed face, beautiful eyes, clear skin',
        tags: ['smiling', 'serious', 'cute', 'elegant']
    },
    hair: {
        id: 'hair',
        name: 'Hair',
        emoji: '💇',
        defaultPrompt: 'flowing hair, detailed strands',
        tags: ['long', 'short', 'wavy', 'straight']
    }
};

// Sample LoRA options
const LORA_OPTIONS = [
    {name: 'Anime Style', value: 'anime_v3'},
    {name: 'Realistic Skin v2', value: 'realistic_skin_v2'},
    {name: 'Detailed Eyes', value: 'detailed_eyes'},
    {name: 'Epic Lighting', value: 'epic_lighting'}
];

// Calculate bounding boxes from pose keypoints
function calculateRegionsFromPose(keypoints, width, height) {
    // keypoints = [[x,y], [x,y], ...] normalized 0-1

    const [nose, leftEye, rightEye, leftEar, rightEar, lShoulder, rShoulder, lElbow, rElbow, lWrist, rWrist, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle] = keypoints;

    const {
        left_upper_arm,
        left_forearm,
        right_upper_arm,
        right_forearm,
        left_upper_leg,
        left_lower_leg,
        right_upper_leg,
        right_lower_leg
    } = calculateRegions(keypoints, width, height)

    // Calculate region bounds with padding
    const regions = {
        hair: {
            // Head top (expanded upward from face)
            x: Math.min(leftEar[0], rightEar[0]) - 0.08,
            y: Math.min(leftEye[1], rightEye[1]) - 0.15,  // Above eyes
            w: Math.max(leftEar[0], rightEar[0]) - Math.min(leftEar[0], rightEar[0]) + 0.16,
            h: 0.20,
            color: '#FFD700'
        },

        face: {
            // Eyes to chin
            x: Math.min(leftEye[0], rightEye[0]) - 0.05,
            y: Math.min(leftEye[1], rightEye[1]) - 0.02,
            w: Math.max(rightEye[0], rightEar[0]) - Math.min(leftEye[0], leftEar[0]) + 0.10,
            h: 0.15,
            color: '#4A90E2'
        },

        // Separate body sub-regions (non-overlapping)
        body: {
            x: Math.min(lShoulder[0], rShoulder[0]) - 0.08,
            y: Math.min(lShoulder[1], rShoulder[1]),
            w: Math.max(rShoulder[0], rHip[0]) - Math.min(lShoulder[0], lHip[0]) + 0.16,
            h: Math.max(lHip[1], rHip[1]) - Math.min(lShoulder[1], rShoulder[1]) + 0.10,
            color: '#FF6B6B'
        },

        left_upper_arm,
        left_forearm,
        right_upper_arm,
        right_forearm,

        left_upper_leg,
        left_lower_leg,
        right_upper_leg,
        right_lower_leg,

        background: {
            x: 0, y: 0, w: 1.0, h: 1.0,
            color: '#95A5A6'
        }
    };

    // Convert normalized to pixel coords
    Object.keys(regions).forEach(key => {
        const r = regions[key];
        r.x_px = Math.round(r.x * width);
        r.y_px = Math.round(r.y * height);
        r.w_px = Math.round(r.w * width);
        r.h_px = Math.round(r.h * height);
    });

    return regions;
}

function CharacterStudioModal() {
    const {state, dispatch, actions} = useApp();
    const canvasRef = useRef(null);
    const [selectedPose, setSelectedPose] = useState('standing');
    const [showSkeleton, setShowSkeleton] = useState(true);
    const [showRegions, setShowRegions] = useState(true);
    const [showDebug, setShowDebug] = useState(false);
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [regions, setRegions] = useState({});
    const [regionPrompts, setRegionPrompts] = useState(
        Object.keys(REGION_METADATA).reduce((acc, key) => ({
            ...acc,
            [key]: REGION_METADATA[key].defaultPrompt
        }), {})
    );
    const [regionLoras, setRegionLoras] = useState(
        Object.keys(REGION_METADATA).reduce((acc, key) => ({...acc, [key]: {}}), {})
    );

    // Update regions when pose changes
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const pose = PRESET_POSES[selectedPose];
        if (!pose) return;

        const calculatedRegions = calculateRegionsFromPose(
            pose.keypoints,
            canvas.width,
            canvas.height
        );

        setRegions(calculatedRegions);
    }, [selectedPose]);

    // Draw canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        const pose = PRESET_POSES[selectedPose];
        if (!pose) return;

        // Draw regions
        if (showRegions && Object.keys(regions).length > 0) {
            Object.entries(regions).forEach(([key, region]) => {
                if (region.angle !== undefined) {
                    ctx.save();
                    ctx.translate(region.centerX, region.centerY);
                    ctx.rotate(region.angle * Math.PI / 180);

                    ctx.fillStyle = "#FF6B6B";
                    ctx.setLineDash([8, 4]);
                    ctx.strokeRect(
                        -(region.length / 2),
                        -(region.thickness / 2),
                        region.length,
                        region.thickness
                    );
                    ctx.setLineDash([]);
                    ctx.restore();
                    return;
                }
                const x = region.x_px;
                const y = region.y_px;
                const w = region.w_px;
                const h = region.h_px;

                ctx.strokeStyle = region.color || "#4A90E2";
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 4]);
                ctx.strokeRect(x, y, w, h);
                ctx.setLineDash([]);

                // Region label
                if (showDebug) {
                    const metadata = REGION_METADATA[key];
                    ctx.fillStyle = region.color || "#4A90E2";
                    ctx.font = '12px sans-serif';
                    ctx.fillText(metadata?.name || key, x + 5, y + 15);
                }
            });
        }

        // Draw skeleton
        if (showSkeleton) {
            // Draw bone connections
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#E50914';
            ctx.shadowBlur = 8;

            SKELETON_CONNECTIONS.forEach(([start, end]) => {
                const [x1, y1] = pose.keypoints[start];
                const [x2, y2] = pose.keypoints[end];
                ctx.beginPath();
                ctx.moveTo(x1 * width, y1 * height);
                ctx.lineTo(x2 * width, y2 * height);
                ctx.stroke();
            });

            ctx.shadowBlur = 0;

            // Draw joints
            pose.keypoints.forEach(([x, y], index) => {
                const px = x * width;
                const py = y * height;

                ctx.fillStyle = '#E50914';
                ctx.beginPath();
                ctx.arc(px, py, 6, 0, Math.PI * 2);
                ctx.fill();

                // Joint labels in debug mode
                if (showDebug) {
                    ctx.fillStyle = '#fff';
                    ctx.font = '10px monospace';
                    ctx.fillText(KEYPOINT_NAMES[index], px + 8, py - 8);
                }
            });
        }
    }, [selectedPose, showSkeleton, showRegions, showDebug, regions]);

    const handleClose = () => {
        dispatch({type: actions.SET_SHOW_CHARACTER_STUDIO, payload: false});
    };

    const handlePoseSelect = (poseKey) => {
        setSelectedPose(poseKey);
    };

    const handleTagClick = (regionId, tag) => {
        setRegionPrompts(prev => ({
            ...prev,
            [regionId]: prev[regionId] ? `${prev[regionId]}, ${tag}` : tag
        }));
    };

    const handleLoraToggle = (regionId, loraValue) => {
        setRegionLoras(prev => ({
            ...prev,
            [regionId]: {
                ...prev[regionId],
                [loraValue]: prev[regionId]?.[loraValue] ? undefined : 0.7 // Default weight 0.7
            }
        }));
    };

    const handleLoraWeightChange = (regionId, loraValue, weight) => {
        setRegionLoras(prev => ({
            ...prev,
            [regionId]: {
                ...prev[regionId],
                [loraValue]: weight
            }
        }));
    };

    const handleExportPose = () => {
        const keypoints = PRESET_POSES[selectedPose].keypoints;

        // Convert to COCO/OpenPose format
        // Each keypoint becomes [x*512, y*512, confidence=1.0]
        const pose_keypoints_2d = keypoints.flatMap(([x, y]) => [x * 512, y * 512, 1.0]);

        const poseData = {
            people: [{
                pose_keypoints_2d: pose_keypoints_2d
            }],
            canvas_width: 512,
            canvas_height: 512,
        };

        // Create a blob and download
        const blob = new Blob([JSON.stringify(poseData, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pose-${selectedPose}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleGenerate = () => {
        const payload = {
            pose: selectedPose,
            keypoints: PRESET_POSES[selectedPose].keypoints,
            regions: Object.entries(regions).map(([key, region]) => {
                const metadata = REGION_METADATA[key];
                return {
                    id: key,
                    name: metadata?.name || key,
                    prompt: regionPrompts[key] || metadata?.defaultPrompt || '',
                    bounds: {
                        x: region.x,
                        y: region.y,
                        width: region.w,
                        height: region.h
                    },
                    bounds_px: {
                        x: region.x_px,
                        y: region.y_px,
                        width: region.w_px,
                        height: region.h_px
                    },
                    loras: Object.entries(regionLoras[key] || {})
                        .filter(([_, weight]) => weight !== undefined)
                        .map(([value, weight]) => ({value, weight}))
                };
            })
        };

        console.log('Character Studio Payload:', payload);
        // TODO: Integrate with actual generation API
    };

    if (!state.showCharacterStudio) return null;

    return (
        <div className="character-studio-overlay" onClick={handleClose}>
            <div className="character-studio-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="cs-header">
                    <button className="cs-close-btn" onClick={handleClose} title="Close">
                        <i className="fa fa-times"></i>
                    </button>
                </div>

                {/* Canvas */}
                <div className="cs-canvas-container">
                    <canvas
                        ref={canvasRef}
                        width={400}
                        height={600}
                        className="cs-canvas"
                    />
                    <div className="cs-canvas-controls">
                        <button
                            className={`cs-control-btn ${showSkeleton ? 'active' : ''}`}
                            onClick={() => setShowSkeleton(!showSkeleton)}
                            title="Toggle Skeleton"
                        >
                            🦴
                        </button>
                        <button
                            className={`cs-control-btn ${showRegions ? 'active' : ''}`}
                            onClick={() => setShowRegions(!showRegions)}
                            title="Toggle Regions"
                        >
                            📐
                        </button>
                        <button
                            className={`cs-control-btn ${showDebug ? 'active' : ''}`}
                            onClick={() => setShowDebug(!showDebug)}
                            title="Toggle Debug"
                        >
                            🔍
                        </button>
                    </div>
                </div>

                {/* Pose Gallery */}
                <div className="cs-pose-gallery-container">
                    <h3>Poses</h3>
                    <div className="cs-pose-gallery">
                        {Object.entries(PRESET_POSES).map(([key, pose]) => (
                            <div
                                key={key}
                                className={`cs-pose-card ${selectedPose === key ? 'active' : ''}`}
                                onClick={() => handlePoseSelect(key)}
                            >
                                <div className="cs-pose-emoji">{pose.emoji}</div>
                                <div className="cs-pose-name">{pose.name}</div>
                                {selectedPose === key && (
                                    <div className="cs-pose-checkmark">✓</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Region Editor */}
                <div className="cs-region-editor">
                    <h3>Regional Prompts</h3>
                    {Object.entries(REGION_METADATA).map(([key, metadata]) => (
                        <div key={key} className="cs-region-item">
                            <div
                                className="cs-region-header"
                                onClick={() => setSelectedRegion(selectedRegion === key ? null : key)}
                            >
                                <div className="cs-region-title">
                                    <span className="cs-region-emoji">{metadata.emoji}</span>
                                    <span className="cs-region-name">{metadata.name}</span>
                                    <span
                                        className="cs-region-indicator"
                                        style={{backgroundColor: regions[key]?.color || '#666'}}
                                    ></span>
                                </div>
                                <i className={`fa fa-chevron-${selectedRegion === key ? 'up' : 'down'}`}></i>
                            </div>

                            {selectedRegion === key && (
                                <div className="cs-region-content">
                                    {/* Tags */}
                                    <div className="cs-tags">
                                        {metadata.tags.map(tag => (
                                            <button
                                                key={tag}
                                                className="cs-tag-chip"
                                                onClick={() => handleTagClick(key, tag)}
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Prompt */}
                                    <textarea
                                        className="cs-prompt-input"
                                        placeholder={metadata.defaultPrompt}
                                        value={regionPrompts[key] || ''}
                                        onChange={(e) => setRegionPrompts(prev => ({
                                            ...prev,
                                            [key]: e.target.value
                                        }))}
                                        rows={2}
                                    />

                                    {/* LoRAs */}
                                    <div className="cs-lora-section">
                                        <div className="cs-lora-label">LoRAs</div>
                                        <div className="cs-lora-chips">
                                            {LORA_OPTIONS.map(lora => {
                                                const isActive = regionLoras[key]?.[lora.value] !== undefined;
                                                const weight = regionLoras[key]?.[lora.value] || 0.7;

                                                return (
                                                    <div key={lora.value} className="cs-lora-item">
                                                        <button
                                                            className={`cs-lora-chip ${isActive ? 'active' : ''}`}
                                                            onClick={() => handleLoraToggle(key, lora.value)}
                                                        >
                                                            {lora.name}
                                                        </button>
                                                        {isActive && (
                                                            <div className="cs-lora-weight">
                                                                <input
                                                                    type="range"
                                                                    min="0"
                                                                    max="1"
                                                                    step="0.1"
                                                                    value={weight}
                                                                    onChange={(e) => handleLoraWeightChange(
                                                                        key,
                                                                        lora.value,
                                                                        parseFloat(e.target.value)
                                                                    )}
                                                                />
                                                                <span
                                                                    className="cs-lora-weight-value">{weight.toFixed(1)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer Buttons */}
                <div className="cs-footer">
                    <button className="cs-export-btn" onClick={handleExportPose}>
                        <i className="fa fa-download"></i>
                        EXPORT POSE
                    </button>
                    <button className="cs-generate-btn" onClick={handleGenerate}>
                        <i className="fa fa-magic"></i>
                        GENERATE CHARACTER
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CharacterStudioModal;
