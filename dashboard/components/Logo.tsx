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
    <span className="flex h-[26px] w-[26px] flex-none items-center justify-center overflow-hidden rounded-[7px] bg-white p-[3px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/flowsops-mark.png" alt="" width={20} height={20} className="h-5 w-5 object-contain" />
    </span>
  );
}
