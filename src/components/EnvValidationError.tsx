import React, { ReactNode } from 'react';
import styles from './EnvValidationError.module.css';
import { validateEnvironment, displayValidationErrors } from '../../utils/envValidator';

interface EnvValidationErrorProps {
  children?: ReactNode;
}

interface EnvValidationErrorState {
  validationError: Error | null;
}

/**
 * Component that validates environment configuration at app initialization
 * Displays helpful error messages if validation fails
 */
class EnvValidationError extends React.Component<EnvValidationErrorProps, EnvValidationErrorState> {
  state: EnvValidationErrorState = { validationError: null };

  componentDidMount(): void {
    const result = validateEnvironment();
    if (!result.valid) {
      displayValidationErrors(result);
      const errorMessages = result.errors
        .map((e) => `${e.variable}: ${e.reason}${e.format ? ` (expected: ${e.format})` : ''}`)
        .join('\n');
      this.setState({
        validationError: new Error(`Environment validation failed:\n\n${errorMessages}`),
      });
    }
  }

  render(): ReactNode {
    if (this.state.validationError) {
      return (
        <main className={styles.errorContainer} role="alert">
          <div className={styles.errorContent}>
            <div className={styles.iconWrapper}>
              <span className={styles.errorIcon}>⚠️</span>
            </div>
            <h1 className={styles.errorTitle}>Configuration Error</h1>
            <p className={styles.errorSubtitle}>
              Your application cannot start due to missing or invalid environment variables.
            </p>
            <div className={styles.errorDetails}>
              <p className={styles.errorMessage}>
                {this.state.validationError.message}
              </p>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => window.location.reload()}
                >
                  Retry
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => {
                    const text = this.state.validationError?.message || '';
                    navigator.clipboard.writeText(text).then(() => {
                      alert('Error details copied to clipboard');
                    });
                  }}
                >
                  Copy Error
                </button>
              </div>
            </div>
            <div className={styles.helpText}>
              <p>
                <strong>Need help?</strong> Check the{' '}
                <a
                  href="https://github.com/Pidoko257/proxypay-frontend#environment-setup"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  environment setup documentation
                </a>
                .
              </p>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

export default EnvValidationError;
