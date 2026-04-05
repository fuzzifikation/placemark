/**
 * useModals — manages the set of boolean visibility flags for all panels and
 * overlays in the App shell.
 *
 * Side effects that depend on other state (e.g. resetting the date filter when
 * the timeline closes) remain in App.tsx — this hook only tracks visibility.
 */

import { useState } from 'react';

export interface ModalState {
  showTimeline: boolean;
  showSettings: boolean;
  showUpgrade: boolean;
  showStats: boolean;
  showOperations: boolean;
  showHelp: boolean;
  showPlacemarks: boolean;
  showScanOverlay: boolean;
}

export interface ModalActions {
  setShowTimeline: (v: boolean) => void;
  setShowSettings: (v: boolean) => void;
  setShowUpgrade: (v: boolean) => void;
  setShowStats: (v: boolean) => void;
  setShowOperations: (v: boolean) => void;
  setShowHelp: (v: boolean) => void;
  setShowPlacemarks: (v: boolean) => void;
  togglePlacemarks: () => void;
  setShowScanOverlay: (v: boolean) => void;
}

export function useModals(): ModalState & ModalActions {
  const [showTimeline, setShowTimeline] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showOperations, setShowOperations] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showPlacemarks, setShowPlacemarks] = useState(false);
  const [showScanOverlay, setShowScanOverlay] = useState(false);

  return {
    showTimeline,
    setShowTimeline,
    showSettings,
    setShowSettings,
    showUpgrade,
    setShowUpgrade,
    showStats,
    setShowStats,
    showOperations,
    setShowOperations,
    showHelp,
    setShowHelp,
    showPlacemarks,
    setShowPlacemarks,
    togglePlacemarks: () => setShowPlacemarks((v) => !v),
    showScanOverlay,
    setShowScanOverlay,
  };
}
