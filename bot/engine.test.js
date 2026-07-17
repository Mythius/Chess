const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { Chess } = require('chess.js');
const { Board } = require('./engine');
const OpeningsBook = require('./openings.json');

// ── helpers ────────────────────────────────────────────────────────────────

function toChessJsMove(mc) {
    if (mc === 'O-O' || mc === 'O-O-O') return mc;
    if (mc.includes('=')) {
        return {
            from: mc.slice(0, 2).toLowerCase(),
            to:   mc.slice(2, 4).toLowerCase(),
            promotion: mc.slice(-1).toLowerCase(),
        };
    }
    return { from: mc.slice(0, 2).toLowerCase(), to: mc.slice(2, 4).toLowerCase() };
}

// chess.js v1 requires 6-field FEN; engine uses 3- or 4-field
function toFullFen(fen) {
    const n = fen.trim().split(' ').length;
    if (n === 3) return fen + ' - 0 1';
    if (n === 4) return fen + ' 0 1';
    return fen;
}

function isLegal(fen, mc) {
    const chess = new Chess(toFullFen(fen));
    try { return chess.move(toChessJsMove(mc)) !== null; }
    catch { return false; }
}

const BINARY = path.join(__dirname, process.platform === 'win32' ? 'MatthiasBot.exe' : 'MatthiasBot');
const HAS_BINARY = fs.existsSync(BINARY);

// ── test runner ────────────────────────────────────────────────────────────

let passed = 0, failed = 0, skipped = 0;
const pending = [];

function test(name, fn) {
    const p = Promise.resolve().then(() => fn()).then(
        ()  => { console.log(`  PASS  ${name}`); passed++; },
        (e) => { console.log(`  FAIL  ${name}\n        ${e.message}`); failed++; }
    );
    pending.push(p);
}

function skip(name, reason) {
    console.log(`  SKIP  ${name}${reason ? ' — ' + reason : ''}`);
    skipped++;
}

function section(title) { console.log(`\n${title}\n`); }

// ── positions ──────────────────────────────────────────────────────────────

const POSITIONS = [
    { name: 'starting position',          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -' },
    { name: 'after 1.e4',                 fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -' },
    { name: 'Sicilian defence',           fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -' },
    { name: 'Italian game',               fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq -' },
    { name: 'castling rights both sides', fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq -' },
    { name: 'black castling rights',      fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R b KQkq -' },
    { name: 'pinned pieces',              fen: 'r1b1kb1r/ppppqppp/2n2n2/4p3/4P3/3B1N2/PPPP1PPP/RNBQK2R w KQkq -' },
    { name: 'king in check',              fen: 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq -' },
    { name: 'pawn promotion',             fen: '4k3/P7/8/8/8/8/8/4K3 w - -' },
    { name: 'endgame K+P vs K',           fen: '8/8/3k4/8/8/3K4/3P4/8 w - -' },
    { name: 'middlegame, black to move',  fen: 'r2q1rk1/pp2ppbp/2np1np1/8/3NP3/2N1BP2/PPP3PP/R2QK2R b KQ -' },
];

const CHECKMATE_FEN = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq -';
const STALEMATE_FEN = 'k7/8/1Q6/8/8/8/8/7K b - -';

// ── suite 1: generatePossibilities — all moves legal ───────────────────────

section('generatePossibilities — all generated moves are legal');

for (const pos of POSITIONS) {
    test(pos.name, () => {
        const board = new Board(pos.fen);
        board.generatePossibilities();
        for (const { mc } of board.lines) {
            assert.ok(isLegal(pos.fen, mc),
                `Illegal move "${mc}" generated for FEN: ${pos.fen}`);
        }
    });
}

// ── suite 2: castling — move generation ───────────────────────────────────

section('castling — move generation');

test('white O-O generated when path is clear', () => {
    const board = new Board('8/8/8/8/8/8/8/4K2R w K -');
    board.generatePossibilities();
    assert.ok(board.lines.some(l => l.mc === 'O-O'), 'O-O not generated');
});

test('white O-O-O generated when path is clear', () => {
    const board = new Board('8/8/8/8/8/8/8/R3K3 w Q -');
    board.generatePossibilities();
    assert.ok(board.lines.some(l => l.mc === 'O-O-O'), 'O-O-O not generated');
});

test('black O-O generated when path is clear', () => {
    const board = new Board('4k2r/8/8/8/8/8/8/8 b k -');
    board.generatePossibilities();
    assert.ok(board.lines.some(l => l.mc === 'O-O'), 'black O-O not generated');
});

test('black O-O-O generated when path is clear', () => {
    const board = new Board('r3k3/8/8/8/8/8/8/8 b q -');
    board.generatePossibilities();
    assert.ok(board.lines.some(l => l.mc === 'O-O-O'), 'black O-O-O not generated');
});

test('O-O not generated when king is in check (black rook on e8)', () => {
    const board = new Board('4r3/8/8/8/8/8/8/4K2R w K -');
    board.generatePossibilities();
    assert.ok(!board.lines.some(l => l.mc === 'O-O'), 'O-O generated while king is in check');
});

test('O-O not generated when f1 is attacked (black rook on f8)', () => {
    const board = new Board('5r2/8/8/8/8/8/8/4K2R w K -');
    board.generatePossibilities();
    assert.ok(!board.lines.some(l => l.mc === 'O-O'), 'O-O generated through attacked f1');
});

test('O-O not generated when g1 is attacked (black rook on g8)', () => {
    const board = new Board('6r1/8/8/8/8/8/8/4K2R w K -');
    board.generatePossibilities();
    assert.ok(!board.lines.some(l => l.mc === 'O-O'), 'O-O generated into attacked g1');
});

test('O-O-O not generated when d1 is attacked (black rook on d8)', () => {
    const board = new Board('3r4/8/8/8/8/8/8/R3K3 w Q -');
    board.generatePossibilities();
    assert.ok(!board.lines.some(l => l.mc === 'O-O-O'), 'O-O-O generated through attacked d1');
});

test('no castling when castling rights are absent', () => {
    const board = new Board('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w - -');
    board.generatePossibilities();
    assert.ok(!board.lines.some(l => l.mc === 'O-O' || l.mc === 'O-O-O'),
        'Castling generated without rights');
});

// ── suite 3: castling — resulting board state ──────────────────────────────

section('castling — resulting board state (theorize)');

test('after white O-O: king on g1, rook on f1', () => {
    const board = new Board('8/8/8/8/8/8/8/4K2R w K -');
    const nb = board.theorize('O-O');
    assert.ok(nb.square(6, 7)?.type === 'K', 'King not on g1');
    assert.ok(nb.square(5, 7)?.type === 'R', 'Rook not on f1');
    assert.ok(!nb.square(4, 7), 'King still on e1');
    assert.ok(!nb.square(7, 7), 'Rook still on h1');
});

test('after white O-O-O: king on c1, rook on d1', () => {
    const board = new Board('8/8/8/8/8/8/8/R3K3 w Q -');
    const nb = board.theorize('O-O-O');
    assert.ok(nb.square(2, 7)?.type === 'K', 'King not on c1');
    assert.ok(nb.square(3, 7)?.type === 'R', 'Rook not on d1');
    assert.ok(!nb.square(4, 7), 'King still on e1');
    assert.ok(!nb.square(0, 7), 'Rook still on a1');
});

test('after black O-O: king on g8, rook on f8', () => {
    const board = new Board('4k2r/8/8/8/8/8/8/8 b k -');
    const nb = board.theorize('O-O');
    assert.ok(nb.square(6, 0)?.type === 'k', 'Black king not on g8');
    assert.ok(nb.square(5, 0)?.type === 'r', 'Black rook not on f8');
    assert.ok(!nb.square(4, 0), 'Black king still on e8');
    assert.ok(!nb.square(7, 0), 'Black rook still on h8');
});

test('after white O-O: castling rights stripped for white', () => {
    const board = new Board('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq -');
    const nb = board.theorize('O-O');
    assert.ok(!nb.castle.includes('K'), 'White K-side right not removed after O-O');
    assert.ok(!nb.castle.includes('Q'), 'White Q-side right not removed after O-O');
    assert.ok(nb.castle.includes('k'), 'Black k-side right incorrectly removed');
    assert.ok(nb.castle.includes('q'), 'Black q-side right incorrectly removed');
});

// ── suite 4: en passant — move generation ─────────────────────────────────
//
// Both engines currently do NOT generate en passant captures — the pawn move
// code only captures when an enemy piece occupies the diagonal square, but the
// en passant target square is always empty. These tests document that gap.

section('en passant — move generation');

test('white en passant capture generated (e5xd6)', () => {
    // 1.e4 e6 2.e5 d5 — white pawn e5 can capture d6 en passant
    const fen = 'rnbqkbnr/ppp2ppp/4p3/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6';
    const board = new Board(fen);
    board.generatePossibilities();
    assert.ok(board.lines.some(l => l.mc === 'E5D6'),
        'En passant E5D6 not generated (enpessant field is set but not used in pawn move generation)');
});

test('black en passant capture generated (e4xd3)', () => {
    // White just pushed d2-d4; black pawn on e4 can capture d3 en passant
    const fen = 'rnbqkbnr/ppp2ppp/8/4p3/3Pp3/8/PPP2PPP/RNBQKBNR b KQkq d3';
    const board = new Board(fen);
    board.generatePossibilities();
    assert.ok(board.lines.some(l => l.mc === 'E4D3'),
        'En passant E4D3 not generated');
});

// ── suite 5: en passant — resulting board state ────────────────────────────
//
// Even if the move were generated, theorize() currently treats it as a normal
// diagonal move and leaves the captured pawn on its original square.

section('en passant — resulting board state (theorize)');

test('after white e5xd6: pawn lands on d6', () => {
    // d5 has black pawn, e5 has white pawn, en passant square = d6
    const board = new Board('4k3/8/8/3pP3/8/8/8/4K3 w - d6');
    const nb = board.theorize('E5D6');
    assert.ok(nb.square(3, 2)?.type === 'P', 'White pawn not on d6 after en passant');
    assert.ok(!nb.square(4, 3), 'White pawn still on e5 after en passant');
});

test('after white e5xd6: captured black pawn removed from d5', () => {
    const board = new Board('4k3/8/8/3pP3/8/8/8/4K3 w - d6');
    const nb = board.theorize('E5D6');
    assert.ok(!nb.square(3, 3),
        'Captured black pawn still on d5 — theorize() does not handle en passant removal');
});

test('after black d4xc3: pawn lands on c3', () => {
    // c4 has white pawn (just pushed), d4 has black pawn, en passant square = c3
    const board = new Board('4k3/8/8/8/2Pp4/8/8/4K3 b - c3');
    const nb = board.theorize('D4C3');
    assert.ok(nb.square(2, 5)?.type === 'p', 'Black pawn not on c3 after en passant');
    assert.ok(!nb.square(3, 4), 'Black pawn still on d4 after en passant');
});

test('after black d4xc3: captured white pawn removed from c4', () => {
    const board = new Board('4k3/8/8/8/2Pp4/8/8/4K3 b - c3');
    const nb = board.theorize('D4C3');
    assert.ok(!nb.square(2, 4),
        'Captured white pawn still on c4 — theorize() does not handle en passant removal');
});

// ── suite 6: terminal positions ────────────────────────────────────────────

section('generatePossibilities — terminal positions');

test('checkmate → returns CHECKMATE, no lines', () => {
    const board = new Board(CHECKMATE_FEN);
    assert.strictEqual(board.generatePossibilities(), 'CHECKMATE');
    assert.strictEqual(board.lines.length, 0);
});

test('stalemate → returns STALEMATE, no lines', () => {
    const board = new Board(STALEMATE_FEN);
    assert.strictEqual(board.generatePossibilities(), 'STALEMATE');
    assert.strictEqual(board.lines.length, 0);
});

// ── suite 7: search(depth=1) — no binary needed ────────────────────────────

section('search(depth=1) — returned move is always legal');

for (const pos of POSITIONS) {
    test(pos.name, async () => {
        const board = new Board(pos.fen);
        board.generatePossibilities();
        if (board.lines.length === 0) return;
        const mc = await board.search(1);
        if (mc === null) return;
        assert.ok(isLegal(pos.fen, mc),
            `search(1) returned illegal move "${mc}" for FEN: ${pos.fen}`);
    });
}

test('search returns null on checkmate', async () => {
    assert.strictEqual(await new Board(CHECKMATE_FEN).search(1), null);
});

test('search returns null on stalemate', async () => {
    assert.strictEqual(await new Board(STALEMATE_FEN).search(1), null);
});

// ── suite 8: C++ binary (search depth=2) ──────────────────────────────────

section(`C++ binary — search(depth=2) ${HAS_BINARY ? '' : '[BINARY NOT FOUND — all skipped]'}`);

const CPP_POSITIONS = [
    { name: 'starting position',                fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -' },
    { name: 'after 1.e4 e5',                    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -' },
    { name: 'castling available',               fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq -' },
    { name: 'Sicilian, black to move',          fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -' },
    { name: 'en passant available, white',      fen: 'rnbqkbnr/ppp2ppp/4p3/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6' },
    { name: 'position with pawn promotion',     fen: '4k3/P7/8/8/8/8/8/4K3 w - -' },
];

if (HAS_BINARY) {
    test('_evalWithExe returns a finite number', async () => {
        const board = new Board();
        const score = await board._evalWithExe(
            'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -', 1
        );
        assert.ok(typeof score === 'number' && isFinite(score),
            `Expected finite number, got ${score}`);
    });

    test('score is positive when white has clear material advantage', async () => {
        // White: king e1 + queen f1. Black: king e8 only.
        const board = new Board();
        const score = await board._evalWithExe('4k3/8/8/8/8/8/8/4KQ2 w - -', 1);
        assert.ok(score > 0, `Expected positive score, got ${score}`);
    });

    test('score is negative when black has clear material advantage', async () => {
        // Black: king e8 + queen g8. White: king e1 only.
        const board = new Board();
        const score = await board._evalWithExe('4k1q1/8/8/8/8/8/8/4K3 b - -', 1);
        assert.ok(score < 0, `Expected negative score, got ${score}`);
    });

    for (const pos of CPP_POSITIONS) {
        test(`search(2) returns legal move — ${pos.name}`, async () => {
            const board = new Board(pos.fen);
            board.generatePossibilities();
            if (board.lines.length === 0) return;
            const mc = await board.search(2);
            if (mc === null) return;
            assert.ok(isLegal(pos.fen, mc),
                `search(2) returned illegal move "${mc}" for FEN: ${pos.fen}`);
        });
    }
} else {
    skip('_evalWithExe returns a finite number', 'binary not found');
    skip('score positive for white advantage',   'binary not found');
    skip('score negative for black advantage',   'binary not found');
    for (const pos of CPP_POSITIONS)
        skip(`search(2) returns legal move — ${pos.name}`, 'binary not found');
}

// ── suite 9: opening book ──────────────────────────────────────────────────

section('opening book — every book move is legal');

for (const [fenKey, mc] of Object.entries(OpeningsBook)) {
    test(`${fenKey.split(' ')[1] === 'w' ? 'w' : 'b'}: ${mc}`, () => {
        assert.ok(isLegal(fenKey, mc),
            `Opening book move "${mc}" is illegal for FEN key: ${fenKey}`);
    });
}

// ── suite 10: promotions — move generation ────────────────────────────────

section('promotions — move generation');

test('straight promotion generates all 4 piece types (white)', () => {
    // White pawn on e7, black king on g8 (not blocking e8)
    const fen = '6k1/4P3/8/8/8/8/8/4K3 w - -';
    const board = new Board(fen);
    board.generatePossibilities();
    const mcs = board.lines.map(l => l.mc);
    for (const p of ['q', 'r', 'n', 'b'])
        assert.ok(mcs.includes(`E7E8=${p}`), `E7E8=${p} not generated`);
});

test('straight promotion generates all 4 piece types (black)', () => {
    // Black pawn on e2, white king on g1 (not blocking e1)
    const fen = '4k3/8/8/8/8/8/4p3/6K1 b - -';
    const board = new Board(fen);
    board.generatePossibilities();
    const mcs = board.lines.map(l => l.mc);
    for (const p of ['q', 'r', 'n', 'b'])
        assert.ok(mcs.includes(`E2E1=${p}`), `E2E1=${p} not generated`);
});

test('diagonal capture promotion generates all 4 types (white)', () => {
    // White pawn e7, black rook d8 — captures and promotes on d8
    const fen = '3r4/4P3/8/4K3/8/8/8/6k1 w - -';
    const board = new Board(fen);
    board.generatePossibilities();
    const mcs = board.lines.map(l => l.mc);
    for (const p of ['q', 'r', 'n', 'b'])
        assert.ok(mcs.includes(`E7D8=${p}`), `E7D8=${p} (capture promotion) not generated`);
});

test('diagonal capture promotion generates all 4 types (black)', () => {
    // Black pawn d2, white rook c1 — captures and promotes on c1
    const fen = '7k/8/8/8/8/8/3p4/2R2K2 b - -';
    const board = new Board(fen);
    board.generatePossibilities();
    const mcs = board.lines.map(l => l.mc);
    for (const p of ['q', 'r', 'n', 'b'])
        assert.ok(mcs.includes(`D2C1=${p}`), `D2C1=${p} (capture promotion) not generated`);
});

test('all generated promotion moves are legal (white, straight + capture)', () => {
    const fen = '3r4/4P3/8/4K3/8/8/8/6k1 w - -';
    const board = new Board(fen);
    board.generatePossibilities();
    for (const { mc } of board.lines.filter(l => l.mc.includes('=')))
        assert.ok(isLegal(fen, mc), `Promotion move "${mc}" illegal`);
});

test('all generated promotion moves are legal (black, straight + capture)', () => {
    const fen = '7k/8/8/8/8/8/3p4/2R2K2 b - -';
    const board = new Board(fen);
    board.generatePossibilities();
    for (const { mc } of board.lines.filter(l => l.mc.includes('=')))
        assert.ok(isLegal(fen, mc), `Promotion move "${mc}" illegal`);
});

// ── suite 11: promotions — board state (theorize) ─────────────────────────

section('promotions — resulting board state (theorize)');

test('straight promotion: promoted piece on e8, pawn gone from e7', () => {
    const board = new Board('4k3/4P3/8/8/8/8/8/4K3 w - -');
    const nb = board.theorize('E7E8=q');
    assert.ok(nb.square(4, 0)?.type === 'Q', 'White queen not on e8');
    assert.ok(!nb.square(4, 1), 'Pawn still on e7');
});

test('straight promotion (black): promoted piece on e1, pawn gone from e2', () => {
    const board = new Board('4k3/8/8/8/8/8/4p3/4K3 b - -');
    const nb = board.theorize('E2E1=q');
    assert.ok(nb.square(4, 7)?.type === 'q', 'Black queen not on e1');
    assert.ok(!nb.square(4, 6), 'Pawn still on e2');
});

test('capture promotion: new piece on d8, captured piece gone, pawn gone from e7', () => {
    // White pawn e7 captures black rook d8, promotes to queen
    const board = new Board('3r4/4P3/8/4K3/8/8/8/6k1 w - -');
    const nb = board.theorize('E7D8=q');
    assert.ok(nb.square(3, 0)?.type === 'Q', 'White queen not on d8');
    assert.ok(!nb.square(4, 1), 'Pawn still on e7');
    assert.ok(nb.square(3, 0)?.type !== 'r', 'Captured black rook still on d8');
});

test('capture promotion (black): new piece on c1, captured piece gone, pawn gone from d2', () => {
    const board = new Board('7k/8/8/8/8/8/3p4/2R2K2 b - -');
    const nb = board.theorize('D2C1=q');
    assert.ok(nb.square(2, 7)?.type === 'q', 'Black queen not on c1');
    assert.ok(!nb.square(3, 6), 'Pawn still on d2');
    assert.ok(nb.square(2, 7)?.type !== 'R', 'Captured white rook still on c1');
});

test('promotion to knight is a knight, not a queen', () => {
    const board = new Board('4k3/4P3/8/8/8/8/8/4K3 w - -');
    const nb = board.theorize('E7E8=n');
    assert.ok(nb.square(4, 0)?.type === 'N', `Expected knight, got ${nb.square(4, 0)?.type}`);
});

// ── suite 12: en passant square propagation (theorize) ────────────────────

section('en passant square propagation (theorize)');

test('double pawn push sets en passant square', () => {
    const board = new Board('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -');
    const nb = board.theorize('E2E4');
    assert.strictEqual(nb.enpessant, 'e3', `Expected e3, got "${nb.enpessant}"`);
});

test('single pawn push clears en passant square', () => {
    // Position has en passant square e3 set; black makes a single push
    const board = new Board('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3');
    const nb = board.theorize('E7E6');
    assert.strictEqual(nb.enpessant, '-', `Expected -, got "${nb.enpessant}"`);
});

test('non-pawn move clears en passant square', () => {
    const board = new Board('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3');
    const nb = board.theorize('G8F6');
    assert.strictEqual(nb.enpessant, '-', `Expected -, got "${nb.enpessant}"`);
});

test('black double pawn push sets en passant square', () => {
    const board = new Board('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -');
    const nb = board.theorize('D7D5');
    assert.strictEqual(nb.enpessant, 'd6', `Expected d6, got "${nb.enpessant}"`);
});

// ── summary ────────────────────────────────────────────────────────────────

Promise.all(pending).then(() => {
    const total = passed + failed + skipped;
    console.log(`\n${total} tests — ${passed} passed, ${failed} failed${skipped ? `, ${skipped} skipped` : ''}`);
    if (failed > 0) process.exit(1);
});
