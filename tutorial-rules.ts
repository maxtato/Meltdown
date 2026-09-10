export interface TutorialStep<Context = any> {
  id: string;
  isIntro?: boolean;
  delay?: number;
  targetSel?: string | null;
  side?: string;
  canShow: (context: Context) => boolean;
  autoClose?: ((context: Context) => boolean) | null;
}

export interface TutorialSurface {
  screen: string;
  paused: boolean;
  blocked: boolean;
  personnelOpen: boolean;
  callModalOpen: boolean;
  callPending: boolean;
}

export function tutorialPriority(id: string): number {
  return ({ t_welcome: -1, t_stock_insuffisant: 0, t_phone: 1, t_moral: 2,
    t_congeler: 3, t_vendre: 4, t_cap: 5, t_upgrades: 6, t_phase2: 7, t_market: 8 } as Record<string, number>)[id] ?? 20;
}

export function tutorialFitsSurface(id: string, surface: TutorialSurface): boolean {
  if (surface.screen !== 'game' || surface.paused || surface.blocked) return false;
  if (surface.callModalOpen) return id === 't_stock_insuffisant';
  if (surface.personnelOpen) return id === 't_moral';
  if (id === 't_moral' || id === 't_stock_insuffisant') return false;
  if (surface.callPending) return ['t_phone', 't_congeler', 't_vendre', 't_cap'].includes(id);
  return true;
}

export function tutorialEligible<Context>(step: TutorialStep<Context>, context: Context, surface: TutorialSurface): boolean {
  return tutorialFitsSurface(step.id, surface) && step.canShow(context) && !step.autoClose?.(context);
}

export function tutorialGapAfter(id: string): number {
  return id === 't_welcome' ? 800 : id === 't_congeler' ? 1200 : 15000;
}

export function tutorialReadingTime(text: string): number {
  // Localized copy can be longer than English. Never require reading in a rush.
  return Math.min(30000, Math.max(12000, text.length * 55));
}

export interface TutorialRect { left: number; top: number; width: number; height: number }
const intersects = (a: TutorialRect, b: TutorialRect) => a.left < b.left + b.width + 8 && a.left + a.width > b.left - 8 && a.top < b.top + b.height + 8 && a.top + a.height > b.top - 8;

/** Finds free space beside the target. Never clamp a hint over its own action. */
export function placeTutorial(width: number, height: number, viewport: { width: number; height: number }, target: TutorialRect | null, side = 'top', protectedRects: TutorialRect[] = []) {
  const gap = 14, margin = 8;
  if (width > viewport.width - margin * 2 || height > viewport.height - margin * 2) return null;
  const left = Math.max(margin, Math.min(viewport.width - width - margin, target ? target.left + target.width / 2 - width / 2 : (viewport.width - width) / 2));
  const candidates = target ? [
    { top: target.top - height - gap, left, tail: 'bottom' },
    { top: target.top + target.height + gap, left, tail: 'top' },
    { top: target.top + target.height / 2 - height / 2, left: target.left - width - gap, tail: 'right' },
    { top: target.top + target.height / 2 - height / 2, left: target.left + target.width + gap, tail: 'left' },
  ] : [{ top: margin, left, tail: 'none' }, { top: viewport.height - height - margin, left, tail: 'none' }];
  const preferred = ({ top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as Record<string, string>)[side];
  candidates.sort((a, b) => Number(b.tail === preferred) - Number(a.tail === preferred));
  // Header targets may have no adjacent room, especially with long translations.
  // A free viewport corner is still useful, but must not pretend to point at the target.
  if (target) candidates.push(...[
    { top: margin, left: margin, tail: 'none' },
    { top: margin, left: viewport.width - width - margin, tail: 'none' },
    { top: viewport.height - height - margin, left: margin, tail: 'none' },
    { top: viewport.height - height - margin, left: viewport.width - width - margin, tail: 'none' },
  ].sort((a, b) => Math.hypot(a.left + width / 2 - target.left, a.top + height / 2 - target.top)
    - Math.hypot(b.left + width / 2 - target.left, b.top + height / 2 - target.top)));
  return candidates.find(position => position.left >= margin && position.top >= margin
    && position.left + width <= viewport.width - margin && position.top + height <= viewport.height - margin
    && ![...protectedRects, ...(target ? [target] : [])].some(rect => intersects({ ...position, width, height }, rect))) || null;
}
