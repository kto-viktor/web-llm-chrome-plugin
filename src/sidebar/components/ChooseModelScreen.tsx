/**
 * Screen displayed when no model is cached and user needs to select one.
 * Shows model cards with badges using shared model definitions.
 */

import React from 'react';
import { MODELS } from '../constants/models';

interface ChooseModelScreenProps {
  cachedModels?: Set<string>;
  onModelSelect?: (modelKey: string) => void;
}

export function ChooseModelScreen({
  cachedModels = new Set(),
  onModelSelect
}: ChooseModelScreenProps) {
  const getModelClass = (modelKey: string, isRecommended: boolean = false) => {
    const classes = ['model-option'];
    if (cachedModels.has(modelKey)) {
      classes.push('model-option-cached');
    } else if (isRecommended) {
      classes.push('model-option-recommended');
    }
    return classes.join(' ');
  };

  return (
    <div className="choose-model-screen">
      <h2 className="choose-model-title">Choose Your LLM:</h2>

      <div className="model-options">
        {MODELS.map(model => {
          if (model.muted) {
            return (
              <div key={model.key} className="model-option model-option-muted">
                <span className="model-option-icon">{model.icon}</span>
                <strong className="model-option-name">{model.name}</strong>
                <p className="model-option-desc">Embedded in Chrome, but requires manual activation in settings.</p>
              </div>
            );
          }

          return (
            <div
              key={model.key}
              className={getModelClass(model.key, model.recommended)}
              onClick={() => onModelSelect?.(model.key)}
              style={{ cursor: onModelSelect ? 'pointer' : 'default' }}
            >
              <span className="model-option-icon">{model.icon}</span>
              <strong className="model-option-name">
                {model.name} ({model.params} params)
              </strong>
              {cachedModels.has(model.key) ? (
                <span className="model-option-badge model-option-badge-downloaded">Downloaded</span>
              ) : model.recommended ? (
                <span className="model-option-badge model-option-badge-recommended">Recommended</span>
              ) : null}
              <p className="model-option-desc">
                {model.desc}
                {!cachedModels.has(model.key) && (
                  model.warning ? (
                    <>
                      <br />
                      Super heavy. Requires 30Gb GPU - runs on latest Macbooks or gaming PC's.
                      <br />Size: <b className="model-option-red">{model.size}</b> to download
                    </>
                  ) : (
                    <>
                      <br />Size: <b>{model.size}</b> to download
                    </>
                  )
                )}
              </p>
            </div>
          );
        })}
      </div>

      <p className="choose-model-note">
        Models run 100% locally on your device. The first download may take a few minutes.
      </p>
    </div>
  );
}
