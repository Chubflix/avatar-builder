# Avatar Builder Design System

This design system follows the **Atomic Design Methodology** to create a scalable, maintainable component library.

## Table of Contents
- [What is Atomic Design?](#what-is-atomic-design)
- [Folder Structure](#folder-structure)
- [Component Hierarchy](#component-hierarchy)
- [Getting Started](#getting-started)
- [Using Storybook](#using-storybook)
- [Creating New Components](#creating-new-components)
- [Best Practices](#best-practices)

## What is Atomic Design?

Atomic Design is a methodology for creating design systems. It breaks down components into five distinct levels:

1. **Atoms**: The smallest building blocks (buttons, inputs, labels)
2. **Molecules**: Simple groups of atoms (search bar, form field)
3. **Organisms**: Complex components made of molecules and atoms (header, sidebar)
4. **Templates**: Page-level layouts without content
5. **Pages**: Actual pages with real content (in Next.js, these live in `/app`)

## Folder Structure

```
app/design-system/
├── atoms/           # Basic building blocks
│   ├── Button/
│   │   ├── Button.js
│   │   ├── Button.css
│   │   ├── Button.stories.js
│   │   └── index.js
│   └── README.md
├── molecules/       # Simple component groups
│   ├── SearchBar/
│   │   ├── SearchBar.js
│   │   ├── SearchBar.css
│   │   ├── SearchBar.stories.js
│   │   └── index.js
│   └── README.md
├── organisms/       # Complex UI sections
│   └── README.md
├── templates/       # Page layouts
│   └── README.md
└── README.md
```

## Component Hierarchy

### Atoms (`/atoms`)
- **Purpose**: Fundamental UI elements
- **Examples**: Button, Input, Label, Icon, Badge
- **Characteristics**:
  - Cannot be broken down further
  - Highly reusable
  - No dependencies on other components
  - Usually stateless

### Molecules (`/molecules`)
- **Purpose**: Simple combinations of atoms
- **Examples**: SearchBar (input + icon + button), FormField (label + input + error)
- **Characteristics**:
  - Combine 2+ atoms
  - Serve a single purpose
  - Still fairly generic
  - May have simple state

### Organisms (`/organisms`)
- **Purpose**: Complex, multi-part components
- **Examples**: Navigation, Image Gallery, Settings Panel
- **Characteristics**:
  - Combine molecules and atoms
  - Often tied to business logic
  - Can have complex state
  - Self-contained units

### Templates (`/templates`)
- **Purpose**: Page-level structures
- **Examples**: Dashboard Layout, Settings Layout
- **Characteristics**:
  - Focus on layout and structure
  - No actual content/data
  - Show arrangement of organisms
  - Used as skeletons for pages

## Getting Started

### Running Storybook

```bash
npm run storybook
```

This will start Storybook on http://localhost:6006

### Building Storybook

```bash
npm run build-storybook
```

This creates a static build in `storybook-static/` for deployment.

## Using Storybook

### Viewing Components
1. Run `npm run storybook`
2. Browse components in the left sidebar
3. Use the controls panel to interact with props
4. Test different viewports (mobile, tablet, desktop)
5. Check accessibility with the a11y addon

### Storybook Addons Included
- **Controls**: Dynamically change component props
- **Actions**: View event handler callbacks
- **Viewport**: Test responsive behavior
- **Accessibility (a11y)**: Check for accessibility issues
- **Docs**: Auto-generated documentation

## Creating New Components

### Step 1: Choose the Right Level
Ask yourself:
- Is it a basic element? → **Atom**
- Does it combine 2-3 atoms? → **Molecule**
- Is it complex with multiple parts? → **Organism**
- Is it a page layout? → **Template**

### Step 2: Create Component Structure

```bash
# Example: Creating a new Button atom
mkdir -p app/design-system/atoms/Badge
cd app/design-system/atoms/Badge
touch Badge.js Badge.css Badge.stories.js index.js
```

### Step 3: Write the Component

**Badge.js**
```javascript
'use client';

import React from 'react';
import './Badge.css';

export const Badge = ({ children, variant = 'default', ...props }) => {
  return (
    <span className={`ds-badge ds-badge--${variant}`} {...props}>
      {children}
    </span>
  );
};
```

### Step 4: Create the Story

**Badge.stories.js**
```javascript
import { Badge } from './Badge';

export default {
  title: 'Design System/Atoms/Badge',
  component: Badge,
  tags: ['autodocs'],
};

export const Default = {
  args: {
    children: 'New',
  },
};
```

### Step 5: Export the Component

**index.js**
```javascript
export { Badge } from './Badge';
```

## Best Practices

### 1. Component Design
- Keep components focused on a single responsibility
- Use meaningful prop names
- Provide sensible defaults
- Support common use cases out of the box

### 2. Naming Conventions
- Use PascalCase for component names: `Button`, `SearchBar`
- Use camelCase for prop names: `variant`, `isDisabled`
- Prefix all CSS classes with `ds-`: `.ds-button`, `.ds-search-bar`

### 3. Props
- Always destructure props with defaults
- Use PropTypes or TypeScript for type checking
- Document props in the story's `argTypes`

### 4. Styling
- Use CSS files (not inline styles) for better organization
- Use CSS custom properties for theming
- Follow the existing design patterns (Chubflix theme)
- Support both light and dark modes where applicable

### 5. Stories
- Create multiple stories showing different states
- Use the `argTypes` to enable interactive controls
- Add descriptions and documentation
- Test edge cases (empty state, loading, error)

### 6. Accessibility
- Use semantic HTML
- Include ARIA labels where needed
- Ensure keyboard navigation works
- Test with the a11y addon
- Support screen readers

### 7. Documentation
- Write clear component descriptions
- Document all props and their types
- Provide usage examples
- Explain when to use vs. when not to use

## Integration with Existing Components

Your current components in `/app/components/` don't need to be moved. They can stay where they are. The design system is for:

1. **New components** being built
2. **Shared primitives** extracted from existing components
3. **Reusable patterns** identified during refactoring

Over time, you can gradually:
- Extract common UI elements into atoms (buttons, inputs)
- Identify reusable patterns and create molecules
- Refactor large components to use design system primitives

## Example Workflow

### Building a New Feature
1. Check if needed atoms exist (Button, Input, etc.)
2. If not, create them in `/atoms`
3. Combine atoms into molecules if needed
4. Build the feature organism using molecules and atoms
5. Add stories for each new component
6. Test in Storybook before integrating
7. Use the components in your actual pages

### Refactoring Existing Code
1. Identify repeated UI patterns
2. Extract them into design system components
3. Replace hardcoded elements with design system components
4. Add stories for the extracted components
5. Test thoroughly in Storybook

## Resources

- [Atomic Design Methodology](https://atomicdesign.bradfrost.com/)
- [Storybook Documentation](https://storybook.js.org/docs)
- [Component-Driven Development](https://www.componentdriven.org/)

## Commands

```bash
# Start development server
npm run dev

# Start Storybook
npm run storybook

# Build Storybook for production
npm run build-storybook

# Run linting
npm run lint
```
