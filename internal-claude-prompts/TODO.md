## Completed
- fix page context injection into prompt - now fetches fresh page content on each message
- attach current tab content to history explicitly for user - it should look like file attachment with page title; should be attached by default; agent also see it as part of user query
- model selection with multiple options: Gemini Nano (default when available), Qwen 2.5 7B (fallback), DeepSeek-R1 (optional)
- Gemini Nano setup instructions shown when user selects it but it's unavailable (with clickable chrome:// URLs)
- added "Contact Developer" link (mailto:kto.viktor.kto@gmail.com)

## Todo
- **add waiting animation, similarly to claude - generate 1000 "thinking" words and keep animation
- add loading indicator, when page is loading and can't be attached
- replace deprecated MediaQueryList.addListener() with addEventListener("change", callback)
