import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../utils/cn';

export function NavButton({ active, onClick, icon, label, ariaLabel, badge, center, pulse }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, ariaLabel?: string, badge?: number, center?: boolean, pulse?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel || label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        "flex flex-col items-center gap-0.5 p-2 transition-all relative",
        center ? "text-emerald-600" : active ? "text-emerald-600" : "text-stone-500",
        center && "-mt-2"
      )}
    >
      {active && !center && (
        <motion.div
          layoutId="nav-active"
          className="absolute -top-2 w-8 h-1 bg-emerald-600 rounded-full"
        />
      )}
      <div className={cn(
        "relative flex items-center justify-center transition-all",
        center
          ? cn("w-14 h-14 rounded-full shadow-lg shadow-emerald-200", pulse ? "bg-emerald-600 scale-105" : "bg-emerald-500")
          : ""
      )}>
        <div className={cn(center && "text-white", !center && "relative")}>
          {icon}
          {!center && badge !== undefined && (
            <span className="absolute -top-1.5 -right-2 bg-emerald-500 text-white text-[9px] font-black min-w-[16px] h-4 rounded-full flex items-center justify-center px-1 leading-none">
              {badge}
            </span>
          )}
        </div>
        {center && badge !== undefined && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 leading-none shadow-sm">
            {badge}
          </span>
        )}
      </div>
      <span className={cn(
        "text-[10px] font-bold uppercase tracking-tighter",
        center ? "text-emerald-600" : ""
      )}>{label}</span>
    </button>
  );
}
