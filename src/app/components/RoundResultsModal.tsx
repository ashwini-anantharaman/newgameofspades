import React from 'react';
import type { GameState, Team } from '@/lib/engine/types';
import { latestRound } from '@/lib/store/selectors';

interface RoundResultsModalProps {
  game: GameState;
  onNext: () => void;
  onClose: () => void;
}

function teamBidFromRound(bids: Record<string, number | 'nil'>, team: Team): number {
  const seats = team === 'NS' ? ['N', 'S'] : ['E', 'W'];
  return seats.reduce((sum, s) => {
    const b = bids[s];
    return sum + (b === 'nil' ? 0 : (b as number));
  }, 0);
}

function teamTricksFromRound(tricks: Record<string, number>, team: Team): number {
  const seats = team === 'NS' ? ['N', 'S'] : ['E', 'W'];
  return seats.reduce((sum, s) => sum + tricks[s], 0);
}

export function RoundResultsModal({ game, onNext }: RoundResultsModalProps) {
  const round = latestRound(game);
  if (!round) return null;

  const teams = [
    {
      name: 'You & Partner',
      bid: teamBidFromRound(round.bids, 'NS'),
      tricks: teamTricksFromRound(round.tricksWon, 'NS'),
      bags: round.bagsAdded.NS,
      roundPoints: round.delta.NS,
      runningTotal: round.scoresAfter.NS,
      made: round.delta.NS >= 0,
    },
    {
      name: 'Opponents',
      bid: teamBidFromRound(round.bids, 'EW'),
      tricks: teamTricksFromRound(round.tricksWon, 'EW'),
      bags: round.bagsAdded.EW,
      roundPoints: round.delta.EW,
      runningTotal: round.scoresAfter.EW,
      made: round.delta.EW >= 0,
    },
  ];

  return (
    <div className="fixed inset-0 bg-[#0C3128]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#FBF7EE] rounded-[16px] w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="bg-[#14564A] px-6 py-5">
          <div className="text-[11px] uppercase tracking-widest text-[#FBF7EE]/50 mb-1">Round complete</div>
          <h2 className="text-xl font-bold text-[#FBF7EE]" style={{ fontFamily: 'var(--font-display)' }}>Round {round.roundNumber} Results</h2>
        </div>
        <div className="p-6 flex flex-col gap-4">
          {teams.map((team, i) => (
            <div key={i} className={`rounded-[12px] border-2 p-4 ${team.made ? 'border-[#14564A]/20 bg-[#14564A]/5' : 'border-[#BD3B33]/20 bg-[#BD3B33]/5'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-[#15110C] text-sm">{team.name}</div>
                <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${team.made ? 'bg-[#14564A] text-[#FBF7EE]' : 'bg-[#BD3B33] text-white'}`}>{team.made ? '✓ Made' : '✗ Set'}</div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><div className="text-lg font-bold text-[#14564A]" style={{ fontFamily: 'var(--font-display)' }}>{team.bid}</div><div className="text-[9px] uppercase tracking-wider text-[#7E8A86]">Bid</div></div>
                <div><div className="text-lg font-bold text-[#14564A]" style={{ fontFamily: 'var(--font-display)' }}>{team.tricks}</div><div className="text-[9px] uppercase tracking-wider text-[#7E8A86]">Tricks</div></div>
                <div><div className="text-lg font-bold text-[#E6B24A]" style={{ fontFamily: 'var(--font-display)' }}>{team.roundPoints >= 0 ? '+' : ''}{team.roundPoints}</div><div className="text-[9px] uppercase tracking-wider text-[#7E8A86]">Points</div></div>
              </div>
              {team.bags > 0 && <div className="mt-2 text-xs text-[#BD3B33]">+{team.bags} bag{team.bags > 1 ? 's' : ''} this round</div>}
            </div>
          ))}
          <button onClick={onNext} className="w-full bg-[#14564A] hover:bg-[#0C3128] text-[#FBF7EE] font-bold py-3 rounded-[999px] text-sm transition-colors">View game report →</button>
        </div>
      </div>
    </div>
  );
}
