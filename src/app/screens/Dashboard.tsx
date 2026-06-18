import React from 'react';
import { MasteryRing } from '../components/MasteryMeter';
import { StatTile } from '../components/StatTile';
import { SkillNode } from '../components/SkillNode';
import { dashboard, curriculum } from '@/lib/store/selectors';
import { NODE_LABELS, useSpadesStore } from '@/lib/store/SpadesProvider';

interface DashboardProps {
  onNavigate: (screen: string) => void;
}

const MINI_NODES = ['suits', 'trick', 'follow', 'trump', 'breaking', 'bid_basics', 'bags', 'nil'] as const;

export function Dashboard({ onNavigate }: DashboardProps) {
  const { profile, gamesPlayed, setActiveNodeId } = useSpadesStore();
  const dash = dashboard(profile, gamesPlayed);
  const nodes = curriculum(profile);
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <div className="flex flex-col gap-6 p-6 pb-24 lg:pb-8 max-w-3xl">
      <div>
        <div className="text-[11px] uppercase tracking-widest text-[#7E8A86] mb-1">Good evening</div>
        <h1 className="text-2xl font-bold text-[#15110C]" style={{ fontFamily: 'var(--font-display)' }}>
          Jordan, ready to play? ♠
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 bg-[#FBF7EE] border border-[#E3E8E6] rounded-[16px] p-5 flex flex-col items-center gap-3">
          <MasteryRing percent={dash.masteryPct} size={100} />
          <div className="text-center">
            <div className="text-[11px] uppercase tracking-widest text-[#7E8A86]">Overall Mastery</div>
            <div className="text-xs text-[#14564A] mt-1">{dash.stats.mastered} of 12 concepts mastered</div>
          </div>
        </div>

        <div
          onClick={() => {
            if (dash.continueNodeId) setActiveNodeId(dash.continueNodeId);
            onNavigate(dash.continueNodeId ? 'lesson' : 'game');
          }}
          className="lg:col-span-2 bg-[#14564A] rounded-[16px] p-5 cursor-pointer hover:bg-[#0C3128] transition-colors relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10 text-[#E6B24A] text-[120px] leading-none -mt-4 -mr-4 pointer-events-none select-none">♠</div>
          <div className="text-[11px] uppercase tracking-widest text-[#FBF7EE]/50 mb-1">Continue learning</div>
          <h2 className="text-xl font-bold text-[#FBF7EE] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            {dash.continueTitle}
          </h2>
          <p className="text-[#FBF7EE]/60 text-sm mb-4">Pick up where you left off in the skill tree</p>
          <button className="mt-4 bg-[#E6B24A] hover:bg-[#C49135] text-[#15110C] font-bold px-5 py-2.5 rounded-[999px] text-sm transition-colors">
            Continue →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile value={dash.stats.mastered} label="Mastered" icon="✓" />
        <StatTile value={dash.stats.games} label="Games played" icon="♠" />
        <StatTile value={dash.stats.streak} label="Day streak" icon="🔥" accent />
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-widest text-[#7E8A86] mb-3">Your focus areas</div>
        <div className="flex flex-wrap gap-2">
          {(dash.focus.length > 0 ? dash.focus : [{ id: 'breaking', title: 'Keep learning' }]).map((w) => (
            <button
              key={w.id}
              onClick={() => onNavigate('curriculum')}
              className="px-3 py-1.5 rounded-[999px] bg-[#FBF7EE] border border-[#E3E8E6] text-[#15110C] text-xs font-medium hover:border-[#14564A] hover:bg-[#14564A]/5 transition-colors"
            >
              {w.title} →
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] uppercase tracking-widest text-[#7E8A86]">Skill tree</div>
          <button onClick={() => onNavigate('curriculum')} className="text-[#14564A] text-xs font-medium hover:underline">View all →</button>
        </div>
        <div className="bg-[#FBF7EE] border border-[#E3E8E6] rounded-[16px] p-5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {MINI_NODES.map((id) => (
              <SkillNode
                key={id}
                label={NODE_LABELS[id] ?? id}
                state={nodeMap[id]?.status ?? 'locked'}
                onClick={() => onNavigate('curriculum')}
                small
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
