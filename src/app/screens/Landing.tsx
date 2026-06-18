import React from 'react';

interface LandingProps {
  onStart: () => void;
  onSignIn: () => void;
}

export function Landing({ onStart, onSignIn }: LandingProps) {
  return (
    <div className="min-h-screen bg-[#0C3128] flex flex-col relative overflow-hidden">
      {/* Felt vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 70% at 50% 40%, transparent 30%, rgba(0,0,0,0.5) 100%)',
        }}
      />
      {/* Subtle felt texture pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.5) 3px, rgba(255,255,255,0.5) 4px), repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(255,255,255,0.5) 3px, rgba(255,255,255,0.5) 4px)',
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[9px] bg-[#E6B24A] flex items-center justify-center shadow-lg">
            <span className="text-xl text-[#15110C]">♠</span>
          </div>
          <span className="text-[#FBF7EE] font-bold text-xl" style={{ fontFamily: 'var(--font-display)' }}>Ace Up</span>
        </div>
        <button
          onClick={onSignIn}
          className="text-[#FBF7EE]/70 hover:text-[#FBF7EE] text-sm transition-colors"
        >
          Sign in
        </button>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        {/* Card decoration */}
        <div className="mb-10 relative">
          <div className="absolute -left-8 top-2 w-16 h-22 bg-[#FBF7EE] rounded-[9px] border border-[#E3E8E6]/30 shadow-xl rotate-[-15deg] flex items-center justify-center">
            <div className="text-3xl text-[#BD3B33]">♥</div>
          </div>
          <div className="absolute -right-8 top-2 w-16 h-22 bg-[#FBF7EE] rounded-[9px] border border-[#E3E8E6]/30 shadow-xl rotate-[15deg] flex items-center justify-center">
            <div className="text-3xl text-[#BD3B33]">♦</div>
          </div>
          <div className="relative w-24 h-32 bg-[#FBF7EE] rounded-[9px] border-2 border-[#E6B24A] shadow-2xl flex items-center justify-center z-10">
            <div className="text-6xl text-[#15110C]">♠</div>
          </div>
        </div>

        <h1
          className="text-5xl lg:text-7xl font-bold text-[#FBF7EE] mb-4 leading-[1.05]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Master<br />
          <span className="text-[#E6B24A]">Spades</span>
        </h1>
        <p className="text-[#FBF7EE]/60 text-lg max-w-md mb-10 leading-relaxed">
          Learn to bid smart, play sharp, and read your partner — from your first trick to nil mastery.
        </p>

        <button
          onClick={onStart}
          className="bg-[#E6B24A] hover:bg-[#C49135] text-[#15110C] font-bold px-10 py-4 rounded-[999px] text-base shadow-lg shadow-[#E6B24A]/20 hover:shadow-[#E6B24A]/30 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
        >
          Start learning free
        </button>
        <p className="mt-4 text-[#FBF7EE]/30 text-xs">No account needed to begin</p>
      </main>

      {/* Feature tiles */}
      <section className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-4 px-6 pb-16 max-w-3xl mx-auto w-full">
        {[
          { icon: '◈', title: 'Learn the rules', desc: 'Interactive lessons that adapt to your pace', color: '#14564A' },
          { icon: '♠', title: 'Play coached', desc: 'Real games with AI coach commentary after each decision', color: '#14564A' },
          { icon: '◎', title: 'Track mastery', desc: 'Skill tree shows exactly what you know and what to learn next', color: '#14564A' },
        ].map((tile, i) => (
          <div
            key={i}
            className="bg-white/5 border border-white/10 rounded-[16px] p-5 backdrop-blur-sm hover:bg-white/8 transition-colors"
          >
            <div className="w-10 h-10 rounded-[12px] bg-[#14564A] flex items-center justify-center mb-3">
              <span className="text-[#E6B24A] text-lg">{tile.icon}</span>
            </div>
            <div className="text-[#FBF7EE] font-semibold mb-1">{tile.title}</div>
            <div className="text-[#FBF7EE]/50 text-sm leading-relaxed">{tile.desc}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
