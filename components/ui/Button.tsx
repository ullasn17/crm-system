import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'amber';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center font-medium transition-colors select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-[#555555] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer rounded-lg text-xs';

  const sizeClasses: Record<ButtonSize, string> = {
    xs: 'px-2 py-1 text-[11px] gap-1',
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-3.5 py-1.5 text-xs gap-1.5',
    lg: 'px-4 py-2 text-sm gap-2',
  };

  const variantClasses: Record<ButtonVariant, string> = {
    // Primary is sleek dark button with stark white text and hairline border
    primary:
      'bg-[#181818] hover:bg-[#222222] text-white font-semibold border border-[#333333] hover:border-white shadow-xs',
    // Secondary is sleek dark pill
    secondary:
      'bg-[#141414] hover:bg-[#1E1E1E] text-white border border-[#222222] hover:border-[#333333] shadow-xs',
    danger:
      'bg-[#DC2626] hover:bg-[#B91C1C] text-white border border-[#B91C1C]',
    ghost:
      'bg-transparent hover:bg-[#1A1A1A] text-[#888888] hover:text-white',
    outline:
      'bg-[#141414] hover:bg-[#1C1C1C] text-[#E5E5E5] border border-[#262626]',
    amber:
      'bg-[#1A1A1A] hover:bg-[#242424] text-[#FACC15] border border-[#2A2A2A]',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin -ml-0.5 h-3.5 w-3.5 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children}
    </button>
  );
}
