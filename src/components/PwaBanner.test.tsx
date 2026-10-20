import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PWA_NEEDS_CONNECTION_MESSAGE, PWA_READY_MESSAGE } from '../pwa/pwaStatus';
import { PwaBanner } from './PwaBanner';

describe('PwaBanner', () => {
  it('renders an empty live region when there is nothing to say', () => {
    render(<PwaBanner display="none" />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('shows the ready message', () => {
    render(<PwaBanner display="readyMessage" />);
    expect(screen.getByRole('status')).toHaveTextContent(PWA_READY_MESSAGE);
  });

  it('shows the needs-connection message', () => {
    render(<PwaBanner display="needsConnection" />);
    expect(screen.getByRole('status')).toHaveTextContent(PWA_NEEDS_CONNECTION_MESSAGE);
  });
});
