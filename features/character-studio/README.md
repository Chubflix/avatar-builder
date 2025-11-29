# Chubflix Character Studio: Feature & UI Specification

## App Purpose
A mobile-first character generator UI for Chubflix, inspired by Netflix’s aesthetic. Users design AI-generated character portraits by visually arranging pose skeletons and prompt regions, then submitting to a proxy/Stable Diffusion backend.

---

## Core Features

- **Netflix-inspired dark theme with bold red accents and large, simple navigation**
- **Visual character pose skeleton**:
    - 17 adjustable OpenPose keypoints (nose, eyes, shoulders, elbows, wrists, hips, knees, ankles)
    - Interactive: tap joints to drag, swipe to switch between preset poses
- **Region system for prompt partitioning**:
    - Overlapping, draggable/resizable regions for Hair, Face, Body, Background
    - Each region: colored dashed border, emoji indicator, and overlap warning badge where applicable
- **Emoji/quick prompt chips**:
    - Tapping chips appends fixed phrases to region prompt
- **Zone-specific & global LoRA selectors**
    - "Anime", "Realistic Skin v2", etc., with per-region toggles and adjustable weights (slider)
- **Debug overlay toggle**:
    - Shows joint/region labels and highlights overlap areas live
- **Pose gallery**:
    - Horizontal scrolling, “card” interface with pose emojis/names (Standing, Warrior, Sitting, etc.)
- **Sticky Generate Character button**:
    - Shows proxy payload summary (for development)
- **No keyboard popups required for basic flow**
    - Tapping region and emoji/LoRA chips is sufficient for most use

---

## Layout

- **Header**: Chubflix logo, “Character Studio” subtitle
- **Main Canvas**: Occupies top half; white skeleton and colored regions over dark background; toggle controls (🦴, 📐, 🔍) at top right of canvas
- **Pose gallery**: Horizontal scroll below canvas
- **Region editor list**: Expands/collapses for each region; shows emoji, tags, prompt, LoRAs, weight
- **Sticky bottom bar**: [🚀 Generate Character] button

---

## Interaction Sketch

1. User lands on home, sees default “Standing” skeleton and four colored regions
2. Taps a pose card (“🧍”, “⚔️”, etc.) to change skeleton
3. Taps a region (“Face”)—region card expands below with emoji, prompt, LoRA chips
4. Taps emoji/quick prompt chips—prompt in card updates live
5. Toggles LoRA chips/sliders
6. (Optional) Uses debug mode: joint/region names, overlap visualized
7. Taps Generate—sees payload summary (“pending → preparing-controlnet → generating…”)

---

## Technical Notes

- All skeleton and region data normalized to [0,1] for canvas resizing
- Changing region, pose, or LoRA selection updates preview instantly
- Output is single JSON describing: pose keypoints, regions (prompt, bounds, LoRAs), and any global styles

---

## Musts for AI

- Keep everything tappable, visually bold, minimal text input
- All “state” (pose, regions, LoRAs, chips) is JSON serializable on “Generate”
- Make region/LoRA quick pickers animated & mobile-friendly; keyboard only for advanced input
- Animate transitions (e.g., pose change, region select)
