/**
 * Custom dropdown model selector with status badges.
 * Replaces the native <select> with a styled dropdown panel.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MODELS } from '../constants/models';

interface ModelSelectorProps {
  selectedModel: string | null;
  activeModel: string | null;
  cachedModels: Set<string>;
  onModelChange: (modelName: string) => void;
}

/**
 * Returns the badge type for a model based on its status.
 */
function getBadgeType(
  modelKey: string,
  activeModel: string | null,
  cachedModels: Set<string>
): 'active' | 'downloaded' | null {
  if (activeModel === modelKey) return 'active';
  if (cachedModels.has(modelKey)) return 'downloaded';
  return null;
}

export function ModelSelector({
  selectedModel,
  activeModel,
  cachedModels,
  onModelChange,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDef = MODELS.find(m => m.key === selectedModel);

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleSelect = useCallback((key: string) => {
    onModelChange(key);
    setIsOpen(false);
  }, [onModelChange]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="model-selector-container" ref={containerRef}>
      <button className="model-selector-trigger" onClick={handleToggle}>
        <span className="model-selector-trigger-text">
          {selectedDef ? `${selectedDef.icon} ${selectedDef.name}` : 'Select a model...'}
        </span>
        <span className={`model-selector-chevron ${isOpen ? 'open' : ''}`}>&#9662;</span>
      </button>

      {isOpen && (
        <div className="model-selector-dropdown">
          {MODELS.map(model => {
            const badge = getBadgeType(model.key, activeModel, cachedModels);
            const isSelected = model.key === selectedModel;

            return (
              <button
                key={model.key}
                className={`model-selector-item${isSelected ? ' selected' : ''}${model.muted ? ' muted' : ''}`}
                onClick={() => handleSelect(model.key)}
              >
                <span className="model-selector-item-icon">{model.icon}</span>
                <div className="model-selector-item-info">
                  <span className="model-selector-item-name">
                    {model.name}
                    {model.params && <span className="model-selector-item-params">{model.params}</span>}
                  </span>
                  <span className="model-selector-item-meta">
                    {model.size ? `${model.size} — ${model.desc}` : model.desc}
                  </span>
                </div>
                {badge === 'active' && (
                  <span className="model-selector-badge badge-active">Active</span>
                )}
                {badge === 'downloaded' && (
                  <span className="model-selector-badge badge-downloaded">Downloaded</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
