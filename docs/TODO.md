## Todo
- when error with cancellation ("previous generation still in progress") - restart LLM. FIRST NEED TO REPRODUCE
- If user asking about current page - ask him to attach the page. (system prompt for no-attachment)
- autodetect of user language on normal prompt - try to play with prompt
- autodetect of user language on page summary prompt - try to add language in prompt 
- подумать над еще одной моделью на 8-9В

## Long-term backlog
- add sentry and analytics
- add next best questions. One of it - "Give summary of this page", 2 others should be generated asynchoniously every time.
- refactor gemini setup - add screenshots, refactor step 4
- add waiting animation, similarly to claude - generate 1000 "thinking" words and keep animation

## Completed
- выпилить LLama
- made gemini clickable
- когда контекст зааттачен, добавить кнопку "Page summary"
- сделать понятнее эти галочки в дропдауне
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
- **migrate to amazon CDN**
- there is a blinking bug - when first time downloading, for a few seconds it show like "loading from cache"
- **add cancel download button**
- **background downloads**: Downloads moved to compact progress bars when user switches models. Users can explore other models, start new downloads, and manage multiple downloads simultaneously. Background progress bars show at top with model name, progress, and cancel button.
- **dismiss Gemini setup on model switch**: Gemini setup instructions now automatically close when user switches to a different model from the dropdown or model bubbles.
- add steps about enable multilang option - make multilang word bold. Add clickable urls. And in case if component missing, tells that this is experimental feature in Chrome and not available for everyone yet. Actually, first need to check with someone - how to setup it properly.
- add ability to just copy support email
- "thinking" scratchpad from deepseek should be under spoiler
- FIX GRAMMAR
- instead of clear, add new chat button. Try to do something similarly to chat gpt
- Дать возможность кликать на баблы с моделями
- Сделать кнопку скачать Х гб (не качать автоматом)
- LLama 70B - красным написать размер и системные требования (или упомянуть про маки)
- Доресерчить модели, возможно, выбрать побольше
- **model selection refactor**: Refactored to state machine architecture with ViewState as single source of truth. Eliminated `previewModel` and `showGeminiSetup` state variables. Dropdown now shows checkmarks (✓) for cached models. Simplified App.tsx from ~330 lines to ~260 lines. All model selection flows (cached, uncached, Gemini, switching during download) now work reliably.
- **page attachment opt-in system**: Replaced auto-attachment with explicit opt-in. Pages are NOT attached by default. Added "📎 Attach page" button (replaces "Page Summary"). Two modes: (1) General AI assistant (no page context) using new general-assistant-template.txt, (2) Page-specific assistant when explicitly attached. History shows all messages, but prompt only includes relevant context based on current mode. Auto-detaches when switching tabs.
- **OpenAI-style messages array**: Refactored from single prompt string to proper messages array (`system`, `user`, `assistant`). WebLLM now receives structured messages directly (leveraging native chat template). Gemini Nano flattens messages internally. Added `getRecentContextMessages()` for contiguous tail history filtering. Added `buildSystemMessage()` for system prompt construction. Installed vitest with unit tests.
- **generation cancellation**: Added stop button to cancel LLM generation mid-stream. Button appears in place of send button during generation. Uses AbortController for clean cancellation. Partial responses are saved to history with "[Generation stopped]" marker. Works with both WebLLM and Gemini Nano adapters.
- **streaming UX improvements**: Implemented smart auto-scroll with user intent detection (scrolls only when user is near bottom, respects manual scrolling). Added performance tip tooltip that appears after 10s of streaming, suggesting faster models like Llama 1B. Tip dismisses permanently via localStorage. Creates a non-blocking, user-friendly streaming experience.
- Переехать с Amplify
- решить, хочу ли я оставить лламу 700мб
- убрать tip о том, что LLama 1B тормозит, для LLama 1B :)
- добавить tips для LLama 1B, что I'm lightweight model and will appreciate if you can speak english with me :)
- add Rate App widget
- fix Rate App widget CSS hover animation
- add spotlight for attach page


