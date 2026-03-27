import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Xbox Controller Button Mapping (Standard Gamepad API)
 */
export enum XboxButton {
  A = 0,          // Bottom button (Cross on PS)
  B = 1,          // Right button (Circle on PS)
  X = 2,          // Left button (Square on PS)
  Y = 3,          // Top button (Triangle on PS)
  LB = 4,         // Left bumper
  RB = 5,         // Right bumper
  LT = 6,         // Left trigger (button)
  RT = 7,         // Right trigger (button)
  SELECT = 8,     // Back/Select
  START = 9,      // Start/Options
  L3 = 10,        // Left stick button
  R3 = 11,        // Right stick button
  DPAD_UP = 12,
  DPAD_DOWN = 13,
  DPAD_LEFT = 14,
  DPAD_RIGHT = 15,
  XBOX = 16,      // Xbox button (may not be accessible)
}

/**
 * Xbox Controller Axis Mapping
 */
export enum XboxAxis {
  LEFT_STICK_X = 0,
  LEFT_STICK_Y = 1,
  RIGHT_STICK_X = 2,
  RIGHT_STICK_Y = 3,
}

export interface GamepadState {
  connected: boolean;
  buttons: boolean[];
  axes: number[];
  leftStick: { x: number; y: number };
  rightStick: { x: number; y: number };
  leftTrigger: number;
  rightTrigger: number;
  vibrationSupported: boolean;
}

export interface GamepadInput {
  // Movement
  moveLeft: boolean;
  moveRight: boolean;
  moveUp: boolean;
  moveDown: boolean;
  // Actions
  jump: boolean;
  interact: boolean;
  pause: boolean;
  // UI Navigation
  confirm: boolean;
  cancel: boolean;
  // Editor controls
  placeBlock: boolean;
  removeBlock: boolean;
  nextBlock: boolean;
  prevBlock: boolean;
  // Analog values
  leftStickX: number;
  leftStickY: number;
  rightStickX: number;
  rightStickY: number;
}

const DEADZONE = 0.15;
const TRIGGER_THRESHOLD = 0.5;

/**
 * Custom hook for Xbox controller support
 */
export function useXboxGamepad() {
  const [gamepadState, setGamepadState] = useState<GamepadState>({
    connected: false,
    buttons: [],
    axes: [],
    leftStick: { x: 0, y: 0 },
    rightStick: { x: 0, y: 0 },
    leftTrigger: 0,
    rightTrigger: 0,
    vibrationSupported: false,
  });

  const gamepadIndexRef = useRef<number | null>(null);
  const previousButtonsRef = useRef<boolean[]>([]);
  const animationFrameRef = useRef<number>();

  // Apply deadzone to analog stick values
  const applyDeadzone = useCallback((value: number): number => {
    return Math.abs(value) < DEADZONE ? 0 : value;
  }, []);

  // Poll gamepad state
  const pollGamepad = useCallback(() => {
    const gamepads = navigator.getGamepads();
    const gamepad = gamepadIndexRef.current !== null ? gamepads[gamepadIndexRef.current] : null;

    if (gamepad && gamepad.connected) {
      const buttons = gamepad.buttons.map(b => b.pressed);
      const axes = gamepad.axes.slice();

      // Apply deadzone to axes
      const leftStickX = applyDeadzone(axes[XboxAxis.LEFT_STICK_X] || 0);
      const leftStickY = applyDeadzone(axes[XboxAxis.LEFT_STICK_Y] || 0);
      const rightStickX = applyDeadzone(axes[XboxAxis.RIGHT_STICK_X] || 0);
      const rightStickY = applyDeadzone(axes[XboxAxis.RIGHT_STICK_Y] || 0);

      // Get trigger values (some browsers use buttons, some use axes)
      const leftTrigger = gamepad.buttons[XboxButton.LT]?.value || 0;
      const rightTrigger = gamepad.buttons[XboxButton.RT]?.value || 0;

      // Check for vibration support
      const vibrationSupported = 'vibrationActuator' in gamepad;

      setGamepadState({
        connected: true,
        buttons,
        axes,
        leftStick: { x: leftStickX, y: leftStickY },
        rightStick: { x: rightStickX, y: rightStickY },
        leftTrigger,
        rightTrigger,
        vibrationSupported,
      });

      previousButtonsRef.current = buttons;
    } else {
      setGamepadState(prev => ({ ...prev, connected: false }));
    }

    animationFrameRef.current = requestAnimationFrame(pollGamepad);
  }, [applyDeadzone]);

  // Handle gamepad connection
  const handleGamepadConnected = useCallback((e: GamepadEvent) => {
    console.log('Xbox Controller connected:', e.gamepad.id);
    gamepadIndexRef.current = e.gamepad.index;
    if (!animationFrameRef.current) {
      pollGamepad();
    }
  }, [pollGamepad]);

  // Handle gamepad disconnection
  const handleGamepadDisconnected = useCallback((e: GamepadEvent) => {
    console.log('Xbox Controller disconnected:', e.gamepad.id);
    if (gamepadIndexRef.current === e.gamepad.index) {
      gamepadIndexRef.current = null;
      setGamepadState(prev => ({ ...prev, connected: false }));
    }
  }, []);

  // Vibrate controller (haptic feedback)
  const vibrate = useCallback((duration: number = 100, weakMagnitude: number = 0.5, strongMagnitude: number = 0.5) => {
    const gamepads = navigator.getGamepads();
    const gamepad = gamepadIndexRef.current !== null ? gamepads[gamepadIndexRef.current] : null;

    if (gamepad && 'vibrationActuator' in gamepad) {
      const actuator = (gamepad as any).vibrationActuator;
      if (actuator && actuator.playEffect) {
        actuator.playEffect('dual-rumble', {
          duration,
          weakMagnitude,
          strongMagnitude,
        });
      }
    }
  }, []);

  // Get processed input for game logic
  const getGamepadInput = useCallback((): GamepadInput => {
    const { buttons, leftStick, rightStick, leftTrigger, rightTrigger } = gamepadState;

    return {
      // Movement (left stick or D-pad)
      moveLeft: leftStick.x < -DEADZONE || buttons[XboxButton.DPAD_LEFT] || false,
      moveRight: leftStick.x > DEADZONE || buttons[XboxButton.DPAD_RIGHT] || false,
      moveUp: leftStick.y < -DEADZONE || buttons[XboxButton.DPAD_UP] || false,
      moveDown: leftStick.y > DEADZONE || buttons[XboxButton.DPAD_DOWN] || false,

      // Actions
      jump: buttons[XboxButton.A] || false,
      interact: buttons[XboxButton.X] || false,
      pause: buttons[XboxButton.START] || false,

      // UI Navigation
      confirm: buttons[XboxButton.A] || false,
      cancel: buttons[XboxButton.B] || false,

      // Editor controls
      placeBlock: rightTrigger > TRIGGER_THRESHOLD || buttons[XboxButton.RT] || false,
      removeBlock: leftTrigger > TRIGGER_THRESHOLD || buttons[XboxButton.LT] || false,
      nextBlock: buttons[XboxButton.RB] || false,
      prevBlock: buttons[XboxButton.LB] || false,

      // Analog values (for precise camera control, etc.)
      leftStickX: leftStick.x,
      leftStickY: leftStick.y,
      rightStickX: rightStick.x,
      rightStickY: rightStick.y,
    };
  }, [gamepadState]);

  // Check if a button was just pressed (not held)
  const isButtonJustPressed = useCallback((button: XboxButton): boolean => {
    return gamepadState.buttons[button] && !previousButtonsRef.current[button];
  }, [gamepadState.buttons]);

  // Setup and cleanup
  useEffect(() => {
    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

    // Check for already connected gamepads
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      const gamepad = gamepads[i];
      if (gamepad && gamepad.connected) {
        gamepadIndexRef.current = gamepad.index;
        pollGamepad();
        break;
      }
    }

    return () => {
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [handleGamepadConnected, handleGamepadDisconnected, pollGamepad]);

  return {
    gamepadState,
    getGamepadInput,
    isButtonJustPressed,
    vibrate,
    isConnected: gamepadState.connected,
  };
}
