import React from 'react';

interface StatTileProps {
  value: string | number;
  label: string;
  icon?: string;
  accent?: boolean;
}

export function StatTile({ value, label, icon, accent = false }: StatTileProps) {
  return (
    <div className={`
      rounded-[16px] p-4 flex flex-col gap-2
      ${accent ? 'bg-[#14564A] text-[#FBF7EE]' : 'bg-[#FBF7EE] border border-[#E3E8E6]'}
    `}>
      {icon && <span className="text-xl">{icon}</span>}
      <div>
        <div
          className={`text-2xl font-bold leading-none ${accent ? 'text-[#E6B24A]' : 'text-[#14564A]'}`}
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {value}
        </div>
        <div className={`text-[11px] uppercase tracking-widest mt-1 ${accent ? 'text-[#FBF7EE]/60' : 'text-[#7E8A86]'}`}>
          {label}
        </div>
      </div>
    </div>
  );
}
