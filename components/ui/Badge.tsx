import React from 'react';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'indigo'
  | 'amber';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; border: string; dot: string }> = {
  default: {
    bg: 'bg-[#181818]',
    text: 'text-[#A1A1AA]',
    border: 'border-[#262626]',
    dot: 'bg-zinc-400',
  },
  neutral: {
    bg: 'bg-[#181818]',
    text: 'text-[#A1A1AA]',
    border: 'border-[#262626]',
    dot: 'bg-zinc-400',
  },
  success: {
    bg: 'bg-emerald-950/30',
    text: 'text-emerald-400',
    border: 'border-emerald-800/40',
    dot: 'bg-[#22C55E]',
  },
  warning: {
    bg: 'bg-amber-950/30',
    text: 'text-[#FBBF24]',
    border: 'border-amber-800/40',
    dot: 'bg-[#F59E0B]',
  },
  error: {
    bg: 'bg-rose-950/30',
    text: 'text-rose-400',
    border: 'border-rose-800/40',
    dot: 'bg-rose-400',
  },
  info: {
    bg: 'bg-sky-950/30',
    text: 'text-white',
    border: 'border-sky-800/40',
    dot: 'bg-[#38BDF8]',
  },
  indigo: {
    bg: 'bg-indigo-950/30',
    text: 'text-white',
    border: 'border-indigo-800/40',
    dot: 'bg-indigo-400',
  },
  amber: {
    bg: 'bg-[#F59E0B]/15',
    text: 'text-[#FBBF24]',
    border: 'border-[#F59E0B]/30',
    dot: 'bg-[#F59E0B]',
  },
};

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
  dot = false,
}: BadgeProps) {
  const styles = variantStyles[variant] || variantStyles.default;
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded border ${styles.bg} ${styles.text} ${styles.border} ${sizeClasses} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />}
      {children}
    </span>
  );
}

export function getStatusVariant(status: string): BadgeVariant {
  const normalized = (status || '').toLowerCase();
  if (['active', 'completed', 'paid', 'approved', 'converted', 'closed-won'].includes(normalized)) {
    return 'success';
  }
  if (['pending', 'in-progress', 'in progress', 'contacted', 'qualified', 'proposal', 'low stock'].includes(normalized)) {
    return 'warning';
  }
  if (['inactive', 'failed', 'rejected', 'cancelled', 'overdue', 'lost', 'out of stock'].includes(normalized)) {
    return 'error';
  }
  if (['new', 'open', 'cashier'].includes(normalized)) {
    return 'info';
  }
  if (['admin'].includes(normalized)) {
    return 'amber';
  }
  if (['manager', 'store manager', 'staff'].includes(normalized)) {
    return 'indigo';
  }
  return 'default';
}
