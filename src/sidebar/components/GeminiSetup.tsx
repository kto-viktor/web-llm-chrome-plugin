/**
 * Gemini Nano setup instructions section.
 * Shows when Gemini is selected but unavailable.
 */

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

    // Copy to clipboard since chrome:// URLs can't be opened directly
    navigator.clipboard.writeText(url).then(() => {
      const originalText = e.currentTarget.textContent;
      e.currentTarget.textContent = 'Copied!';
      setTimeout(() => {
        if (e.currentTarget) {
          e.currentTarget.textContent = originalText;
        }
      }, 2000);
    });
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
          and enable <strong>Prompt API for Gemini Nano</strong>
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
          and enable <strong>Optimization guide on device</strong>
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
          and download <strong>Optimization Guide On Device Model</strong>
        </li>
        <li>Restart Chrome</li>
      </ol>
      <button className="gemini-setup-dismiss" onClick={onDismiss}>
        Got it
      </button>
    </div>
  );
}
