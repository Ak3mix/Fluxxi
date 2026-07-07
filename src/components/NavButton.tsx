import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../utils/cn';

export function NavButton({ active, onClick, icon, label, ariaLabel, badge }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, ariaLabel?: string, badge?: number }) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel || label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        "flex flex-col items-center gap-1 p-2 transition-all relative",
        active ? "text-emerald-600" : "text-stone-500"
      )}
    >
      {active && (
        <motion.div
          layoutId="nav-active"
          className="absolute -top-2 w-8 h-1 bg-emerald-600 rounded-full"
        />
      )}
      <div className="relative">
        {icon}
        {badge !== undefined && (
          <span className="absolute -top-1.5 -right-2 bg-emerald-500 text-white text-[9px] font-black min-w-[16px] h-4 rounded-full flex items-center justify-center px-1 leading-none">
            {badge}
          </span>
        )}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
    </button>
  );
}
