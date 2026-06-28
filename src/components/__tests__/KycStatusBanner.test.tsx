import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import KycStatusBanner from '../KycStatusBanner';

jest.mock('@docusaurus/Link', () => {
  return function Link({
    children,
    href,
    to,
  }: {
    children: React.ReactNode;
    href?: string;
    to?: string;
  }) {
    return <a href={href ?? to}>{children}</a>;
  };
});

describe('KycStatusBanner', () => {
  it('renders pending state with correct message and CTA', () => {
    render(<KycStatusBanner status="pending" />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByText(/under review/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /check status/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
  });

  it('renders approved state with correct message, CTA, and dismiss button', () => {
    render(<KycStatusBanner status="approved" />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByText(/fully verified/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view profile/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
  });

  it('renders rejected state with correct message and CTA', () => {
    render(<KycStatusBanner status="rejected" />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByText(/rejected/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /resubmit documents/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
  });

  it('renders incomplete state with correct message and CTA', () => {
    render(<KycStatusBanner status="incomplete" />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByText(/incomplete/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /complete verification/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
  });

  it('hides the banner when dismissed in approved state', () => {
    render(<KycStatusBanner status="approved" />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });
});
