/**
 * Cartoon UI styling (ADR-004). Injected once at boot. One playful direction:
 * deep indigo gradient, rounded glassy panels, bright pill buttons, bold display type.
 */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@600;700;800&display=swap');

:root {
  --bg-0: #141432;
  --bg-1: #20204e;
  --panel: rgba(40, 40, 92, 0.72);
  --panel-line: rgba(255, 255, 255, 0.12);
  --ink: #ffffff;
  --ink-soft: #b9b9e6;
  --pink: #ff4d8d;
  --cyan: #4dd4ff;
  --yellow: #ffd23f;
  --green: #7cff6b;
  --red: #ff5a5a;
  --display: 'Baloo 2', 'Trebuchet MS', system-ui, sans-serif;
  --body: 'Nunito', system-ui, sans-serif;
}

#ui {
  position: fixed; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--body); color: var(--ink);
  pointer-events: none; z-index: 10;
  padding: 20px;
}
#ui.hidden { display: none; }
#ui > * { pointer-events: auto; }

.bq-card {
  width: min(440px, 92vw);
  background: var(--panel);
  border: 1px solid var(--panel-line);
  border-radius: 28px;
  padding: 32px 30px;
  box-shadow: 0 24px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08);
  backdrop-filter: blur(14px);
  animation: bq-pop 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes bq-pop { from { transform: translateY(14px) scale(0.96); opacity: 0; } to { transform: none; opacity: 1; } }

.bq-title {
  font-family: var(--display); font-weight: 800;
  font-size: clamp(40px, 7vw, 60px); line-height: 1; text-align: center;
  background: linear-gradient(120deg, var(--pink), var(--yellow) 55%, var(--cyan));
  -webkit-background-clip: text; background-clip: text; color: transparent;
  margin-bottom: 6px; letter-spacing: 0.5px;
}
.bq-tag { text-align: center; color: var(--ink-soft); margin-bottom: 22px; font-weight: 700; }

.bq-label { display: block; font-weight: 800; font-size: 13px; color: var(--ink-soft);
  text-transform: uppercase; letter-spacing: 1.2px; margin: 14px 2px 7px; }

.bq-input {
  width: 100%; box-sizing: border-box; font-family: var(--body); font-weight: 700;
  font-size: 17px; color: var(--ink); background: rgba(0,0,0,0.28);
  border: 2px solid var(--panel-line); border-radius: 16px; padding: 13px 16px;
  outline: none; transition: border-color 0.15s, box-shadow 0.15s;
}
.bq-input::placeholder { color: rgba(185,185,230,0.55); }
.bq-input:focus { border-color: var(--cyan); box-shadow: 0 0 0 4px rgba(77,212,255,0.18); }
.bq-input.code { text-transform: uppercase; letter-spacing: 6px; text-align: center; font-size: 26px; font-family: var(--display); }

.bq-btn {
  width: 100%; font-family: var(--display); font-weight: 800; font-size: 18px;
  color: #1a1030; border: none; border-radius: 16px; padding: 14px 18px; margin-top: 14px;
  cursor: pointer; transition: transform 0.12s, filter 0.12s, opacity 0.12s;
  box-shadow: 0 8px 0 rgba(0,0,0,0.25);
}
.bq-btn:active { transform: translateY(4px); box-shadow: 0 4px 0 rgba(0,0,0,0.25); }
.bq-btn:hover { filter: brightness(1.06); }
.bq-btn.primary { background: linear-gradient(135deg, var(--pink), #ff7eb3); color: #fff; }
.bq-btn.cyan { background: linear-gradient(135deg, var(--cyan), #76e6ff); }
.bq-btn.yellow { background: linear-gradient(135deg, var(--yellow), #ffe27a); }
.bq-btn[disabled] { opacity: 0.45; cursor: not-allowed; filter: grayscale(0.4); box-shadow: 0 8px 0 rgba(0,0,0,0.2); }
.bq-btn:active[disabled] { transform: none; box-shadow: 0 8px 0 rgba(0,0,0,0.2); }

.bq-divider { display: flex; align-items: center; gap: 12px; color: var(--ink-soft);
  font-weight: 800; margin: 22px 0 6px; font-size: 13px; }
.bq-divider::before, .bq-divider::after { content: ''; flex: 1; height: 2px; background: var(--panel-line); border-radius: 2px; }

.bq-error { background: rgba(255,90,90,0.16); border: 1px solid rgba(255,90,90,0.4);
  color: #ffd2d2; border-radius: 14px; padding: 10px 14px; margin-top: 14px; font-weight: 700; text-align: center; }

.bq-code-display { text-align: center; margin-bottom: 18px; }
.bq-code-display .code { font-family: var(--display); font-weight: 800; font-size: 46px;
  letter-spacing: 10px; color: var(--yellow); cursor: pointer; user-select: all; }
.bq-code-display .hint { color: var(--ink-soft); font-weight: 700; font-size: 13px; margin-top: 2px; }

.bq-players { list-style: none; margin: 4px 0 8px; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.bq-player { display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.22);
  border-radius: 14px; padding: 10px 14px; font-weight: 700; animation: bq-pop 0.3s ease; }
.bq-player .dot { width: 12px; height: 12px; border-radius: 50%; background: var(--cyan); flex: none; box-shadow: 0 0 10px var(--cyan); }
.bq-player .name { flex: 1; }
.bq-badge { font-size: 11px; font-weight: 800; padding: 3px 9px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.6px; }
.bq-badge.host { background: var(--yellow); color: #3a2a00; }
.bq-badge.you { background: var(--cyan); color: #06303f; }

.bq-count { text-align: center; color: var(--ink-soft); font-weight: 800; margin: 6px 0 4px; }

/* Role reveal */
.bq-reveal { width: min(560px, 94vw); text-align: center; }
.bq-slot { font-family: var(--display); font-weight: 800; font-size: clamp(28px, 6vw, 46px);
  background: rgba(0,0,0,0.3); border: 2px solid var(--panel-line); border-radius: 20px;
  padding: 22px; margin: 14px 0; min-height: 70px; display: flex; align-items: center; justify-content: center;
  color: var(--ink); overflow: hidden; }
.bq-role-banner { font-family: var(--display); font-weight: 800; font-size: clamp(34px, 8vw, 64px);
  margin-top: 10px; animation: bq-pop 0.4s ease; }
.bq-role-banner.seeker { color: var(--pink); }
.bq-role-banner.hider { color: var(--cyan); }
.bq-role-sub { color: var(--ink-soft); font-weight: 700; margin-top: 6px; }

/* In-game HUD (non-blocking top bar) */
.bq-hud { position: fixed; top: 14px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 20px; background: var(--panel);
  border: 1px solid var(--panel-line); border-radius: 18px; padding: 9px 20px;
  backdrop-filter: blur(10px); box-shadow: 0 10px 30px rgba(0,0,0,0.4); white-space: nowrap; }
.bq-hud-left, .bq-hud-right { min-width: 92px; }
.bq-hud-right { text-align: right; }
.bq-hud-role { font-family: var(--display); font-weight: 800; font-size: 16px; }
.bq-hud-role.seeker { color: var(--pink); }
.bq-hud-role.hider { color: var(--cyan); }
.bq-hud-center { text-align: center; }
.bq-hud-timer { font-family: var(--display); font-weight: 800; font-size: 30px; line-height: 1; color: var(--ink); }
.bq-hud-timer.urgent { color: var(--red); animation: bq-pulse 0.8s ease-in-out infinite; }
@keyframes bq-pulse { 50% { opacity: 0.45; } }
.bq-hud-phase { font-weight: 800; font-size: 11px; letter-spacing: 1.5px; color: var(--ink-soft); }
.bq-hud-remaining { font-weight: 800; color: var(--yellow); }

.dot.seeker { background: var(--pink); box-shadow: 0 0 10px var(--pink); }
.dot.hider { background: var(--cyan); box-shadow: 0 0 10px var(--cyan); }

.bq-mute { position: fixed; top: 14px; right: 14px; z-index: 30;
  width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--panel-line);
  background: var(--panel); color: var(--ink); font-size: 20px; cursor: pointer;
  backdrop-filter: blur(8px); box-shadow: 0 6px 18px rgba(0,0,0,0.4); transition: transform 0.1s; }
.bq-mute:hover { transform: scale(1.08); }
.bq-mute:active { transform: scale(0.94); }

.bq-stick { position: fixed; left: 22px; bottom: 22px; width: 120px; height: 120px;
  border-radius: 50%; background: rgba(40,40,92,0.5); border: 2px solid var(--panel-line);
  touch-action: none; z-index: 20; backdrop-filter: blur(6px); }
.bq-stick-knob { position: absolute; left: 50%; top: 50%; width: 54px; height: 54px;
  margin: -27px 0 0 -27px; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, var(--cyan), #2a8fb0);
  box-shadow: 0 4px 12px rgba(0,0,0,0.45); }

/* Paint studio (docked, prep) */
.bq-studio { position: fixed; left: 16px; top: 50%; transform: translateY(-50%);
  width: 232px; background: var(--panel); border: 1px solid var(--panel-line);
  border-radius: 22px; padding: 14px; backdrop-filter: blur(12px);
  box-shadow: 0 16px 40px rgba(0,0,0,0.45); animation: bq-pop 0.3s ease; }
.bq-studio-title { font-family: var(--display); font-weight: 800; font-size: 15px;
  text-align: center; color: var(--ink); margin-bottom: 10px; }
.bq-paint-stage { position: relative; width: 156px; height: 208px; margin: 0 auto 10px;
  border-radius: 14px; overflow: hidden; border: 2px solid var(--panel-line);
  touch-action: none; cursor: crosshair; background: #0c0c20; }
.bq-paint-canvas { position: absolute; inset: 0; width: 100%; height: 100%; image-rendering: auto; }
.bq-paint-canvas.guide { pointer-events: none; opacity: 0.5; }
.bq-swatches { display: flex; flex-wrap: wrap; gap: 5px; justify-content: center; margin-bottom: 10px; }
.bq-swatch { width: 24px; height: 24px; border-radius: 7px; border: 2px solid rgba(255,255,255,0.25);
  cursor: pointer; padding: 0; transition: transform 0.1s; }
.bq-swatch:hover { transform: scale(1.12); }
.bq-tool-row, .bq-pose-row { display: flex; gap: 6px; align-items: center; justify-content: center; flex-wrap: wrap; margin-bottom: 8px; }
.bq-tool { font-family: var(--display); font-weight: 800; font-size: 15px; color: var(--ink);
  background: rgba(0,0,0,0.28); border: 2px solid var(--panel-line); border-radius: 12px;
  padding: 7px 10px; cursor: pointer; transition: all 0.12s; min-width: 38px; }
.bq-tool:hover { border-color: var(--cyan); }
.bq-tool.active { background: var(--cyan); color: #06303f; border-color: var(--cyan); }
.bq-tool.pose { min-width: 30px; padding: 6px 8px; }
.bq-color { width: 40px; height: 36px; border: none; border-radius: 10px; background: none; cursor: pointer; padding: 0; }
.bq-slider-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; font-weight: 800; font-size: 12px; color: var(--ink-soft); }
.bq-slider-row span { width: 34px; }
.bq-range { flex: 1; accent-color: var(--pink); }
.bq-pose-label { font-weight: 800; font-size: 12px; color: var(--ink-soft); margin-right: 2px; }

@media (max-width: 720px) {
  .bq-studio { left: 50%; top: auto; bottom: 10px; transform: translateX(-50%);
    width: min(94vw, 360px); display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; }
  .bq-studio-title { width: 100%; margin-bottom: 4px; }
  .bq-paint-stage { width: 108px; height: 144px; margin: 0; }
}
`;

let injected = false;
export function injectStyles(): void {
  if (injected) return;
  const style = document.createElement('style');
  style.id = 'bq-styles';
  style.textContent = CSS;
  document.head.append(style);
  injected = true;
}
