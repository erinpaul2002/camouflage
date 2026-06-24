/** Shared virtual-joystick vector (touch movement). Read by WorldScene each frame. */
export const moveInput = { x: 0, y: 0, active: false };

export function resetMoveInput(): void {
  moveInput.x = 0;
  moveInput.y = 0;
  moveInput.active = false;
}

/** True on touch / coarse-pointer devices, where an on-screen joystick is appropriate. */
export function isCoarsePointer(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true;
}
