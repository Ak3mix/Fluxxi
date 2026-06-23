import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../utils/cn';

export function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 p-2 transition-all relative",
        active ? "text-emerald-600" : "text-stone-400"
      )}
    >
      {active && (
        <motion.div 
          layoutId="nav-active"
          className="absolute -top-2 w-8 h-1 bg-emerald-600 rounded-full"
        />
      )}
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
    </button>
  );
}
