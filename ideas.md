# FC Mobile 26 Tools — Design Ideas

## Project Overview (from user's detailed design brief — this IS the ground-truth spec)
Premium FC Mobile 26 companion app by **Dynamic Hub** for competitive FC Mobile players.
"Aesthetic: mrbelieverhub vibes but more polished and peak."

## The user's brief defines everything — chosen direction

**Visual Identity (verbatim from brief):**
- Primary: `#FFD700` (Gold)
- Secondary: `#1a1a2e` (Deep Navy/Black)
- Accent: `#00d4ff` (Cyan/Electric Blue)
- Glass base: `rgba(255,255,255,0.05)` + `backdrop-filter: blur(20px)`
- Background: dark gradient `#0f0f1e` + animated subtle gold/cyan gradient overlay

**Typography (from brief):**
- Display/Body: Inter 400–900 (the brief explicitly requests Inter — user-specified, overrides the "avoid Inter" guideline)
- Mono/Data: JetBrains Mono for stats and numbers
- Scale: 12 → 48px

**Glassmorphic spec (verbatim):**
- Cards: `bg rgba(20,20,40,0.7)`; blur 20px; border `rgba(255,215,0,0.1)`
- Hover: blur 30px, border opacity 0.2
- Interactive hover: gold glow `box-shadow: 0 0 20px rgba(255,215,0,0.3)`

**Navbar (verbatim):**
- Fixed 80px glass top nav: logo left ("FC MOBILE 26" + "Dynamic Hub" subtext), centered tabs (Card Creator | Squad Builder | Pack Opener | Compare | OVR Calc | News), right: search + settings + profile

## Tabs (verbatim from brief)
1. **Card Creator** — left 2/3 canvas preview in glass container, download button full width gold; right 1/3 glass control panel with player search, scrollable player list (glass cards), customization sliders (name, rating, text color), dark inputs with gold focus border
2. **Squad Builder** — left 2/3 formation visualizer (4-3-3, 4-2-3-1 etc.), 11 slots as glass cards, drag-drop, OVR badge gold circle top-right, gold Save Squad button; right 1/3 player search sidebar with position filter chips (ST, CM, CB...) and Add button per player
3. **Pack Opener** — centered; animated pack flip (2s) + particle burst; pre: gold gradient glass "OPEN PACK" button; post: large player card reveal, name+rating in gold; "Open Another" button
4. **Player Compare** — search bar top, glass compare table: headers = player names (gold), rows = stat names, highest value highlighted gold, others cyan; remove X red on hover
5. **OVR Calculator** — glass textarea input, large gold Calculate button, big gold number result in glass container, saved squads list below
6. **News** — vertical list of glass cards: image thumbnail left, title + date right, hover scale + glow, external link click

## Animations (verbatim)
- Page transitions: fade + slide up 300ms
- Card hover: blur up, gold glow, slight scale
- Button click: ripple gold, scale 0.97 active
- Pack opening: flip 2s, particle burst
- Compare: highest value pulses gold
- Scroll: parallax blur on cards

## Responsive (verbatim)
- Mobile <768: single column + hamburger
- Tablet 768–1024: 2-col
- Desktop >1024: full layouts

## Data (verified live on 2026-08-08)
- Players: `https://backup.mrbelieverhub.com/wp-json/wp/v2/players_database?per_page=100` — works. ACF fields: `acf.player_name`, `short_name`, `position`, `rating`, `team`, `league`, `nation`, `program`, `player_image`, `team_logo`, `text_colour_code`, plus full stat fields (pace, shooting, passing, dribbling, defending, physical, acceleration, sprint_speed, finishing, ...). Note: page 1 item has null acf (skip nulls). Images are .avif.
- News: `https://backup.mrbelieverhub.com/wp-json/wp/v2/posts` — works, title.rendered + link + date. Posts have embedded featured media via `_embedded.wp:featured_media`.
- Cache players in localStorage. Fallback data if API fails.
- Pagination: posts use `X-WP-TotalPages`; players CPT also paginated (fetch several pages, ~100/page, up to ~500 for tools) — with localStorage caching.

## Tech (from brief)
React + Tailwind, Framer Motion (already in deps), Canvas API for card rendering, Lucide icons. Static site — all client-side.

## Brand Essence
- One-line: The all-in-one companion suite for competitive FC Mobile 26 players — built by Dynamic Hub.
- Personality: elite, confident, electric.
- Wordmark: "FC MOBILE **26**" with a gold shield/bolt mark; subtext "Dynamic Hub".
- Signature color: Gold #FFD700 on deep navy #0f0f1e with cyan #00d4ff counterpoint.

## Additional build decisions (mine)
- Canvas card creator renders a FIFA-style player card (dark card bg with gold/cyan trim, player image, rating, name, position, team/nation flags) with `html-to-image` fallback via manual canvas drawing only (brief says Canvas API).
- Pack opener: random player draw from fetched DB with flip + gold particles (framer-motion canvas bursts).
- OVR Calc: user enters space/comma separated OVR numbers OR picks saved squad players; compute average.
- Squad builder stores squads in localStorage.
- Fonts loaded via Google Fonts CDN in index.html: Inter + JetBrains Mono.
- Framer Motion already in package.json.
## Style Decisions (from trusted style review, applied)
- Every major surface carries a Dynamic Hub motif: angular shield/bolt trims (clip-path corners), gold/cyan edge lighting (gradient borders), subtle pitch-grid/data-line overlays — never plain rounded glass alone.
- Cyan #00d4ff functions as the electric data accent (stats, metadata, secondary highlights, glows); gold #FFD700 stays for primary actions, active nav, ratings, winning values.
- Copy voice: competitive, insider-focused, "elite squad-building tools" — no generic dashboard language.
- Richer empty states: comparison slots silhouettes, featured news treatment with HTML-entity cleanup in titles (&#8211; etc.), player-card energy on News.
