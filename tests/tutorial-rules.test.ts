import test from 'node:test';
import assert from 'node:assert/strict';
import {
  placeTutorial, tutorialEligible, tutorialFitsSurface, tutorialGapAfter,
  tutorialPriority, tutorialIsOnboarding, tutorialReadingTime,
} from '../tutorial-rules.ts';
import type { TutorialRect, TutorialStep, TutorialSurface } from '../tutorial-rules.ts';

function surface(changes: Partial<TutorialSurface> = {}): TutorialSurface {
  return {
    screen: 'game', paused: false, blocked: false,
    personnelOpen: false, callModalOpen: false, callPending: false,
    ...changes,
  };
}

function assertClear(bubble: TutorialRect, obstacle: TutorialRect) {
  const clearance = Math.max(
    obstacle.left - bubble.left - bubble.width,
    bubble.left - obstacle.left - obstacle.width,
    obstacle.top - bubble.top - bubble.height,
    bubble.top - obstacle.top - obstacle.height,
  );
  assert.ok(clearance >= 8, 'the hint must leave at least 8 px around the protected control');
}

test('pause, critical overlays and non-game screens suppress every kind of tutorial', () => {
  const steps = ['t_welcome', 't_phone', 't_stock_insuffisant', 't_moral', 't_congeler', 't_revenus'];
  for (const state of [surface({ paused: true }), surface({ blocked: true }), surface({ screen: 'menu' })]) {
    for (const id of steps) assert.equal(tutorialFitsSurface(id, state), false, id);
  }
});

test('eligibility rechecks the latest screen and context after a pending delay', () => {
  const step: TutorialStep<{ available: boolean }> = {
    id: 't_phone', canShow: context => context.available,
  };
  assert.equal(tutorialEligible(step, { available: true }, surface()), true);
  assert.equal(tutorialEligible(step, { available: true }, surface({ screen: 'menu' })), false);
  assert.equal(tutorialEligible(step, { available: true }, surface({ paused: true })), false);
  assert.equal(tutorialEligible(step, { available: false }, surface()), false);
  assert.equal(tutorialEligible(step, { available: true }, surface()), true);
});

test('an action completed while its hint is pending makes the hint ineligible', () => {
  const step: TutorialStep<{ produced: number }> = {
    id: 't_congeler', canShow: () => true, autoClose: context => context.produced >= 8,
  };
  assert.equal(tutorialEligible(step, { produced: 7 }, surface()), true);
  assert.equal(tutorialEligible(step, { produced: 8 }, surface()), false);
  assert.equal(tutorialEligible(step, { produced: 100 }, surface()), false);
});

test('staff guidance belongs to the staff panel and disappears when it closes', () => {
  const step: TutorialStep<{ employed: boolean }> = { id: 't_moral', canShow: context => context.employed };
  assert.equal(tutorialEligible(step, { employed: true }, surface({ personnelOpen: true })), true);
  assert.equal(tutorialEligible(step, { employed: true }, surface()), false);
  for (const id of ['t_revenus', 't_salary', 't_phone', 't_congeler']) {
    assert.equal(tutorialFitsSurface(id, surface({ personnelOpen: true })), false, id);
  }
});

test('an open call takes precedence and only shows relevant stock guidance', () => {
  const state = surface({ callModalOpen: true, personnelOpen: true, callPending: true });
  const step: TutorialStep<{ insufficient: boolean }> = {
    id: 't_stock_insuffisant', canShow: context => context.insufficient,
    autoClose: context => !context.insufficient,
  };
  assert.equal(tutorialEligible(step, { insufficient: true }, state), true);
  assert.equal(tutorialEligible(step, { insufficient: false }, state), false);
  assert.equal(tutorialEligible(step, { insufficient: true }, surface()), false);
  for (const id of ['t_moral', 't_phone', 't_congeler', 't_revenus']) {
    assert.equal(tutorialFitsSurface(id, state), false, id);
  }
});

test('a ringing phone postpones general lessons while keeping useful production guidance', () => {
  const state = surface({ callPending: true });
  for (const id of ['t_phone', 't_congeler', 't_vendre', 't_cap']) {
    assert.equal(tutorialFitsSurface(id, state), true, id);
  }
  for (const id of ['t_revenus', 't_level', 't_events', 't_phase2', 't_upgrades']) {
    assert.equal(tutorialFitsSurface(id, state), false, id);
  }
});

test('contextual help and the first actions rank ahead of general explanations', () => {
  assert.ok(tutorialPriority('t_stock_insuffisant') < tutorialPriority('t_phone'));
  assert.ok(tutorialPriority('t_phone') < tutorialPriority('t_revenus'));
  assert.ok(tutorialPriority('t_moral') < tutorialPriority('t_events'));
  assert.ok(tutorialPriority('t_congeler') < tutorialPriority('t_vendre'));
  assert.ok(tutorialPriority('t_vendre') < tutorialPriority('t_upgrades'));
  assert.ok(tutorialPriority('t_cap') < tutorialPriority('t_revenus'));
});

test('the first controls follow promptly and later lessons leave time to play', () => {
  for (const id of ['t_welcome', 't_congeler', 't_vendre', 't_revenus', 't_upgrades']) {
    assert.ok(tutorialIsOnboarding(id));
    assert.ok(tutorialGapAfter(id) <= 300, 'no long pause breaks the first actions');
  }
  assert.equal(tutorialIsOnboarding('t_phase2'), false);
  assert.ok(tutorialGapAfter('t_phase2') >= 5000);
  assert.ok(tutorialPriority('t_revenus') < tutorialPriority('t_upgrades'));
});

test('reading time accommodates longer translations without endless hints', () => {
  const shortCopy = 'Clique pour produire.';
  const longerCopy = 'Préserve une réserve pour tes prochaines factures. '.repeat(8);
  assert.ok(tutorialReadingTime(shortCopy) >= 12000);
  assert.ok(tutorialReadingTime(longerCopy) > tutorialReadingTime(shortCopy));
  assert.ok(tutorialReadingTime(longerCopy) <= 30000);
  assert.equal(tutorialReadingTime('Très longue explication. '.repeat(100)), 30000);
});

test('mobile placement switches sides to preserve the target and production controls', () => {
  const viewport = { width: 390, height: 844 };
  const target = { left: 150, top: 340, width: 90, height: 40 };
  const actions = { left: 20, top: 200, width: 350, height: 120 };
  const position = placeTutorial(300, 120, viewport, target, 'top', [actions]);
  assert.ok(position);
  assert.equal(position.tail, 'top');
  const bubble = { ...position, width: 300, height: 120 };
  assertClear(bubble, target);
  assertClear(bubble, actions);
  assert.ok(position.left >= 8 && position.left + bubble.width <= viewport.width - 8);
  assert.ok(position.top >= 8 && position.top + bubble.height <= viewport.height - 8);
});

test('a target near the top edge gets a hint below without covering it', () => {
  const target = { left: 20, top: 16, width: 160, height: 44 };
  const position = placeTutorial(300, 100, { width: 390, height: 844 }, target, 'top');
  assert.ok(position);
  assert.equal(position.tail, 'top');
  assertClear({ ...position, width: 300, height: 100 }, target);
});

test('a desktop hint respects the requested side when there is enough room', () => {
  const target = { left: 600, top: 300, width: 140, height: 60 };
  const position = placeTutorial(240, 110, { width: 1280, height: 800 }, target, 'left');
  assert.ok(position);
  assert.equal(position.tail, 'right');
  assertClear({ ...position, width: 240, height: 110 }, target);
});

test('an unanchored hint uses a free edge instead of covering a protected menu', () => {
  const menu = { left: 0, top: 0, width: 390, height: 160 };
  const position = placeTutorial(300, 100, { width: 390, height: 844 }, null, 'top', [menu]);
  assert.ok(position);
  assert.equal(position.tail, 'none');
  assertClear({ ...position, width: 300, height: 100 }, menu);
  assert.ok(position.top > menu.top + menu.height);
});

test('anchored guidance is postponed instead of jumping to a distant free corner', () => {
  const viewport = { width: 390, height: 844 };
  const target = { left: 310, top: 20, width: 60, height: 50 };
  const headerControls = { left: 0, top: 0, width: 390, height: 220 };
  const position = placeTutorial(240, 250, viewport, target, 'bottom', [headerControls]);
  assert.equal(position, null, 'the only free area is more than 134 px from the control');
  assert.equal(placeTutorial(240, 250, viewport, target, 'bottom', [{ left: 0, top: 0, ...viewport }]), null,
    'a fully protected viewport has no acceptable placement');
});

function assertArrowPointsAtTarget(position: NonNullable<ReturnType<typeof placeTutorial>>, target: TutorialRect, viewport: { width: number; height: number }) {
  assert.notEqual(position.tail, 'none', 'anchored advice always keeps its arrow');
  if (position.tail === 'top' || position.tail === 'bottom') {
    assert.equal(position.tailTop, null);
    assert.notEqual(position.tailLeft, null);
    const x = position.left + position.tailLeft!;
    assert.ok(x >= Math.max(0, target.left) && x <= Math.min(viewport.width, target.left + target.width), 'the vertical arrow must face the visible target');
  } else {
    assert.equal(position.tailLeft, null);
    assert.notEqual(position.tailTop, null);
    const y = position.top + position.tailTop!;
    assert.ok(y >= Math.max(0, target.top) && y <= Math.min(viewport.height, target.top + target.height), 'the horizontal arrow must face the visible target');
  }
}

test('a side placement slides inside the top and bottom viewport edges', () => {
  const viewport = { width: 390, height: 844 };
  for (const top of [24, 800]) {
    const target = { left: 310, top, width: 60, height: 24 };
    const position = placeTutorial(240, 150, viewport, target, 'left');
    assert.ok(position);
    assert.equal(position.tail, 'right');
    assert.equal(position.left, 56);
    assert.ok(position.top >= 8 && position.top + 150 <= viewport.height - 8);
    assertClear({ ...position, width: 240, height: 150 }, target);
    assertArrowPointsAtTarget(position, target, viewport);
  }
});

test('an adjacent bubble slides parallel to its target to clear a protected control', () => {
  const viewport = { width: 760, height: 450 };
  const target = { left: 200, top: 300, width: 300, height: 40 };
  const obstacle = { left: 420, top: 140, width: 300, height: 130 };
  const position = placeTutorial(240, 100, viewport, target, 'top', [obstacle]);
  assert.ok(position);
  assert.equal(position.tail, 'bottom');
  assert.equal(position.top, 186);
  assert.equal(position.left, 172);
  assertClear({ ...position, width: 240, height: 100 }, obstacle);
  assertClear({ ...position, width: 240, height: 100 }, target);
  assertArrowPointsAtTarget(position, target, viewport);
});

test('mobile cash guidance stays alongside the cash control above the menu', () => {
  const viewport = { width: 390, height: 844 };
  const target = { left: 310, top: 140, width: 60, height: 24 };
  const menu = { left: 20, top: 220, width: 350, height: 40 };
  const position = placeTutorial(240, 150, viewport, target, 'bottom', [menu]);
  assert.ok(position);
  assert.equal(position.tail, 'right');
  assert.equal(position.left, 56);
  assert.ok(position.top + 150 <= menu.top - 8);
  assertClear({ ...position, width: 240, height: 150 }, target);
  assertClear({ ...position, width: 240, height: 150 }, menu);
  assertArrowPointsAtTarget(position, target, viewport);
});

test('a protected group around the target uses its nearby outer edge', () => {
  const viewport = { width: 390, height: 844 };
  const target = { left: 310, top: 140, width: 60, height: 24 };
  const group = { left: 0, top: 100, width: 390, height: 110 };
  const menu = { left: 20, top: 220, width: 350, height: 40 };
  const position = placeTutorial(240, 150, viewport, target, 'bottom', [group, menu]);
  assert.ok(position);
  assert.equal(position.tail, 'top');
  assert.equal(position.top, 274);
  assert.ok(position.top - target.top - target.height <= 134);
  for (const rect of [target, group, menu]) assertClear({ ...position, width: 240, height: 150 }, rect);
  assertArrowPointsAtTarget(position, target, viewport);
});

test('the arrow points to the visible center of a partly scrolled target', () => {
  const viewport = { width: 390, height: 844 };
  const target = { left: 310, top: -30, width: 60, height: 100 };
  const position = placeTutorial(240, 110, viewport, target, 'left');
  assert.ok(position);
  assert.equal(position.tail, 'right');
  assert.equal(position.top + position.tailTop!, 35);
  assertArrowPointsAtTarget(position, target, viewport);
  assert.equal(placeTutorial(240, 110, viewport, { ...target, top: -200 }), null);
});

test('a preferred but detached side yields to space directly beside the target', () => {
  const viewport = { width: 800, height: 600 };
  const target = { left: 350, top: 300, width: 100, height: 40 };
  const obstacle = { left: 300, top: 180, width: 200, height: 90 };
  const position = placeTutorial(240, 100, viewport, target, 'top', [obstacle]);
  assert.ok(position);
  assert.equal(position.tail, 'top');
  assert.equal(position.top, 354);
  assertArrowPointsAtTarget(position, target, viewport);
});

test('a hint is postponed when the viewport has no safe space', () => {
  const viewport = { width: 320, height: 200 };
  const target = { left: 120, top: 80, width: 80, height: 40 };
  assert.equal(placeTutorial(280, 120, viewport, target), null);
  assert.equal(placeTutorial(320, 100, viewport, null), null);
  assert.equal(placeTutorial(280, 200, viewport, null), null);
  assert.equal(placeTutorial(280, 80, viewport, null, 'top', [{ left: 0, top: 0, ...viewport }]), null);
});
