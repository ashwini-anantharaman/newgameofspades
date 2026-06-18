import React, { useState } from 'react';
import { evaluateBid } from '@/lib/engine/evaluate';
import { analyzeBid } from '@/lib/teaching/coach';
import type { Observation } from '@/lib/teaching/profile';
import type { GameState } from '@/lib/engine/types';

interface BiddingModalProps {
  game: GameState;
  onCommit: (bid: number, nil: boolean) => void;
  onClose: () => void;
  observe: (obs: Observation) => void;
}

export function BiddingModal({ game, onCommit, onClose, observe }: BiddingModalProps) {
  const hand = game.hands.S;
  const bidEval = evaluateBid(hand);
  const [bid, setBid] = useState(bidEval.suggested || 3);
  const [nil, setNil] = useState(false);
  const [committed, setCommitted] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [reason, setReason] = useState('');
  const [coachText, setCoachText] = useState('');

  const eastBid = game.bids.E;
  const westBid = game.bids.W;
  const oppTotal = (typeof eastBid === 'number' ? eastBid : 0) + (typeof westBid === 'number' ? westBid : 0);
  const partnerBid = game.bids.N;
  const partnerNum = partnerBid === 'nil' || partnerBid === null ? 0 : partnerBid;

  const handleCommit = () => {
    setCommitted(true);
    const analysis = analyzeBid(bidEval, nil ? 'nil' : bid);
    setCoachText(analysis.message);
    observe(analysis.observation);
    setTimeout(() => setShowSuggestion(true), 800);
  };

  const handleDone = () => onCommit(nil ? 0 : bid, nil);

  return (
    <div className="fixed inset-0 bg-[#0C3128]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#FBF7EE] rounded-[16px] w-full max-w-sm shadow-2xl">
        <div className="px-6 py-5 border-b border-[#E3E8E6]">
          <div className="text-[11px] uppercase tracking-widest text-[#7E8A86] mb-1">Bidding Phase</div>
          <h2 className="text-xl font-bold text-[#15110C]" style={{ fontFamily: 'var(--font-display)' }}>How many tricks will you win?</h2>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <div className="bg-[#F4F6F5] rounded-[12px] p-3 flex justify-between text-sm">
            <div><span className="text-[#7E8A86]">East bid:</span> <span className="font-semibold text-[#15110C]">{eastBid ?? '—'}</span></div>
            <div><span className="text-[#7E8A86]">West bid:</span> <span className="font-semibold text-[#15110C]">{westBid ?? '—'}</span></div>
            <div><span className="text-[#7E8A86]">Opp total:</span> <span className="font-semibold text-[#BD3B33]">{oppTotal}</span></div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-[#15110C] text-sm">Bid Nil</div>
              <div className="text-[#7E8A86] text-xs">Promise to win zero tricks (+100/-100)</div>
            </div>
            <button onClick={() => setNil((n) => !n)} disabled={committed} className={`w-12 h-6 rounded-full transition-colors duration-200 relative ${nil ? 'bg-[#14564A]' : 'bg-[#E3E8E6]'}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform duration-200 ${nil ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {!nil && (
            <div className="flex flex-col gap-2">
              <div className="text-[11px] uppercase tracking-widest text-[#7E8A86]">Your bid</div>
              <div className="flex items-center gap-4">
                <button onClick={() => setBid((b) => Math.max(0, b - 1))} disabled={committed || bid === 0} className="w-10 h-10 rounded-full border-2 border-[#E3E8E6] flex items-center justify-center text-xl text-[#15110C] hover:border-[#14564A] disabled:opacity-30 transition-colors">−</button>
                <div className="flex-1 text-center"><span className="text-4xl font-bold text-[#14564A]" style={{ fontFamily: 'var(--font-display)' }}>{bid}</span></div>
                <button onClick={() => setBid((b) => Math.min(13, b + 1))} disabled={committed || bid === 13} className="w-10 h-10 rounded-full border-2 border-[#E3E8E6] flex items-center justify-center text-xl text-[#15110C] hover:border-[#14564A] disabled:opacity-30 transition-colors">+</button>
              </div>
              <div className="text-xs text-[#7E8A86]">Suggested range: {bidEval.range[0]}–{bidEval.range[1]}</div>
            </div>
          )}

          {!committed && (
            <div>
              <div className="text-[11px] uppercase tracking-widest text-[#7E8A86] mb-2">Why are you bidding {nil ? 'nil' : bid}? <span className="normal-case lowercase tracking-normal">(optional)</span></div>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. I have two high spades and a possible heart trick…" className="w-full bg-[#F4F6F5] border border-[#E3E8E6] rounded-[12px] px-3 py-2 text-sm outline-none focus:border-[#14564A] text-[#15110C] placeholder:text-[#7E8A86] resize-none h-16" />
            </div>
          )}

          {showSuggestion && (
            <div className="bg-[#E6B24A]/10 border border-[#E6B24A]/30 rounded-[12px] p-3">
              <div className="text-[10px] uppercase tracking-wider text-[#C49135] mb-1">Coach's take</div>
              <p className="text-sm text-[#15110C]">{coachText}</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="text-xs text-[#7E8A86]">Team contract:</div>
                <div className="font-bold text-[#14564A]">{(nil ? 0 : bid) + partnerNum} tricks</div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {!committed ? (
              <>
                <button onClick={onClose} className="flex-1 py-3 rounded-[999px] border border-[#E3E8E6] text-[#15110C] text-sm font-medium hover:bg-[#F4F6F5] transition-colors">Cancel</button>
                <button onClick={handleCommit} className="flex-1 py-3 rounded-[999px] bg-[#14564A] text-[#FBF7EE] font-bold text-sm hover:bg-[#0C3128] transition-colors">Commit bid</button>
              </>
            ) : showSuggestion ? (
              <button onClick={handleDone} className="w-full py-3 rounded-[999px] bg-[#E6B24A] text-[#15110C] font-bold text-sm hover:bg-[#C49135] transition-colors">Let's play! →</button>
            ) : (
              <div className="w-full text-center text-[#7E8A86] text-sm py-3">Coach is thinking…</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
