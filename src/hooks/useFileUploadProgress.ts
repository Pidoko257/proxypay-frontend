import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Upload progress information
 */
export interface UploadProgress {
  fileId: string;
  fileName: string;
  fileSize: number;
  bytesUploaded: number;
  percentComplete: number;
  uploadSpeed: number; // bytes per second
  estimatedTimeRemaining: number; // milliseconds
  isUploading: boolean;
  isPaused: boolean;
  error: Error | null;
  startTime: number;
  lastUpdateTime: number;
}

/**
 * Hook to manage file upload progress with pause/resume capability
 */
export function useFileUploadProgress() {
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map());
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  /**
   * Start or resume an upload
   */
  const startUpload = useCallback(
    (
      fileId: string,
      fileName: string,
      fileSize: number,
      uploadFn: (
        onProgress: (bytesUploaded: number) => void,
        signal: AbortSignal,
      ) => Promise<void>,
    ) => {
      const abortController = new AbortController();
      abortControllers.current.set(fileId, abortController);

      const startTime = Date.now();
      let lastUpdateTime = startTime;

      const handleProgress = (bytesUploaded: number) => {
        const now = Date.now();
        const timeDeltaMs = now - lastUpdateTime;
        const bytesDelta = bytesUploaded - (uploads.get(fileId)?.bytesUploaded || 0);

        const uploadSpeed = timeDeltaMs > 0 ? (bytesDelta / timeDeltaMs) * 1000 : 0; // bytes/sec
        const remainingBytes = fileSize - bytesUploaded;
        const estimatedTimeRemaining = uploadSpeed > 0 ? (remainingBytes / uploadSpeed) * 1000 : 0;

        setUploads((prev) => {
          const newMap = new Map(prev);
          newMap.set(fileId, {
            fileId,
            fileName,
            fileSize,
            bytesUploaded,
            percentComplete: Math.round((bytesUploaded / fileSize) * 100),
            uploadSpeed: Math.round(uploadSpeed),
            estimatedTimeRemaining: Math.max(0, Math.round(estimatedTimeRemaining)),
            isUploading: true,
            isPaused: false,
            error: null,
            startTime,
            lastUpdateTime: now,
          });
          return newMap;
        });

        lastUpdateTime = now;
      };

      // Initialize progress
      setUploads((prev) => {
        const newMap = new Map(prev);
        newMap.set(fileId, {
          fileId,
          fileName,
          fileSize,
          bytesUploaded: 0,
          percentComplete: 0,
          uploadSpeed: 0,
          estimatedTimeRemaining: 0,
          isUploading: true,
          isPaused: false,
          error: null,
          startTime,
          lastUpdateTime: startTime,
        });
        return newMap;
      });

      // Execute upload
      uploadFn(handleProgress, abortController.signal)
        .then(() => {
          setUploads((prev) => {
            const newMap = new Map(prev);
            const upload = newMap.get(fileId);
            if (upload) {
              newMap.set(fileId, {
                ...upload,
                isUploading: false,
                percentComplete: 100,
              });
            }
            return newMap;
          });
        })
        .catch((error) => {
          // Don't set error if upload was aborted
          if (error.name !== 'AbortError') {
            setUploads((prev) => {
              const newMap = new Map(prev);
              const upload = newMap.get(fileId);
              if (upload) {
                newMap.set(fileId, {
                  ...upload,
                  isUploading: false,
                  error,
                });
              }
              return newMap;
            });
          }
        });
    },
    [uploads],
  );

  /**
   * Pause an upload
   */
  const pauseUpload = useCallback((fileId: string) => {
    const controller = abortControllers.current.get(fileId);
    if (controller) {
      controller.abort();
    }

    setUploads((prev) => {
      const newMap = new Map(prev);
      const upload = newMap.get(fileId);
      if (upload) {
        newMap.set(fileId, {
          ...upload,
          isUploading: false,
          isPaused: true,
        });
      }
      return newMap;
    });
  }, []);

  /**
   * Resume a paused upload
   */
  const resumeUpload = useCallback(
    (
      fileId: string,
      uploadFn: (
        onProgress: (bytesUploaded: number) => void,
        signal: AbortSignal,
      ) => Promise<void>,
    ) => {
      const upload = uploads.get(fileId);
      if (!upload) return;

      const abortController = new AbortController();
      abortControllers.current.set(fileId, abortController);

      const lastUpdateTime = Date.now();

      const handleProgress = (bytesUploaded: number) => {
        const now = Date.now();
        const timeDeltaMs = now - lastUpdateTime;
        const bytesDelta = bytesUploaded - upload.bytesUploaded;

        const uploadSpeed = timeDeltaMs > 0 ? (bytesDelta / timeDeltaMs) * 1000 : 0;
        const remainingBytes = upload.fileSize - bytesUploaded;
        const estimatedTimeRemaining = uploadSpeed > 0 ? (remainingBytes / uploadSpeed) * 1000 : 0;

        setUploads((prev) => {
          const newMap = new Map(prev);
          newMap.set(fileId, {
            ...upload,
            bytesUploaded,
            percentComplete: Math.round((bytesUploaded / upload.fileSize) * 100),
            uploadSpeed: Math.round(uploadSpeed),
            estimatedTimeRemaining: Math.max(0, Math.round(estimatedTimeRemaining)),
            isUploading: true,
            isPaused: false,
          });
          return newMap;
        });
      };

      setUploads((prev) => {
        const newMap = new Map(prev);
        newMap.set(fileId, {
          ...upload,
          isUploading: true,
          isPaused: false,
        });
        return newMap;
      });

      uploadFn(handleProgress, abortController.signal)
        .then(() => {
          setUploads((prev) => {
            const newMap = new Map(prev);
            newMap.set(fileId, {
              ...upload,
              isUploading: false,
              percentComplete: 100,
            });
            return newMap;
          });
        })
        .catch((error) => {
          if (error.name !== 'AbortError') {
            setUploads((prev) => {
              const newMap = new Map(prev);
              newMap.set(fileId, {
                ...upload,
                isUploading: false,
                error,
              });
              return newMap;
            });
          }
        });
    },
    [uploads],
  );

  /**
   * Cancel an upload
   */
  const cancelUpload = useCallback((fileId: string) => {
    const controller = abortControllers.current.get(fileId);
    if (controller) {
      controller.abort();
    }
    abortControllers.current.delete(fileId);

    setUploads((prev) => {
      const newMap = new Map(prev);
      newMap.delete(fileId);
      return newMap;
    });
  }, []);

  /**
   * Get progress for a specific upload
   */
  const getProgress = useCallback(
    (fileId: string): UploadProgress | undefined => {
      return uploads.get(fileId);
    },
    [uploads],
  );

  /**
   * Get all active uploads
   */
  const getAllProgress = useCallback((): UploadProgress[] => {
    return Array.from(uploads.values());
  }, [uploads]);

  return {
    uploads,
    startUpload,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    getProgress,
    getAllProgress,
  };
}

/**
 * Format bytes to human-readable size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format upload speed (bytes/sec) to human-readable
 */
export function formatUploadSpeed(bytesPerSecond: number): string {
  return formatFileSize(bytesPerSecond) + '/s';
}

/**
 * Format time remaining (milliseconds) to human-readable
 */
export function formatTimeRemaining(ms: number): string {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}
