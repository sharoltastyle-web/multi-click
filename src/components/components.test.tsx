import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MathExpression } from './MathExpression';
import { TextField } from './TextField';

describe('MathExpression', () => {
  it('keeps the expression in LTR order', () => {
    const { container } = render(<MathExpression a={3} b={4} />);
    const bdi = container.querySelector('bdi');
    expect(bdi).toHaveAttribute('dir', 'ltr');
    expect(bdi?.textContent).toBe('3×4=?');
  });
});

describe('TextField', () => {
  it('links the label to the input and passes inputMode', () => {
    render(<TextField label="התשובה שלך" inputMode="numeric" />);
    const input = screen.getByLabelText('התשובה שלך');
    expect(input).toHaveAttribute('inputmode', 'numeric');
  });
});
