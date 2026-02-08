/**
 * Hook to manage first-time onboarding state.
 * Shows dropdown tooltip after user has selected their first model.
 */

import { useState, useCallback } from 'react';

export function useOnboarding() {
  const [showDropdownTooltip, setShowDropdownTooltip] = useState(false);

  const shouldShowTooltip = useCallback(() => {
    // Check if tooltip should be shown based on localStorage
    const tooltipDismissed = localStorage.getItem('llm-dropdown-tooltip-dismissed') === 'true';
    return !tooltipDismissed;
  }, []);

  const markModelSelected = useCallback(() => {
    // Mark that user selected a model and show tooltip if not dismissed
    if (shouldShowTooltip()) {
      setShowDropdownTooltip(true);
    }
  }, [shouldShowTooltip]);

  const dismissDropdownTooltip = useCallback(() => {
    localStorage.setItem('llm-dropdown-tooltip-dismissed', 'true');
    setShowDropdownTooltip(false);
  }, []);

  return {
    showDropdownTooltip,
    markModelSelected,
    dismissDropdownTooltip
  };
}
