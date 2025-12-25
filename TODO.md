## Completed
- fix page context injection into prompt - now fetches fresh page content on each message

## Todo
- add host permission to hugging face and load model from it (in case if Gemini is unavailable)
- replace deprecated MediaQueryList.addListener() with addEventListener("change", callback)
- attach current tab content to history explicitly for user - it should look like file attachment with page title; should be attached by default; agent also see it as part of user query