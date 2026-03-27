import { useEffect, useCallback, useRef } from 'react';
import { XboxButton, useXboxGamepad } from './useXboxGamepad';

interface UINavigationOptions {
  onConfirm?: () => void;
  onCancel?: () => void;
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  onNavigateLeft?: () => void;
  onNavigateRight?: () => void;
  onBumperLeft?: () => void;
  onBumperRight?: () => void;
  enabled?: boolean;
}

/**
 * Hook for handling UI navigation with Xbox gamepad
 * Provides menu navigation, button selection, and UI interaction
 */
export function useGamepadUINavigation(options: UINavigationOptions) {
  const { getGamepadInput, isButtonJustPressed, vibrate, isConnected } = useXboxGamepad();
  const previousInputRef = useRef({
    moveUp: false,
    moveDown: false,
    moveLeft: false,
    moveRight: false,
    confirm: false,
    cancel: false,
    nextBlock: false,
    prevBlock: false,
  });

  const handleNavigation = useCallback(() => {
    if (!isConnected || options.enabled === false) return;

    const input = getGamepadInput();
    const prev = previousInputRef.current;

    // Detect button press transitions (just pressed, not held)
    const justPressedUp = input.moveUp && !prev.moveUp;
    const justPressedDown = input.moveDown && !prev.moveDown;
    const justPressedLeft = input.moveLeft && !prev.moveLeft;
    const justPressedRight = input.moveRight && !prev.moveRight;
    const justPressedConfirm = input.confirm && !prev.confirm;
    const justPressedCancel = input.cancel && !prev.cancel;
    const justPressedNext = input.nextBlock && !prev.nextBlock;
    const justPressedPrev = input.prevBlock && !prev.prevBlock;

    // Handle navigation
    if (justPressedUp && options.onNavigateUp) {
      options.onNavigateUp();
      vibrate(50, 0.2, 0.2);
    }
    if (justPressedDown && options.onNavigateDown) {
      options.onNavigateDown();
      vibrate(50, 0.2, 0.2);
    }
    if (justPressedLeft && options.onNavigateLeft) {
      options.onNavigateLeft();
      vibrate(50, 0.2, 0.2);
    }
    if (justPressedRight && options.onNavigateRight) {
      options.onNavigateRight();
      vibrate(50, 0.2, 0.2);
    }

    // Handle actions
    if (justPressedConfirm && options.onConfirm) {
      options.onConfirm();
      vibrate(100, 0.4, 0.4);
    }
    if (justPressedCancel && options.onCancel) {
      options.onCancel();
      vibrate(100, 0.3, 0.3);
    }

    // Handle bumpers
    if (justPressedNext && options.onBumperRight) {
      options.onBumperRight();
      vibrate(80, 0.3, 0.3);
    }
    if (justPressedPrev && options.onBumperLeft) {
      options.onBumperLeft();
      vibrate(80, 0.3, 0.3);
    }

    // Update previous state
    previousInputRef.current = {
      moveUp: input.moveUp,
      moveDown: input.moveDown,
      moveLeft: input.moveLeft,
      moveRight: input.moveRight,
      confirm: input.confirm,
      cancel: input.cancel,
      nextBlock: input.nextBlock,
      prevBlock: input.prevBlock,
    };
  }, [isConnected, options, getGamepadInput, vibrate]);

  // Poll for input every frame
  useEffect(() => {
    if (!isConnected || options.enabled === false) return;

    let animationFrameId: number;
    
    const pollInput = () => {
      handleNavigation();
      animationFrameId = requestAnimationFrame(pollInput);
    };

    animationFrameId = requestAnimationFrame(pollInput);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isConnected, options.enabled, handleNavigation]);

  return {
    isConnected,
    getGamepadInput,
    vibrate,
  };
}

/**
 * Helper function to focus the next/previous element in a menu
 */
export function focusNextElement(currentIndex: number, totalItems: number, direction: 'up' | 'down'): number {
  if (direction === 'down') {
    return (currentIndex + 1) % totalItems;
  } else {
    return (currentIndex - 1 + totalItems) % totalItems;
  }
}

/**
 * Helper function to simulate DOM element focus
 */
export function focusElementByIndex(containerSelector: string, index: number) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const focusableElements = container.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  if (focusableElements[index]) {
    (focusableElements[index] as HTMLElement).focus();
  }
}
