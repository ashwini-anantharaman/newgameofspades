import React from 'react';
import { SkillNode } from '../components/SkillNode';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { progress } from '@/lib/store/selectors';
import { NODE_LABELS, useSpadesStore } from '@/lib/store/SpadesProvider';

interface ProgressProps {
  onNavigate: (screen: string) => void;
}

export function Progress({ onNavigate }: ProgressProps) {
  const { profile } = useSpadesStore();
  const data = progress(profile);

  const masteryHistory = data.masteryOverTime.map((p) => ({
    date: new Date(p.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    mastery: p.pct,
  }));

  return (
    <div className="flex flex-col gap-6 p-6 pb-24 lg:pb-8 max-w-2xl">
      <div>
        <div className="text-[11px] uppercase tracking-widest text-[#7E8A86] mb-1">Profile</div>
        <h1 className="text-2xl font-bold text-[#15110C]" style={{ fontFamily: 'var(--font-display)' }}>Progress & Mastery</h1>
      </div>

      <div className="bg-[#FBF7EE] border border-[#E3E8E6] rounded-[16px] p-5">
        <div className="text-[11px] uppercase tracking-widest text-[#7E8A86] mb-4">Mastery over time</div>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={masteryHistory.length > 0 ? masteryHistory : [{ date: 'Now', mastery: 0 }]}>
            <defs>
              <linearGradient id="masteryGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14564A" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#14564A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#7E8A86' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#7E8A86' }} axisLine={false} tickLine={false} width={28} tickFormatter={(v) => `${v}%`} />
            <Tooltip contentStyle={{ background: '#FBF7EE', border: '1px solid #E3E8E6', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v}%`, 'Mastery']} />
            <Area type="monotone" dataKey="mastery" stroke="#14564A" strokeWidth={2} fill="url(#masteryGrad)" dot={{ r: 3, fill: '#14564A' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {data.review.length > 0 && (
        <div className="bg-[#C9772E]/10 border border-[#C9772E]/30 rounded-[16px] p-4">
          <div className="text-[11px] uppercase tracking-widest text-[#C9772E] mb-2">Needs review</div>
          <div className="flex flex-wrap gap-2">
            {data.review.map((r) => (
              <span key={r.id} className="text-sm text-[#15110C] bg-[#FBF7EE] px-3 py-1 rounded-full">{r.title}</span>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="text-[11px] uppercase tracking-widest text-[#7E8A86] mb-3">Skill tree</div>
        <div className="bg-[#FBF7EE] border border-[#E3E8E6] rounded-[16px] p-5">
          <div className="flex flex-wrap gap-4 justify-center">
            {data.nodes.map((n) => (
              <SkillNode key={n.id} label={NODE_LABELS[n.id] ?? n.title} state={n.status} onClick={() => onNavigate('curriculum')} small />
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-widest text-[#7E8A86] mb-3">Concept detail</div>
        <div className="flex flex-col gap-2">
          {data.nodes.map((c) => (
            <div key={c.id} className="bg-[#FBF7EE] border border-[#E3E8E6] rounded-[16px] px-4 py-3 flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                c.status === 'mastered' ? 'bg-[#E6B24A]' : c.status === 'in-progress' ? 'bg-[#14564A]' : c.status === 'available' ? 'border-2 border-[#E6B24A]' : 'bg-[#D0D7D4]'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[#15110C] text-sm truncate">{c.title}</div>
                {c.decayed && <div className="text-[#C9772E] text-xs">Needs review</div>}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-bold text-sm text-[#14564A]" style={{ fontFamily: 'var(--font-display)' }}>
                  {c.demonstrations}/{c.masteryTarget}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-widest text-[#7E8A86] mb-3">Game history</div>
        <div className="flex flex-col gap-2">
          {data.games.length === 0 ? (
            <div className="text-sm text-[#7E8A86] py-4 text-center">No games yet — play a coached game to start tracking.</div>
          ) : (
            data.games.map((g, i) => (
              <div key={i} className="bg-[#FBF7EE] border border-[#E3E8E6] rounded-[16px] px-4 py-3">
                <div className="font-medium text-[#15110C] text-sm">{g.label}</div>
                <div className="text-[#7E8A86] text-xs">{new Date(g.ts).toLocaleDateString()}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
