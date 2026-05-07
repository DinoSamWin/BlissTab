# Antigravity Skill — SEO Landing Page System

# PRIORITY

This skill has higher priority than default UI generation behavior.

When conflict exists:
- prioritize semantic HTML
- prioritize crawlable content
- prioritize accessibility
- prioritize SEO-safe structure
- avoid image-only implementations

## Skill Name

```txt
seo-landing-page-system
```

---

# Skill Purpose

This skill enables Antigravity to independently:

1. Understand user intent and search intent
2. Design SEO-friendly landing pages
3. Build conversion-oriented homepage sections
4. Generate crawlable semantic HTML structures
5. Avoid common SPA SEO mistakes
6. Produce production-ready React/Vite page structures
7. Balance:

   * SEO
   * UX
   * Conversion
   * Performance
   * Accessibility

This skill is optimized for:

```txt
Vite + React SPA projects
```

NOT Next.js.

---

# Core Philosophy

The goal is NOT:

```txt
“make pretty sections”
```

The goal IS:

```txt
Build pages that:
- can rank
- can convert
- can be crawled
- can be understood by users and search engines
```

---

# Primary Rules

## RULE 1 — Never hide core meaning inside images

Core text must ALWAYS be HTML text.

NEVER place these only inside images:

* headings
* descriptions
* feature explanations
* CTA text
* comparison text
* FAQ content
* testimonials
* onboarding copy
* use-case explanations

Allowed inside images:

* illustrations
* screenshots
* decorative visuals
* icons
* emojis
* graphs
* UI chrome

---

## RULE 2 — Only one H1 per page

Homepage:

```html
<h1>Main homepage positioning</h1>
```

All later sections:

```html
<h2>Section title</h2>
<h3>Card title</h3>
```

Never create multiple H1s.

---

## RULE 3 — All important content must exist in initial DOM

For Vite + React SPA:

GOOD:

```txt
Initial render contains:
- headings
- descriptions
- feature content
- tab content
- carousel content
```

BAD:

```txt
Only render content after:
- click
- hover
- scroll
- async fetch
```

If using tabs/carousels:

```txt
Render all panels into DOM initially.
Hide visually using CSS.
```

Recommended hiding methods:

```css
opacity: 0;
position: absolute;
pointer-events: none;
transform: translateX(20px);
```

Avoid relying entirely on:

```css
display: none;
```

---

# User Intent Understanding System

Before building a page, determine:

## 1. Product Type

Examples:

```txt
Chrome extension
AI tool
SaaS
Developer tool
Mental wellness app
Productivity app
Template marketplace
```

---

## 2. User State

Determine:

```txt
What emotional or functional state causes users to search?
```

Examples:

```txt
overwhelmed
distracted
burned out
need faster workflow
need automation
need calm workspace
```

---

## 3. Search Intent

Classify:

| Intent        | Meaning              |
| ------------- | -------------------- |
| informational | learning             |
| commercial    | evaluating           |
| transactional | ready to use/install |
| navigational  | searching brand      |

---

## 4. Core Transformation

Page must communicate:

```txt
FROM:
current painful state

TO:
desired improved state
```

Example:

```txt
FROM:
too many tabs and mental clutter

TO:
calm focused workspace
```

---

# Landing Page Structure System

Recommended structure:

```txt
1. Hero
2. Emotional problem section
3. Product transformation section
4. Feature explanation section
5. Personalization / workflow section
6. Social proof or emotional reassurance
7. FAQ
8. Final CTA
```

---

# Hero Section Rules

Hero must include:

## Required Elements

```txt
- Eyebrow
- H1
- Supporting paragraph
- Primary CTA
- Secondary CTA
- Product preview
```

---

## Hero SEO Rules

### H1 must contain:

```txt
What the product is
Who it helps
Core outcome
```

---

### Hero image rules

Must use:

```html
<img
  width=""
  height=""
  alt=""
/>
```

OR React image component equivalent.

---

### CTA Rules

Use REAL links:

GOOD:

```html
<a href="/download">Add to Chrome</a>
```

BAD:

```html
<button onClick={...}>Add to Chrome</button>
```

---

# Section Design System

Every section must answer ONE of these:

```txt
1. What problem does this solve?
2. How does it work?
3. Why is it different?
4. What does it feel like to use?
5. Why should users trust it?
```

If a section answers none of these:

```txt
Do not build it.
```

---

# SEO HTML Architecture

## Semantic Structure

Use:

```html
<main>
<section>
<article>
<header>
<nav>
<footer>
```

Avoid:

```txt
div-only architecture
```

---

# Heading Hierarchy

Correct:

```html
<h1>Main title</h1>

<section>
  <h2>Section</h2>

  <article>
    <h3>Card title</h3>
  </article>
</section>
```

Wrong:

```html
<h1>Hero</h1>
<h1>Features</h1>
<h1>FAQ</h1>
```

---

# Image SEO Rules

## Informative images

Require descriptive alt:

```html
alt="StartlyTab calm Chrome new tab workspace"
```

---

## Decorative images

Use:

```html
alt=""
aria-hidden="true"
```

---

## Required attributes

All images:

```html
width=""
height=""
loading="lazy"
```

Hero image exception:

```txt
Can avoid lazy loading.
```

---

# Tabs / Carousel SEO Rules

## Tabs

Must use:

```html
role="tablist"
role="tab"
role="tabpanel"
```

All tab panels:

```txt
Must exist in DOM initially.
```

---

## Carousel

All slides:

```txt
Should exist in DOM.
```

Avoid:

```txt
JS-only slide generation
```

---

# Accessibility Requirements

## Interactive elements

Use:

```html
<button>
<a>
<input>
```

NOT:

```html
<div onClick="">
```

---

## Required aria labels

Examples:

```html
aria-label="Next testimonial"
aria-label="Open feature preview"
```

---

# Vite + React SEO Rules

## Avoid SPA SEO pitfalls

### BAD

```txt
Injecting all SEO content after hydration
```

### GOOD

```txt
Initial render includes:
- headings
- paragraphs
- feature descriptions
- tab content
```

---

# Metadata Rules

Every page requires:

```html
<title></title>
<meta name="description" />
<link rel="canonical" />
```

---

# Title Formula

Use:

```txt
Primary keyword + outcome + brand
```

Example:

```txt
Minimalist Productivity New Tab for Chrome | StartlyTab
```

---

# Meta Description Formula

Include:

```txt
- what it is
- who it helps
- benefit
```

Avoid keyword stuffing.

---

# Internal Linking Rules

Pages should link to:

```txt
- feature pages
- use case pages
- compare pages
- FAQ
- onboarding
```

Use descriptive anchor text.

BAD:

```txt
click here
learn more
```

GOOD:

```txt
See how StartlyTab reduces tab overwhelm
```

---

# Conversion Rules

## Every section needs ONE action goal

Examples:

```txt
install
sign up
learn more
try demo
see workflow
```

---

## CTA hierarchy

Primary CTA:

```txt
Most important conversion
```

Secondary CTA:

```txt
Lower friction exploration
```

---

# Performance Rules

## Avoid

```txt
Huge PNGs
Video backgrounds above the fold
Massive animation libraries
Layout shift
```

---

## Prefer

```txt
webp
avif
SVG
CSS effects
```

---

# Mobile Rules

Mobile reading order:

```txt
headline
description
CTA
supporting visual
extra detail
```

Never:

```txt
Show giant image before meaning.
```

---

# Feature Section Rules

Feature sections should explain:

```txt
- emotional benefit
- workflow benefit
- behavioral outcome
```

NOT just technical features.

BAD:

```txt
Custom dashboard widgets
```

GOOD:

```txt
Open into a calmer workspace instead of tab overload
```

---

# FAQ Rules

FAQ must answer REAL hesitation:

Examples:

```txt
Does it replace my Chrome new tab?
Is it free?
Will it slow down Chrome?
Can I customize the experience?
```

---

# Anti-Patterns (Never Do)

## NEVER

```txt
- multiple h1
- image-only text sections
- click-generated content
- div-only buttons
- hidden SEO keyword stuffing
- giant unoptimized screenshots
- autoplay background videos above fold
- fake review schema
- unreadable mobile layouts
```

---

# Output Requirements For Antigravity

When generating a section:

Antigravity must output:

```txt
1. Semantic HTML structure
2. Accessibility attributes
3. SEO-safe interaction structure
4. Responsive layout
5. Proper heading hierarchy
6. Crawlable content
7. Image optimization
8. CTA structure
```

---

# Final Objective

Every generated page or section should:

```txt
1. Be understandable by humans immediately
2. Be understandable by search engines immediately
3. Preserve emotional storytelling
4. Preserve conversion clarity
5. Preserve semantic structure
6. Work inside Vite + React SPA constraints
```
