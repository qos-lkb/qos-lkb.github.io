# Project Rules and Guidelines

This document outlines the rules, conventions, and best practices for developing and maintaining the Science Simulations project.

---

## Table of Contents

1. [File Naming Conventions](#file-naming-conventions)
2. [HTML Structure Rules](#html-structure-rules)
3. [JavaScript Coding Rules](#javascript-coding-rules)
4. [CSS and Styling Rules](#css-and-styling-rules)
5. [Content Organization Rules](#content-organization-rules)
6. [Code Quality Rules](#code-quality-rules)
7. [Performance Rules](#performance-rules)
8. [Accessibility Rules](#accessibility-rules)
9. [Git and Version Control Rules](#git-and-version-control-rules)
10. [Documentation Rules](#documentation-rules)
11. [Language and Localization Rules](#language-and-localization-rules)
12. [Testing Rules](#testing-rules)
13. [Special Rules for Physics Simulations](#special-rules-for-physics-simulations)
14. [PHP and API Development Rules](#php-and-api-development-rules)
15. [SPA Frontend Rules (`app/`)](#spa-frontend-rules-app)
16. [Worksheet and Learning Content Rules](#worksheet-and-learning-content-rules)

---

## File Naming Conventions

### HTML Files

**Rule 1.1**: Use lowercase letters and underscores for file names
- ✅ Correct: `0105_gas_laws.html`, `cell_membrane_permeability.html`
- ❌ Incorrect: `0105-Gas-Laws.html`, `CellMembranePermeability.html`

**Rule 1.2**: Physics files must follow the pattern: `{unit}{topic}_{description}.html`
- Format: `0X0Y_description.html` where:
  - `X` = Unit number (1-5)
  - `Y` = Topic number within unit
  - `description` = Brief, descriptive name in lowercase with underscores
- Examples:
  - ✅ `0101_calibration_of_thermometer.html`
  - ✅ `0202_freefall.html`
  - ✅ `e0201_photoelectric_effect.html` (for electives)

**Rule 1.3**: Elective files must include `e` prefix: `e{number}/{e}{unit}{topic}_{description}.html`
- ✅ `e02/e0201_photoelectric_effect.html`
- ✅ `e03/e0301_air-conditioner.html`

**Rule 1.4**: Other subject files use simple descriptive names
- ✅ `biology/osmosis.html`
- ✅ `chemistry/atomic_structure.html`
- ✅ `astronomy/hr_diagram.html`

**Rule 1.5**: Avoid special characters except underscores and hyphens
- ✅ Allowed: `-`, `_`
- ❌ Avoid: spaces, `@`, `#`, `$`, `%`, `&`, `*`, etc.

**Rule 1.6**: Keep file names concise but descriptive (max 50 characters recommended)

---

## HTML Structure Rules

### Document Structure

**Rule 2.1**: Every HTML file must include a proper DOCTYPE and lang attribute
```html
<!DOCTYPE html>
<html lang="en">  <!-- or "zh-Hant" for Chinese -->
```

**Rule 2.2**: Include required meta tags in `<head>`
```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Descriptive Title</title>
```

**Rule 2.3**: Use semantic HTML5 elements
- ✅ `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`
- ❌ Avoid: `<div>` for everything

**Rule 2.4**: Include Tailwind CSS via CDN in all files
```html
<script src="https://cdn.tailwindcss.com"></script>
```

**Rule 2.5**: Load external libraries in the correct order
1. Tailwind CSS (first)
2. MathJax (if needed)
3. Chart.js (if needed)
4. Three.js (if needed)
5. React/Babel (if needed)

**Rule 2.6**: Use consistent indentation (4 spaces or tabs - be consistent)
```html
<div class="container">
    <div class="content">
        <p>Text</p>
    </div>
</div>
```

**Rule 2.7**: Close all HTML tags properly
- ✅ `<div></div>`, `<p></p>`
- ❌ Self-closing tags only for void elements: `<img />`, `<br />`, `<hr />`

---

## JavaScript Coding Rules

### General Rules

**Rule 3.1**: Use modern ES6+ syntax
- ✅ Arrow functions: `const func = () => {}`
- ✅ `const`/`let` instead of `var`
- ✅ Template literals: `` `Hello ${name}` ``
- ✅ Destructuring: `const { x, y } = point`

**Rule 3.2**: Use camelCase for variables and functions
```javascript
const particleCount = 100;
function updatePhysics() {}
const calculateVelocity = () => {};
```

**Rule 3.3**: Use PascalCase for constructors/classes
```javascript
class ParticleSystem {}
const scene = new THREE.Scene();
```

**Rule 3.4**: Use descriptive variable names
- ✅ `particleVelocity`, `temperatureKelvin`, `pressurePascal`
- ❌ `v`, `t`, `p`, `x1`, `x2`

**Rule 3.5**: Comment complex physics calculations
```javascript
// Calculate RMS velocity using: v_rms = sqrt(3RT/M)
const rmsVelocity = Math.sqrt(3 * R * temperature / molarMass);
```

**Rule 3.6**: Avoid global variables when possible
- ✅ Use IIFE or module pattern
- ✅ Use `const`/`let` in function scope
- ❌ Avoid polluting global namespace

**Rule 3.7**: Use `const` by default, `let` only when reassignment is needed
```javascript
const PI = 3.14159;  // Never changes
let currentTime = 0;  // Changes over time
```

**Rule 3.8**: Handle errors gracefully
```javascript
try {
    // Risky operation
} catch (error) {
    console.error('Error:', error);
    // Fallback behavior
}
```

**Rule 3.9**: Use `requestAnimationFrame` for animations
```javascript
function animate() {
    requestAnimationFrame(animate);
    updatePhysics();
    renderer.render(scene, camera);
}
animate();
```

**Rule 3.10**: Clean up event listeners and intervals when needed
```javascript
// Store reference for cleanup
const intervalId = setInterval(update, 100);
// Later: clearInterval(intervalId);
```

---

## CSS and Styling Rules

### Tailwind CSS Usage

**Rule 4.1**: Prefer Tailwind utility classes over custom CSS
- ✅ `<div class="bg-blue-500 p-4 rounded-lg">`
- ❌ Avoid inline styles: `<div style="background: blue; padding: 1rem;">`

**Rule 4.2**: Use responsive breakpoints consistently
- `sm:` - 640px and up
- `md:` - 768px and up
- `lg:` - 1024px and up
- `xl:` - 1280px and up

**Rule 4.3**: Custom CSS should be in `<style>` tags, not inline
```html
<style>
    /* Custom slider styling */
    input[type=range]::-webkit-slider-thumb {
        /* ... */
    }
</style>
```

**Rule 4.4**: Use consistent color scheme
- Primary: Indigo (`indigo-600`, `indigo-900`)
- Secondary: Slate (`slate-800`, `slate-200`)
- Accent: Blue (`blue-500`, `blue-400`)

**Rule 4.5**: Follow mobile-first design approach
```html
<!-- Mobile styles first, then add larger breakpoints -->
<div class="p-4 md:p-6 lg:p-8">
```

**Rule 4.6**: Use semantic color names in comments
```css
/* Use color names, not just hex codes */
background: #3b82f6; /* blue-500 */
```

---

## Content Organization Rules

### Directory Structure

**Rule 5.1**: Place files in appropriate subject directories
- Physics → `physics/`
- Chemistry → `chem/`
- Biology → `biology/`
- Astronomy → `astronomy/`
- Integrated Science → `science/`

**Rule 5.2**: Physics files must be organized by curriculum units
- Unit 1 → `physics/01/`
- Unit 2 → `physics/02/`
- Elective 1 → `physics/e01/`
- Elective 2 → `physics/e02/`
- Elective 3 → `physics/e03/`

**Rule 5.3**: Register new simulations via the database / admin workflow
- Add the simulation record in **`admin/simulations.php`** (or contributor portal)
- Set subject, topic, bilingual titles, HTML path, and **published** status when ready
- Do **not** rely on `index.csv` or manual `index.html` links (legacy flows are deprecated)
- Place the HTML file in the correct subject directory before registering

**Rule 5.4**: Database-managed learning content follows the same publish workflow
- **Learning notes**, **worksheets**, **learning tools**, **articles**, **learning videos**, and **question banks** are stored in MariaDB
- Contributors save as `draft` or `pending_review`; admins publish via admin or review queue
- Use **`admin/`** or **`portal/`** editors; SPA reads published items via **`/api/v1/`**
- Self-study curriculum ordering: **`admin/course_curriculum.php`** (`topic_learning_items`)
- Teacher **courses / classes**: **`admin/courses.php`**, **`admin/course_edit.php`**; enrollment may include form class, class number, MOI (`011`–`012`)
- **Worksheet assignments**: teachers assign via admin or API; students submit at **`/app/assignments`**; grading via teacher API or admin reports

**Rule 5.5**: Do not rely on legacy CSV or static index generation for new content
- **`index.csv`** and CSV-driven **`index.php`** listing are deprecated
- Register simulations and learning items in the database only

**Rule 5.6**: Keep related files together
- Multiple versions of same simulation → same directory
- Related experiments → same unit folder

---

## Code Quality Rules

### General Quality

**Rule 6.1**: Write self-documenting code
- Clear variable names
- Logical function structure
- Minimal comments (code should explain itself)

**Rule 6.2**: Keep functions focused and small
- One function = one responsibility
- Maximum ~50 lines per function (guideline)

**Rule 6.3**: Avoid code duplication
- Extract common patterns into reusable functions
- Use consistent patterns across simulations

**Rule 6.4**: Validate user input
```javascript
if (value < min || value > max) {
    console.warn('Value out of range');
    return;
}
```

**Rule 6.5**: Use consistent formatting
- Same indentation style throughout file
- Consistent spacing around operators
- Consistent brace style

**Rule 6.6**: Remove console.log statements before committing
- ✅ Use `console.error()` for errors (keep)
- ❌ Remove `console.log()` debug statements

---

## Performance Rules

### Optimization

**Rule 7.1**: Load libraries asynchronously when possible
```html
<script id="MathJax-script" async src="..."></script>
```

**Rule 7.2**: Use `defer` for non-critical scripts
```html
<script src="..." defer></script>
```

**Rule 7.3**: Limit particle counts in Three.js simulations
- Maximum 1000 particles for smooth performance
- Use instanced rendering for many particles

**Rule 7.4**: Optimize canvas rendering
- Use `requestAnimationFrame` instead of `setInterval`
- Clear canvas properly between frames
- Limit redraws to visible areas when possible

**Rule 7.5**: Minimize DOM manipulation
- Cache DOM references
- Batch DOM updates
- Use document fragments for multiple inserts

**Rule 7.6**: Lazy load heavy resources
- Load Three.js only when 3D visualization is needed
- Load Chart.js only when graphs are displayed

**Rule 7.7**: Optimize images (if used)
- Use appropriate formats (WebP, SVG when possible)
- Compress images
- Use appropriate sizes (not oversized)

---

## Accessibility Rules

### WCAG Compliance

**Rule 8.1**: Include alt text for all images
```html
<img src="..." alt="Description of image">
```

**Rule 8.2**: Use semantic HTML elements
- ✅ `<button>` for buttons, not `<div onclick="">`
- ✅ `<nav>` for navigation
- ✅ `<main>` for main content

**Rule 8.3**: Provide ARIA labels when needed
```html
<button aria-label="Close modal">×</button>
<div role="slider" aria-label="Temperature control">
```

**Rule 8.4**: Ensure keyboard navigation works
- All interactive elements must be keyboard accessible
- Use proper focus management
- Visible focus indicators

**Rule 8.5**: Maintain sufficient color contrast
- Text contrast ratio: minimum 4.5:1
- Large text: minimum 3:1

**Rule 8.6**: Use descriptive link text
- ✅ "Learn more about gas laws"
- ❌ "Click here" or "Read more"

**Rule 8.7**: Provide text alternatives for visual information
- Charts should have text summaries
- Complex visualizations should have descriptions

---

## Git and Version Control Rules

### Commit Rules

**Rule 9.1**: Write clear, descriptive commit messages
```
✅ "Add gas laws simulation with P-V-T relationship visualization"
✅ "Fix mobile responsiveness in refraction simulation"
❌ "Update"
❌ "Fix bug"
```

**Rule 9.2**: Use conventional commit format (recommended)
```
feat: Add new simulation for electron transitions
fix: Correct calculation error in gas laws
docs: Update architecture.md with new patterns
style: Format code with consistent indentation
refactor: Extract common physics calculations
```

**Rule 9.3**: Commit related changes together
- One feature = one commit (or logical commits)
- Don't mix unrelated changes

**Rule 9.4**: Test before committing
- Verify simulation works in browser
- Check for console errors
- Test on mobile if possible

**Rule 9.5**: Don't commit sensitive information
- No API keys
- No personal data
- No credentials

**Rule 9.6**: Keep commits focused
- Small, incremental commits
- Easy to review and revert if needed

**Rule 9.7**: Update documentation when making significant changes
- Add an entry to **`change_log.md`** for user-visible features or breaking changes
- Update **`architecture.md`** for structural changes
- Update **`rule.md`** if adding new rules
- Update **`README.md`** if setup steps or main entry points change

---

## Documentation Rules

### Code Documentation

**Rule 10.1**: Document complex physics formulas
```javascript
/**
 * Calculates the ideal gas law: PV = nRT
 * @param {number} P - Pressure in Pascals
 * @param {number} V - Volume in cubic meters
 * @param {number} n - Number of moles
 * @param {number} T - Temperature in Kelvin
 * @returns {number} Gas constant R
 */
function calculateGasConstant(P, V, n, T) {
    return (P * V) / (n * T);
}
```

**Rule 10.2**: Include comments for non-obvious code
- Why, not what (code shows what)
- Explain physics concepts
- Explain workarounds or hacks

**Rule 10.3**: Keep README, architecture, and changelog updated
- Document new patterns in **`architecture.md`**
- Summarize releases in **`change_log.md`**
- Update file structure and quick-start steps in **`README.md`**
- Note breaking changes in all three when relevant

**Rule 10.4**: Document dependencies
- Note which CDN libraries are used
- Document version requirements
- Note browser compatibility

**Rule 10.5**: Include usage instructions in complex simulations
- How to interact with the simulation
- What parameters can be adjusted
- What the visualization shows

---

## Language and Localization Rules

### Bilingual Support

**Rule 11.1**: Use `data-zh` and `data-en` attributes for bilingual text
```html
<span data-zh="氣體定律" data-en="Gas Laws">Gas Laws</span>
```

**Rule 11.2**: Set appropriate `lang` attribute
- English pages: `lang="en"`
- Chinese pages: `lang="zh-Hant"`

**Rule 11.3**: Provide language toggle functionality
- Include toggle button in header
- Update all text elements when switching
- Persist language preference (localStorage)

**Rule 11.4**: Translate all user-facing text
- Button labels
- Form labels
- Error messages
- Help text

---

## Testing Rules

### Quality Assurance

**Rule 12.1**: Test in multiple browsers
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

**Rule 12.2**: Test on mobile devices
- Responsive design works
- Touch interactions work
- Performance is acceptable

**Rule 12.3**: Verify all links work
- Internal links
- External links (if any)
- Navigation links

**Rule 12.4**: Test with different screen sizes
- Mobile (320px - 640px)
- Tablet (640px - 1024px)
- Desktop (1024px+)

**Rule 12.5**: Check for console errors
- No JavaScript errors
- No 404 errors for resources
- No CORS issues

**Rule 12.6**: Verify physics calculations
- Check formulas are correct
- Verify units are consistent
- Test edge cases

---

## Special Rules for Physics Simulations

### Physics-Specific

**Rule 13.1**: Use SI units consistently
- Pressure: Pascals (Pa)
- Volume: Cubic meters (m³)
- Temperature: Kelvin (K)
- Display conversions when showing to users

**Rule 13.2**: Include physical constants accurately
```javascript
const R = 8.314; // Gas constant (J/(mol·K))
const c = 299792458; // Speed of light (m/s)
```

**Rule 13.3**: Validate physical constraints
- Temperature > 0 K
- Volume > 0
- Pressure > 0
- Mass > 0

**Rule 13.4**: Use appropriate precision
- Display: 2-4 significant figures
- Calculations: Higher precision internally

**Rule 13.5**: Document assumptions
- Ideal gas assumptions
- Negligible friction
- Point particles, etc.

---

## PHP and API Development Rules

### Scope

Applies to **`includes/`**, **`admin/`**, **`api/v1/`**, and root PHP entry points.

**Rule 14.1**: Use strict typing on new and substantially edited PHP files
```php
<?php
declare(strict_types=1);
```

**Rule 14.2**: Put reusable business logic in `includes/*_lib.php`; keep admin pages thin
- API handlers in **`api/v1/handlers/`** call lib functions; register routes in **`api/v1/router.php`**
- Do not duplicate authorization checks—use existing `require_permission()`, `api_require_*` helpers

**Rule 14.3**: Schema changes only via numbered SQL in **`migrations/`**
- Apply migrations in order (`001` … `018` and beyond)
- Do not use foreign keys unless the project already does so for that table; maintain relations in application code when that is the established pattern

**Rule 14.4**: Mutating HTTP requests require CSRF
- Web forms: hidden `csrf` field + `verify_csrf()`
- API: header **`X-CSRF-Token`** or JSON body `csrf`

**Rule 14.5**: Match existing response and error patterns
- REST: `api_json_ok()` / `api_json_error()` from **`api_response.php`**
- Admin flash messages and redirects follow neighbouring admin pages

**Rule 14.6**: Timezone and bilingual fields
- Store/display times in **`Asia/Hong_Kong`**
- User-facing strings: provide **`_zh`** and **`_en`** columns or attributes where the schema supports them

---

## SPA Frontend Rules (`app/`)

**Rule 15.1**: No bundler—add scripts to **`app/index.html`** in dependency order
- Use IIFE or `global` pattern consistent with existing modules (`router.js`, `api.js`, …)
- New routes: register in **`app.js`** via `AppRouter.register()`; add path handling in **`router.js`** if needed

**Rule 15.2**: All API calls go through **`api.js`** (`apiFetch`)
- Include CSRF token on POST/PUT/DELETE
- Handle `401` / `403` with login redirect where existing pages do

**Rule 15.3**: Render untrusted Markdown/HTML through **DOMPurify**
- Use **`markdown.js`** and **`content-embeds.js`** for worksheets and notes
- Do not use `innerHTML` with raw server content without sanitization

**Rule 15.4**: Simulations in SPA use the API iframe endpoint
- **`GET /api/v1/simulations/{slug}/html`** inside a sandboxed iframe
- Do not hard-code filesystem paths to simulation HTML in client code

**Rule 15.5**: Bilingual UI
- Use `AppRouter.t('中文', 'English')` or `data-zh` / `data-en` attributes
- Persist language via existing `localStorage` keys used in **`router.js`**

**Rule 15.6**: Track learning events consistently
- Page views: hook through **`learning-tracker.js`** after route dispatch when applicable
- Do not bypass existing SDL event batching without good reason

---

## Worksheet and Learning Content Rules

**Rule 16.1**: Worksheet body is Markdown with optional embed directives (one per line)
```
::simulation slug="0105_gas_laws"
::video slug="intro-forces"
::article slug="gas-laws-intro"
::question bank="physics-mcq" id="42" score="2"
```
- Parsed by **`worksheet_blocks_lib.php`**; rendered in SPA by **`content-embeds.js`**
- Use `slug=` for simulation, video, article; use `bank=` + `id=` or `code=` for questions

**Rule 16.2**: Question scores
- Set **`default_score`** on question bank items when used in gradable worksheets
- Assignment submissions store answers in **`responses_json`**; auto-score when configured (migration `017`)

**Rule 16.3**: Learning videos support bilingual embeds
- Prefer **`embed_url_zh`** / **`embed_url_en`** (and matching providers) after migration `018`
- Keep legacy `embed_url` populated when migrating old rows

**Rule 16.4**: Worksheet permissions (see migration `016`)
- **Admin**: design any worksheet, assign, grade
- **Teacher**: `worksheet.manage_own`, `worksheet.assign_own`, `worksheet.grade_own` on own classes
- **Student**: `worksheet.submit_own` for assigned work only

**Rule 16.5**: Admin embed editors
- When adding embed pickers in admin, follow **`admin-worksheet-embed.js`** / **`admin-content-embed.js`** patterns
- Preview embed syntax before save; invalid slugs should fail validation server-side

---

## Enforcement

These rules should be followed for all new code and updates. When reviewing code:

1. Check file naming conventions
2. Verify HTML structure
3. Review JavaScript for best practices
4. Ensure responsive design
5. Test functionality
6. Check accessibility
7. Verify performance

---

## Exceptions

Some older files may not follow all these rules. When updating old files:
- Gradually bring them up to standard
- Prioritize functionality over style
- Document exceptions if necessary

---

**Last Updated**: 2026-06-28  
**Maintained by**: Mr. B. Leung

**See also**: [`architecture.md`](architecture.md) (API & data model), [`.cursorrules`](.cursorrules) (Cursor AI summary).

