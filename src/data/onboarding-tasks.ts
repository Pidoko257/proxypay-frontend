export interface OnboardingTask {
  id: string;
  label: string;
  description: string;
}

export const ONBOARDING_TASKS: OnboardingTask[] = [
  {
    id: 'verify-email',
    label: 'Verify Email Address',
    description: 'Confirm your email to activate your account',
  },
  {
    id: 'complete-kyc',
    label: 'Complete KYC Verification',
    description: 'Submit your business documents for verification',
  },
  {
    id: 'generate-api-key',
    label: 'Generate API Key',
    description: 'Create your first API key to start integrating',
  },
  {
    id: 'configure-webhook',
    label: 'Configure Webhook',
    description: 'Set up webhooks to receive payment notifications',
  },
  {
    id: 'initiate-test-payment',
    label: 'Initiate Test Payment',
    description: 'Process a test transaction in sandbox mode',
  },
];
