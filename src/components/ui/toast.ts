import type { ReactElement, ReactNode } from 'react';

export type ToastActionElement = ReactElement;

export type ToastProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  action?: ToastActionElement;
};
