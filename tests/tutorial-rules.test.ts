import test from 'node:test';
import assert from 'node:assert/strict';
import {
  placeTutorial, tutorialEligible, tutorialFitsSurface, tutorialGapAfter,
  tutorialPriority, tutorialReadingTime,
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
  assert.ok(tutorialGapAfter('t_welcome') <= 1000);
  assert.ok(tutorialGapAfter('t_congeler') <= 2000);
  assert.ok(tutorialGapAfter('t_vendre') >= 15000);
  assert.ok(tutorialGapAfter('t_revenus') >= 15000);
  assert.ok(tutorialGapAfter('t_phase2') >= 15000);
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

test('long mobile guidance falls back to a free corner without a misleading arrow', () => {
  const viewport = { width: 390, height: 844 };
  const target = { left: 310, top: 20, width: 60, height: 50 };
  const headerControls = { left: 0, top: 0, width: 390, height: 220 };
  const position = placeTutorial(240, 250, viewport, target, 'bottom', [headerControls]);
  assert.ok(position, 'free space away from the crowded header should still allow the advice');
  assert.equal(position.tail, 'none');
  const bubble = { ...position, width: 240, height: 250 };
  assertClear(bubble, target);
  assertClear(bubble, headerControls);
  assert.ok(position.left >= 8 && position.left + bubble.width <= viewport.width - 8);
  assert.ok(position.top >= 8 && position.top + bubble.height <= viewport.height - 8);
  assert.equal(placeTutorial(240, 250, viewport, target, 'bottom', [{ left: 0, top: 0, ...viewport }]), null,
    'corner fallbacks must also be rejected when protected controls occupy all available space');
});

test('a hint is postponed when the viewport has no safe space', () => {
  const viewport = { width: 320, height: 200 };
  const target = { left: 120, top: 80, width: 80, height: 40 };
  assert.equal(placeTutorial(280, 120, viewport, target), null);
  assert.equal(placeTutorial(320, 100, viewport, null), null);
  assert.equal(placeTutorial(280, 200, viewport, null), null);
  assert.equal(placeTutorial(280, 80, viewport, null, 'top', [{ left: 0, top: 0, ...viewport }]), null);
});
