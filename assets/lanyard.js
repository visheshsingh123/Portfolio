/* Pointer-driven pendulum, with a native button for keyboard/touch flipping. */
(() => {
  const badge = document.querySelector('.lanyard-badge');
  if (!badge) return;
  const pendulum = document.querySelector('.lanyard-pendulum');
  const front = badge.querySelector('.lanyard-front');
  const back = badge.querySelector('.lanyard-back');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const rest = -5;
  let angle = rest, velocity = 0, stretch = 0, target = rest;
  let pointer = null, moved = false, suppressClick = false;
  let startX = 0, startY = 0, frame = 0, lastTime = 0;
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  function render() {
    pendulum.style.transform = `rotate(${angle}deg) scaleY(${1 + stretch / 900})`;
  }
  function tick(time) {
    const dt = Math.min((time - lastTime) / 1000 || 1 / 60, 0.032);
    lastTime = time;
    const destination = pointer !== null ? target : rest;
    velocity += ((destination - angle) * 65 - velocity * 9) * dt;
    angle += velocity * dt;
    if (pointer === null) stretch *= Math.exp(-14 * dt);
    render();
    if (Math.abs(angle - destination) > .015 || Math.abs(velocity) > .025 || stretch > .05) {
      frame = requestAnimationFrame(tick);
    } else { frame = 0; lastTime = 0; }
  }
  function wake() {
    if (reducedMotion.matches) { angle = rest; velocity = stretch = 0; render(); return; }
    if (!frame) frame = requestAnimationFrame(tick);
  }
  function flip(force) {
    const flipped = force ?? badge.getAttribute('aria-pressed') !== 'true';
    badge.setAttribute('aria-pressed', String(flipped));
    badge.setAttribute('aria-label', flipped ? 'Show the front of Vishesh Singh’s ID badge' : 'Flip Vishesh Singh’s ID badge');
    front.setAttribute('aria-hidden', String(flipped));
    back.setAttribute('aria-hidden', String(!flipped));
    front.inert = flipped;
    back.inert = !flipped;
    velocity += flipped ? 22 : -22;
    wake();
  }
  badge.addEventListener('click', (event) => {
    if (suppressClick && event.detail !== 0) { suppressClick = false; return; }
    suppressClick = false;
    flip();
  });
  badge.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); flip(false); }
  });
  badge.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    pointer = event.pointerId;
    startX = event.clientX; startY = event.clientY;
    moved = false; suppressClick = false; target = angle;
    badge.setPointerCapture(pointer);
  });
  badge.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointer) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.hypot(dx, dy) > 7) moved = true;
    if (!moved) return;
    badge.classList.add('is-dragging');
    target = clamp(rest - dx * .14, -24, 24);
    stretch = clamp(dy * .3, 0, 24);
    wake();
  });
  function release(event) {
    if (event.pointerId !== pointer) return;
    const id = pointer;
    suppressClick = moved;
    pointer = null;
    badge.classList.remove('is-dragging');
    if (badge.hasPointerCapture(id)) badge.releasePointerCapture(id);
    wake();
  }
  badge.addEventListener('pointerup', release);
  badge.addEventListener('pointercancel', release);
  badge.addEventListener('lostpointercapture', release);
  badge.querySelector('img').addEventListener('error', (event) => { event.target.hidden = true; });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) { cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
    wake();
  });
  // A brief settling motion suggests that the badge can be picked up.
  angle = reducedMotion.matches ? rest : 4;
  render(); wake();
})();
