# DESIGN FILE:
https://ppl-ai-code-interpreter-files.s3.amazonaws.com/web/direct-files/9a2daa911f085dd60022a15519d86678/c8767a0c-363c-4efd-b183-f27e2b9fe622/ff357c78.html?utm_source=perplexity

# DESIGN DESCRIPTION:

## Key Features

**Visual Skeleton (OpenPose):**
- **White bone lines** connecting 17 joints with glowing red shadow effect
- **Red circular joints** at each keypoint (nose, eyes, shoulders, elbows, wrists, hips, knees, ankles)
- Real-time skeleton updates when switching poses
- Toggle visibility with 🦴 button

**Interactive Canvas Controls:**
- **🦴 Skeleton** - Show/hide pose skeleton (active by default)
- **📐 Regions** - Show/hide regional prompt zones (active by default)
- **🔍 Debug** - Show joint labels + overlap zones

**Netflix-Style Design:**
- Dark theme (#000/#141414 backgrounds)
- **CHUBFLIX** logo with red gradient (matching Netflix aesthetic)
- Horizontal scrolling pose gallery with selection checkmarks
- Smooth transitions and hover effects
- Sticky generate button at bottom

**Pose System:**
- **Standing** (default) - Straight arms down
- **Warrior** - Action pose with raised sword arm
- Click any pose card to see skeleton animate to new position
- Each pose has 17 keypoints stored as normalized coordinates

**Regional Prompting:**
- 4 overlapping regions (Hair/Face/Body/Background)
- Dashed colored borders matching your design
- Overlap badge shows "⚠️ Overlaps Face 23%"
- Each region card expands to show LoRA chips

**Debug Mode:**
- Shows joint names next to each keypoint
- Highlights overlap zones in yellow
- Perfect for troubleshooting region boundaries
