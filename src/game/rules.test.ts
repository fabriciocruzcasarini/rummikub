import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateDeck,
  isValidGroup,
  isValidRun,
  isValidMeld,
  isBoardValid,
  calculateMeldPoints,
  calculateHandScore,
  dealHands,
  findInitialMelds,
  type Tile,
} from './rules.ts';

test('deck generation generates exactly 106 tiles with 2 jokers', () => {
  const deck = generateDeck();
  assert.equal(deck.length, 106);
  const jokers = deck.filter((t) => t.isJoker);
  assert.equal(jokers.length, 2);
  const blues = deck.filter((t) => t.color === 'blue');
  assert.equal(blues.length, 26); // 2 sets of 13
});

test('group validation works for 3 and 4 tiles with distinct colors', () => {
  const validGroup3: Tile[] = [
    { id: '1', number: 7, color: 'blue', isJoker: false },
    { id: '2', number: 7, color: 'red', isJoker: false },
    { id: '3', number: 7, color: 'black', isJoker: false },
  ];
  assert.equal(isValidGroup(validGroup3), true);

  const validGroup4: Tile[] = [
    { id: '1', number: 7, color: 'blue', isJoker: false },
    { id: '2', number: 7, color: 'red', isJoker: false },
    { id: '3', number: 7, color: 'black', isJoker: false },
    { id: '4', number: 7, color: 'yellow', isJoker: false },
  ];
  assert.equal(isValidGroup(validGroup4), true);

  // Duplicate color is invalid
  const duplicateColorGroup: Tile[] = [
    { id: '1', number: 7, color: 'blue', isJoker: false },
    { id: '2', number: 7, color: 'blue', isJoker: false },
    { id: '3', number: 7, color: 'black', isJoker: false },
  ];
  assert.equal(isValidGroup(duplicateColorGroup), false);

  // Different numbers is invalid
  const differentNumbersGroup: Tile[] = [
    { id: '1', number: 7, color: 'blue', isJoker: false },
    { id: '2', number: 8, color: 'red', isJoker: false },
    { id: '3', number: 7, color: 'black', isJoker: false },
  ];
  assert.equal(isValidGroup(differentNumbersGroup), false);

  // Length 2 is invalid
  assert.equal(isValidGroup(validGroup3.slice(0, 2)), false);
});

test('group with joker works correctly', () => {
  const groupWithJoker: Tile[] = [
    { id: '1', number: 10, color: 'blue', isJoker: false },
    { id: '2', number: 10, color: 'red', isJoker: false },
    { id: 'j', number: 0, color: 'joker', isJoker: true },
  ];
  assert.equal(isValidGroup(groupWithJoker), true);
  assert.equal(calculateMeldPoints(groupWithJoker), 30);
});

test('run validation works for consecutive same-color tiles', () => {
  const validRun: Tile[] = [
    { id: '1', number: 4, color: 'red', isJoker: false },
    { id: '2', number: 5, color: 'red', isJoker: false },
    { id: '3', number: 6, color: 'red', isJoker: false },
    { id: '4', number: 7, color: 'red', isJoker: false },
  ];
  assert.equal(isValidRun(validRun), true);
  assert.equal(calculateMeldPoints(validRun), 4 + 5 + 6 + 7); // 22

  // Different colors in run is invalid
  const wrongColorRun: Tile[] = [
    { id: '1', number: 4, color: 'red', isJoker: false },
    { id: '2', number: 5, color: 'blue', isJoker: false },
    { id: '3', number: 6, color: 'red', isJoker: false },
  ];
  assert.equal(isValidRun(wrongColorRun), false);

  // Gap without joker is invalid
  const gapRun: Tile[] = [
    { id: '1', number: 4, color: 'red', isJoker: false },
    { id: '2', number: 6, color: 'red', isJoker: false },
    { id: '3', number: 7, color: 'red', isJoker: false },
  ];
  assert.equal(isValidRun(gapRun), false);
});

test('run with joker works correctly', () => {
  const runWithJoker: Tile[] = [
    { id: '1', number: 9, color: 'yellow', isJoker: false },
    { id: 'j', number: 0, color: 'joker', isJoker: true },
    { id: '3', number: 11, color: 'yellow', isJoker: false },
  ];
  assert.equal(isValidRun(runWithJoker), true);
  assert.equal(calculateMeldPoints(runWithJoker), 9 + 10 + 11); // 30
});

test('board validation verifies all sets on table', () => {
  const board: Tile[][] = [
    [
      { id: '1', number: 10, color: 'blue', isJoker: false },
      { id: '2', number: 10, color: 'red', isJoker: false },
      { id: '3', number: 10, color: 'yellow', isJoker: false },
    ],
    [
      { id: '4', number: 1, color: 'black', isJoker: false },
      { id: '5', number: 2, color: 'black', isJoker: false },
      { id: '6', number: 3, color: 'black', isJoker: false },
    ],
  ];
  assert.equal(isBoardValid(board), true);

  // If one set has 2 tiles, board is invalid
  board.push([
    { id: '7', number: 5, color: 'red', isJoker: false },
    { id: '8', number: 6, color: 'red', isJoker: false },
  ]);
  assert.equal(isBoardValid(board), false);
});

test('dealing hands gives 14 tiles to 3 players', () => {
  const deck = generateDeck();
  const { hands, remainingDeck } = dealHands(deck, 3);
  assert.equal(hands.length, 3);
  assert.equal(hands[0].length, 14);
  assert.equal(hands[1].length, 14);
  assert.equal(hands[2].length, 14);
  assert.equal(remainingDeck.length, 106 - 42); // 64
});

test('calculateHandScore handles jokers as 30 points penalty', () => {
  const hand: Tile[] = [
    { id: '1', number: 5, color: 'blue', isJoker: false },
    { id: '2', number: 8, color: 'red', isJoker: false },
    { id: 'j', number: 0, color: 'joker', isJoker: true },
  ];
  assert.equal(calculateHandScore(hand), 5 + 8 + 30);
});

test('findInitialMelds detects 30+ points opening melds', () => {
  const rackWithOpening: Tile[] = [
    { id: '1', number: 10, color: 'blue', isJoker: false },
    { id: '2', number: 10, color: 'red', isJoker: false },
    { id: '3', number: 10, color: 'black', isJoker: false }, // 30 points
    { id: '4', number: 2, color: 'yellow', isJoker: false },
  ];
  const result = findInitialMelds(rackWithOpening);
  assert.notEqual(result, null);
  assert.ok(result!.points >= 30);
});
