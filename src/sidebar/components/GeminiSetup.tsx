/**
 * Gemini Nano setup instructions section.
 * Shows when Gemini is selected but unavailable.
 */

declare const chrome: { tabs?: { create: (options: { url: string }) => void } };

import React, { useCallback } from 'react';

interface GeminiSetupProps {
  visible: boolean;
  onDismiss: () => void;
}

export function GeminiSetup({ visible, onDismiss }: GeminiSetupProps) {
  const handleChromeLink = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const url = e.currentTarget.dataset.url;
    if (!url) return;

    // Use Chrome extension API to open chrome:// URLs in a new tab
    chrome.tabs?.create({ url });
  }, []);

  if (!visible) return null;

  return (
    <div className="gemini-setup-section">
      <div className="gemini-setup-header">You need to turn on Gemini in your Chrome</div>
      <p className="gemini-setup-intro">
        Gemini Nano is a fast model embedded in Google Chrome. One-time setup required:
      </p>
      <ol className="gemini-setup-steps">
        <li>
          Go to{' '}
          <a
            href="#"
            className="chrome-link"
            data-url="chrome://flags/#prompt-api-for-gemini-nano"
            onClick={handleChromeLink}
          >
            chrome://flags/#prompt-api-for-gemini-nano
          </a>{' '}
          and set <strong>Enabled Multilingual</strong> for "Prompt API for Gemini Nano"
        </li>
        <li>
          Go to{' '}
          <a
            href="#"
            className="chrome-link"
            data-url="chrome://flags/#optimization-guide-on-device-model"
            onClick={handleChromeLink}
          >
            chrome://flags/#optimization-guide-on-device-model
          </a>{' '}
          and set <strong>Enabled BypassPerfRequirement</strong> for "Optimization guide on device"
        </li>
        <li>
          Restart your Google Chrome - it will start download Gemini automatically.
        </li>
        <li>
          Go to{' '}
          <a
            href="#"
            className="chrome-link"
            data-url="chrome://components/"
            onClick={handleChromeLink}
          >
            chrome://components/
          </a>{' '}
          and search for <strong>Optimization Guide On Device Model</strong> - wait for downloading, until Status will be "Up-to-date"
        </li>
      </ol>
      <button className="gemini-setup-dismiss" onClick={onDismiss}>
        Got it
      </button>
    </div>
  );
}
