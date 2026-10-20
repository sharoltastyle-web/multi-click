import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AboutScreen } from './AboutScreen';

describe('AboutScreen', () => {
  it('renders the full 1–10 multiplication table as an HTML table', () => {
    render(<AboutScreen />);
    const table = screen.getByRole('table', { name: 'לוח הכפל 1–10' });
    const headers = within(table).getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(['×', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);

    const bodyRows = table.querySelectorAll('tbody tr');
    expect(bodyRows).toHaveLength(10);
    bodyRows.forEach((row, i) => {
      const a = i + 1;
      expect(row.querySelector('th')?.textContent).toBe(String(a));
      const cells = [...row.querySelectorAll('td')].map((td) => Number(td.textContent));
      expect(cells).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((b) => a * b));
    });
  });

  it('shows the explanation text and the back-home button', () => {
    render(<AboutScreen />);
    for (const line of [
      'בוחרים תרגול אקראי או כפולה.',
      'מקלידים תשובה ולוחצים על בדיקה.',
      'טעות? מקבלים רמז ומנסים שוב.',
      'אחרי הצלחה ממשיכים לתרגיל הבא.',
      'הגרף מציג הצלחה בניסיון הראשון.',
      'התוצאות נשמרות במכשיר לכל פרופיל.',
      'באייפון מומלץ להוסיף את האפליקציה למסך הבית, כדי שהתוצאות יישמרו לאורך זמן.',
    ]) {
      expect(screen.getByText(line)).toBeInTheDocument();
    }
    expect(screen.getByText(/תרגול לוח הכפל לילדים בגילאי/)).toHaveTextContent(
      'תרגול לוח הכפל לילדים בגילאי 7–8.',
    );
    expect(screen.getByRole('link', { name: 'חזרה לבית' })).toHaveAttribute('href', '#/home');
  });
});
