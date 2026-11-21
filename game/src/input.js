// Keyboard and mouse, kept apart from the rules: this module only reports what
// the player is doing, and the world decides what it means.

export function makeInput(canvas) {
  const keys = new Set();
  const state = {
    keys,
    click: null,
    pressed: new Set(),
  };

  const isGameKey = (code) => code.startsWith('Key') || code.startsWith('Arrow') || code.startsWith('Shift') || code === 'Space' || code === 'Enter';

  window.addEventListener('keydown', (event) => {
    if (isGameKey(event.code)) event.preventDefault();
    if (!event.repeat) state.pressed.add(event.code);
    keys.add(event.code);
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    keys.clear();
  });
  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    state.click = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return state;
}

// Read and clear the keys pressed since the last frame, so a single press is
// never read twice.
export function takePressed(input) {
  const pressed = new Set(input.pressed);
  input.pressed.clear();
  return pressed;
}

// Read and clear a click, converted from window pixels to level coordinates.
export function takeClick(input, view) {
  if (!input.click) return null;
  const click = input.click;
  input.click = null;
  return {
    x: (click.x - view.offsetX) / view.scale,
    y: (click.y - view.offsetY) / view.scale,
  };
}
