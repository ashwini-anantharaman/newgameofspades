import React, { useState } from 'react';
import { SkillNode } from '../components/SkillNode';
import { MasteryMeter } from '../components/MasteryMeter';
import { curriculum } from '@/lib/store/selectors';
import { NODE_LABELS, useSpadesStore } from '@/lib/store/SpadesProvider';

interface CurriculumProps {
  onNavigate: (screen: string) => void;
}

const legendItems = [
  { state: 'locked', label: 'Locked' },
  { state: 'available', label: 'Available' },
  { state: 'in-progress', label: 'In progress' },
  { state: 'mastered', label: 'Mastered' },
] as const;

const legendColors: Record<string, string> = {
  locked: 'bg-[#D0D7D4]',
  available: 'bg-[#FBF7EE] border-2 border-[#E6B24A]',
  'in-progress': 'bg-[#14564A]',
  mastered: 'bg-[#E6B24A]',
};

const ROWS: number[][] = [
  [0], [1, 2], [3], [4, 5], [6], [7, 8], [9], [10, 11],
];

export function Curriculum({ onNavigate }: CurriculumProps) {
  const { profile, setActiveNodeId, setPlayMode } = useSpadesStore();
  const nodes = curriculum(profile);
  const [selected, setSelected] = useState<string | null>(null);
  const selectedNode = nodes.find((n) => n.id === selected);

  const pickNode = (id: string) => {
    setSelected(id);
    setActiveNodeId(id);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-0 min-h-[calc(100vh-64px)] pb-20 lg:pb-0">
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="mb-6">
          <div className="text-[11px] uppercase tracking-widest text-[#7E8A86] mb-1">Skill Tree</div>
          <h1 className="text-2xl font-bold text-[#15110C]" style={{ fontFamily: 'var(--font-display)' }}>Curriculum</h1>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          {legendItems.map((l) => (
            <div key={l.state} className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full ${legendColors[l.state]} flex items-center justify-center`}>
                {l.state === 'mastered' && <span className="text-[10px] text-[#15110C]">✓</span>}
                {l.state === 'in-progress' && <span className="text-[10px] text-white">◑</span>}
              </div>
              <span className="text-[11px] uppercase tracking-wider text-[#7E8A86]">{l.label}</span>
            </div>
          ))}
        </div>

        <div className="relative">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
            <line x1="50%" y1="80px" x2="25%" y2="160px" stroke="#E3E8E6" strokeWidth="2" strokeDasharray="4 4" />
            <line x1="50%" y1="80px" x2="75%" y2="160px" stroke="#E3E8E6" strokeWidth="2" strokeDasharray="4 4" />
            <line x1="25%" y1="240px" x2="50%" y2="320px" stroke="#E3E8E6" strokeWidth="2" strokeDasharray="4 4" />
            <line x1="75%" y1="240px" x2="50%" y2="320px" stroke="#E3E8E6" strokeWidth="2" strokeDasharray="4 4" />
            <line x1="50%" y1="400px" x2="25%" y2="480px" stroke="#E3E8E6" strokeWidth="2" strokeDasharray="4 4" />
            <line x1="50%" y1="400px" x2="75%" y2="480px" stroke="#E3E8E6" strokeWidth="2" strokeDasharray="4 4" />
          </svg>

          <div className="relative z-10 flex flex-col gap-6">
            {ROWS.map((row, ri) => (
              <div key={ri} className={`flex ${row.length > 1 ? 'justify-around px-4' : 'justify-center'}`}>
                {row.map((idx) => {
                  const node = nodes[idx];
                  return (
                    <SkillNode
                      key={node.id}
                      label={NODE_LABELS[node.id] ?? node.title}
                      state={node.status}
                      onClick={() => pickNode(node.id)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`
        lg:w-80 border-l border-[#E3E8E6] bg-[#FBF7EE] flex flex-col
        ${selectedNode ? 'flex' : 'hidden lg:flex lg:items-center lg:justify-center'}
      `}>
        {selectedNode ? (
          <div className="p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-widest text-[#7E8A86]">{selectedNode.status.replace('-', ' ')}</div>
              <button onClick={() => setSelected(null)} className="text-[#7E8A86] hover:text-[#15110C] text-xl leading-none">×</button>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#15110C]" style={{ fontFamily: 'var(--font-display)' }}>
                {selectedNode.title}
              </h2>
            </div>
            <p className="text-[#15110C] text-sm leading-relaxed">{selectedNode.blurb}</p>
            {selectedNode.decayed && (
              <div className="text-xs text-[#C9772E] bg-[#C9772E]/10 px-3 py-2 rounded-lg">Needs review</div>
            )}
            <MasteryMeter current={selectedNode.demonstrations} total={selectedNode.masteryTarget} label="Mastery" />
            <div className="flex flex-col gap-2 mt-2">
              {selectedNode.status !== 'locked' && (
                <button
                  onClick={() => { setActiveNodeId(selectedNode.id); onNavigate('lesson'); }}
                  className="w-full bg-[#14564A] hover:bg-[#0C3128] text-[#FBF7EE] font-bold py-3 rounded-[999px] text-sm transition-colors"
                >
                  <span className="text-[10px] opacity-80 block mb-0.5">Phase 1</span>
                  {selectedNode.status === 'mastered' ? 'Review lesson' : 'Learn'}
                </button>
              )}
              {selectedNode.status !== 'locked' && (
                <button
                  onClick={() => { setActiveNodeId(selectedNode.id); onNavigate('practice'); }}
                  className="w-full bg-[#FBF7EE] border-2 border-[#14564A] text-[#14564A] font-bold py-3 rounded-[999px] text-sm transition-colors hover:bg-[#14564A]/5"
                >
                  <span className="text-[10px] opacity-80 block mb-0.5">Phase 1 · Drill</span>
                  Practice scenarios
                </button>
              )}
              {selectedNode.status !== 'locked' && (
                <button
                  onClick={() => { setPlayMode('Hard'); onNavigate('game'); }}
                  className="w-full bg-[#FBF7EE] border-2 border-[#E6B24A] text-[#15110C] font-bold py-3 rounded-[999px] text-sm transition-colors hover:bg-[#E6B24A]/10"
                >
                  <span className="text-[10px] text-[#C49135] block mb-0.5">Phase 2 · Hard questions</span>
                  Quiz me while I play
                </button>
              )}
              {selectedNode.status !== 'locked' && (
                <button
                  onClick={() => { setPlayMode('Solo'); onNavigate('game'); }}
                  className="w-full bg-[#E6B24A] hover:bg-[#C49135] text-[#15110C] font-bold py-3 rounded-[999px] text-sm transition-colors"
                >
                  <span className="text-[10px] opacity-80 block mb-0.5">Phase 3 · Solo</span>
                  Play vs AI only
                </button>
              )}
              {selectedNode.status === 'locked' && (
                <div className="text-center text-[#7E8A86] text-sm py-4">
                  Complete the lesson and practice on prerequisite nodes to unlock
                </div>
              )}
              {selectedNode.status !== 'locked' && selectedNode.deps.length > 0 && selectedNode.status === 'available' && (
                <p className="text-[10px] text-[#7E8A86] text-center">Start with Learn → Practice → Hard play → Solo</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center p-8 text-[#7E8A86]">
            <div className="text-4xl mb-3 opacity-30">◈</div>
            <p className="text-sm">Tap a node to see details</p>
          </div>
        )}
      </div>
    </div>
  );
}
