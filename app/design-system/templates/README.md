# Templates

Templates are page-level structures that place organisms and molecules into a layout. They define the structure of a page but don't include actual content.

## Examples
- Dashboard layout (sidebar + header + content area)
- Settings page layout
- Two-column layout
- Modal overlay template

## Guidelines
- Templates are primarily concerned with layout
- They don't include actual data or content
- They show the structure and arrangement of organisms
- They're often used as the skeleton for actual pages

## File Structure
```
templates/
├── DashboardTemplate/
│   ├── DashboardTemplate.js
│   ├── DashboardTemplate.stories.js
│   └── DashboardTemplate.module.css (optional)
└── SettingsTemplate/
    ├── SettingsTemplate.js
    └── SettingsTemplate.stories.js
```

## Note
In Next.js, your actual pages live in `/app/page.js` and use these templates as layouts.
