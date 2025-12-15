# Tailwind CSS v4 Configuration Notes

## Important: Custom Theme Variables

**Tailwind v4 uses a completely different theming system than v3!**

### ❌ Don't use (v3 style):
```css
@layer base {
  :root {
    --color-primary: #F59E0B;
  }
}
```

### ✅ Do use (v4 style):
```css
@theme {
  --color-primary: #F59E0B;
}
```

## Key Differences

1. **@theme directive**: Tailwind v4 requires the `@theme` directive to register custom design tokens
2. **No tailwind.config.js for colors**: While you CAN extend in the config, the `@theme` directive in CSS is the recommended approach
3. **Automatic utility generation**: Once defined in `@theme`, utilities like `bg-primary`, `text-primary` are automatically generated

## Our Custom Design Tokens

Located in `src/index.css`:

```css
@theme {
  /* Colors */
  --color-background: #0A0A0F;
  --color-background-alt: #12121A;
  --color-surface: #1A1A24;
  --color-muted: #24242E;
  --color-primary: #F59E0B;
  --color-primary-light: #FBBF24;
  --color-primary-dark: #D97706;
  --color-positive: #10B981;
  --color-negative: #EF4444;
  --color-text-primary: #F9FAFB;
  --color-text-secondary: #9CA3AF;
  --color-text-tertiary: #6B7280;
  --color-border: rgba(255, 255, 255, 0.08);
  --color-border-strong: rgba(255, 255, 255, 0.12);

  /* Shadows */
  --shadow-glow-sm: 0 0 10px rgba(245, 158, 11, 0.2);
  --shadow-glow-md: 0 0 20px rgba(245, 158, 11, 0.4);
  --shadow-glow-lg: 0 0 30px rgba(245, 158, 11, 0.6);

  /* Fonts */
  --font-display: 'Space Grotesk', system-ui, sans-serif;
}
```

## Usage in Components

Once defined in `@theme`, use them like standard Tailwind utilities:

```tsx
<div className="bg-background text-text-primary border-border">
  <h1 className="text-primary font-display">Hello</h1>
  <button className="bg-primary hover:shadow-glow-md">Click me</button>
</div>
```

## Why This Matters

- **v3 → v4 migration**: If you try to use `@layer base` for custom colors, they won't generate utilities
- **Config vs CSS**: The `tailwind.config.js` `extend` object is mainly for non-color customizations in v4
- **PostCSS plugin**: We use `@tailwindcss/postcss` (not the v3 `tailwindcss` plugin)

## References

- [Tailwind v4 Beta Docs](https://tailwindcss.com/docs/v4-beta)
- Project using: `tailwindcss@^4.1.18`
