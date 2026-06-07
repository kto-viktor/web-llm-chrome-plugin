/**
 * Bold red banner shown at the top of online mode, with a clickable link that
 * switches to the private offline mode.
 *
 * Uses useAppMode (no assistant-ui runtime needed) so it can render anywhere in
 * the online tree, including above the runtime provider.
 */

import React from 'react';
import { useAppMode } from '../hooks/useAppMode';
import { analytics } from '../../services/analytics';

export function OnlineModeNotice() {
  const { setMode } = useAppMode();

  const switchToOffline = async () => {
    analytics.modeChanged('offline');
    await setMode('offline');
  };

  return (
    <div className="online-mode-notice" role="note">
      This is online mode.{' '}
      <button type="button" className="online-mode-switch" onClick={switchToOffline}>
        switch to private offline mode
      </button>
    </div>
  );
}
