# Molecules

Molecules are groups of atoms bonded together to form relatively simple UI components that have a specific purpose.

## Examples
- Search bar (input + button)
- Form field (label + input + error message)
- Card header (avatar + title + action button)
- Navigation item (icon + label)

## Guidelines
- Molecules combine 2+ atoms to create a functional unit
- They should serve a single, clear purpose
- Can maintain their own simple state
- Should still be fairly generic and reusable

## File Structure
```
molecules/
├── SearchBar/
│   ├── SearchBar.js
│   ├── SearchBar.stories.js
│   └── SearchBar.module.css (optional)
└── FormField/
    ├── FormField.js
    └── FormField.stories.js
```
