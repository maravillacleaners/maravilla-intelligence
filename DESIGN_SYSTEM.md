# Maravilla Intelligence Design System

## Overview

Professional, modern design system for the Maravilla Intelligence Platform built on light-theme with the brand's iconic blue color palette.

## Color Palette

### Primary Colors
- **Primary Blue**: `#0F3DFF` - Main brand color (logo color)
- **Primary Light**: `#E7EDFF` - Light background for primary actions
- **Primary Dark**: `#0B2BB8` - Dark hover state

### Secondary Colors
- **Secondary Purple**: `#612BF2` - Accent and secondary actions
- **Secondary Light**: `#F3EBFE` - Light background

### Accent Colors
- **Cyan**: `#00C7DE` - Tertiary accent
- **Cyan Light**: `#E0F8FB` - Light background

### Semantic Colors
- **Success (Emerald)**: `#10B981`
- **Error (Red)**: `#EF4444`
- **Warning (Amber)**: `#F59E0B`
- **Info (Blue)**: `#3B82F6`

### Neutral Colors
- **White**: `#FFFFFF`
- **Gray 50-900**: Full grayscale from `#F9FAFB` to `#111827`

## Typography

### Font Family
- **Primary**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
- **Monospace**: `ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace`

### Font Sizes
- **xs**: 0.75rem (12px)
- **sm**: 0.875rem (14px)
- **base**: 1rem (16px)
- **lg**: 1.125rem (18px)
- **xl**: 1.25rem (20px)
- **2xl**: 1.5rem (24px)
- **3xl**: 1.875rem (30px)
- **4xl**: 2.25rem (36px)

### Font Weights
- **Light**: 300
- **Normal**: 400
- **Medium**: 500
- **Semibold**: 600
- **Bold**: 700

## Component Styles

### Buttons

#### Primary Button
```html
<button class="btn-primary">Action</button>
```
- Background: Primary Blue
- Text: White
- Hover: Primary Dark
- Active: Scale 0.98

#### Secondary Button
```html
<button class="btn-secondary">Cancel</button>
```
- Background: Gray 200
- Text: Gray 900
- Hover: Gray 300

### Cards
```html
<div class="card">
  <h3>Card Title</h3>
  <p>Card content</p>
</div>
```
- Background: White
- Border: 1px solid Gray 200
- Border Radius: 0.75rem
- Shadow: Subtle elevation
- Hover: Enhanced shadow

### Inputs
```html
<input type="text" class="form-input" placeholder="Enter text..." />
```
- Border: Gray 300
- Focus: Blue border + light ring
- Placeholder: Gray 500
- Radius: 0.5rem

## Layout System

### Spacing Scale
- **xs**: 0.25rem (4px)
- **sm**: 0.5rem (8px)
- **md**: 1rem (16px)
- **lg**: 1.5rem (24px)
- **xl**: 2rem (32px)
- **2xl**: 2.5rem (40px)
- **3xl**: 3rem (48px)

### Border Radius
- **sm**: 0.375rem
- **md**: 0.5rem
- **lg**: 0.75rem
- **xl**: 1rem
- **2xl**: 1.25rem
- **full**: 9999px (circle)

## Navigation

### Sidebar Navigation
- **Width**: 256px (16rem)
- **Theme**: White background
- **Border**: 1px solid Gray 200
- **Collapse**: Responsive on mobile

### Top Navigation Bar
- **Height**: 73px
- **Theme**: White background
- **Shadow**: Subtle
- **Sticky**: Fixed at top

## Icons

Uses emoji icons throughout the interface for:
- Navigation items
- Action buttons
- Status indicators
- Section headers

## Responsive Design

### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Layout Adjustments
- Sidebar collapses to mobile menu on < 1024px
- Grid columns: 2 on mobile, 3-4 on desktop
- Padding: 1.5rem on mobile, 2rem on desktop

## Animations & Transitions

### Duration
- **Fast**: 150ms
- **Base**: 200ms
- **Slow**: 300ms

### Easing
- **Default**: ease-in-out

### Common Animations
- Fade In: opacity 200ms
- Slide In: transform + opacity 200ms
- Scale on Active: scale(0.98) on button click
- Shadow on Hover: Enhanced elevation

## Accessibility

### Focus States
- **Focus Visible**: 2px solid border + 2px offset
- **Color**: Primary Blue `#0F3DFF`

### Contrast
- Text on White: Gray 900 (WCAG AAA)
- Text on Primary: White (WCAG AAA)
- Disabled: Gray 400 (WCAG AA minimum)

### Interactive Elements
- Minimum tap target: 44px × 44px
- Focus indicators always visible
- Sufficient color contrast maintained

## Dark Mode (Future)

The design system is prepared for future dark mode support:
- All colors use CSS variables
- Can be toggled via `prefers-color-scheme`
- Shadows adjust for dark backgrounds

## Usage Examples

### Creating a Card Section
```jsx
<div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md p-8">
  <h2 className="text-2xl font-bold text-gray-900 mb-6">Section Title</h2>
  {/* Content */}
</div>
```

### Button Variants
```jsx
// Primary
<button className="btn-primary">Save</button>

// Secondary
<button className="btn-secondary">Cancel</button>

// Link-style
<a href="#" className="text-blue-600 hover:text-blue-700 font-medium">Learn more</a>
```

### Form Input
```jsx
<input
  type="text"
  placeholder="Enter value..."
  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
/>
```

## Files

- `lib/design-system.ts` - Design tokens and styles
- `app/globals.css` - Global CSS and Tailwind directives
- `app/components/Navigation.tsx` - Navigation component
- `app/layout.tsx` - Root layout with navigation

## Updates

When updating the design system:
1. Update colors in `design-system.ts` and `globals.css`
2. Update component styles in relevant `.tsx` files
3. Update CSS classes in `globals.css`
4. Test on mobile, tablet, and desktop
5. Verify accessibility (contrast, focus states)
6. Update this documentation

## Support

For design system questions or improvements, refer to the main SETUP_GUIDE.md or contact the development team.
