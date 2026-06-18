import React from 'react';

interface MasteryMeterProps {
  current: number;
  total?: number;
  label?: string;
  size?: 'sm' | 'md';
}

export function MasteryMeter({ current, total = 3, label, size = 'md' }: MasteryMeterProps) {
  const dotSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5';

  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-[11px] uppercase tracking-widest text-[#7E8A86] font-medium">{label}</span>}
      <div className="flex gap-1.5 items-center">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`${dotSize} rounded-full border-2 transition-all duration-300 ${
              i < current
                ? 'bg-[#E6B24A] border-[#C49135]'
                : 'bg-transparent border-[#B5BDB9]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

interface MasteryRingProps {
  percent: number;
  size?: number;
  label?: string;
}

export function MasteryRing({ percent, size = 96, label }: MasteryRingProps) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E3E8E6"
            strokeWidth={6}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E6B24A"
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-[#14564A]" style={{ fontFamily: 'var(--font-display)' }}>{percent}%</span>
          <span className="text-[10px] uppercase tracking-wider text-[#7E8A86]">mastery</span>
        </div>
      </div>
      {label && <span className="text-xs text-[#7E8A86]">{label}</span>}
    </div>
  );
}
