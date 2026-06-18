import React from 'react';
import type { NodeStatus } from '@/lib/teaching/skillTree';

export type NodeState = NodeStatus;

interface SkillNodeProps {
  label: string;
  state: NodeState;
  onClick?: () => void;
  small?: boolean;
}

export function SkillNode({ label, state, onClick, small = false }: SkillNodeProps) {
  const configs: Record<NodeState, { bg: string; border: string; text: string; icon: string; glow: boolean }> = {
    locked: {
      bg: 'bg-[#D0D7D4]',
      border: 'border-[#B5BDB9]',
      text: 'text-[#7E8A86]',
      icon: '🔒',
      glow: false,
    },
    available: {
      bg: 'bg-[#FBF7EE]',
      border: 'border-[#E6B24A] border-2',
      text: 'text-[#14564A]',
      icon: '◈',
      glow: true,
    },
    'in-progress': {
      bg: 'bg-[#14564A]',
      border: 'border-[#0C3128]',
      text: 'text-[#FBF7EE]',
      icon: '◑',
      glow: false,
    },
    mastered: {
      bg: 'bg-[#E6B24A]',
      border: 'border-[#C49135]',
      text: 'text-[#15110C]',
      icon: '✓',
      glow: false,
    },
  };

  const cfg = configs[state];
  const size = small ? 'w-12 h-12' : 'w-16 h-16';
  const textSize = small ? 'text-[9px]' : 'text-[10px]';
  const iconSize = small ? 'text-base' : 'text-xl';

  return (
    <button
      onClick={state !== 'locked' ? onClick : undefined}
      disabled={state === 'locked'}
      className={`
        flex flex-col items-center gap-1 group
        ${state !== 'locked' ? 'cursor-pointer' : 'cursor-default'}
      `}
    >
      <div
        className={`
          ${size} rounded-full flex items-center justify-center border transition-all duration-200
          ${cfg.bg} ${cfg.border}
          ${cfg.glow ? 'shadow-[0_0_12px_rgba(230,178,74,0.4)]' : 'shadow-sm'}
          ${state !== 'locked' ? 'group-hover:scale-110 group-hover:shadow-md' : ''}
        `}
      >
        <span className={iconSize}>{cfg.icon}</span>
      </div>
      <span className={`${textSize} font-medium text-center leading-tight max-w-[64px] ${cfg.text} uppercase tracking-wide`}>
        {label}
      </span>
    </button>
  );
}
