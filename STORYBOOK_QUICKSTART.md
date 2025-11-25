# Storybook Quick Start Guide

## What Was Set Up

Your Avatar Builder project now has a complete component library setup with:

- ✅ **Storybook 10.0.8** - Component development environment
- ✅ **Atomic Design Structure** - Organized component hierarchy (atoms/molecules/organisms/templates)
- ✅ **Example Components** - Button atom and SearchBar molecule with stories
- ✅ **Viewport Addon** - Test responsive behavior across devices
- ✅ **Accessibility Addon** - Built-in a11y testing
- ✅ **Auto-documentation** - Props tables and component docs generated automatically

## Getting Started

### 1. Launch Storybook

```bash
npm run storybook
```

Storybook will open at http://localhost:6006

### 2. Explore Example Components

Navigate to:
- **Design System > Atoms > Button** - See 8 button variations
- **Design System > Molecules > SearchBar** - Interactive search component

### 3. Test Features

**Controls Panel** (bottom)
- Change props in real-time
- See how components react to different inputs
- Test edge cases

**Viewport Addon** (top toolbar)
- Click the viewport icon
- Test Mobile (375px), Tablet (768px), Desktop (1440px)

**Accessibility** (bottom tabs)
- Click "Accessibility" tab
- See violations and warnings
- Fix issues before they reach production

## Component Structure

```
app/design-system/
├── atoms/              # Basic UI elements
│   └── Button/
│       ├── Button.js         # Component
│       ├── Button.css        # Styles
│       ├── Button.stories.js # Stories
│       └── index.js          # Export
├── molecules/          # Combined atoms
│   └── SearchBar/
│       ├── SearchBar.js
│       ├── SearchBar.css
│       ├── SearchBar.stories.js
│       └── index.js
├── organisms/          # Complex components (future)
├── templates/          # Page layouts (future)
└── README.md           # Full documentation
```

## Creating Your First Component

### Example: Badge Atom

```bash
# 1. Create directory
mkdir -p app/design-system/atoms/Badge

# 2. Create files
touch app/design-system/atoms/Badge/Badge.js
touch app/design-system/atoms/Badge/Badge.css
touch app/design-system/atoms/Badge/Badge.stories.js
touch app/design-system/atoms/Badge/index.js
```

**Badge.js**
```javascript
'use client';

import React from 'react';
import './Badge.css';

export const Badge = ({
  children,
  variant = 'default',
  size = 'medium',
  ...props
}) => {
  return (
    <span
      className={`ds-badge ds-badge--${variant} ds-badge--${size}`}
      {...props}
    >
      {children}
    </span>
  );
};
```

**Badge.css**
```css
.ds-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.ds-badge--default {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.ds-badge--success {
  background: #28a745;
  color: white;
}

.ds-badge--small {
  padding: 0.125rem 0.5rem;
  font-size: 0.625rem;
}

.ds-badge--medium {
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
}
```

**Badge.stories.js**
```javascript
import { Badge } from './Badge';

export default {
  title: 'Design System/Atoms/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'success', 'warning', 'danger'],
    },
    size: {
      control: 'select',
      options: ['small', 'medium'],
    },
  },
};

export const Default = {
  args: {
    children: 'New',
  },
};

export const Success = {
  args: {
    children: 'Active',
    variant: 'success',
  },
};

export const Small = {
  args: {
    children: 'Small',
    size: 'small',
  },
};
```

**index.js**
```javascript
export { Badge } from './Badge';
```

### Result
Your new Badge component will automatically appear in Storybook under "Design System > Atoms > Badge"!

## Component Hierarchy Guide

### When to Create an Atom
- Basic HTML element wrapper (button, input, label)
- No dependencies on other components
- Highly reusable across the app

**Examples**: Button, Input, Icon, Badge, Spinner

### When to Create a Molecule
- Combines 2-3 atoms
- Serves a single, clear purpose
- Still fairly generic

**Examples**: SearchBar (input + icon), FormField (label + input + error), Card

### When to Create an Organism
- Complex multi-part component
- Combines many molecules/atoms
- Often business-specific

**Examples**: Navigation, ImageGallery, SettingsPanel

### When to Create a Template
- Page-level layout structure
- Arranges organisms into a layout
- No actual content/data

**Examples**: DashboardLayout, SettingsPageTemplate

## Using Components in Your App

```javascript
// In your Next.js pages or components
import { Button } from '@/app/design-system/atoms/Button';
import { SearchBar } from '@/app/design-system/molecules/SearchBar';

function MyPage() {
  return (
    <div>
      <SearchBar placeholder="Search..." />
      <Button variant="primary">Click Me</Button>
    </div>
  );
}
```

## Best Practices

### ✅ Do
- Test components in Storybook before using them
- Create stories for all states (default, loading, error, empty)
- Use the accessibility addon to catch issues early
- Prefix all CSS classes with `ds-` (design system)
- Keep components focused and single-purpose

### ❌ Don't
- Don't skip creating stories - they're your documentation
- Don't use inline styles - use CSS files
- Don't couple components to Redux or app state
- Don't create generic "Utils" or "Common" folders

## Commands Reference

```bash
# Development
npm run dev              # Start Next.js dev server
npm run storybook        # Start Storybook

# Building
npm run build            # Build Next.js app
npm run build-storybook  # Build static Storybook

# Testing
npm run lint             # Run ESLint
```

## Next Steps

1. **Explore the examples** - Check out Button and SearchBar
2. **Read the full docs** - See `app/design-system/README.md`
3. **Create your first component** - Start with a simple atom
4. **Extract from existing code** - Identify reusable patterns
5. **Build systematically** - Atoms → Molecules → Organisms

## Resources

- Full Documentation: `app/design-system/README.md`
- Atomic Design: https://atomicdesign.bradfrost.com/
- Storybook Docs: https://storybook.js.org/docs
- Accessibility: https://storybook.js.org/addons/@storybook/addon-a11y

## Troubleshooting

### Storybook won't start
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run storybook
```

### Components not showing up
- Check that your `.stories.js` file follows the naming convention
- Verify the file is in `app/design-system/` directory
- Check `.storybook/main.js` stories paths

### Styles not loading
- Make sure you're importing the CSS file in your component
- Check that `globals.css` is imported in `.storybook/preview.js`
- Verify CSS class names match between component and CSS file

Need help? Check the full docs in `app/design-system/README.md`
