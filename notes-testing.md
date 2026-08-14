# Testing notes (internal)

- All 5 player pages fetched OK (status 200, pages 1-5, per_page=100).
- Console log: no errors. avif images load via img tags (no img network log entries — likely cached or lazy not triggered).
- Screenshots: pages render well; glassmorphic design, navbar, tabs all correct.
- Player chip images show a default avatar (the API's normal-2.avif placeholder) for many players — acceptable fallback.
- Issue found: first screenshot card preview shows "YOUR NAME" fine; card creator defaults to empty name = placeholder text. OK.
- Mobile 375px: hamburger works, layout stacks, sidebar moves below pitch — OK.
- News mobile screenshot shows "Loading news..." then blank in first capture (loading race with capture). News fetches fine per earlier test.
- Pack image /manus-storage/pack-gold_ba22c138.png looks premium. Logo /manus-storage/fc26-logo_b944cf86.png works.
- Remaining: run style review once, save checkpoint, deliver.
- Assets: logo=fc26-logo_b944cf86.png, hero-bg (unused currently), pack=pack-gold_ba22c138.png.
- Style review done (1 per cycle). Applied in one pass: index.css motifs (shield-trim, edge-lit, grid-overlay, hud-corner, glow-cyan, text-cyan-glow, border-cyan-dim, stat-bar); navbar gold-cyan gradient active underline + grid overlay; News featured hero card + entity decode in api.ts (decodeEntities); Compare rich empty state (slots PAC/SHO/PAS/DRI, grid overlay, edge-lit).
- Still to do: enrich Card Creator card preview with angular trim / edge-lit + stat lines maybe; Pack Opener ambient background richness (grid overlay); OVR Calc edge-lit; then pnpm check, screenshots verify, checkpoint, deliver.
- Footer copy already "FC MOBILE 26 TOOLS — BUILT BY DYNAMIC HUB".
- News entity decode applied in api.ts fetchNews (title: decodeEntities(...)).
- No checkpoint created yet (single checkpoint rule applies until first delivery).

## Style-review pass 1 results (verified via screenshots 23:07)
- Card Creator: edge-lit panel + HUD corner ticks + canvas corner ticks render nicely. GOOD.
- Compare: rich empty state with 4 PAC/SHO/PAS/DRI slots, edge-lit, grid overlay. GOOD.
- Pack Opener: grid overlay + edge-lit reveal panel. GOOD.
- OVR Calc: edge-lit result panel with grid overlay. GOOD.
- News: featured hero card (LATEST DISPATCH + FEATURED badge + grid) renders. Title entities STILL show literal &#8211;/&#8217; in screenshots even after decodeEntities + cache key bump to fc26.news.v2 — the screenshot browser likely has its own separate localStorage; but code path is correct (curl confirms API returns &#8211;, decodeEntities replaces it). IMPORTANT: screenshot tool browser may not share localStorage; entity decode is verified by code. Actually the news list may have been captured mid-load; earlier screenshots showed items with entities, after bump to v2 still literal — but screenshot capture may hit before fetch resolves. Need to verify via browser or accept (fetchNews is async; screenshots are taken before resolve → shows stale empty? No — earlier full-page showed items w/ entities = used cached v1 data. After v2 bump, no cache → fetch runs; but per_page=14 fetch timed out? No errors in console. Maybe screenshot captures are stale. Leave as-is; entities will decode live.
- Remaining: save ONE checkpoint, deliver with manus-webdev attachment. Preview URL: https://3000-i5oumd240uknm6c14iiza-bdbfc5f0.us2.manus.computer
- Note: screenshot tool captured /news still "Loading news..." twice — network log shows only ONE posts fetch total (22:28) meaning the screenshot browser sessions didn't fetch news. Likely AbortSignal.timeout 15s + server slow, or browser env blocks external fetch in screenshot tool. Earlier first-cycle screenshots DID show news items (from localStorage cache seeded by browser session). Acceptable — live site fetches fine (verified via curl; browser session 22:28 fetch returned 200).
## Live browser verification (23:08)
- News page in real browser: all 14 items load, titles correctly decoded (e.g. "CHAMPIONS EVENT Week 2 Player Predictions!! – FC Mobile 26" with proper en-dash). Featured hero card works. Only entity left is "World&#8217;s" inside excerpts, which API sends HTML-escaped in excerpt field — apply decodeEntities to excerpt too.
- Fix: decodeEntities on excerpt as well. Then checkpoint + deliver.
