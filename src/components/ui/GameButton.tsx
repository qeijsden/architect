import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'accent' | 'success' | 'destructive' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface GameButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground border border-primary/70 hover:brightness-110',
  secondary: 'bg-secondary text-secondary-foreground border border-secondary/70 hover:brightness-110',
  accent: 'bg-accent text-accent-foreground border border-accent/70 hover:brightness-110',
  success: 'bg-success text-success-foreground border border-success/70 hover:brightness-110',
  destructive: 'bg-destructive text-destructive-foreground border border-destructive/70 hover:brightness-110',
  outline: 'bg-transparent text-foreground border border-border hover:bg-muted/60',
  ghost: 'bg-transparent text-foreground border border-transparent hover:bg-muted/40',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-base',
};

export function GameButton({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: GameButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'font-pixel inline-flex items-center justify-center rounded-none transition-all duration-75 disabled:opacity-50 disabled:cursor-not-allowed shadow-[inset_-2px_-2px_0_rgba(0,0,0,0.35),inset_2px_2px_0_rgba(255,255,255,0.06)] active:translate-y-[1px] active:shadow-[inset_1px_1px_0_rgba(0,0,0,0.35)]',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}