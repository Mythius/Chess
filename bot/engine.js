const { spawn } = require('child_process');
const path = require('path');
const OpeningsBook = require('./openings.json');

const A1 = t => String.fromCharCode(t.x + 65) + (8 - t.y);
const XY = s => ({ x: s[0].toUpperCase().charCodeAt(0) - 65, y: 7 - (Number(s[1]) - 1) });
const ot = t => t == 'w' ? 'b' : 'w';

const EXE = path.join(__dirname, 'MatthiasBot.exe');

var cache = {};

class Piece {
    constructor(l, b) {
        this.type = l;
        this.color = (l == l.toUpperCase()) ? 'w' : 'b';
        this.board = b;
    }

    getPossibleMoves(x, y, castle = true, log = false) {
        let to = this.type.toLowerCase();
        let b = this.board;
        let moves = [];

        if (to == 'n') {
            moves = moves.concat(
                b.getSquares(x, y, 2, 1, this.color, false),
                b.getSquares(x, y, 2, -1, this.color, false),
                b.getSquares(x, y, -2, 1, this.color, false),
                b.getSquares(x, y, -2, -1, this.color, false),
                b.getSquares(x, y, 1, 2, this.color, false),
                b.getSquares(x, y, -1, 2, this.color, false),
                b.getSquares(x, y, 1, -2, this.color, false),
                b.getSquares(x, y, -1, -2, this.color, false)
            );
        } else if (to == 'b') {
            moves = moves.concat(
                b.getSquares(x, y, 1, 1, this.color, true),
                b.getSquares(x, y, 1, -1, this.color, true),
                b.getSquares(x, y, -1, 1, this.color, true),
                b.getSquares(x, y, -1, -1, this.color, true)
            );
        } else if (to == 'r') {
            moves = moves.concat(
                b.getSquares(x, y, 0, 1, this.color, true),
                b.getSquares(x, y, 0, -1, this.color, true),
                b.getSquares(x, y, -1, 0, this.color, true),
                b.getSquares(x, y, 1, 0, this.color, true)
            );
        } else if (to == 'q') {
            moves = moves.concat(
                b.getSquares(x, y, 1, 1, this.color, true),
                b.getSquares(x, y, 1, -1, this.color, true),
                b.getSquares(x, y, -1, 1, this.color, true),
                b.getSquares(x, y, -1, -1, this.color, true),
                b.getSquares(x, y, 0, 1, this.color, true),
                b.getSquares(x, y, 0, -1, this.color, true),
                b.getSquares(x, y, -1, 0, this.color, true),
                b.getSquares(x, y, 1, 0, this.color, true)
            );
        } else if (to == 'k') {
            moves = moves.concat(
                b.getSquares(x, y, 1, 1, this.color, false),
                b.getSquares(x, y, 1, -1, this.color, false),
                b.getSquares(x, y, -1, 1, this.color, false),
                b.getSquares(x, y, -1, -1, this.color, false),
                b.getSquares(x, y, 0, 1, this.color, false),
                b.getSquares(x, y, 0, -1, this.color, false),
                b.getSquares(x, y, -1, 0, this.color, false),
                b.getSquares(x, y, 1, 0, this.color, false)
            );
            if (castle) {
                const rank = this.color == 'w' ? 7 : 0;
                const [K, k, R, r] = this.color == 'w'
                    ? ['K', 'Q', 'R', 'r']
                    : ['k', 'q', 'r', 'R'];
                const inCheck = b.isCheck(this.color);
                if (!inCheck && b.castle.includes(K) &&
                    b.square(7, rank)?.type == R &&
                    !b.square(5, rank) && !b.square(6, rank)) {
                    moves.push('O-O');
                }
                if (!inCheck && b.castle.includes(k) &&
                    b.square(0, rank)?.type == R &&
                    !b.square(1, rank) && !b.square(2, rank) && !b.square(3, rank)) {
                    moves.push('O-O-O');
                }
            }
        } else if (to == 'p') {
            const dy = this.color == 'w' ? -1 : 1;
            const startRank = this.color == 'w' ? 6 : 1;
            const promRank = this.color == 'w' ? 0 : 7;
            const f1 = b.square(x, y + dy);
            const f2 = b.square(x, y + dy * 2);
            const l = b.square(x - 1, y + dy);
            const r = b.square(x + 1, y + dy);

            const addPawnMove = (tx, ty) => {
                if (ty == promRank) {
                    moves.push({ x: tx, y: ty, p: 'q' }, { x: tx, y: ty, p: 'r' },
                               { x: tx, y: ty, p: 'n' }, { x: tx, y: ty, p: 'b' });
                } else {
                    moves.push({ x: tx, y: ty });
                }
            };

            if (!f1?.type) {
                addPawnMove(x, y + dy);
                if (y == startRank && !f2?.type)
                    moves.push({ x, y: y + dy * 2, enp: A1({ x, y: y + dy }) });
            }
            if (l && l != -1 && l.color != this.color) addPawnMove(x - 1, y + dy);
            if (r && r != -1 && r.color != this.color) addPawnMove(x + 1, y + dy);
        }

        if (log) {
            const fmt = e => e.p ? A1(e) + '=' + e.p : typeof e == 'string' ? e : A1(e);
            console.log(`Moves for ${A1({ x, y })}: ` + moves.map(fmt).join(', '));
        }
        return moves;
    }
}

class Board {
    constructor(fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -') {
        this.lines = [];
        this.apoints = null;
        this.castle = 'KQkq';
        this.enpessant = '-';
        this.loadFEN(fen);
    }

    loadFEN(fen) {
        this.squares = [];
        this.lines = [];
        this.apoints = null;
        fen = fen.trim();
        const data = fen.split(' ');
        const rows = data[0].split('/');
        for (let y = 0; y < 8; y++) {
            this.squares[y] = new Array(8);
            for (let x = 0, i = 0; x < 8; x++, i++) {
                const p = rows[y][i];
                if (p.match(/\D/)) {
                    this.squares[y][x] = new Piece(p, this);
                } else {
                    x += Number(p) - 1;
                }
            }
        }
        this.turn = data[1];
        this.castle = data[2];
        this.enpessant = data[3];
    }

    square(x, y) {
        if (x > 7 || x < 0 || y > 7 || y < 0) return -1;
        return this.squares[y][x] || 0;
    }

    forEach(cb) {
        for (let y = 0; y < 8; y++)
            for (let x = 0; x < 8; x++)
                if (cb(this.squares[y][x], x, y)) return;
    }

    toString() {
        let result = '-'.repeat(19) + '\n';
        this.forEach((tile, x, y) => {
            if (x == 0) result += '| ';
            result += tile ? tile.type : '.';
            result += x == 7 ? ' |\n' : ' ';
        });
        return result + '-'.repeat(19);
    }

    isCheck(c) {
        const k = (c == 'w') ? 'K' : 'k';
        const threatened = [];
        this.forEach((t, x, y) => {
            if (t && t.color != c) {
                t.getPossibleMoves(x, y, false)
                    .filter(e => typeof e != 'string')
                    .map(e => this.square(e.x, e.y))
                    .filter(e => e && e.type)
                    .forEach(e => threatened.push(e.type));
            }
        });
        return threatened.includes(k);
    }

    getSquares(x, y, dx, dy, c, mult = true) {
        const squares = [];
        for (let i = 1; i < 8; i++) {
            if (i == 2 && !mult) break;
            const sx = x + dx * i, sy = y + dy * i;
            const sq = this.square(sx, sy);
            if (sq == -1) break;
            if (sq == 0 || sq.color != c) squares.push({ x: sx, y: sy });
            if (sq && sq.type) break;
        }
        return squares;
    }

    get fen() {
        let fen = '';
        for (let y = 0; y < 8; y++) {
            let empty = 0;
            for (let x = 0; x < 8; x++) {
                const sq = this.squares[y][x];
                if (sq) {
                    if (empty) { fen += empty; empty = 0; }
                    fen += sq.type;
                } else {
                    empty++;
                }
            }
            if (empty) fen += empty;
            fen += '/';
        }
        return fen.slice(0, -1) + ` ${this.turn} ${this.castle} ${this.enpessant}`;
    }

    get points() {
        if (this._pts) return this._pts;
        const values = { p: 1, n: 3.45, b: 3.55, q: 10, r: 5.25, k: 0 };
        let w = 0, b = 0;
        this.forEach(t => { if (t) (t.color == 'w' ? w : b) += values[t.type.toLowerCase()]; });
        this._pts = { w, b, o: w - b };
        return this._pts;
    }

    get valid() {
        return !this.isCheck(ot(this.turn));
    }

    theorize(move_code, make_move = false) {
        const nb = new Board(this.fen);
        nb.turn = ot(this.turn);
        const mc = move_code.toUpperCase();

        if (mc == 'O-O') {
            const r = this.turn == 'w' ? 7 : 0;
            nb.squares[r][6] = nb.squares[r][4];
            nb.squares[r][5] = nb.squares[r][7];
            nb.squares[r][4] = null;
            nb.squares[r][7] = null;
            nb.castle = nb.castle.replace(/[KQ]/g, '');
        } else if (mc == 'O-O-O') {
            const r = this.turn == 'w' ? 7 : 0;
            nb.squares[r][2] = nb.squares[r][4];
            nb.squares[r][3] = nb.squares[r][0];
            nb.squares[r][4] = null;
            nb.squares[r][0] = null;
            nb.castle = nb.castle.replace(/[KQ]/g, '');
        } else if (move_code.includes('=')) {
            const a = XY(move_code.slice(0, 2));
            const b = XY(move_code.slice(2, 4));
            const ptype = move_code.slice(-1);
            const npcode = nb.squares[a.y][a.x].color == 'w' ? ptype.toUpperCase() : ptype.toLowerCase();
            nb.squares[b.y][b.x] = new Piece(npcode, nb);
            nb.squares[a.y][a.x] = null;
        } else {
            const a = XY(move_code.slice(0, 2));
            const b = XY(move_code.slice(2, 4));
            nb.squares[b.y][b.x] = nb.squares[a.y][a.x];
            nb.squares[a.y][a.x] = null;
        }

        if (make_move) {
            this.lines = [];
            exports.board = nb;
        }
        return nb;
    }

    generatePossibilities(log = false) {
        this.lines = [];
        const moveCodes = [];
        this.forEach((t, x, y) => {
            if (!t || t.color != this.turn) return;
            const pos = A1({ x, y });
            for (const xy of t.getPossibleMoves(x, y)) {
                if (xy.p) moveCodes.push(pos + A1(xy) + '=' + xy.p);
                else if (typeof xy == 'string') moveCodes.push(xy);
                else moveCodes.push(pos + A1(xy));
            }
        });

        for (const mc of moveCodes) {
            const nb = this.theorize(mc);
            if (!nb || !nb.valid) continue;
            if (!cache[nb.fen]) cache[nb.fen] = nb;
            this.lines.push({ mc, fen: nb.fen });
        }

        if (log) console.log('Moves: ' + this.lines.map(l => l.mc).join(', '));

        if (this.lines.length == 0) {
            if (this.isCheck(this.turn)) {
                this.apoints = this.turn == 'b' ? 1200 : -1200;
                return 'CHECKMATE';
            }
            this.apoints = 0;
            return 'STALEMATE';
        }
    }

    // Evaluates one position by spawning MatthiasBot.exe at the given depth
    _evalWithExe(fen, depth) {
        return new Promise((res, rej) => {
            const proc = spawn(EXE, [depth, fen]);
            let out = '';
            proc.stdout.on('data', d => out += d.toString());
            proc.stdout.on('end', () => res(Number(out.trim())));
            proc.stderr.on('data', e => console.error(e.toString()));
            proc.on('error', rej);
        });
    }

    async search(depth = 3, log = false) {
        // Opening book
        const fenKey = this.fen.split(' ').slice(0, 3).join(' ');
        if (fenKey in OpeningsBook) {
            if (log) console.log('BOOK MOVE: ' + OpeningsBook[fenKey]);
            return OpeningsBook[fenKey];
        }

        // Generate moves if needed
        if (this.lines.length == 0) {
            const end = this.generatePossibilities();
            if (end) {
                if (log) console.log('END: ' + end);
                return null;
            }
        }

        // Shuffle for variety among equal moves
        const moves = [...this.lines].sort(() => Math.random() - 0.5);

        // Evaluate each move
        if (depth == 1) {
            for (const m of moves) m.score = cache[m.fen].points.o;
        } else {
            // Run all evaluations in parallel via C++ subprocesses
            await Promise.all(moves.map(async m => {
                m.score = await this._evalWithExe(m.fen, depth - 1);
                cache[m.fen].apoints = m.score;
            }));
        }

        // Castling bonus
        const castleBonus = this.turn == 'w' ? 0.5 : -0.5;
        for (const m of moves)
            if (m.mc.includes('O')) m.score += castleBonus;

        // White maximizes, black minimizes
        moves.sort((a, b) => b.score - a.score);
        const best = this.turn == 'w' ? moves[0] : moves[moves.length - 1];

        this.apoints = best.score;
        if (log) console.log(`Best Move (depth ${depth}): ${best.mc}, score: ${best.score}`);
        return best.mc;
    }

    getPossibleFor(a1) {
        const t = XY(a1);
        const sq = this.square(t.x, t.y);
        if (sq && sq.type) return sq.getPossibleMoves(t.x, t.y, true, true);
        console.log('No piece at ' + a1);
    }
}

exports.board = new Board();
exports.Board = Board;
