(function (root) {
  'use strict';
  const SIZE = 11;
  const WORD_LABELS = ['ROBOT', 'PROCES', 'ROBOTYZACJA', 'EFEKTYWNOŚĆ', 'ALGORYTM', 'Agent AI', 'Prompt', 'LLM', 'Asystent', 'AUTONOMIA'];
  const WORDS = WORD_LABELS.map(word => word.toUpperCase().replace(/\s+/g, ''));
  const displayWord = word => WORD_LABELS[WORDS.indexOf(word)] || word;
  const DIRECTIONS = [[0, 1], [1, 0], [1, 1]];
  const ALPHABET = 'AĄBCĆDEĘFGHIJKLŁMNŃOÓPRSŚTUWYZŹŻ';

  function shuffle(items, random) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  function selectPath(start, end) {
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < 0 || start >= SIZE * SIZE || end >= SIZE * SIZE) return [];
    const sr = Math.floor(start / SIZE), sc = start % SIZE;
    const dr = Math.floor(end / SIZE) - sr, dc = end % SIZE - sc;
    if (dr === 0 && dc === 0) return [start];
    if (!((dr === 0 && dc > 0) || (dc === 0 && dr > 0) || (dr > 0 && dr === dc))) return [];
    const length = Math.max(dr, dc) + 1;
    return Array.from({ length }, (_, i) => (sr + Math.sign(dr) * i) * SIZE + sc + Math.sign(dc) * i);
  }

  function generateBoard(random = Math.random) {
    const ordered = shuffle([...WORDS], random).sort((a, b) => b.length - a.length);
    for (let attempt = 0; attempt < 250; attempt++) {
      const letters = Array(SIZE * SIZE).fill('');
      const placements = [];
      const directionCounts = [0, 0, 0];
      for (const word of ordered) {
        const candidates = [];
        DIRECTIONS.forEach(([dr, dc], direction) => {
          for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
            if (r + dr * (word.length - 1) >= SIZE || c + dc * (word.length - 1) >= SIZE) continue;
            const path = Array.from(word, (_, i) => (r + dr * i) * SIZE + c + dc * i);
            if (path.every((at, i) => !letters[at] || letters[at] === word[i]) && path.some(at => !letters[at])) {
              candidates.push({ word, path, direction });
            }
          }
        });
        if (!candidates.length) break;
        shuffle(candidates, random);
        candidates.sort((a, b) => directionCounts[a.direction] - directionCounts[b.direction]);
        const chosen = candidates[0];
        chosen.path.forEach((at, i) => { letters[at] = word[i]; });
        directionCounts[chosen.direction]++;
        placements.push(chosen);
      }
      if (placements.length !== WORDS.length || directionCounts.some(count => count === 0)) continue;
      for (let i = 0; i < letters.length; i++) if (!letters[i]) letters[i] = ALPHABET[Math.floor(random() * ALPHABET.length)];
      return { letters, placements };
    }
    throw new Error('Nie udało się ułożyć planszy. Spróbuj ponownie.');
  }

  function checkSelection(letters, start, end, found = new Set()) {
    const path = selectPath(start, end);
    if (path.length < 2) return { status: 'invalid', path };
    const word = path.map(at => letters[at]).join('');
    if (!WORDS.includes(word)) return { status: 'miss', path };
    if (found.has(word)) return { status: 'duplicate', word, path };
    return { status: 'found', word, path };
  }

  const api = { SIZE, WORDS, WORD_LABELS, displayWord, DIRECTIONS, generateBoard, selectPath, checkSelection };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RobotGame = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
