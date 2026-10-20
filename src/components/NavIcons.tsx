const common = {
  width: 28,
  height: 28,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
  focusable: false,
} as const;

export function HomeIcon() {
  return (
    <svg {...common}>
      <path d="M12 3 2.5 11.2h2.8V21h5.2v-6h3v6h5.2v-9.8h2.8z" fill="currentColor" />
    </svg>
  );
}

export function ChartIcon() {
  return (
    <svg {...common}>
      <rect x="4" y="13" width="4" height="8" rx="1" fill="currentColor" />
      <rect x="10" y="8" width="4" height="13" rx="1" fill="currentColor" />
      <rect x="16" y="3" width="4" height="18" rx="1" fill="currentColor" />
    </svg>
  );
}

export function InfoIcon() {
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="12" cy="7.5" r="1.5" fill="currentColor" />
      <rect x="10.8" y="10.5" width="2.4" height="7.5" rx="1.2" fill="currentColor" />
    </svg>
  );
}
