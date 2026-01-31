/**
 * Entry point for the sidebar React application.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// @ts-ignore - JS module
import { llm } from '../core/llm-interface.js';

console.log('=== Offline GPT Sidebar Loading (React) ===');

// Initialize React
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);

// Render app
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Initialize LLM after render
llm.initialize().catch((error: Error) => {
  console.error('[Sidebar] LLM initialization failed:', error);
});

console.log('[Sidebar] React app mounted');
