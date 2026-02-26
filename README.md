# Web LLM Chrome Extension

> Chat with local AI models directly in your browser - with help of WebLLM

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Install-blue?logo=google-chrome)](https://chromewebstore.google.com/detail/local-llm/ihnkenmjaghoplblibibgpllganhoenc)
![Version](https://img.shields.io/badge/version-1.8.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## Overview

This Chrome extension adds a sidebar to your browser where you can chat with large language models running entirely on your GPU — no internet connection required for inference.

---

## Powered by WebLLM

This extension is built on top of **[WebLLM](https://webllm.mlc.ai/)** — a high-performance in-browser LLM inference engine developed by the [MLC AI](https://github.com/mlc-ai) team.

WebLLM brings GPU-accelerated model inference directly to the browser via WebGPU and WebAssembly, with no server required. It provides an OpenAI-compatible API and supports 24+ models including Llama, Mistral, Gemma, and more.

- Website: [webllm.mlc.ai](https://webllm.mlc.ai/)
- GitHub: [github.com/mlc-ai/web-llm](https://github.com/mlc-ai/web-llm)

This repo is a real-world example of WebLLM integrated into a Chrome extension — a useful reference for anyone building browser-native AI applications.

---

## Install

### Chrome Web Store

[![Install from Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Install%20Extension-blue?logo=google-chrome&style=for-the-badge)](https://chromewebstore.google.com/detail/local-llm/ihnkenmjaghoplblibibgpllganhoenc)

### Manual install (unpacked)

1. Download or clone this repo
2. Run `npm install && npm run build`
3. Go to `chrome://extensions`
4. Enable **Developer mode**
5. Click **Load unpacked** → select the project folder

---

## Using as a Base / Development Guide

This project is designed to be a clean starting point for building your own WebLLM-powered Chrome extension.

### Requirements

- Node.js 18+
- Chrome 120+ (for WebGPU and Side Panel API)
- A GPU (required for WebLLM model inference)

### Install dependencies

```bash
npm install
```

### Development (watch mode)

```bash
npm run watch
```

Then load the extension in Chrome:

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the project folder
4. The extension loads from built output — reload after changes

### Build for production

```bash
npm run build
```

### Run tests

```bash
npm test
```

### Project structure

```
src/
├── background/       # Service worker (message routing)
├── content/          # Content script (page text extraction)
├── core/             # LLM adapters and unified interface
│   ├── llm-interface.js      # Unified LLM abstraction
│   ├── webllm-adapter.js     # WebLLM integration
│   └── gemini-nano.js        # Chrome built-in model adapter
├── services/         # Chat, history, prompt building
├── sidebar/          # React UI (components, hooks, types)
└── utils/            # Shared utilities
```

---

## How WebLLM is Integrated

The WebLLM integration lives in two files:

- **`src/core/webllm-adapter.js`** — wraps the `@mlc-ai/web-llm` package, handles model loading, caching, and streaming chat completions
- **`src/core/llm-interface.js`** — unified interface that routes requests to either WebLLM or Gemini Nano depending on the selected model

To add a new WebLLM model, you only need to add an entry to the model config in `src/sidebar/constants/models.ts` and map it to a WebLLM model ID in the adapter.

**CSP note:** WebAssembly requires `'wasm-unsafe-eval'` in `manifest.json`:

```json
"content_security_policy": {
  "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
}
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 18 + TypeScript |
| LLM inference | [@mlc-ai/web-llm](https://github.com/mlc-ai/web-llm) |
| Extension platform | Chrome Manifest V3 |
| Bundler | esbuild |
| Tests | Vitest |

---

## Contributing

Contributions are welcome. Open an issue or pull request.

## License

MIT
