import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface IconButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  active?: boolean;
  danger?: boolean;
  text?: string;
  disabled?: boolean;
  className?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  label,
  onClick,
  active = false,
  danger = false,
  text,
  disabled = false,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`
        inline-flex items-center justify-center font-medium
        h-[28px] rounded-[6px] transition-colors select-none
        bg-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400
        disabled:opacity-40 disabled:pointer-events-none
        ${text ? 'px-2 gap-1.5 text-xs' : 'w-[28px] min-w-[28px]'}
        ${
          danger
            ? 'text-red-500 dark:text-red-500'
            : active
            ? 'text-indigo-600 dark:text-indigo-400'
            : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
        }
        ${className}
      `}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {text && <span className="truncate leading-none">{text}</span>}
    </button>
  );
};

export default IconButton;
