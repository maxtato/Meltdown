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
    t_congeler: 3, t_vendre: 4, t_cap: 5, t_revenus: 6, t_upgrades: 7, t_phase2: 8, t_market: 9 } as Record<string, number>)[id] ?? 20;
}

export function tutorialIsOnboarding(id: string): boolean {
  return ['t_welcome', 't_congeler', 't_vendre', 't_revenus', 't_upgrades'].includes(id);
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
  return tutorialIsOnboarding(id) ? 250 : 5000;
}

export function tutorialReadingTime(text: string): number {
  // Localized copy can be longer than English. Never require reading in a rush.
  return Math.min(30000, Math.max(12000, text.length * 55));
}

export interface TutorialRect { left: number; top: number; width: number; height: number }
const intersects = (a: TutorialRect, b: TutorialRect) => a.left < b.left + b.width + 8 && a.left + a.width > b.left - 8 && a.top < b.top + b.height + 8 && a.top + a.height > b.top - 8;

/** Finds free space beside the target. Never clamp a hint over its own action. */
export function placeTutorial(width: number, height: number, viewport: { width: number; height: number }, target: TutorialRect | null, side = 'top', protectedRects: TutorialRect[] = []) {
  const gap = 14, margin = 8, maxDistance = gap + 120;
  if (![width, height, viewport.width, viewport.height].every(value => Number.isFinite(value) && value > 0)
    || width > viewport.width - margin * 2 || height > viewport.height - margin * 2) return null;
  const validRect = (rect: TutorialRect) => [rect.left, rect.top, rect.width, rect.height].every(Number.isFinite)
    && rect.width > 0 && rect.height > 0;
  const obstacles = protectedRects.filter(validRect);
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  const clear = (left: number, top: number) => left >= margin && top >= margin
    && left + width <= viewport.width - margin && top + height <= viewport.height - margin
    && ![...obstacles, ...(target ? [target] : [])].some(rect => intersects({ left, top, width, height }, rect));
  if (!target) {
    for (const top of [margin, viewport.height - height - margin]) {
      for (const left of [(viewport.width - width) / 2, margin, viewport.width - width - margin]) {
        if (clear(left, top)) return { left, top, tail: 'none', tailLeft: null, tailTop: null };
      }
    }
    return null;
  }
  if (!validRect(target)) return null;
  // The arrow aims at the visible part of a partially scrolled control.
  const visible = {
    left: Math.max(0, target.left), right: Math.min(viewport.width, target.left + target.width),
    top: Math.max(0, target.top), bottom: Math.min(viewport.height, target.top + target.height),
  };
  if (visible.left >= visible.right || visible.top >= visible.bottom) return null;
  const candidates: { left: number; top: number; tail: string; tailLeft: number | null; tailTop: number | null; score: number }[] = [];
  for (const direction of ['top', 'bottom', 'left', 'right']) {
    const vertical = direction === 'top' || direction === 'bottom';
    const before = direction === 'top' || direction === 'left';
    const size = vertical ? width : height;
    const depth = vertical ? height : width;
    const edge = vertical ? (before ? visible.top : visible.bottom) : (before ? visible.left : visible.right);
    const targetStart = vertical ? visible.left : visible.top;
    const targetEnd = vertical ? visible.right : visible.bottom;
    const targetCenter = (targetStart + targetEnd) / 2;
    const inset = Math.min(14, size / 2);
    // Keep the arrow's projection on the control while sliding the bubble along it.
    const parallelMin = Math.max(margin, targetStart - size + inset);
    const parallelMax = Math.min((vertical ? viewport.width : viewport.height) - size - margin, targetEnd - inset);
    if (parallelMin > parallelMax) continue;
    const ideal = targetCenter - size / 2;
    const parallelPositions = new Set([clamp(ideal, parallelMin, parallelMax), parallelMin, parallelMax]);
    const normalPositions = new Set([before ? edge - depth - gap : edge + gap]);
    for (const rect of obstacles) {
      const start = vertical ? rect.left : rect.top;
      const end = start + (vertical ? rect.width : rect.height);
      parallelPositions.add(clamp(start - size - margin, parallelMin, parallelMax));
      parallelPositions.add(clamp(end + margin, parallelMin, parallelMax));
      // This also tries the outer edge of a menu/action group containing the target.
      const boundary = vertical ? (before ? rect.top : rect.top + rect.height)
        : (before ? rect.left : rect.left + rect.width);
      normalPositions.add(before ? boundary - depth - gap : boundary + gap);
    }
    for (const normal of normalPositions) {
      const distance = before ? edge - normal - depth : normal - edge;
      if (distance < gap || distance > maxDistance) continue;
      for (const parallel of parallelPositions) {
        const left = vertical ? parallel : normal;
        const top = vertical ? normal : parallel;
        if (!clear(left, top)) continue;
        const arrowStart = Math.max(targetStart, parallel + inset);
        const arrowEnd = Math.min(targetEnd, parallel + size - inset);
        if (arrowStart > arrowEnd) continue;
        const arrow = clamp(targetCenter, arrowStart, arrowEnd) - parallel;
        candidates.push({ left, top,
          tail: ({ top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as Record<string, string>)[direction],
          tailLeft: vertical ? arrow : null, tailTop: vertical ? null : arrow,
          // Prefer nearby space; a requested side must not send the hint far away.
          score: distance + Math.abs(parallel - ideal) * 0.15 + (direction === side ? 0 : 12),
        });
      }
    }
  }
  candidates.sort((a, b) => a.score - b.score);
  if (!candidates.length) return null;
  const { score, ...position } = candidates[0];
  return position;
}
