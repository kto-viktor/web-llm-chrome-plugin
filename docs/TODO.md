## Completed
- fix page context injection into prompt - now fetches fresh page content on each message
- attach current tab content to history explicitly for user - it should look like file attachment with page title; should be attached by default; agent also see it as part of user query
- model selection with multiple options: Gemini Nano (default when available), Qwen 2.5 7B (fallback), DeepSeek-R1 (optional)
- Gemini Nano setup instructions shown when user selects it but it's unavailable (with clickable chrome:// URLs)
- added "Contact Developer" link (mailto:kto.viktor.kto@gmail.com)
- don't block window during model load - model selector stays enabled during download, user can browse other models and see Gemini setup instructions while download continues in background
- engaging download screen (35-45% of screen) with model info, benefits, and "one-time download to your computer" message; updates when user previews different models in dropdown
- compact cache loading screen when model loads from disk (shows disk icon and "Loading from your device... This will be quick")
- **fix streaming DOM updates**: Migrated sidebar from vanilla JS to React + TypeScript. React's state-based rendering handles streaming properly in Chrome extension sidebars (unlike vanilla JS DOM manipulation which Chrome doesn't repaint). Original sidebar.js backed up as sidebar.js.bak.
- Add lightweight model

## Todo
- When download just initiated, first minute it just shows text: "Getting model". I want to show some progress bar. For example: "Getting metainformation of model:" and then can fake some progress bar where 100% is 1 minute.
- Fix bug, when download just initiated and getting model screen came, it show text like it loading from disk.
- **migrate to amazon CDN**
- there is a blinking bug - when first time downloading, for a few seconds it show like "loading from cache"
- **add cancel download button**
- add steps about enable multilang option - make multilang word bold. Add clickable urls. And in case if component missing, tells that this is experimental feature in Chrome and not available for everyone yet. Actually, first need to check with someone - how to setup it properly.
- add next best questions. One of it - "Give summary of this page", 2 others should be generated asynchoniously every time.
- "thinking" scratchpad from deepseek should be under spoiler
- instead of clear, add new chat button. Try to do somethign similarly to chat gpt
- add ability to just copy support email
- add waiting animation, similarly to claude - generate 1000 "thinking" words and keep animation
- add loading indicator, when page is loading and can't be attached
- add sentry and analytics
- replace deprecated MediaQueryList.addListener() with addEventListener("change", callback)
