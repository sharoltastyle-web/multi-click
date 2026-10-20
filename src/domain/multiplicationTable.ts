export const TABLE_FACTORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/** Rows of the 1–10 multiplication table: rows[r][c] = (r + 1) × (c + 1). */
export function multiplicationRows(): number[][] {
  return TABLE_FACTORS.map((row) => TABLE_FACTORS.map((col) => row * col));
}
