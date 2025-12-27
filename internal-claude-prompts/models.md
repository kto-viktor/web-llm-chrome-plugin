# Model Selection - COMPLETED

## Implemented
1. When user opens extension, it checks if Gemini Nano is available. If yes, it becomes the default model.
2. If not, it downloads 'Qwen2.5-7B-Instruct-q4f16_1-MLC' as the default model.
3. In dropdown, user can choose between:
   - Gemini Nano (Chrome built-in)
   - Qwen 2.5 7B (WebLLM)
   - DeepSeek-R1 (WebLLM)
4. If user chooses Gemini Nano from dropdown and it's not available, it shows setup instructions with clickable URLs:
   - chrome://flags/#prompt-api-for-gemini-nano
   - chrome://flags/#optimization-guide-on-device-model
   - chrome://components/

   (Clicking on URLs copies them to clipboard since chrome:// URLs can't be opened directly from extensions)
