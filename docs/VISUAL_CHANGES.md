# Visual Changes Guide

## Folder Navigation Tabs

### Before
```
[All Images] [Unfiled] [Character-1 5] [Character-2 3] [+]
```
- Plain text buttons
- No clear active state
- Counts in parentheses
- Edit buttons hard to see

### After
```
┌─────────────┐ ┌─────────┐ ┌───────────────────┐ ┌───────────────────┐ ┌───┐
│ All Images  │ │ Unfiled │ │ Character-1   5 ✏️ │ │ Character-2   3 ✏️ │ │ + │
└─────────────┘ └─────────┘ └───────────────────┘ └───────────────────┘ └───┘
     (active)
```
- Clear visual hierarchy
- Active state with accent color (#e50914)
- Hover states
- Count badges with subtle styling
- Easy-to-see edit icons
- Rounded corners (6px)
- Consistent spacing

## Save to Folder (Controls Panel)

### Before
```
Save to Folder [+]
┌──────────────────────────────┐
│ No folder (unfiled)          │
│ Character-1 (5)              │
│ Character-2 (3)              │
└──────────────────────────────┘
```
- Button in label
- Dropdown only

### After
```
Save to Folder
┌──────────────────────────────┐ ┌───┐
│ Unfiled                    ▼ │ │ + │
└──────────────────────────────┘ └───┘
```
- Clean side-by-side layout
- Visual consistency
- Better touch targets

## Folder Selection in Lightbox

### Before (Dropdown)
```
┌──────────────────────────────┐
│ Unfiled                    ▼ │
│ Character-1                  │
│ Character-2                  │
└──────────────────────────────┘
```
- Small dropdown
- Hard to use on mobile
- No visual feedback

### After (Modal)
```
┌────────────────────────────────────┐
│  Move to Folder                  × │
├────────────────────────────────────┤
│  📁 Unfiled                      ✓ │
│  📁 Character-1              5     │
│  📁 Character-2              3     │
└────────────────────────────────────┘
```
- Large, easy-to-tap buttons
- Clear visual feedback (checkmark)
- Folder icons
- Image counts displayed
- Professional modal design
- Click outside to close

## Folder Button States

### Inactive State
```
┌─────────────┐
│ Character-1 │
└─────────────┘
Background: #1a1a1a (bg-card)
Text: #a3a3a3 (text-secondary)
Border: #2a2a2a (border)
```

### Hover State
```
┌─────────────┐
│ Character-1 │
└─────────────┘
Background: #252525 (bg-hover)
Text: #ffffff (text-primary)
Border: #737373 (text-muted)
```

### Active State
```
┌─────────────┐
│ Character-1 │
└─────────────┘
Background: #e50914 (accent)
Text: #ffffff (text-primary)
Border: #e50914 (accent)
```

## Modal Overlay

```
████████████████████████████████████████
████████████████████████████████████████
████████  ┌────────────────┐  ███████████
████████  │                │  ███████████
████████  │  Modal Content │  ███████████
████████  │                │  ███████████
████████  └────────────────┘  ███████████
████████████████████████████████████████
████████████████████████████████████████
```
- Semi-transparent black overlay (rgba(0,0,0,0.8))
- Center-aligned modal
- Click outside to close
- Smooth fade-in animation

## Responsive Breakpoints

### Desktop (> 768px)
- Full-sized buttons and text
- Side-by-side layouts
- Hover states visible

### Mobile (≤ 768px)
- Larger tap targets (44px minimum)
- Stack layouts where appropriate
- Optimized font sizes
- Touch-friendly spacing

## Color Palette

```css
--bg-primary:     #0a0a0a (Main background)
--bg-secondary:   #141414 (Panel background)
--bg-card:        #1a1a1a (Card background)
--bg-hover:       #252525 (Hover state)
--text-primary:   #ffffff (Primary text)
--text-secondary: #a3a3a3 (Secondary text)
--text-muted:     #737373 (Muted text)
--accent:         #e50914 (Netflix red)
--accent-hover:   #f40612 (Brighter red)
--border:         #2a2a2a (Border color)
```

## Typography

- **Font Family:** Inter, -apple-system, system fonts
- **Folder Tabs:** 0.875rem (14px), weight 500
- **Folder Counts:** 0.75rem (12px), weight 400
- **Modal Headers:** 1.125rem (18px), weight 700
- **Mobile Folder Tabs:** 0.8rem (12.8px)

## Spacing System

- **Small Gap:** 0.25rem (4px)
- **Medium Gap:** 0.5rem (8px)
- **Large Gap:** 1rem (16px)
- **Button Padding:** 0.625rem 1rem (10px 16px)
- **Modal Padding:** 1.5-2rem (24-32px)

## Border Radius

- **Buttons:** 6px
- **Modals:** 8px
- **Small Elements:** 4px

## Transitions

- **Default:** all 0.2s ease
- **Smooth Fade:** opacity 0.3s ease
- **Transform:** transform 0.2s ease

## Icon Sizes

- **Folder Icons:** 1.125rem (18px)
- **Action Icons:** 0.875rem (14px)
- **Close Button:** 1.25rem (20px)
- **Chevrons:** 0.75rem (12px)
