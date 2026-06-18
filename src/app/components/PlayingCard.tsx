import React from 'react';

type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
type Rank = 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';
type CardState = 'default' | 'legal' | 'illegal' | 'winner' | 'selected';

interface PlayingCardProps {
  suit?: Suit;
  rank?: Rank;
  faceDown?: boolean;
  state?: CardState;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

const suitSymbols: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const isRed = (suit: Suit) => suit === 'hearts' || suit === 'diamonds';

export function PlayingCard({ suit = 'spades', rank = 'A', faceDown = false, state = 'default', size = 'md', onClick, className = '' }: PlayingCardProps) {
  const sizes = {
    sm: 'w-10 h-14',
    md: 'w-14 h-20',
    lg: 'w-20 h-28',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const centerSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  const stateClasses: Record<CardState, string> = {
    default: 'border-[#E3E8E6] shadow-sm hover:shadow-md hover:-translate-y-0.5',
    legal: 'border-[#E6B24A] shadow-md ring-2 ring-[#E6B24A]/50 hover:shadow-lg hover:-translate-y-1 cursor-pointer bg-white',
    illegal: 'opacity-40 cursor-not-allowed grayscale',
    winner: 'border-[#E6B24A] shadow-lg ring-2 ring-[#E6B24A]/50 scale-105',
    selected: 'border-[#E6B24A] shadow-lg ring-2 ring-[#E6B24A] -translate-y-3 cursor-pointer',
  };

  const suitColor = suit && isRed(suit) ? 'text-[#BD3B33]' : 'text-[#15110C]';

  return (
    <div
      onClick={state !== 'illegal' ? onClick : undefined}
      className={`
        relative flex flex-col rounded-[9px] border-2 transition-all duration-200 select-none
        bg-[#FBF7EE]
        ${sizes[size]}
        ${stateClasses[state]}
        ${className}
      `}
    >
      {faceDown ? (
        <div className="absolute inset-0 rounded-[7px] overflow-hidden">
          <div
            className="absolute inset-0 rounded-[7px]"
            style={{
              background: 'repeating-linear-gradient(45deg, #14564A 0px, #14564A 4px, #0C3128 4px, #0C3128 8px)',
            }}
          />
          <div className="absolute inset-1 rounded-[5px] border border-white/20" />
          <div className="absolute inset-0 flex items-center justify-center text-white/30 text-2xl">♠</div>
        </div>
      ) : (
        <>
          {state === 'winner' && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#E6B24A] rounded-full flex items-center justify-center">
              <span className="text-[8px] text-[#15110C]">★</span>
            </div>
          )}
          <div className={`absolute top-1 left-1.5 flex flex-col items-center leading-none ${suitColor} ${textSizes[size]}`}>
            <span className="font-bold">{rank}</span>
            <span className="text-[10px]">{suitSymbols[suit]}</span>
          </div>
          <div className={`absolute inset-0 flex items-center justify-center ${suitColor} ${centerSizes[size]}`}>
            {suitSymbols[suit]}
          </div>
          <div className={`absolute bottom-1 right-1.5 flex flex-col items-center leading-none rotate-180 ${suitColor} ${textSizes[size]}`}>
            <span className="font-bold">{rank}</span>
            <span className="text-[10px]">{suitSymbols[suit]}</span>
          </div>
        </>
      )}
    </div>
  );
}

export function CardBack({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return <PlayingCard faceDown size={size} className={className} />;
}
