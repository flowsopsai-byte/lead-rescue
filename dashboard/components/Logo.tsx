export function LeadRescueMark() {
  return (
    <div className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-gradient-to-br from-brand to-[#06B6D4] text-white">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 12a8 8 0 1 0 2.3-5.7" />
        <path d="M4 4v4h4" />
      </svg>
    </div>
  );
}

export function FlowsOpsMark() {
  return (
    <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[7px] bg-white">
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <defs>
          <linearGradient id="fog" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2563EB" />
            <stop offset="1" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
        <rect x="3.5" y="2.5" width="17" height="5.2" rx="2.6" fill="#0F1E3D" />
        <path d="M6.1 9.8H13.4a2.3 2.3 0 0 1 0 4.6H8.7v4.5a2.6 2.6 0 0 1-5.2 0v-6.5a2.6 2.6 0 0 1 2.6-2.6z" fill="url(#fog)" />
        <circle cx="15.6" cy="19" r="2.3" fill="url(#fog)" />
      </svg>
    </span>
  );
}
