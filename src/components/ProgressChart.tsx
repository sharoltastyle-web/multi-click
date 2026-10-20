import {
  formatPercent,
  formatShortDate,
  lastPracticeDays,
  type DailyProgress,
} from '../domain/progress';
import styles from './ProgressChart.module.css';

const WIDTH = 320;
const HEIGHT = 200;
const PLOT = { left: 48, right: 296, top: 28, bottom: 168 };
const Y_TICKS = [0, 20, 40, 60, 80, 100];
// Dots and their labels stay clear of the axes.
const DOTS = { left: PLOT.left + 20, right: PLOT.right - 12 };

interface Point {
  day: DailyProgress;
  x: number;
  y: number;
}

function yFor(accuracy: number) {
  return PLOT.bottom - (accuracy / 100) * (PLOT.bottom - PLOT.top);
}

/** Practice days are evenly spaced, so the chart stays tidy for young children. */
function layout(days: readonly DailyProgress[]): Point[] {
  const step = days.length > 1 ? (DOTS.right - DOTS.left) / (days.length - 1) : 0;
  return days.map((day, i) => ({
    day,
    x: days.length > 1 ? DOTS.left + i * step : (DOTS.left + DOTS.right) / 2,
    y: yFor(day.accuracy),
  }));
}

/** First-attempt accuracy per practice day (latest 7), as a simple responsive SVG line chart. */
export function ProgressChart({ days }: { days: readonly DailyProgress[] }) {
  const shown = lastPracticeDays(days);
  if (shown.length === 0) return null;
  const points = layout(shown);
  const description = shown
    .map((day) => `${formatShortDate(day.date)} ${formatPercent(day.accuracy)}`)
    .join(', ');

  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      direction="ltr"
      role="img"
      aria-label={`אחוז הצלחה בניסיון הראשון: ${description}`}
    >
      <g className={styles.grid}>
        {Y_TICKS.map((tick) => (
          <line key={tick} x1={PLOT.left} x2={PLOT.right} y1={yFor(tick)} y2={yFor(tick)} />
        ))}
        {points.map((point) => (
          <line key={point.day.date} x1={point.x} x2={point.x} y1={PLOT.top} y2={PLOT.bottom} />
        ))}
      </g>
      <line className={styles.axis} x1={PLOT.left} x2={PLOT.left} y1={PLOT.top} y2={PLOT.bottom} />
      <line
        className={styles.axis}
        x1={PLOT.left}
        x2={PLOT.right}
        y1={PLOT.bottom}
        y2={PLOT.bottom}
      />

      {Y_TICKS.map((tick) => (
        <text key={tick} className={styles.tick} x={PLOT.left - 8} y={yFor(tick)} textAnchor="end" dominantBaseline="middle">
          {tick}%
        </text>
      ))}

      {points.length > 1 && (
        <polyline className={styles.line} points={points.map((p) => `${p.x},${p.y}`).join(' ')} />
      )}

      {points.map((point) => (
        <g key={point.day.date}>
          <circle className={styles.dot} cx={point.x} cy={point.y} r={6} />
          <text className={styles.value} x={point.x} y={point.y - 12} textAnchor="middle">
            {formatPercent(point.day.accuracy)}
          </text>
          <text className={styles.tick} x={point.x} y={PLOT.bottom + 22} textAnchor="middle">
            {formatShortDate(point.day.date)}
          </text>
        </g>
      ))}
    </svg>
  );
}
