import React from 'react';
import {
  UploadProgress,
  formatFileSize,
  formatUploadSpeed,
  formatTimeRemaining,
} from '../hooks/useFileUploadProgress';
import styles from './FileUploadProgressBar.module.css';

interface FileUploadProgressBarProps {
  upload: UploadProgress;
  onPause?: (fileId: string) => void;
  onResume?: (fileId: string) => void;
  onCancel?: (fileId: string) => void;
  showDetails?: boolean;
  compact?: boolean;
}

/**
 * Progress bar component for file uploads
 * Shows upload progress, speed, ETA, and pause/resume/cancel controls
 */
export const FileUploadProgressBar: React.FC<FileUploadProgressBarProps> = ({
  upload,
  onPause,
  onResume,
  onCancel,
  showDetails = true,
  compact = false,
}) => {
  const isActive = upload.isUploading && !upload.isPaused;
  const showActions = !upload.isPaused && upload.error === null;

  if (compact) {
    return (
      <div className={`${styles.compactContainer} ${upload.error ? styles.error : ''}`}>
        <div className={styles.compactHeader}>
          <span className={styles.fileName}>{upload.fileName}</span>
          <span className={styles.percentage}>{upload.percentComplete}%</span>
        </div>
        <div className={styles.compactBar}>
          <div
            className={`${styles.fill} ${isActive ? styles.active : ''}`}
            style={{ width: `${upload.percentComplete}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${isActive ? styles.active : ''} ${upload.error ? styles.error : ''}`}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <div className={styles.icon}>
            {isActive && <span className={styles.uploadingIcon}>⬆️</span>}
            {upload.isPaused && <span className={styles.pausedIcon}>⏸️</span>}
            {upload.error && <span className={styles.errorIcon}>❌</span>}
            {upload.percentComplete === 100 && !isActive && !upload.error && (
              <span className={styles.completeIcon}>✅</span>
            )}
          </div>
          <div className={styles.title}>
            <div className={styles.fileName}>{upload.fileName}</div>
            <div className={styles.fileSize}>{formatFileSize(upload.fileSize)}</div>
          </div>
        </div>
        {showActions && (
          <div className={styles.controls}>
            {!upload.isPaused && upload.percentComplete < 100 && (
              <button
                className={styles.button}
                onClick={() => onPause?.(upload.fileId)}
                title="Pause upload"
                aria-label={`Pause upload for ${upload.fileName}`}
              >
                ⏸️
              </button>
            )}
            {upload.isPaused && (
              <button
                className={styles.button}
                onClick={() => onResume?.(upload.fileId)}
                title="Resume upload"
                aria-label={`Resume upload for ${upload.fileName}`}
              >
                ▶️
              </button>
            )}
            <button
              className={styles.button}
              onClick={() => onCancel?.(upload.fileId)}
              title="Cancel upload"
              aria-label={`Cancel upload for ${upload.fileName}`}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className={styles.progressContainer}>
        <div
          className={`${styles.progressBar} ${isActive ? styles.active : ''}`}
          role="progressbar"
          aria-valuenow={upload.percentComplete}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Upload progress: ${upload.percentComplete}%`}
        >
          <div
            className={styles.fill}
            style={{ width: `${upload.percentComplete}%` }}
          />
          {upload.percentComplete > 10 && (
            <span className={styles.percentage}>{upload.percentComplete}%</span>
          )}
        </div>
      </div>

      {showDetails && (
        <div className={styles.details}>
          <div className={styles.detailItem}>
            <span className={styles.label}>Uploaded:</span>
            <span className={styles.value}>
              {formatFileSize(upload.bytesUploaded)} / {formatFileSize(upload.fileSize)}
            </span>
          </div>

          {!upload.isPaused && upload.uploadSpeed > 0 && (
            <>
              <div className={styles.detailItem}>
                <span className={styles.label}>Speed:</span>
                <span className={styles.value}>{formatUploadSpeed(upload.uploadSpeed)}</span>
              </div>

              {upload.estimatedTimeRemaining > 0 && upload.percentComplete < 100 && (
                <div className={styles.detailItem}>
                  <span className={styles.label}>ETA:</span>
                  <span className={styles.value}>
                    {formatTimeRemaining(upload.estimatedTimeRemaining)}
                  </span>
                </div>
              )}
            </>
          )}

          {upload.isPaused && (
            <div className={styles.detailItem}>
              <span className={styles.label}>Status:</span>
              <span className={styles.value}>Paused</span>
            </div>
          )}

          {upload.error && (
            <div className={styles.errorMessage}>
              <strong>Error:</strong> {upload.error.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUploadProgressBar;
