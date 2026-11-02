import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PAPER_SIZES,
  getOrientedPaperDimensions,
  synthesizeDynamicStyles,
  getAvailableStyles,
  computeSheetSlotRects,
  resolveSlotPhotos,
  swapSlotWithNext,
  DEFAULT_SLOT_TRANSFORM,
} from './printLayoutEngine';

test('paper sizes calculate exact 300 DPI and oriented dimensions', () => {
  const p12x18 = getOrientedPaperDimensions('12x18', 'portrait', 300);
  assert.equal(p12x18.widthIn, 12);
  assert.equal(p12x18.heightIn, 18);
  assert.equal(p12x18.widthPx, 3600);
  assert.equal(p12x18.heightPx, 5400);

  const l13x19 = getOrientedPaperDimensions('13x19', 'landscape', 300);
  assert.equal(l13x19.widthIn, 19);
  assert.equal(l13x19.heightIn, 13);
  assert.equal(l13x19.widthPx, 5700);
  assert.equal(l13x19.heightPx, 3900);

  const a4At150 = getOrientedPaperDimensions('a4', 'portrait', 150);
  assert.equal(a4At150.widthPx, 1240);
  assert.equal(a4At150.heightPx, 1754);

  const a3At300 = getOrientedPaperDimensions('a3', 'portrait', 300);
  assert.equal(a3At300.widthPx, 3508);
  assert.equal(a3At300.heightPx, 4960);
});

test('dynamic style synthesis creates exact N slots for arbitrary image counts', () => {
  for (const arbitraryCount of [7, 10, 11, 14]) {
    const synthesized = synthesizeDynamicStyles(arbitraryCount);
    assert.equal(synthesized.length, 3);
    for (const style of synthesized) {
      assert.equal(style.slotCount, arbitraryCount);
      assert.equal(style.cells.length, arbitraryCount);
    }
  }

  const matchedFor7 = getAvailableStyles(7, 'match');
  assert.ok(matchedFor7.length >= 3);
  assert.equal(matchedFor7[0].slotCount, 7);
});

test('computeSheetSlotRects respects outer safe margins and gutters', () => {
  const style2x2 = getAvailableStyles(4, 'match')[0];
  assert.equal(style2x2.id, '4-grid-2x2');

  const rects = computeSheetSlotRects(12, 18, style2x2, 0.5, 0.2);
  assert.equal(rects.length, 4);

  // Outer safe width is 12 - 1.0 = 11.0 in; with 0.2 in gutter between 2 cols, each slot width is (5.5 - 0.1) = 5.4 in
  assert.ok(Math.abs(rects[0].xIn - 0.5) < 0.001);
  assert.ok(Math.abs(rects[0].yIn - 0.5) < 0.001);
  assert.ok(Math.abs(rects[0].widthIn - 5.4) < 0.001);
  // Outer safe height is 18 - 1.0 = 17.0 in; with 0.2 in gutter between 2 rows, each slot height is (8.5 - 0.1) = 8.4 in
  assert.ok(Math.abs(rects[0].heightIn - 8.4) < 0.001);
});

test('resolveSlotPhotos cycles photos in repeat mode and swapSlotWithNext swaps cleanly', () => {
  const mockPhotos = [
    { id: 'p1', name: 'One.jpg', dataUrl: 'data:1', width: 800, height: 1000 },
    { id: 'p2', name: 'Two.jpg', dataUrl: 'data:2', width: 800, height: 1000 },
  ];
  const resolved = resolveSlotPhotos(mockPhotos, 4, []);
  assert.equal(resolved.length, 4);
  assert.equal(resolved[0]?.id, 'p1');
  assert.equal(resolved[1]?.id, 'p2');
  assert.equal(resolved[2]?.id, 'p1');
  assert.equal(resolved[3]?.id, 'p2');

  const { nextOrder, nextTransforms, newActiveSlot } = swapSlotWithNext(
    0,
    4,
    [0, 1, 2, 3],
    {
      0: { ...DEFAULT_SLOT_TRANSFORM, zoom: 1.8, rotation: 90 },
      1: { ...DEFAULT_SLOT_TRANSFORM, zoom: 1.0, rotation: 0 },
    }
  );
  assert.deepEqual(nextOrder, [1, 0, 2, 3]);
  assert.equal(newActiveSlot, 1);
  assert.equal(nextTransforms[1].zoom, 1.8);
  assert.equal(nextTransforms[1].rotation, 90);
});
