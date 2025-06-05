#include "MatthiasBot.h"

Board* BOARD;
string path;

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
        cout << A1(m.f->pos) << A1(m.s->pos);
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
    void loadFen(string fen);
    Square* getSquare(int x, int y);
    string toString();
    bool isCheck(char c);
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
    Line* choosePossibilitesMULTI(int depth = 1, bool log = false);
};

struct Line {
    Move move;
    Board board;
    float eval = 0.0;
};

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
    Square* f = board->getSquare(x, y);
    if (board == nullptr) return arr;
    int i = 0;
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
        if (castles && false) {
            int rank = color == 'w' ? 7 : 0;
            char kpriv = color == 'w' ? 'K' : 'k';
            char qpriv = color == 'w' ? 'Q' : 'q';
            char rtype = color == 'w' ? 'R' : 'r';
            Piece* king = board->getSquare(4, rank)->piece;
            bool kinggood = king != nullptr && !board->isCheck(board->turn);
            if (board->castle.find(kpriv) != string::npos) {
                if (kinggood &&
                    board->getSquare(7, rank)->piece->type == rtype &&
                    board->getSquare(5, rank)->piece == nullptr &&
                    board->getSquare(6, rank)->piece == nullptr) {
                    Move m = getMove(board->getSquare(6, rank), f);
                    m.type = oo; // short castle
                    result->push_back(m);
                }
            }
            if (board->castle.find(qpriv) != string::npos) {
                if (kinggood &&
                    board->getSquare(0, rank)->piece->type == rtype &&
                    board->getSquare(1, rank)->piece == nullptr &&
                    board->getSquare(2, rank)->piece == nullptr &&
                    board->getSquare(3, rank)->piece == nullptr) {
                    Move m = getMove(board->getSquare(2, rank), f);
                    m.type = ooo; // long castle
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
Board::Board(string fen) {
    loadFen(fen);
}
void Board::loadFen(string fen) {
    int i = 0;
    Piece* piece;

    for (int y = 0; y < 8; y++) {
        for (int x = 0; x < 8; x++) {
            XY pos = { x,y };
            Square s;
            s.pos = pos;
            s.piece = nullptr;
            squares[y][x] = s;
        }
    }

    for (int y = 0; y < 8; y++) {
        for (int x = 0; x < 8; x++) {
            if (x >= 8) break;
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
    string rem_castle = ot(turn) == 'w' ? "KQ" : "kq";
    if (m.type == oo) {
        int r = turn == 'w' ? 0 : 7;
        nb->squares[r][6].piece = nb->squares[r][4].piece;
        nb->squares[r][5].piece = nb->squares[r][7].piece;
        nb->squares[r][4].piece = nullptr;
        nb->squares[r][7].piece = nullptr;
        removeSubstr(&nb->castle, rem_castle);
    }
    else if (m.type == ooo) {
        int r = turn == 'w' ? 0 : 7;
        nb->squares[r][6].piece = nb->squares[r][4].piece;
        nb->squares[r][5].piece = nb->squares[r][7].piece;
        nb->squares[r][4].piece = nullptr;
        nb->squares[r][7].piece = nullptr;
        removeSubstr(&nb->castle, rem_castle);
    }
    else if (m.type > ooo) { // promotion
        char pt[] = { 'n','r','b','q' };
        char promotion = pt[m.type - 4];
        promotion = (turn == 'w') ? toupper(promotion) : promotion;
        nb->getSquare(m.s->pos.x, m.s->pos.y)->piece = new Piece(promotion, nb);
        delete nb->getSquare(m.f->pos.x, m.f->pos.y)->piece;
        nb->getSquare(m.f->pos.x, m.f->pos.y)->piece = nullptr;
    }
    else {
        if (nb->getSquare(m.s->pos.x, m.s->pos.y)->piece) delete nb->getSquare(m.s->pos.x, m.s->pos.y)->piece;
        nb->getSquare(m.s->pos.x, m.s->pos.y)->piece = nb->getSquare(m.f->pos.x, m.f->pos.y)->piece;
        nb->getSquare(m.f->pos.x, m.f->pos.y)->piece = nullptr;
        if (true) { // REMOVE CASTLE RIGHTS
            Square* s = nb->getSquare(m.s->pos.x, m.s->pos.y);
            Square* f = nb->getSquare(m.f->pos.x, m.f->pos.y);
            if (tolower(s->piece->type) == 'k') {
                removeSubstr(&nb->castle, rem_castle);
            }
            if (f->pos.x == 0) {
                if (f->pos.y == 0) {
                    removeSubstr(&nb->castle, "q");
                }
                else if (f->pos.y == 7) {
                    removeSubstr(&nb->castle, "k");
                }
            }
            else if (f->pos.x == 7) {
                if (f->pos.y == 0) {
                    removeSubstr(&nb->castle, "Q");
                }
                else if (f->pos.y == 7) {
                    removeSubstr(&nb->castle, "K");
                }
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
        cout << "THIS CODE WORKS" << endl;
        return savedpoints;
    }
    float result = 0.0;
    int pieceCount = 0;
    for (int y = 0; y < 8; y++) {
        for (int x = 0; x < 8; x++) {
            Piece* piece = squares[y][x].piece;
            if (piece == nullptr) continue;
            int dir = piece->color == 'w' ? 1 : -1;
            switch (tolower(squares[y][x].piece->type)) {
            case 'p': result += 1 * dir; break;
            case 'n': result += 3 * dir; break;
            case 'b': result += 3 * dir; break;
            case 'r': result += 5 * dir; break;
            case 'q': result += 9 * dir; break;
            default: break;
            }
            pieceCount++;
        }
    }

    if (pieceCount < 8) {
        for (int y = 0; y < 8; y++) {
            for (int x = 0; x < 8; x++) {
                Piece* piece = squares[y][x].piece;
                if (piece != nullptr && tolower(piece->type) == 'p') {
                    if (piece->color == 'w') {
                        result += 0.05 * (7 - y); // more advanced, higher y
                    }
                    else {
                        result -= 0.05 * y; // more advanced, lower y
                    }
                }
            }
        }
    }

    bool kingMoved = false;
    bool enemyHasQueen = false;
    for (int y = 0; y < 8; y++) {
        for (int x = 0; x < 8; x++) {
            Piece* piece = squares[y][x].piece;
            if (piece == nullptr) continue;
            // Check if the king has moved from its starting position
            if (tolower(piece->type) == 'k') {
                if ((piece->color == 'w' && (y != 7 || x != 4)) ||
                    (piece->color == 'b' && (y != 0 || x != 4))) {
                    kingMoved = true;
                }
            }
            // Check if the enemy has a queen
            if (tolower(piece->type) == 'q' && piece->color != turn) {
                enemyHasQueen = true;
            }
        }
    }
    if (kingMoved && enemyHasQueen) {
        result += (turn == 'w' ? -0.6 : 0.6);
    }

    savedpoints = result;
    usedSavedPoints = true;
    return result;
}
void Board::clearLines() {
    for (Line l : lines) {
        for (int y = 0; y < 8; y++) {
            for (int x = 0; x < 8; x++) {
                Piece* p = l.board.getSquare(x, y)->piece;
                if (p) delete p;
                l.board.getSquare(x, y)->piece = nullptr;
            }
        }
    }
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
Line* Board::choosePossibilites(int depth, bool log) {
    Line* bestwhite;
    Line* bestblack;
    Line* temp;
    int ixwhite = 0, ixblack = 0;
    bestwhite = nullptr;
    bestblack = nullptr;
    char end_info;
    if (nopossible == 'x') {
        end_info = generatePossibilites();
    }
    else {
        end_info = nopossible;
    }
    if (end_info != '0') {
        if (log) cout << "END SEEN: ";
        if (end_info == 's') {
            apoints = 0;
            if (log) cout << "STALEMATE" << endl;
        }
        else if (end_info == 'c') {
            apoints = turn == 'b' ? 1200 : -1200;
            if (log) cout << "CHECKMATE" << endl;
        }
        return nullptr;
    }
    vector<thread> threads;
    for (int i = 0; i < lines.size(); i++) {
        float eval = rand() % 200;
        eval = eval / 2000.0;
        lines[i].eval = eval;
        if (depth == 1) {
            lines[i].eval += lines[i].board.points();
        }
        else {
            //if (depth < 3) {
            //if (depth < 4) {
            if (true) {
                temp = lines[i].board.choosePossibilites(depth - 1, log);
                lines[i].eval += lines[i].board.apoints;
            }
            else {
                ThreadData td = {};
                td.b = &lines[i].board;
                td.d = depth - 1;
                td.result = &lines[i].eval;
                threads.push_back(thread(calculateBoard, td));
                if (log) cout << "Started Thread" << endl;
            }
        }
        if (lines[i].move.type == oo || lines[i].move.type == ooo) {
            lines[i].eval += turn == 'w' ? .5 : -.5;
        }
        if (bestwhite == nullptr) {
            bestwhite = &lines[i];
            bestblack = &lines[i];
        }
        else {
            if (lines[i].eval > bestwhite->eval) {
                bestwhite = &lines[i];
                ixwhite = i;
            }
            if (lines[i].eval < bestblack->eval) {
                bestblack = &lines[i];
                ixblack = i;
            }
        }
    }

    for (int i = 0; i < threads.size(); i++) {
        if (threads[i].joinable()) {
            threads[i].join();
        }
    }

    // WHEN ALL THREADS ARE DONE PROCEED //


    if (turn == 'w') {
        if (bestwhite == nullptr) {
            return nullptr;
        }
        else {
            bestmove = bestwhite->move;
            apoints = bestwhite->eval;
        }
    }
    else {
        if (bestwhite == nullptr) {
            return nullptr;
        }
        else {
            bestmove = bestblack->move;
            apoints = bestblack->eval;
        }
    }
    if (log && depth != 1) {
        if (lines.size() == 0) {
            cout << "No Move";
        }
        else {
            cout << "Best Move: ";
            if (turn == 'w') {
                cout << "(" << depth << ") " << moveToString(bestwhite->move) << ", points: " << bestwhite->eval << endl;
            }
            else {
                cout << "(" << depth << ") " << moveToString(bestblack->move) << ", points: " << bestblack->eval << endl;
            }
        }
    }
    clearLines();
    return (turn == 'w') ? bestwhite : bestblack;
}

int main(int argc, char** argv) {
    const bool DEV = true;
    BOARD = new Board;
    BOARD->loadFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -");
    string command;
    path = argv[0];
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