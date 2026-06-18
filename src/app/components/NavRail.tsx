import React from 'react';

type NavItem = {
  id: string;
  label: string;
  icon: string;
};

const navItems: NavItem[] = [
  { id: 'landing', label: 'Home', icon: '⌂' },
  { id: 'curriculum', label: 'Learn', icon: '◈' },
  { id: 'game', label: 'Play', icon: '♠' },
  { id: 'progress', label: 'Progress', icon: '◎' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

interface NavRailProps {
  current: string;
  onNavigate: (id: string) => void;
}

export function NavRail({ current, onNavigate }: NavRailProps) {
  return (
    <aside className="hidden lg:flex flex-col w-[220px] min-h-screen bg-[#0C3128] border-r border-white/8 fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[9px] bg-[#E6B24A] flex items-center justify-center">
            <span className="text-lg text-[#15110C]">♠</span>
          </div>
          <div>
            <div className="text-[#FBF7EE] font-bold text-base leading-none" style={{ fontFamily: 'var(--font-display)' }}>Ace Up</div>
            <div className="text-[10px] text-[#FBF7EE]/40 uppercase tracking-widest mt-0.5">Spades Coach</div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-3 flex flex-col gap-1 mt-2">
        {navItems.map(item => {
          const isActive = current === item.id || (item.id === 'landing' && current === 'dashboard');
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-sm transition-all duration-150 text-left w-full
                ${isActive
                  ? 'bg-[#14564A] text-[#FBF7EE] font-medium'
                  : 'text-[#FBF7EE]/60 hover:bg-white/5 hover:text-[#FBF7EE]'
                }
              `}
            >
              <span className={`text-base w-5 text-center ${isActive ? 'text-[#E6B24A]' : ''}`}>{item.icon}</span>
              <span>{item.label}</span>
              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#E6B24A]" />}
            </button>
          );
        })}
      </nav>

      {/* User badge */}
      <div className="p-4 border-t border-white/8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#14564A] flex items-center justify-center text-[#E6B24A] text-sm font-bold">
            J
          </div>
          <div>
            <div className="text-[#FBF7EE] text-sm font-medium">Jordan K.</div>
            <div className="text-[10px] text-[#FBF7EE]/40">Intermediate</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function BottomTabs({ current, onNavigate }: NavRailProps) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0C3128] border-t border-white/10 px-2 pb-safe">
      <div className="flex items-center justify-around py-2">
        {navItems.map(item => {
          const isActive = current === item.id || (item.id === 'landing' && current === 'dashboard');
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                isActive ? 'text-[#E6B24A]' : 'text-[#FBF7EE]/50'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-[10px] uppercase tracking-wider font-medium">{item.label}</span>
              {isActive && <span className="w-1 h-1 rounded-full bg-[#E6B24A]" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
