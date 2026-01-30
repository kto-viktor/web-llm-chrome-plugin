## Completed
- fix page context injection into prompt - now fetches fresh page content on each message
- attach current tab content to history explicitly for user - it should look like file attachment with page title; should be attached by default; agent also see it as part of user query
- model selection with multiple options: Gemini Nano (default when available), Qwen 2.5 7B (fallback), DeepSeek-R1 (optional)
- Gemini Nano setup instructions shown when user selects it but it's unavailable (with clickable chrome:// URLs)
- added "Contact Developer" link (mailto:kto.viktor.kto@gmail.com)

## Todo
- **don't block window during model load - add to see another models etc**
- add streaming animation
- **add waiting animation**, similarly to claude - generate 1000 "thinking" words and keep animation
- When download just initiated, first minute it just shows text: "Getting model". I want to show some progress bar. For example: "Getting metainformation of model:" and then can fake some progress bar where 100% is 1 minute.
- add loading indicator, when page is loading and can't be attached
- add sentry and analytics
- downloading model (just once 🚀) is not enough - it should be an **offer**, with size of screen limit
- during loading from cache there is a text "this is one time download" - **VERY IMPORTANT TO REMOVE AND SHOW IT WILL BE QUICKLY LOADED FROM YOUR CACHE**
- "thinking" scratchpad from deepseek should be under spoiler
- instead of clear, add new chat button. Try to do somethign similarly to chat gpt
- add ability to just copy support email
- **migrate to amazon CDN**
- add steps about enable multilang option - make multilang word bold. Add clickable urls. And in case if component missing, tells that this is experimental feature in Chrome and not available for everyone yet. Actually, first need to check with someone - how to setup it properly.
- replace deprecated MediaQueryList.addListener() with addEventListener("change", callback)
