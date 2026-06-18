import React from 'react';
import { gameReport } from '@/lib/store/selectors';
import { useSpadesStore } from '@/lib/store/SpadesProvider';

interface GameReportProps {
  onNavigate: (screen: string) => void;
}

export function GameReport({ onNavigate }: GameReportProps) {
  const { profile, lastGame, setActiveNodeId } = useSpadesStore();
  if (!lastGame) {
    return (
      <div className="p-8 text-center text-[#7E8A86]">
        No game data yet. <button onClick={() => onNavigate('game')} className="text-[#14564A] ml-2">Play a game →</button>
      </div>
    );
  }

  const report = gameReport(profile, lastGame);
  const fixNode = report.misconceptions[0]?.fixNode ?? report.weaknesses[0]?.id ?? 'breaking';

  return (
    <div className="flex flex-col gap-6 p-6 pb-24 lg:pb-8 max-w-2xl">
      <div className="bg-[#14564A] rounded-[16px] p-6 relative overflow-hidden">
        <div className="absolute right-4 top-4 text-[120px] leading-none text-white/5 pointer-events-none select-none">♠</div>
        <div className="text-[11px] uppercase tracking-widest text-[#FBF7EE]/50 mb-1">Game complete</div>
        <h1 className="text-3xl font-bold text-[#FBF7EE] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          {report.result === 'win' ? 'Solid game, Jordan!' : report.result === 'tie' ? 'Close one!' : 'Good effort, Jordan!'}
        </h1>
        <p className="text-[#FBF7EE]/70 text-sm mb-4">Final score {report.finalScores.NS}–{report.finalScores.EW}</p>
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#E6B24A]" style={{ fontFamily: 'var(--font-display)' }}>{report.finalScores.NS}</div>
            <div className="text-[10px] text-[#FBF7EE]/50 uppercase tracking-wider">Your score</div>
          </div>
          <div className="text-[#FBF7EE]/30 self-center">vs</div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#FBF7EE]/60" style={{ fontFamily: 'var(--font-display)' }}>{report.finalScores.EW}</div>
            <div className="text-[10px] text-[#FBF7EE]/50 uppercase tracking-wider">Opponents</div>
          </div>
        </div>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-widest text-[#7E8A86] mb-3">What you did well</div>
        <div className="flex flex-col gap-3">
          {report.strengths.map((s) => (
            <div key={s.id} className="bg-[#FBF7EE] border border-[#E3E8E6] rounded-[16px] p-4 flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#14564A] flex items-center justify-center flex-shrink-0 mt-0.5"><span className="text-[#FBF7EE] text-xs">✓</span></div>
              <div><div className="font-semibold text-[#15110C] text-sm">{s.title}</div></div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-widest text-[#7E8A86] mb-3">Areas to work on</div>
        <div className="flex flex-col gap-3">
          {[...report.weaknesses.map((w) => ({ label: w.title, example: '' })), ...report.misconceptions.map((m) => ({ label: m.label, example: m.explain }))].slice(0, 3).map((w, i) => (
            <div key={i} className="bg-[#FBF7EE] border border-[#BD3B33]/20 rounded-[16px] p-4 flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#BD3B33]/10 flex items-center justify-center flex-shrink-0 mt-0.5"><span className="text-[#BD3B33] text-xs">!</span></div>
              <div>
                <div className="font-semibold text-[#15110C] text-sm">{w.label}</div>
                {w.example && <div className="text-[#7E8A86] text-xs mt-0.5 leading-relaxed">{w.example}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {report.improvement && report.improvement.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-widest text-[#7E8A86] mb-3">Skill progress from this game</div>
          <div className="bg-[#FBF7EE] border border-[#E3E8E6] rounded-[16px] p-4 flex flex-col gap-3">
            {report.improvement.map((d) => (
              <div key={d.id} className="flex items-center gap-3">
                <div className="text-sm text-[#15110C] w-36 flex-shrink-0">{d.title}</div>
                <div className="flex-1 h-2 bg-[#E3E8E6] rounded-full overflow-hidden">
                  <div className="h-full bg-[#E6B24A] rounded-full transition-all" style={{ width: `${d.to}%` }} />
                </div>
                <div className="text-[#E6B24A] text-[10px] font-bold">{d.from}% → {d.to}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <button onClick={() => { setActiveNodeId(fixNode); onNavigate('curriculum'); }} className="w-full bg-[#14564A] hover:bg-[#0C3128] text-[#FBF7EE] font-bold py-4 rounded-[999px] transition-colors">
          Work on weakness →
        </button>
        <button onClick={() => onNavigate('game')} className="w-full bg-[#FBF7EE] border-2 border-[#14564A] text-[#14564A] font-bold py-4 rounded-[999px] transition-colors hover:bg-[#14564A]/5">Play again ♠</button>
      </div>
    </div>
  );
}
