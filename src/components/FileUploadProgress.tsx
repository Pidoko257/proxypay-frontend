import React from 'react';
import FileUploadProgressBar from './FileUploadProgressBar';
import { UploadProgress } from '../hooks/useFileUploadProgress';
import styles from './FileUploadProgress.module.css';

interface FileUploadProgressProps {
  uploads: UploadProgress[];
  onPause?: (fileId: string) => void;
  onResume?: (fileId: string) => void;
  onCancel?: (fileId: string) => void;
  showDetails?: boolean;
  compact?: boolean;
  title?: string;
}

/**
 * Container component that displays all active file uploads
 * Shows progress bars with controls for each upload
 */
export const FileUploadProgress: React.FC<FileUploadProgressProps> = ({
  uploads,
  onPause,
  onResume,
  onCancel,
  showDetails = true,
  compact = false,
  title = 'Active Uploads',
}) => {
  if (uploads.length === 0) {
    return null;
  }

  const activeUploads = uploads.filter(u => u.isUploading || u.isPaused);
  const completedUploads = uploads.filter(u => !u.isUploading && !u.isPaused && u.error === null);
  const failedUploads = uploads.filter(u => u.error !== null);

  return (
    <div className={styles.container}>
      {uploads.length > 0 && (
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <div className={styles.summary}>
            {activeUploads.length > 0 && (
              <span className={styles.badge}>{activeUploads.length} uploading</span>
            )}
            {completedUploads.length > 0 && (
              <span className={`${styles.badge} ${styles.success}`}>{completedUploads.length} completed</span>
            )}
            {failedUploads.length > 0 && (
              <span className={`${styles.badge} ${styles.error}`}>{failedUploads.length} failed</span>
            )}
          </div>
        </div>
      )}

      <div className={styles.uploadsList}>
        {activeUploads.map(upload => (
          <FileUploadProgressBar
            key={upload.fileId}
            upload={upload}
            onPause={onPause}
            onResume={onResume}
            onCancel={onCancel}
            showDetails={showDetails}
            compact={compact}
          />
        ))}

        {completedUploads.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>✅ Completed</div>
            {completedUploads.map(upload => (
              <FileUploadProgressBar
                key={upload.fileId}
                upload={upload}
                onCancel={onCancel}
                showDetails={false}
                compact
              />
            ))}
          </div>
        )}

        {failedUploads.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>❌ Failed</div>
            {failedUploads.map(upload => (
              <FileUploadProgressBar
                key={upload.fileId}
                upload={upload}
                onCancel={onCancel}
                showDetails={false}
                compact
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploadProgress;
