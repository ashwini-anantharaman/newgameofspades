import React, { useEffect, useState } from 'react';
import { PlayingCard } from './PlayingCard';
import type { Card } from '@/lib/engine/types';

const SEAT_NAMES: Record<string, string> = {
  N: 'North',
  E: 'East',
  W: 'West',
  S: 'You',
};

interface TrickRevealProps {
  trick: { seat: string; card: Card }[];
  paceMs?: number;
}

/** Reveal trick cards one seat at a time (practice / lesson demos). */
export function TrickReveal({ trick, paceMs = 900 }: TrickRevealProps) {
  const [revealed, setRevealed] = useState(0);
  const [status, setStatus] = useState<string | null>(trick.length ? `${SEAT_NAMES[trick[0].seat] ?? trick[0].seat} played…` : null);

  useEffect(() => {
    setRevealed(0);
    if (!trick.length) {
      setStatus(null);
      return;
    }
    setStatus(`${SEAT_NAMES[trick[0].seat] ?? trick[0].seat} played…`);
    let i = 0;
    const tick = () => {
      i += 1;
      setRevealed(i);
      if (i < trick.length) {
        setStatus(`${SEAT_NAMES[trick[i].seat] ?? trick[i].seat} played…`);
        timer = window.setTimeout(tick, paceMs);
      } else {
        setStatus(null);
      }
    };
    let timer = window.setTimeout(tick, paceMs);
    return () => clearTimeout(timer);
  }, [trick, paceMs]);

  if (!trick.length) {
    return <div className="text-[#FBF7EE]/40 text-xs py-4">You&apos;re leading this trick</div>;
  }

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {status && (
        <div className="text-[#FBF7EE] text-xs font-medium px-3 py-1.5 rounded-full bg-black/30 animate-pulse">
          {status}
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-4">
        {trick.slice(0, revealed).map((t) => (
          <div key={t.seat} className="text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="text-[#FBF7EE]/40 text-[9px] mb-1">{SEAT_NAMES[t.seat] ?? t.seat}</div>
            <PlayingCard suit={t.card.suit} rank={t.card.rank} size="sm" />
          </div>
        ))}
      </div>
    </div>
  );
}
