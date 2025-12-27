implement project: Chrome plugin, chat with local LLM in sidebar.

1. Work with embedded chrome model (gemini nano) or with web-llm (deepseek-r1)
2. Automatically detects and choosing best model to avoid manual steps for user.
3. Automatically detects, if browser supports gemini nano. Described here: https://developer.chrome.com/docs/ai/get-started
   If yes, just running with gemini nano
4. If gemini nano support is disabled, then downloading deepseek-r1 model from hugging face. Showing progressbar.
   Mentioning to user, download is just one time.
5. Extension is AI chatbot, works as sidebar with access to current tab.
6. Current page automatically loads into context (prompt). Before load, cleanup happens - remove js, css; remove html tags.
If page content after cleanup bigger than 3000 words, limit it to 3000 words.
7. Conversation history always passed to AI as context. Page content not stored in conversatiom history.
8. Implement smart compaction: when history is bigger than 800 words, ask LLM to compact it.
9. Add "Page summary" button, which is shortcut to "Give summary of this page" prompt.

Code style
1. Write modular code, divided into atomic files and atomic functions. Write documentation to code.
2. CSS, UI logic layer and business logic layers should be clearly separated.