import React from 'react';
import { useCoachApiStatus } from '@/lib/teaching/content/useCoachApiStatus';

interface CoachApiBannerProps {
  /** Only show on screens that use the coach API (lesson, practice, play). */
  show: boolean;
}

export function CoachApiBanner({ show }: CoachApiBannerProps) {
  const online = useCoachApiStatus();

  if (!show || online !== false) return null;

  return (
    <div className="bg-[#BD3B33]/10 border-b border-[#BD3B33]/25 px-4 py-2.5 text-center text-xs text-[#15110C] leading-relaxed">
      <strong>Coach API offline.</strong> You only need one command:{' '}
      <code className="bg-black/5 px-1.5 py-0.5 rounded font-semibold">npm run stop</code>
      {' '}then{' '}
      <code className="bg-black/5 px-1.5 py-0.5 rounded font-semibold">npm run start</code>
      . Don&apos;t run <code className="bg-black/5 px-1 rounded">coach</code> separately.
      Open <strong>http://localhost:5173</strong> → <strong>Play</strong> for animations.
    </div>
  );
}
