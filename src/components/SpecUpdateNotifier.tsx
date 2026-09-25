/**
 * SpecUpdateNotifier Component
 *
 * Displays a notification when a newer OpenAPI spec version is detected.
 * Provides UI to update to the latest version or dismiss the notification.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getVersionChangeNotification } from '../utils/specVersionManager';
import styles from './SpecUpdateNotifier.module.css';

export interface SpecUpdateNotifierProps {
  onUpdate?: () => void;
  onDismiss?: () => void;
  autoHideDuration?: number; // ms, 0 = never auto-hide
}

export default function SpecUpdateNotifier({
  onUpdate,
  onDismiss,
  autoHideDuration = 8000,
}: SpecUpdateNotifierProps): React.JSX.Element | null {
  const [visible, setVisible] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{ previousVersion: string | null; currentVersion: string } | null>(null);

  useEffect(() => {
    const info = getVersionChangeNotification();
    if (info) {
      setUpdateInfo(info);
      setVisible(true);

      // Auto-hide notification after duration
      if (autoHideDuration > 0) {
        const timer = setTimeout(() => {
          setVisible(false);
        }, autoHideDuration);

        return () => clearTimeout(timer);
      }
    }
  }, [autoHideDuration]);

  const handleUpdate = useCallback(() => {
    if (onUpdate) {
      onUpdate();
    }
    setVisible(false);
  }, [onUpdate]);

  const handleDismiss = useCallback(() => {
    if (onDismiss) {
      onDismiss();
    }
    setVisible(false);
  }, [onDismiss]);

  if (!visible || !updateInfo) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.icon}>🔄</div>
        <div className={styles.message}>
          <h3 className={styles.title}>API Spec Updated</h3>
          <p className={styles.description}>
            A newer version of the OpenAPI specification is available.
          </p>
          <details className={styles.details}>
            <summary>Version Details</summary>
            <pre className={styles.versionInfo}>
              Previous: {updateInfo.previousVersion || 'none'}
              {'\n'}
              Current: {updateInfo.currentVersion}
            </pre>
          </details>
        </div>
        <div className={styles.actions}>
          <button className={`${styles.button} ${styles.updateButton}`} onClick={handleUpdate} title="Refresh to load the latest spec">
            ✨ Update Now
          </button>
          <button className={`${styles.button} ${styles.dismissButton}`} onClick={handleDismiss} title="Dismiss this notification">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
