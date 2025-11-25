# Atoms

Atoms are the smallest building blocks of your UI. They are basic HTML elements or simple components that can't be broken down further without losing their meaning.

## Examples
- Buttons
- Inputs
- Labels
- Icons
- Badges
- Spinners

## Guidelines
- Atoms should be highly reusable
- They should not depend on other components
- They typically accept simple props (text, color, size, etc.)
- They should be stateless when possible

## File Structure
```
atoms/
├── Button/
│   ├── Button.js
│   ├── Button.stories.js
│   └── Button.module.css (optional)
└── Input/
    ├── Input.js
    └── Input.stories.js
```
