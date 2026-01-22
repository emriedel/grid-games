'use client';

import { type ButtonHTMLAttributes, type ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  /** Full width button */
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-[var(--accent,#f59e0b)] text-[var(--accent-foreground,#1c1917)]
    hover:opacity-90
  `,
  secondary: `
    bg-[var(--tile-bg,#1a1a2e)] text-[var(--foreground,#ededed)]
    hover:bg-[var(--tile-bg-selected,#4a4a6e)]
  `,
  ghost: `
    bg-transparent text-[var(--muted,#a1a1aa)]
    hover:text-[var(--foreground,#ededed)]
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'py-2 px-3 text-sm rounded-lg',
  md: 'py-3 px-4 text-base rounded-lg',
  lg: 'py-4 px-6 text-lg rounded-xl',
};

/**
 * Shared button component with variants
 * Uses CSS custom properties from the game theme
 */
export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        font-semibold transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
