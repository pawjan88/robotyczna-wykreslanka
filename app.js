(() => {
  'use strict';
  const { SIZE, WORDS, generateBoard, selectPath, checkSelection } = window.RobotGame;
  const $ = id => document.getElementById(id);
  const board = $('board');
  const svg = $('highlights');
  const colors = ['#3366FF', '#3333CC', '#B1D2FF', '#6633FF', '#FF2038', '#000066', '#3366FF', '#B1D2FF', '#3333CC', '#6633FF'];
  let puzzle = null;
  let found = new Map();
  let anchor = null;
  let selection = [];
  let pointer = null;
  let cells = [];

  function message(text, kind = '') {
    $('feedback').textContent = text;
    $('feedback').className = 'feedback' + (kind ? ' ' + kind : '');
  }

  function line(path, color, opacity) {
    if (!path.length) return;
    const first = path[0], last = path[path.length - 1];
    const shape = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    shape.setAttribute('x1', String((first % SIZE) * 10 + 5));
    shape.setAttribute('y1', String(Math.floor(first / SIZE) * 10 + 5));
    shape.setAttribute('x2', String((last % SIZE) * 10 + 5));
    shape.setAttribute('y2', String(Math.floor(last / SIZE) * 10 + 5));
    shape.setAttribute('stroke', color);
    shape.setAttribute('opacity', String(opacity));
    svg.appendChild(shape);
  }

  function paint() {
    svg.replaceChildren();
    const revealed = new Set();
    let index = 0;
    for (const path of found.values()) {
      line(path, colors[index++], .20);
      for (const at of path) revealed.add(at);
    }
    line(selection, '#3366FF', .25);
    const selected = new Set(selection);
    cells.forEach((cell, at) => {
      cell.classList.toggle('selected', selected.has(at));
      cell.classList.toggle('found', revealed.has(at));
      cell.classList.toggle('start', at === anchor);
      cell.setAttribute('aria-pressed', selected.has(at) ? 'true' : 'false');
    });
  }

  function focusCell(index) {
    cells.forEach((cell, at) => { cell.tabIndex = at === index ? 0 : -1; });
    cells[index].focus({ preventScroll: true });
  }

  function updateProgress() {
    const count = found.size;
    $('count').textContent = String(count);
    $('progress').setAttribute('aria-valuenow', String(count));
    $('progress').setAttribute('aria-valuetext', `${count} z 10 haseł odkrytych`);
    $('progress-fill').style.width = `${count * 10}%`;
    $('empty').hidden = count > 0;
    $('found-list').replaceChildren();
    for (const word of found.keys()) {
      const item = document.createElement('li');
      const tick = document.createElement('span');
      tick.textContent = '✓';
      tick.setAttribute('aria-hidden', 'true');
      item.append(tick, document.createTextNode(word));
      $('found-list').appendChild(item);
    }
    $('win').hidden = count !== WORDS.length;
  }

  function cancelSelection(announce = true) {
    const oldPointer = pointer;
    pointer = null;
    if (oldPointer && board.hasPointerCapture(oldPointer.id)) board.releasePointerCapture(oldPointer.id);
    anchor = null;
    selection = [];
    paint();
    if (announce) message('Zaznaczenie anulowane. Wybierz pierwszą literę hasła.');
  }

  function complete(start, end) {
    const result = checkSelection(puzzle.letters, start, end, found);
    anchor = null;
    selection = [];
    if (result.status === 'found') {
      found.set(result.word, result.path);
      updateProgress();
      message(`Dobra robota! ${result.word} — odkryto ${found.size} z 10 haseł.`, 'success');
      if (found.size === WORDS.length) {
        message('Brawo! Wszystkie 10 haseł odkryte.', 'success');
        $('win-title').focus({ preventScroll: true });
        $('win').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } else if (result.status === 'duplicate') {
      message(`${result.word} jest już na liście. Poszukaj kolejnego pojęcia.`);
    } else if (result.status === 'invalid') {
      message('Zaznacz co najmniej dwie litery: w prawo, w dół lub po skosie w dół w prawo.', 'error');
    } else {
      message('To nie jest jedno z 10 haseł. Spróbuj jeszcze raz!', 'error');
    }
    paint();
  }

  function startGame() {
    cancelSelection(false);
    try { puzzle = generateBoard(); }
    catch (error) {
      $('welcome').hidden = false;
      $('play').hidden = true;
      document.body.classList.remove('playing');
      $('start').textContent = 'Spróbuj ponownie';
      return;
    }
    found = new Map();
    board.replaceChildren();
    cells = puzzle.letters.map((letter, index) => {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      cell.dataset.index = String(index);
      cell.textContent = letter;
      cell.tabIndex = index === 0 ? 0 : -1;
      cell.setAttribute('aria-label', `${letter}, wiersz ${Math.floor(index / SIZE) + 1}, kolumna ${index % SIZE + 1}`);
      cell.setAttribute('aria-pressed', 'false');
      board.appendChild(cell);
      return cell;
    });
    updateProgress();
    paint();
    message('Pierwsze hasło czeka na odkrycie.');
    $('welcome').hidden = true;
    $('play').hidden = false;
    document.body.classList.add('playing');
    $('board-title').focus({ preventScroll: true });
    $('play').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function indexFromPosition(event) {
    const rect = board.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX >= rect.right || event.clientY < rect.top || event.clientY >= rect.bottom) return null;
    return Math.floor((event.clientY - rect.top) / rect.height * SIZE) * SIZE + Math.floor((event.clientX - rect.left) / rect.width * SIZE);
  }

  function activateCell(index) {
    if (!puzzle) return;
    if (anchor === null) {
      anchor = index;
      selection = [index];
      message('Początek wybrany. Wybierz ostatnią literę hasła.');
      paint();
    } else complete(anchor, index);
  }

  board.addEventListener('pointerdown', event => {
    if (!puzzle || pointer || !event.isPrimary || event.button !== 0) return;
    const cell = event.target.closest('.cell');
    if (!cell) return;
    event.preventDefault();
    const index = Number(cell.dataset.index);
    focusCell(index);
    pointer = { id: event.pointerId, start: anchor === null ? index : anchor, initial: index, second: anchor !== null, moved: false };
    anchor = pointer.start;
    selection = selectPath(anchor, index);
    board.setPointerCapture(event.pointerId);
    paint();
  });

  board.addEventListener('pointermove', event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    event.preventDefault();
    const index = indexFromPosition(event);
    if (index !== pointer.initial) pointer.moved = true;
    selection = index === null ? [] : selectPath(pointer.start, index);
    paint();
  });

  board.addEventListener('pointerup', event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const completedPointer = pointer;
    pointer = null;
    if (board.hasPointerCapture(event.pointerId)) board.releasePointerCapture(event.pointerId);
    const end = indexFromPosition(event);
    if (completedPointer.second || completedPointer.moved) complete(completedPointer.start, end);
    else {
      anchor = completedPointer.start;
      selection = [anchor];
      message('Początek wybrany. Wybierz ostatnią literę hasła.');
      paint();
    }
  });
  board.addEventListener('pointercancel', () => cancelSelection());
  board.addEventListener('lostpointercapture', () => { if (pointer) cancelSelection(); });

  board.addEventListener('keydown', event => {
    const cell = event.target.closest('.cell');
    if (!cell) return;
    const index = Number(cell.dataset.index);
    const row = Math.floor(index / SIZE), col = index % SIZE;
    let next = index;
    if (event.key === 'ArrowRight') next = row * SIZE + Math.min(SIZE - 1, col + 1);
    else if (event.key === 'ArrowLeft') next = row * SIZE + Math.max(0, col - 1);
    else if (event.key === 'ArrowDown') next = Math.min(SIZE - 1, row + 1) * SIZE + col;
    else if (event.key === 'ArrowUp') next = Math.max(0, row - 1) * SIZE + col;
    else if (event.key === 'Home') next = row * SIZE;
    else if (event.key === 'End') next = row * SIZE + SIZE - 1;
    else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activateCell(index); return; }
    else if (event.key === 'Escape') { event.preventDefault(); cancelSelection(); return; }
    else return;
    event.preventDefault();
    focusCell(next);
    if (anchor !== null) { selection = selectPath(anchor, next); paint(); }
  });
  board.addEventListener('click', event => {
    // Assistive technology can activate a button without pointer events.
    if (event.detail !== 0 || event.pointerType) return;
    const cell = event.target.closest('.cell');
    if (cell) activateCell(Number(cell.dataset.index));
  });

  $('start').addEventListener('click', startGame);
  $('again').addEventListener('click', startGame);
  $('reset').addEventListener('click', () => {
    cancelSelection(false);
    if (found.size > 0 && found.size < WORDS.length) $('reset-dialog').showModal();
    else startGame();
  });
  $('confirm-reset').addEventListener('click', () => { $('reset-dialog').close(); startGame(); });
  $('qr-open').addEventListener('click', () => $('qr-dialog').showModal());
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  }));
  window.addEventListener('blur', () => { if (anchor !== null) cancelSelection(false); });
})();
