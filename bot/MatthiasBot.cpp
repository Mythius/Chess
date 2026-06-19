#include <iostream>
#include <string>
#include <vector>
#include <thread>
#include <algorithm>
#include <numeric>
using namespace std;
struct Move;
struct Line;
class Board;
struct Square;
class Piece;

Board* BOARD;

struct XY {
    int x = -1;
    int y = -1;
};

struct Square {
    XY pos;
    Piece* piece = nullptr;
};

enum movetype {
    normal,
    enp,
    oo,
    ooo,
    pn,
    pr,
    pb,
    pq
};

struct Move {
    Square* f = nullptr; // from
    Square* s = nullptr; // to
    int type = normal;
};

string A1(XY p) {
    char a = p.x + 65;
    char b = '0' + 8 - p.y;
    string result;
    result.push_back(a);
    result.push_back(b);
    return result;
}

XY toXY(string p) {
    int a = toupper(p[0]) - 65;
    int b = 8 - (p[1] - '0');
    return XY{ a,b };
}

char ot(char t) {
    return t == 'w' ? 'b' : 'w';
}

void removeSubstr(string* s, string substr) {
    size_t ix = s->find(substr);
    if (ix != string::npos) {
        s->erase(ix, substr.size());
    }
}

Move getMove(Square* s, Square* f) {
    Move m;
    m.s = s;
    m.f = f;
    return m;
}

string moveToString(Move m) {
    string result;
    if (m.type > ooo) { // if move is a pawn promotion
        result += A1(m.f->pos) + A1(m.s->pos);
        switch (m.type) {
        case pq: result += "=q"; break;
        case pr: result += "=r"; break;
        case pb: result += "=b"; break;
        case pn: result += "=n"; break;
        }
    }
    else if (m.type == ooo) {
        result += "O-O-O";
    }
    else if (m.type == oo) {
        result += "O-O";
    }
    else {
        result += A1(m.f->pos) + A1(m.s->pos);
    }
    return result;
}

bool ivs(Square s) { // IS SQUARE OUT OF BOUNDS
    int x = s.pos.x, y = s.pos.y;
    return (x > 7 || x < 0 || y > 7 || y < 0);
}

class Piece {
public:
    char type = 'K';
    char color = 'w';
    Board* board = nullptr;
    Piece();
    Piece(char l, Board* b);
    vector<Move> getPossibleMoves(int x, int y, bool castles = true, bool log = false);
};

class Board {
private:
    float savedpoints = 0;
    bool usedSavedPoints = false;
    Line* alphabeta(int depth, float alpha, float beta, bool log);
    float quiesce(float alpha, float beta);
public:
    char nopossible = 'x';
    vector<Line> lines;
    string fen = "";
    float apoints;
    string castle = "KQkq";
    XY enpessent = {};
    char turn = 'w';
    Move bestmove;
    Square squares[8][8] = {};
    Board();
    Board(string fen);
    Board(const Board& other);
    Board& operator=(const Board& other);
    Board(Board&& other) noexcept;
    ~Board();
    void loadFen(string fen);
    Square* getSquare(int x, int y);
    string toString();
    bool isCheck(char c);
    bool isAttacked(int x, int y, char attackerColor);
    void getSquares(vector<Move>* result, int x, int y, int dx, int dy, char c, bool mult);
    vector<Move> getPossibleFor(string a1);
    string getFen();
    void theorize(Board* b, Move m, bool make_move = false);
    Move fromString(string move_code);
    bool valid();
    float points();
    void clearLines();
    char generatePossibilites(bool log = false);
    Line* choosePossibilites(int depth = 1, bool log = false);
};

struct Line {
    Move move;
    Board board;
    float eval = 0.0;
};

static float pieceValue(char type) {
    switch (tolower(type)) {
    case 'p': return 1.0f;
    case 'n': return 3.45f;
    case 'b': return 3.55f;
    case 'r': return 5.25f;
    case 'q': return 10.0f;
    case 'k': return 100.0f;
    default:  return 0.0f;
    }
}

// Piece-square tables (centipawns, white's perspective: y=0=rank8, y=7=rank1)
static const int pst_pawn[64] = {
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
};
static const int pst_knight[64] = {
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
};
static const int pst_bishop[64] = {
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
};
static const int pst_rook[64] = {
     0,  0,  0,  5,  5,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
};
static const int pst_queen[64] = {
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
};
static const int pst_king[64] = {
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
};

static float pstValue(char type, int x, int y, char color) {
    int row = (color == 'w') ? y : (7 - y);
    int idx = row * 8 + x;
    switch (tolower(type)) {
    case 'p': return pst_pawn[idx]   / 100.0f;
    case 'n': return pst_knight[idx] / 100.0f;
    case 'b': return pst_bishop[idx] / 100.0f;
    case 'r': return pst_rook[idx]   / 100.0f;
    case 'q': return pst_queen[idx]  / 100.0f;
    case 'k': return pst_king[idx]   / 100.0f;
    default:  return 0.0f;
    }
}

// MVV-LVA: high score = search this move first (captures big pieces with small ones)
static float moveOrderScore(const Move& m) {
    if (m.type == pq) return 9.0f;
    if (m.type == pr) return 5.0f;
    if (m.type == pb) return 3.55f;
    if (m.type == pn) return 3.45f;
    if (m.s && m.s->piece) {
        float victim   = pieceValue(m.s->piece->type);
        float attacker = (m.f && m.f->piece) ? pieceValue(m.f->piece->type) : 0.0f;
        return victim - attacker * 0.01f;
    }
    return 0.0f;
}

Piece::Piece() {
    type = 'p';
    color = 'w';
    board = nullptr;
}
Piece::Piece(char l, Board* b) {
    type = l;
    color = isupper(l) ? 'w' : 'b';
    board = b;
}
vector<Move> Piece::getPossibleMoves(int x, int y, bool castles, bool log) {
    char to = tolower(type);
    vector<Move> arr;
    vector<Move>* result = &arr;
    if (board == nullptr) return arr;
    Square* f = board->getSquare(x, y);
    if (to == 'n') {
        board->getSquares(result, x, y, 2, 1, color, false);
        board->getSquares(result, x, y, 2, -1, color, false);
        board->getSquares(result, x, y, -2, 1, color, false);
        board->getSquares(result, x, y, -2, -1, color, false);
        board->getSquares(result, x, y, 1, 2, color, false);
        board->getSquares(result, x, y, 1, -2, color, false);
        board->getSquares(result, x, y, -1, 2, color, false);
        board->getSquares(result, x, y, -1, -2, color, false);
    }
    else if (to == 'b') {
        board->getSquares(result, x, y, 1, 1, color, true);
        board->getSquares(result, x, y, 1, -1, color, true);
        board->getSquares(result, x, y, -1, 1, color, true);
        board->getSquares(result, x, y, -1, -1, color, true);
    }
    else if (to == 'r') {
        board->getSquares(result, x, y, 0, 1, color, true);
        board->getSquares(result, x, y, 0, -1, color, true);
        board->getSquares(result, x, y, 1, 0, color, true);
        board->getSquares(result, x, y, -1, 0, color, true);
    }
    else if (to == 'q') {
        board->getSquares(result, x, y, 1, 1, color, true);
        board->getSquares(result, x, y, 1, -1, color, true);
        board->getSquares(result, x, y, -1, 1, color, true);
        board->getSquares(result, x, y, -1, -1, color, true);
        board->getSquares(result, x, y, 0, 1, color, true);
        board->getSquares(result, x, y, 0, -1, color, true);
        board->getSquares(result, x, y, 1, 0, color, true);
        board->getSquares(result, x, y, -1, 0, color, true);
    }
    else if (to == 'k') {
        board->getSquares(result, x, y, 1, -1, color, false);
        board->getSquares(result, x, y, -1, 1, color, false);
        board->getSquares(result, x, y, -1, -1, color, false);
        board->getSquares(result, x, y, 1, 1, color, false);
        board->getSquares(result, x, y, 0, 1, color, false);
        board->getSquares(result, x, y, 0, -1, color, false);
        board->getSquares(result, x, y, 1, 0, color, false);
        board->getSquares(result, x, y, -1, 0, color, false);
        if (castles) {
            int rank = color == 'w' ? 7 : 0;
            char kpriv = color == 'w' ? 'K' : 'k';
            char qpriv = color == 'w' ? 'Q' : 'q';
            char rtype = color == 'w' ? 'R' : 'r';
            char opp = ot(color);
            bool kinggood = !board->isCheck(color);
            if (kinggood && board->castle.find(kpriv) != string::npos) {
                Square* rook = board->getSquare(7, rank);
                if (rook->piece != nullptr && rook->piece->type == rtype &&
                    board->getSquare(5, rank)->piece == nullptr &&
                    board->getSquare(6, rank)->piece == nullptr &&
                    !board->isAttacked(5, rank, opp) &&
                    !board->isAttacked(6, rank, opp)) {
                    Move m = getMove(board->getSquare(6, rank), f);
                    m.type = oo;
                    result->push_back(m);
                }
            }
            if (kinggood && board->castle.find(qpriv) != string::npos) {
                Square* rook = board->getSquare(0, rank);
                if (rook->piece != nullptr && rook->piece->type == rtype &&
                    board->getSquare(1, rank)->piece == nullptr &&
                    board->getSquare(2, rank)->piece == nullptr &&
                    board->getSquare(3, rank)->piece == nullptr &&
                    !board->isAttacked(2, rank, opp) &&
                    !board->isAttacked(3, rank, opp)) {
                    Move m = getMove(board->getSquare(2, rank), f);
                    m.type = ooo;
                    result->push_back(m);
                }
            }
        }
    }
    else if (to == 'p') {
        int dy = color == 'w' ? -1 : 1;
        int hr = color == 'w' ? 6 : 1;
        int p = color == 'w' ? 0 : 7;
        Square* f1 = board->getSquare(x, y + dy);
        Square* f2 = board->getSquare(x, y + dy * 2);
        Square* l = board->getSquare(x - 1, y + dy);
        Square* r = board->getSquare(x + 1, y + dy);
        if (f1->piece == nullptr) {
            if (y + dy == p) {
                Move fq = getMove(f1, f); fq.type = pq; result->push_back(fq);
                Move fr = getMove(f1, f); fr.type = pr; result->push_back(fr);
                Move fn = getMove(f1, f); fn.type = pn; result->push_back(fn);
                Move fb = getMove(f1, f); fb.type = pb; result->push_back(fb);
            }
            else {
                Move m = getMove(f1, f);
                result->push_back(m);
            }
            if (y == hr && f2->piece == nullptr) {
                Move m = getMove(f2, f);
                m.type = enp;
                result->push_back(m);
            }
        }
        if (l != nullptr && !ivs(*l) && l->piece != nullptr && l->piece->color != color) {
            if (y + dy == p) {
                Move fq = getMove(l, f); fq.type = pq; result->push_back(fq);
                Move fr = getMove(l, f); fr.type = pr; result->push_back(fr);
                Move fn = getMove(l, f); fn.type = pn; result->push_back(fn);
                Move fb = getMove(l, f); fb.type = pb; result->push_back(fb);
            }
            else {
                Move m = getMove(l, f);
                result->push_back(m);
            }
        }
        if (r != nullptr && !ivs(*r) && r->piece != nullptr && r->piece->color != color) {
            if (y + dy == p) {
                Move fq = getMove(r, f); fq.type = pq; result->push_back(fq);
                Move fr = getMove(r, f); fr.type = pr; result->push_back(fr);
                Move fn = getMove(r, f); fn.type = pn; result->push_back(fn);
                Move fb = getMove(r, f); fb.type = pb; result->push_back(fb);
            }
            else {
                Move m = getMove(r, f);
                result->push_back(m);
            }
        }
    }
    if (log) {
        XY sp = { x,y };
        int size = (int)result->size();
        cout << "Moves for " << A1(sp) << " are (" << size << "): ";
        for (int i = 0; i < size; i++) {
            cout << moveToString(result->at(i)) << " ";
        }
        cout << endl;
    }
    return arr;
}

struct ThreadData {
    Board* b = nullptr;
    int d;
    float* result;
};

void calculateBoard(ThreadData d) {
    Line* l = d.b->choosePossibilites(d.d, false);
    *d.result = l->eval;
    cout << "Calculated!" << endl;
}

Board::Board() {
    lines.clear();
    apoints = 0;
}
Board::~Board() {
    for (int y = 0; y < 8; y++)
        for (int x = 0; x < 8; x++) {
            delete squares[y][x].piece;
            squares[y][x].piece = nullptr;
        }
}
static void copySquares(Square dst[8][8], const Square src[8][8], Board* owner) {
    for (int y = 0; y < 8; y++)
        for (int x = 0; x < 8; x++) {
            dst[y][x].pos = src[y][x].pos;
            dst[y][x].piece = src[y][x].piece
                ? new Piece(*src[y][x].piece)
                : nullptr;
            if (dst[y][x].piece) dst[y][x].piece->board = owner;
        }
}
Board::Board(const Board& other) {
    savedpoints    = other.savedpoints;
    usedSavedPoints = other.usedSavedPoints;
    nopossible     = other.nopossible;
    fen            = other.fen;
    apoints        = other.apoints;
    castle         = other.castle;
    enpessent      = other.enpessent;
    turn           = other.turn;
    bestmove       = other.bestmove;
    lines          = {};  // lines are regenerated on demand; don't deep-copy
    copySquares(squares, other.squares, this);
}
Board& Board::operator=(const Board& other) {
    if (this == &other) return *this;
    for (int y = 0; y < 8; y++)
        for (int x = 0; x < 8; x++) {
            delete squares[y][x].piece;
            squares[y][x].piece = nullptr;
        }
    lines.clear();
    savedpoints    = other.savedpoints;
    usedSavedPoints = other.usedSavedPoints;
    nopossible     = other.nopossible;
    fen            = other.fen;
    apoints        = other.apoints;
    castle         = other.castle;
    enpessent      = other.enpessent;
    turn           = other.turn;
    bestmove       = other.bestmove;
    copySquares(squares, other.squares, this);
    return *this;
}
Board::Board(Board&& other) noexcept {
    savedpoints    = other.savedpoints;
    usedSavedPoints = other.usedSavedPoints;
    nopossible     = other.nopossible;
    fen            = move(other.fen);
    apoints        = other.apoints;
    castle         = move(other.castle);
    enpessent      = move(other.enpessent);
    turn           = other.turn;
    bestmove       = other.bestmove;
    lines          = move(other.lines);
    for (int y = 0; y < 8; y++)
        for (int x = 0; x < 8; x++) {
            squares[y][x].pos   = other.squares[y][x].pos;
            squares[y][x].piece = other.squares[y][x].piece;
            if (squares[y][x].piece) squares[y][x].piece->board = this;
            other.squares[y][x].piece = nullptr;  // prevent double-delete
        }
}
Board::Board(string fen) {
    loadFen(fen);
}
void Board::loadFen(string fen) {
    int i = 0;
    Piece* piece;

    for (int y = 0; y < 8; y++) {
        for (int x = 0; x < 8; x++) {
            delete squares[y][x].piece;
            squares[y][x].piece = nullptr;
            squares[y][x].pos = { x, y };
        }
    }

    for (int y = 0; y < 8; y++) {
        for (int x = 0; x < 8; x++) {
            char p = fen[i];
            if (isdigit(p)) {
                x += p - '0' - 1;
            }
            else {
                piece = new Piece(p, this);
                squares[y][x].piece = piece;
            }
            i++;
        }
        i++; // to skip slashes in fen
    }
    turn = fen[i++];
    fen = fen.substr(++i, fen.size()); // cut off everything until here
    castle = fen.substr(0, fen.find(' '));
    removeSubstr(&fen, castle + " ");
    int end = (int)fen.find(' ');
    end = end == string::npos ? (int)fen.size() : end;
    string enpcode = fen.substr(0, end);
    nopossible = 'x';
    usedSavedPoints = false;
    savedpoints = 0;
    lines.clear();
    if (enpcode != "-") {
        enpessent = toXY(enpcode);
    }
    else {
        enpessent = { -1,-1 };
    }
}
Square* Board::getSquare(int x, int y) {
    if (x > 7 || x < 0 || y > 7 || y < 0) {
        return nullptr;
    }
    else {
        return &squares[y][x];
    }
}
string Board::toString() {
    string result = "";
    string border = "-------------------\n";
    result += border;
    for (int y = 0; y < 8; y++) {
        result += "| ";
        for (int x = 0; x < 8; x++) {
            if (squares[y][x].piece != nullptr) {
                char letter = squares[y][x].piece->type;
                char color = squares[y][x].piece->color;
                result.push_back(letter);
                result.push_back(' ');
            }
            else {
                result += ". ";
            }
        }
        result += "|\n";
    }
    result += border;
    return result;
}
bool Board::isCheck(char c) {
    char k = (c == 'w') ? 'K' : 'k';
    string in_danger;
    for (int y = 0; y < 8; y++) {
        for (int x = 0; x < 8; x++) {
            Square* s = getSquare(x, y);
            if (s == nullptr || ivs(*s)) continue;
            if (s->piece != nullptr && s->piece->color != c) {
                vector<Move> moves = s->piece->getPossibleMoves(x, y, false);
                for (int i = 0; i < moves.size(); i++) {
                    if (moves[i].s->piece != nullptr) {
                        in_danger.push_back(moves[i].s->piece->type);
                    }
                }
            }
        }
    }
    // cout << "(" << in_danger << ") "; // DEBUG
    return in_danger.find(k) != string::npos;
}
bool Board::isAttacked(int x, int y, char attackerColor) {
    for (int iy = 0; iy < 8; iy++) {
        for (int ix = 0; ix < 8; ix++) {
            Square* s = getSquare(ix, iy);
            if (s->piece == nullptr || s->piece->color != attackerColor) continue;
            vector<Move> moves = s->piece->getPossibleMoves(ix, iy, false);
            for (auto& m : moves)
                if (m.s->pos.x == x && m.s->pos.y == y) return true;
        }
    }
    return false;
}
void Board::getSquares(vector<Move>* result, int x, int y, int dx, int dy, char c, bool mult) {
    Square* s;
    Square* f = getSquare(x, y);
    for (int i = 1; i < 8; i++) {
        if (i == 2 && !mult) break;
        int sx = x + dx * i;
        int sy = y + dy * i;
        s = getSquare(sx, sy);
        if (s == nullptr || ivs(*s)) break;
        if (s->piece != nullptr) {
            if (s->piece->color == c) {
                break;
            }
            else {
                Move m = getMove(s, f);
                result->push_back(m);
                break;
            }
        }
        else {
            Move m = getMove(s, f);
            result->push_back(m);
        }
    }
}
vector<Move> Board::getPossibleFor(string a1) {
    XY t = toXY(a1);
    Square* s = getSquare(t.x, t.y);
    if (s != nullptr && s->piece != nullptr) {
        return s->piece->getPossibleMoves(t.x, t.y, true, true);
    }
    else {
        cout << "No piece on square X:" << t.x << ", Y: " << t.y << endl;
    }
    return vector<Move>();
}
string Board::getFen() {
    string fen;
    int empty = 0;
    for (int y = 0; y < 8; y++) {
        empty = 0;
        for (int x = 0; x < 8; x++) {
            Piece* p = squares[y][x].piece;
            if (p != nullptr) {
                if (empty != 0) {
                    fen.push_back('0' + empty);
                    empty = 0;
                }
                fen.push_back(p->type);
            }
            else {
                empty++;
            }
        }
        if (empty != 0) {
            fen.push_back('0' + empty);
            empty = 0;
        }
        fen.push_back('/');
    }
    fen.pop_back();
    fen.push_back(' ');
    fen.push_back(turn);
    fen.push_back(' ');
    fen += castle;
    fen.push_back(' ');
    string enpc = A1(enpessent);
    if (enpessent.x == -1) {
        fen.push_back('-');
    }
    else {
        fen += enpc;
    }
    return fen;
}
void Board::theorize(Board* nb, Move m, bool make_move) {
    nb->loadFen(getFen());
    nb->clearLines();
    nb->turn = ot(turn);
    string rem_castle = turn == 'w' ? "KQ" : "kq";
    if (m.type == oo) {
        int r = turn == 'w' ? 7 : 0;
        nb->squares[r][6].piece = nb->squares[r][4].piece; // king e→g
        nb->squares[r][5].piece = nb->squares[r][7].piece; // rook h→f
        nb->squares[r][4].piece = nullptr;
        nb->squares[r][7].piece = nullptr;
        removeSubstr(&nb->castle, rem_castle);
    }
    else if (m.type == ooo) {
        int r = turn == 'w' ? 7 : 0;
        nb->squares[r][2].piece = nb->squares[r][4].piece; // king e→c
        nb->squares[r][3].piece = nb->squares[r][0].piece; // rook a→d
        nb->squares[r][4].piece = nullptr;
        nb->squares[r][0].piece = nullptr;
        removeSubstr(&nb->castle, rem_castle);
    }
    else if (m.type > ooo) { // promotion
        char pt[] = { 'n','r','b','q' };
        char promotion = pt[m.type - 4];
        promotion = (turn == 'w') ? toupper(promotion) : promotion;
        delete nb->getSquare(m.s->pos.x, m.s->pos.y)->piece; // captured piece (if any)
        nb->getSquare(m.s->pos.x, m.s->pos.y)->piece = new Piece(promotion, nb);
        delete nb->getSquare(m.f->pos.x, m.f->pos.y)->piece; // pawn
        nb->getSquare(m.f->pos.x, m.f->pos.y)->piece = nullptr;
    }
    else {
        if (nb->getSquare(m.s->pos.x, m.s->pos.y)->piece) delete nb->getSquare(m.s->pos.x, m.s->pos.y)->piece;
        nb->getSquare(m.s->pos.x, m.s->pos.y)->piece = nb->getSquare(m.f->pos.x, m.f->pos.y)->piece;
        nb->getSquare(m.f->pos.x, m.f->pos.y)->piece = nullptr;
        Square* s = nb->getSquare(m.s->pos.x, m.s->pos.y);
        Square* f = nb->getSquare(m.f->pos.x, m.f->pos.y);
        if (tolower(s->piece->type) == 'k') {
            removeSubstr(&nb->castle, rem_castle);
        }
        if (f->pos.x == 0) {
            if (f->pos.y == 0) {
                removeSubstr(&nb->castle, "q"); // a8: black queenside rook
            }
            else if (f->pos.y == 7) {
                removeSubstr(&nb->castle, "Q"); // a1: white queenside rook
            }
        }
        else if (f->pos.x == 7) {
            if (f->pos.y == 0) {
                removeSubstr(&nb->castle, "k"); // h8: black kingside rook
            }
            else if (f->pos.y == 7) {
                removeSubstr(&nb->castle, "K"); // h1: white kingside rook
            }
        }
    }
}
Move Board::fromString(string move_code) {
    if (move_code == "O-O") {
        Move m;
        XY p1, p2;
        if (turn == 'w') {
            //p1 = toXY("E1");
            //p2 = toXY("G1");
            //m = getMove(getSquare(p2.x, p2.y), getSquare(p1.x, p1.y));
            m.type = oo;
            return m;
        }
        else {
            //p1 = toXY("E8");
            //p2 = toXY("G8");
            //m = getMove(getSquare(p2.x, p2.y), getSquare(p1.x, p1.y));
            m.type = oo;
            return m;
        }
    }
    else if (move_code == "O-O-O") {
        Move m;
        XY p1, p2;
        if (turn == 'w') {
            //p1 = toXY("E1");
            //p2 = toXY("C1");
            //m = getMove(getSquare(p2.x, p2.y), getSquare(p1.x, p1.y));
            m.type = ooo;
            return m;
        }
        else {
            //p1 = toXY("E8");
            //p2 = toXY("C8");
            //m = getMove(getSquare(p2.x, p2.y), getSquare(p1.x, p1.y));
            m.type = ooo;
            return m;
        }
    }
    else {
        XY p1 = toXY(move_code.substr(0, 2));
        XY p2 = toXY(move_code.substr(2, 2));
        return getMove(getSquare(p2.x, p2.y), getSquare(p1.x, p1.y));
    }
}
bool Board::valid() {
    return !isCheck(ot(turn));
}
float Board::points() {
    if (usedSavedPoints) {
        return savedpoints;
    }
    float result = 0.0;
    for (int y = 0; y < 8; y++) {
        for (int x = 0; x < 8; x++) {
            Piece* piece = squares[y][x].piece;
            if (piece == nullptr) continue;
            int dir = piece->color == 'w' ? 1 : -1;
            float material = 0.0f;
            switch (tolower(piece->type)) {
            case 'p': material = 1.0f;    break;
            case 'n': material = 3.45f;   break;
            case 'b': material = 3.55f;   break;
            case 'r': material = 5.25f;   break;
            case 'q': material = 10.0f;   break;
            default:  break;
            }
            result += (material + pstValue(piece->type, x, y, piece->color)) * dir;
        }
    }
    savedpoints = result;
    usedSavedPoints = true;
    return result;
}
void Board::clearLines() {
    lines.clear();
}
char Board::generatePossibilites(bool log) {
    if (nopossible != 'x') {
        if (log) {
            for (int i = 0; i < lines.size(); i++) {
                cout << moveToString(lines[i].move) << " ";
            }
            cout << endl;
        }
        return nopossible;
    }
    vector<Move> moves;
    vector<Move> temp;
    for (int y = 0; y < 8; y++) {
        for (int x = 0; x < 8; x++) {
            Piece* p = getSquare(x, y)->piece;
            if (p == nullptr) continue;
            p->board = this;
            if (p == nullptr || p->color != turn) continue;
            temp = p->getPossibleMoves(x, y);
            if (temp.size() > 0) {
                for (int i = 0; i < temp.size(); i++) {
                    moves.push_back(temp[i]);
                }
            }
        }
    }
    for (int i = 0; i < moves.size(); i++) {
        if (ivs(*moves[i].s) || ivs(*moves[i].f)) {
            continue;
        }
        Line l;
        theorize(&l.board, moves[i], false);
        l.move = moves[i];
        if (l.board.valid()) {
            lines.push_back(l);
        }
    }
    if (log) {
        for (int i = 0; i < lines.size(); i++) {
            cout << moveToString(lines[i].move) << " ";
        }
        cout << endl;
    }
    if (lines.size() == 0) {
        if (isCheck(turn)) {
            nopossible = 'c';
            return 'c';
        }
        else {
            nopossible = 's';
            return 's';
        }
    }
    else {
        nopossible = '0';
        return '0';
    }
}
float Board::quiesce(float alpha, float beta) {
    float stand_pat = points();

    // Stand pat: we can always choose to not capture (skip if in check, but rare)
    if (turn == 'w') {
        if (stand_pat >= beta) return beta;
        if (stand_pat > alpha) alpha = stand_pat;
    } else {
        if (stand_pat <= alpha) return alpha;
        if (stand_pat < beta) beta = stand_pat;
    }

    // Collect captures and promotions only
    vector<Move> captures;
    for (int y = 0; y < 8; y++) {
        for (int x = 0; x < 8; x++) {
            Piece* p = squares[y][x].piece;
            if (!p || p->color != turn) continue;
            vector<Move> moves = p->getPossibleMoves(x, y, false);
            for (auto& m : moves) {
                bool isCapture = m.s && m.s->piece && m.s->piece->color != turn;
                bool isPromotion = m.type > ooo;
                if (isCapture || isPromotion) captures.push_back(m);
            }
        }
    }

    // MVV-LVA ordering within quiesce too
    sort(captures.begin(), captures.end(), [](const Move& a, const Move& b) {
        return moveOrderScore(a) > moveOrderScore(b);
    });

    for (auto& cap : captures) {
        if (!cap.s || !cap.f || ivs(*cap.s) || ivs(*cap.f)) continue;
        Board nb;
        theorize(&nb, cap, false);
        if (!nb.valid()) continue;

        float score = nb.quiesce(alpha, beta);

        if (turn == 'w') {
            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        } else {
            if (score <= alpha) return alpha;
            if (score < beta) beta = score;
        }
    }

    return (turn == 'w') ? alpha : beta;
}

Line* Board::choosePossibilites(int depth, bool log) {
    return alphabeta(depth, -1e6f, 1e6f, log);
}

Line* Board::alphabeta(int depth, float alpha, float beta, bool log) {
    // Resolve terminal / already-generated states
    char end_info;
    if (nopossible == 'x') {
        end_info = generatePossibilites();
    } else {
        end_info = nopossible;
    }
    if (end_info != '0') {
        if (end_info == 's') apoints = 0;
        else if (end_info == 'c') apoints = turn == 'b' ? 1200 : -1200;
        if (log) cout << (end_info == 's' ? "STALEMATE" : "CHECKMATE") << endl;
        return nullptr;
    }

    // Sort by MVV-LVA heuristic so captures are searched first, maximizing cutoffs
    vector<int> order(lines.size());
    iota(order.begin(), order.end(), 0);
    sort(order.begin(), order.end(), [this](int a, int b) {
        return moveOrderScore(lines[a].move) > moveOrderScore(lines[b].move);
    });

    Line* best = nullptr;

    for (int idx : order) {
        float eval = 0.0f;

        if (depth == 1) {
            eval += lines[idx].board.quiesce(alpha, beta);
        } else {
            lines[idx].board.alphabeta(depth - 1, alpha, beta, log);
            eval += lines[idx].board.apoints;
        }

        lines[idx].eval = eval;

        // Alpha-beta: white maximizes, black minimizes
        if (turn == 'w') {
            if (best == nullptr || eval > best->eval) best = &lines[idx];
            if (eval > alpha) alpha = eval;
            if (alpha >= beta) break; // beta cutoff
        } else {
            if (best == nullptr || eval < best->eval) best = &lines[idx];
            if (eval < beta) beta = eval;
            if (beta <= alpha) break; // alpha cutoff
        }
    }

    if (best == nullptr) return nullptr;

    bestmove = best->move;
    apoints = best->eval;

    if (log && depth != 1) {
        // Print all evaluated moves at the root (highest depth) for debugging
        vector<pair<float,int>> scored;
        for (int i = 0; i < (int)lines.size(); i++) {
            if (&lines[i] == best || lines[i].eval != 0.0f)
                scored.push_back({lines[i].eval, i});
        }
        if (depth >= 3) {
            sort(scored.begin(), scored.end(), [](auto& a, auto& b){
                return a.first > b.first;
            });
            cout << "(" << depth << ") All moves:" << endl;
            for (auto& [sc, i] : scored)
                cout << "  " << moveToString(lines[i].move) << " = " << sc << endl;
        }
        cout << "(" << depth << ") Best: " << moveToString(best->move)
             << ", score: " << best->eval << endl;
    }

    return best;
}

int main(int argc, char** argv) {
    BOARD = new Board;
    BOARD->loadFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -");
    string command;
    // #### TEST AREA #####

    // TEST FEN: r6k/pp4pp/1b1P4/8/1n4Q1/2N1RP2/PPq3p1/1RB1K3 b - - 0 1

    //#####################

    if (argc == 1) {
        cout << "Matthias Chess Bot" << endl;
        cout << "\td to Display" << endl;
        cout << "\tfen {your fen here} to load position" << endl;
        cout << "\tm E2E4 to move" << endl;
        cout << "\tq to quit" << endl;
        cout << "\tgo (calculates best move)" << endl;
        cout << "\teval (static score)" << endl;
        cout << "\tbreakdown (per-piece material+PST)" << endl;
    }
    else {
        int depth = argv[1][0] - '0';
        string fen;
        for (int i = 2; i < argc; i++) {
            fen += argv[i];
            fen += " ";
        }
        // cout << "Depth: " << depth << endl;
       //  cout << "Fen: " << fen << endl;
        BOARD->loadFen(fen);
        Line* l = BOARD->choosePossibilites(depth);
        // cout << moveToString(l->move);
        if (l == nullptr) {
            cout << BOARD->apoints << endl;
        }
        else {
            cout << l->eval << endl;
        }
        return 0;
    }
    while (true) {
        getline(cin, command);
        if (!command.empty() && command.back() == '\r') command.pop_back();
        // Strip UTF-8 BOM that PowerShell may prepend to piped input
        if (command.size() >= 3 &&
            (unsigned char)command[0] == 0xEF &&
            (unsigned char)command[1] == 0xBB &&
            (unsigned char)command[2] == 0xBF)
            command = command.substr(3);
        if (command == "d") {
            cout << BOARD->toString() << endl << BOARD->getFen() << endl;
            cout << BOARD->turn << " to move" << endl;
        }
        else if (command == "q") {
            break;
        }
        else if (command == "clear") {
            system("cls");
        }
        else if (command == "start") {
            BOARD->loadFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -");
        }
        else if (command == "possible") {
            cout << "Moves: ";
            BOARD->generatePossibilites(true);
        }
        else if (command == "eval") {
            cout << "Point Evaluation: " << BOARD->points() << endl;
        }
        else if (command == "breakdown") {
            float total = 0.0f;
            for (int y = 0; y < 8; y++) {
                for (int x = 0; x < 8; x++) {
                    Piece* p = BOARD->squares[y][x].piece;
                    if (!p) continue;
                    float mat = 0.0f;
                    switch (tolower(p->type)) {
                    case 'p': mat = 1.0f;   break;
                    case 'n': mat = 3.45f;  break;
                    case 'b': mat = 3.55f;  break;
                    case 'r': mat = 5.25f;  break;
                    case 'q': mat = 10.0f;  break;
                    }
                    float pst = pstValue(p->type, x, y, p->color);
                    int dir = (p->color == 'w') ? 1 : -1;
                    float contrib = (mat + pst) * dir;
                    total += contrib;
                    char col = 'A' + x;
                    int rank = 8 - y;
                    cout << col << rank << " " << p->type
                         << ": mat=" << mat << " pst=" << pst
                         << " contrib=" << contrib << endl;
                }
            }
            cout << "Total: " << total << endl;
        }
        else if (command == "check") {
            if (BOARD->isCheck('w')) {
                cout << "White is in Check" << endl;
            }
            else {
                cout << "White is not in Check" << endl;
            }
            if (BOARD->isCheck('b')) {
                cout << "Black is in Check" << endl;
            }
            else {
                cout << "Black is not in Check" << endl;
            }
        }
        else if (command == "go") {
            BOARD->nopossible = 'x';
            Line* m = BOARD->choosePossibilites(3, true);
            if (m != nullptr) {
                cout << "Best Move: " << moveToString(m->move) << endl;
            }
        }
        else {
            if (command.find("lp ") != string::npos) {
                removeSubstr(&command, "lp ");
                BOARD->getPossibleFor(command);
            }
            else if (command.find("fen ") != string::npos) {
                removeSubstr(&command, "fen ");
                BOARD->loadFen(command);
            }
            else if (command.find("m ") != string::npos) {
                removeSubstr(&command, "m ");
                cout << "Moving Piece: " << moveToString(BOARD->fromString(command)) << endl;
                BOARD->theorize(BOARD, BOARD->fromString(command), true);
            }
            else if (command.find("best ") != string::npos) {
                removeSubstr(&command, "best ");
                BOARD->nopossible = 'x';
                Line* m = BOARD->choosePossibilites(command[0] - '0', true);
                cout << "Best Move: " << moveToString(m->move) << endl;
            }
            else {
                cout << "Invalid" << endl;
            }
        }
    }
}