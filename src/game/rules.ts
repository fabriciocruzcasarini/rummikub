export type TileColor = 'black' | 'blue' | 'red' | 'yellow' | 'joker';

export interface Tile {
  id: string;
  number: number; // 1-13, or 0 for joker
  color: TileColor;
  isJoker: boolean;
}

export type MeldType = 'group' | 'run' | 'invalid';

/**
 * Creates the complete standard Rummikub deck of 106 tiles:
 * 2 sets of numbers 1-13 in 4 colors (black, blue, red, yellow) = 104 tiles
 * + 2 Jokers (1 black/red, 1 blue/yellow) = 106 tiles
 */
export function generateDeck(): Tile[] {
  const deck: Tile[] = [];
  const colors: TileColor[] = ['black', 'blue', 'red', 'yellow'];

  // 2 sets of each color 1-13
  for (let set = 1; set <= 2; set++) {
    for (const color of colors) {
      for (let num = 1; num <= 13; num++) {
        deck.push({
          id: `${color}-${num}-${set}`,
          number: num,
          color,
          isJoker: false,
        });
      }
    }
  }

  // 2 Jokers
  deck.push({
    id: 'joker-black-1',
    number: 0,
    color: 'joker',
    isJoker: true,
  });
  deck.push({
    id: 'joker-red-2',
    number: 0,
    color: 'joker',
    isJoker: true,
  });

  return shuffleArray(deck);
}

export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Validates if a set is a valid Group (Trinca ou Quadra):
 * 3 or 4 tiles of the same number with distinct colors.
 * Jokers can substitute any missing color.
 */
export function isValidGroup(tiles: Tile[]): boolean {
  if (tiles.length < 3 || tiles.length > 4) return false;

  const nonJokers = tiles.filter((t) => !t.isJoker);
  if (nonJokers.length === 0) return false;

  const targetNumber = nonJokers[0].number;
  if (targetNumber < 1 || targetNumber > 13) return false;

  // Check all non-jokers have the same number
  if (!nonJokers.every((t) => t.number === targetNumber)) return false;

  // Check all non-jokers have distinct colors
  const colors = new Set<TileColor>();
  for (const t of nonJokers) {
    if (colors.has(t.color)) return false;
    colors.add(t.color);
  }

  // Total count can't exceed 4 colors
  return tiles.length <= 4;
}

/**
 * Validates if a set is a valid Run (Sequência):
 * 3 or more consecutive numbers in the SAME color.
 * 1 is always low (1-13, no wrap-around like 13-1-2).
 * Jokers can substitute any missing consecutive number.
 */
export function isValidRun(tiles: Tile[]): boolean {
  if (tiles.length < 3 || tiles.length > 13) return false;

  const nonJokers = tiles.filter((t) => !t.isJoker);
  if (nonJokers.length === 0) return false;

  // All non-jokers must share the exact same color
  const runColor = nonJokers[0].color;
  if (!nonJokers.every((t) => t.color === runColor)) return false;

  // Check if there is a valid consecutive sequence of length = tiles.length
  // Find which position each non-joker occupies
  // In a valid run, non-jokers in given order must have strictly increasing numbers
  // and the gap between any two non-jokers can be filled by the jokers between them.
  for (let i = 0; i < tiles.length - 1; i++) {
    const curr = tiles[i];
    const next = tiles[i + 1];

    if (!curr.isJoker && !next.isJoker) {
      if (next.number !== curr.number + 1) return false;
    }
  }

  // Infer sequence start and end
  // Find first non-joker at index k with value V.
  // The first tile (index 0) would have value V - k.
  const firstNonJokerIdx = tiles.findIndex((t) => !t.isJoker);
  if (firstNonJokerIdx === -1) return false;

  const startVal = tiles[firstNonJokerIdx].number - firstNonJokerIdx;
  if (startVal < 1) return false; // Out of bounds below 1

  const endVal = startVal + tiles.length - 1;
  if (endVal > 13) return false; // Out of bounds above 13

  // Verify all non-jokers match startVal + index
  for (let i = 0; i < tiles.length; i++) {
    if (!tiles[i].isJoker) {
      if (tiles[i].number !== startVal + i) return false;
    }
  }

  return true;
}

/**
 * Checks if a tile set is either a valid Group or a valid Run.
 */
export function isValidMeld(tiles: Tile[]): boolean {
  return isValidGroup(tiles) || isValidRun(tiles);
}

export function getMeldType(tiles: Tile[]): MeldType {
  if (isValidGroup(tiles)) return 'group';
  if (isValidRun(tiles)) return 'run';
  return 'invalid';
}

/**
 * Returns point value of a meld (for the 30-point initial meld rule).
 * Jokers assume the point value of the tile they replace.
 */
export function calculateMeldPoints(tiles: Tile[]): number {
  if (!isValidMeld(tiles)) return 0;

  if (isValidGroup(tiles)) {
    const nonJoker = tiles.find((t) => !t.isJoker);
    if (!nonJoker) return 0;
    return nonJoker.number * tiles.length;
  }

  if (isValidRun(tiles)) {
    const firstNonJokerIdx = tiles.findIndex((t) => !t.isJoker);
    if (firstNonJokerIdx === -1) return 0;
    const startVal = tiles[firstNonJokerIdx].number - firstNonJokerIdx;
    let sum = 0;
    for (let i = 0; i < tiles.length; i++) {
      sum += startVal + i;
    }
    return sum;
  }

  return 0;
}

/**
 * Checks if the entire board is valid (every meld has >= 3 tiles and is valid).
 */
export function isBoardValid(board: Tile[][]): boolean {
  for (const meld of board) {
    if (meld.length === 0) continue;
    if (meld.length < 3 || !isValidMeld(meld)) {
      return false;
    }
  }
  return true;
}

/**
 * Sorts rack tiles by runs: group by color, then sort by number (1-13), then jokers.
 */
export function sortRackByRuns(tiles: Tile[]): Tile[] {
  const colorOrder: Record<TileColor, number> = {
    blue: 1,
    red: 2,
    yellow: 3,
    black: 4,
    joker: 5,
  };

  return [...tiles].sort((a, b) => {
    if (a.isJoker && !b.isJoker) return 1;
    if (!a.isJoker && b.isJoker) return -1;
    if (a.isJoker && b.isJoker) return 0;

    if (a.color !== b.color) {
      return colorOrder[a.color] - colorOrder[b.color];
    }
    return a.number - b.number;
  });
}

/**
 * Sorts rack tiles by groups: group by number (1-13), then color, then jokers.
 */
export function sortRackByGroups(tiles: Tile[]): Tile[] {
  const colorOrder: Record<TileColor, number> = {
    blue: 1,
    red: 2,
    yellow: 3,
    black: 4,
    joker: 5,
  };

  return [...tiles].sort((a, b) => {
    if (a.isJoker && !b.isJoker) return 1;
    if (!a.isJoker && b.isJoker) return -1;
    if (a.isJoker && b.isJoker) return 0;

    if (a.number !== b.number) {
      return a.number - b.number;
    }
    return colorOrder[a.color] - colorOrder[b.color];
  });
}

/**
 * Deal initial 14 tiles to each of 3 players from a shuffled deck.
 */
export function dealHands(deck: Tile[], numPlayers = 3): {
  hands: Tile[][];
  remainingDeck: Tile[];
} {
  const pool = [...deck];
  const hands: Tile[][] = [];

  for (let p = 0; p < numPlayers; p++) {
    hands.push(pool.splice(0, 14));
  }

  return { hands, remainingDeck: pool };
}

/**
 * Calculates sum of hand tiles for scoring at end of round.
 * Losers get penalty of sum of remaining tiles (Joker = 30 points).
 */
export function calculateHandScore(hand: Tile[]): number {
  return hand.reduce((acc, tile) => {
    if (tile.isJoker) return acc + 30;
    return acc + tile.number;
  }, 0);
}

/**
 * Finds initial melds for a player who hasn't opened yet (must reach >= 30 points).
 */
export function findInitialMelds(rack: Tile[]): { melds: Tile[][]; points: number } | null {
  // Find all possible valid groups and runs in rack without board manipulation
  const possibleMelds: Tile[][] = [];

  // 1. Look for groups of 3 or 4 same numbers with distinct colors
  const byNumber: Record<number, Tile[]> = {};
  for (const t of rack) {
    if (!t.isJoker) {
      if (!byNumber[t.number]) byNumber[t.number] = [];
      byNumber[t.number].push(t);
    }
  }

  for (const numStr of Object.keys(byNumber)) {
    const list = byNumber[Number(numStr)];
    // Unique colors only
    const uniqueByColor: Record<string, Tile> = {};
    for (const t of list) {
      if (!uniqueByColor[t.color]) uniqueByColor[t.color] = t;
    }
    const distinct = Object.values(uniqueByColor);
    if (distinct.length >= 3) {
      possibleMelds.push(distinct.slice(0, 3));
      if (distinct.length === 4) {
        possibleMelds.push(distinct);
      }
    }
  }

  // 2. Look for runs of 3 or more consecutive numbers of same color
  const byColor: Record<string, Tile[]> = {};
  for (const t of rack) {
    if (!t.isJoker) {
      if (!byColor[t.color]) byColor[t.color] = [];
      byColor[t.color].push(t);
    }
  }

  for (const color of Object.keys(byColor)) {
    const colorTiles = byColor[color];
    const uniqueNums = Array.from(new Set(colorTiles.map((t) => t.number))).sort((a, b) => a - b);
    
    // Find consecutive sub-sequences of length >= 3
    let currentRun: number[] = [];
    for (let i = 0; i < uniqueNums.length; i++) {
      if (currentRun.length === 0 || uniqueNums[i] === currentRun[currentRun.length - 1] + 1) {
        currentRun.push(uniqueNums[i]);
      } else {
        if (currentRun.length >= 3) {
          const runTiles = currentRun.map((n) => colorTiles.find((t) => t.number === n)!);
          possibleMelds.push(runTiles);
        }
        currentRun = [uniqueNums[i]];
      }
    }
    if (currentRun.length >= 3) {
      const runTiles = currentRun.map((n) => colorTiles.find((t) => t.number === n)!);
      possibleMelds.push(runTiles);
    }
  }

  // Try combinations of disjoint melds that sum to >= 30
  // Check single meld
  for (const m of possibleMelds) {
    const pts = calculateMeldPoints(m);
    if (pts >= 30) {
      return { melds: [m], points: pts };
    }
  }

  // Check 2 disjoint melds
  for (let i = 0; i < possibleMelds.length; i++) {
    for (let j = i + 1; j < possibleMelds.length; j++) {
      const m1 = possibleMelds[i];
      const m2 = possibleMelds[j];
      const usedIds = new Set(m1.map((t) => t.id));
      const isDisjoint = m2.every((t) => !usedIds.has(t.id));

      if (isDisjoint) {
        const total = calculateMeldPoints(m1) + calculateMeldPoints(m2);
        if (total >= 30) {
          return { melds: [m1, m2], points: total };
        }
      }
    }
  }

  return null;
}

/**
 * Intelligent Bot Turn Logic:
 * If not opened: checks if has >= 30 pts initial meld. If yes, plays it. If no, draws tile.
 * If opened: checks for simple valid melds or additions to existing melds. If can play, plays. If not, draws tile.
 */
export function calculateBotTurn(
  rack: Tile[],
  board: Tile[][],
  hasOpened: boolean
): {
  action: 'play' | 'draw';
  newBoard: Tile[][];
  newRack: Tile[];
  playedTiles: Tile[];
} {
  if (!hasOpened) {
    const initial = findInitialMelds(rack);
    if (initial) {
      const playedIds = new Set(initial.melds.flatMap((m) => m.map((t) => t.id)));
      const newRack = rack.filter((t) => !playedIds.has(t.id));
      const newBoard = [...board, ...initial.melds];
      return {
        action: 'play',
        newBoard,
        newRack,
        playedTiles: initial.melds.flat(),
      };
    }
    // Must draw
    return {
      action: 'draw',
      newBoard: board,
      newRack: rack,
      playedTiles: [],
    };
  }

  // Bot has already opened: can form any new valid group or run, or append to board melds
  // 1. Try to add a tile from rack to an existing run on the board
  for (let mIdx = 0; mIdx < board.length; mIdx++) {
    const meld = board[mIdx];
    if (isValidRun(meld)) {
      const runColor = meld.find((t) => !t.isJoker)?.color;
      const firstNum = meld[0].isJoker ? meld[1].number - 1 : meld[0].number;
      const lastNum = meld[meld.length - 1].isJoker
        ? meld[meld.length - 2].number + 1
        : meld[meld.length - 1].number;

      // Check if bot has tile that extends beginning
      if (firstNum > 1) {
        const matchPre = rack.find(
          (t) => !t.isJoker && t.color === runColor && t.number === firstNum - 1
        );
        if (matchPre) {
          const newMeld = [matchPre, ...meld];
          const newBoard = board.map((m, idx) => (idx === mIdx ? newMeld : m));
          const newRack = rack.filter((t) => t.id !== matchPre.id);
          return {
            action: 'play',
            newBoard,
            newRack,
            playedTiles: [matchPre],
          };
        }
      }

      // Check if bot has tile that extends end
      if (lastNum < 13) {
        const matchPost = rack.find(
          (t) => !t.isJoker && t.color === runColor && t.number === lastNum + 1
        );
        if (matchPost) {
          const newMeld = [...meld, matchPost];
          const newBoard = board.map((m, idx) => (idx === mIdx ? newMeld : m));
          const newRack = rack.filter((t) => t.id !== matchPost.id);
          return {
            action: 'play',
            newBoard,
            newRack,
            playedTiles: [matchPost],
          };
        }
      }
    } else if (isValidGroup(meld) && meld.length === 3) {
      // Group of 3 can become 4 if bot has the 4th color
      const targetNumber = meld.find((t) => !t.isJoker)?.number;
      const existingColors = new Set(meld.map((t) => t.color));
      const match = rack.find(
        (t) => !t.isJoker && t.number === targetNumber && !existingColors.has(t.color)
      );
      if (match) {
        const newMeld = [...meld, match];
        const newBoard = board.map((m, idx) => (idx === mIdx ? newMeld : m));
        const newRack = rack.filter((t) => t.id !== match.id);
        return {
          action: 'play',
          newBoard,
          newRack,
          playedTiles: [match],
        };
      }
    }
  }

  // 2. Try to form a new run or group from rack (doesn't need 30 points once opened)
  const meldsFound = findInitialMelds(rack);
  if (meldsFound && meldsFound.melds.length > 0) {
    const playMeld = meldsFound.melds[0];
    const playedIds = new Set(playMeld.map((t) => t.id));
    const newRack = rack.filter((t) => !playedIds.has(t.id));
    const newBoard = [...board, playMeld];
    return {
      action: 'play',
      newBoard,
      newRack,
      playedTiles: playMeld,
    };
  }

  // Otherwise draw
  return {
    action: 'draw',
    newBoard: board,
    newRack: rack,
    playedTiles: [],
  };
}
