const {spawn} = require('child_process');
const A1 = t => String.fromCharCode(t.x+65)+(8-t.y);
const XY = A1 => {return{x:A1[0].toUpperCase().charCodeAt(0)-65,y:7-(Number(A1[1])-1)}};
const ot = t => t=='w'?'b':'w';

// 2k1r3/ppp3bp/2n5/2P2pBq/Q2p4/3N2P1/P1KN1P1P/R7 w - -
// Q4b2/7Q/1kp5/pp6/8/1K2pPP1/P2N2q1/R1N5 w - - almost checkmate
// 5b2/1k1P3p/p1p5/1p6/4Q3/1K2pPP1/P2N2q1/R1N5 w - - almost promotion

var cache = {};

class Piece{
	constructor(l,b){
		this.type = l;
		this.color = (l==l.toUpperCase())?'w':'b';
		this.board = b;
	}
	getPossibleMoves(x,y,log=false){ // returns all possible square to move to for this peice
		let to = this.type.toLowerCase();
		let b = this.board;
		let pos_sqrs = [];
		let temp = [];
		if(to == 'n'){
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,2,1,this.color,false));
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,2,-1,this.color,false));
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,-2,1,this.color,false));
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,-2,-1,this.color,false));
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,1,2,this.color,false));
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,-1,2,this.color,false));
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,1,-2,this.color,false));
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,-1,-2,this.color,false));
		} else if(to == 'b'){
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,1,1,this.color,true));
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,1,-1,this.color,true));
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,-1,1,this.color,true));
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,-1,-1,this.color,true));
		} else if(to == 'r'){
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,0,1,this.color,true));
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,0,-1,this.color,true));
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,-1,0,this.color,true));
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,1,0,this.color,true));
		} else if(to == 'q'){
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,1,1,this.color,true));
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,1,-1,this.color,true));
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,-1,1,this.color,true));
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,-1,-1,this.color,true));
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,0,1,this.color,true));
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,0,-1,this.color,true));
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,-1,0,this.color,true));
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,1,0,this.color,true));
		} else if(to == 'k'){
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,1,1,this.color,false));
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,1,-1,this.color,false));
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,-1,1,this.color,false));
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,-1,-1,this.color,false));
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,0,1,this.color,false));
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,0,-1,this.color,false));
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,-1,0,this.color,false));
			pos_sqrs = pos_sqrs.concat(b.getSquares(x,y,1,0,this.color,false));
			// castling
			if(this.color=='w'){
				let kinggood = b.square(4,7).type=='K' && x==4 && y==7 && !b.isCheck(b.turn);
				if(b.castle.includes('K') && kinggood && b.square(7,7).type=='R' && !b.square(5,7) && !b.square(6,7)){
					pos_sqrs.push('O-O');
				} else if(b.castle.includes('Q') && kinggood && b.square(0,7).type=='R' && !b.square(1,7) && !b.square(2,7) && !b.square(3,7)){
					pos_sqrs.push('O-O-O');
				}
			} else {
				let kinggood = b.square(4,0).type=='k' && x==4 && y==0 && !b.isCheck(b.turn);
				if(b.castle.includes('k') && kinggood && b.square(7,0).type=='r' && !b.square(5,0) && !b.square(6,0)){
					pos_sqrs.push('O-O');
				} else if(b.castle.includes('q') && kinggood && b.square(0,0).type=='r' && !b.square(1,0) && !b.square(2,0) && !b.square(3,0)){
					pos_sqrs.push('O-O-O');
				}
			}
		} else if(to == 'p'){
			let dy = this.color=='w'?-1:1;
			let hr = this.color=='w'?6:1;
			let p = this.color=='w'?0:7;
			let f1 = b.square(x,y+dy);
			let f2 = b.square(x,y+dy*2);
			let l = b.square(x-1,y+dy);
			let r = b.square(x+1,y+dy);
			if(!f1.type){
				if(!f2.type && y==hr){ // calculates pawns moving 2 forwards
					pos_sqrs.push({x,y:y+dy*2,enp:A1(x,y+dy)});
				}
				if((y+dy)==p){ // calculates pawn promotions
					pos_sqrs.push({x,y:y+dy,p:'q'});
					pos_sqrs.push({x,y:y+dy,p:'r'});
					pos_sqrs.push({x,y:y+dy,p:'n'});
					pos_sqrs.push({x,y:y+dy,p:'b'});
				} else {
					pos_sqrs.push({x,y:y+dy});
				}
			}
			if(l!=-1&&l!=0&&l.color!=this.color){ // calculates pawn takes left
				pos_sqrs.push({x:x-1,y:y+dy});
			}
			if(r!=-1&&r!=0&&r.color!=this.color){ // calculates pawn takes right
				pos_sqrs.push({x:x+1,y:y+dy});
			}
		}
		function printMap(e){
			if(e.p){ // if promotion
				return A1(e) + '=' + e.p;
			} else if(typeof e == 'string') { // if castles return castles
				return e;
			} else { // convert squares on x,y to A1 notation
				return A1(e);
			}
		}
		if(log) console.log(`Moves for ${A1({x,y})} are: `+pos_sqrs.map(printMap).join(', '));
		return pos_sqrs;
	}
	get letter(){
		return this.type;
	}
}

class Board{
	constructor(fen='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -'){
		this.loadFEN(fen)
		this.lines = [];
		this.stalemate = false;
		this.checkmate = false;
		this.apoints;
		this.castle = 'KQkq';
		this.enpessant = '-';
	}
	loadFEN(fen){
		this.squares = [];
		fen = fen.trim();
		let data = fen.split(' ');
		let pieces = data[0].split('/');
		for(let y=0;y<8;y++){
			this.squares[y] = new Array(8);
			for(let x=0,i=0;x<8;x++,i++){
				if(x>=8) continue;
				let p = pieces[y][i];
				if(p.match(/\D/)){
					this.squares[y][x] = new Piece(p,this);
				} else {
					x += Number(p)-1;
				}
			}
		}
		this.turn = data[1];
		this.castle = data[2];
		this.enpessant = data[3];
		// cache = {};
		this.lines = [];
	}
	square(x,y){
		if(x>7||x<0||y>7||y<0) return -1;
		else {
			let l = this.squares[y][x];
			return l?l:0;
		}
	}
	forEach(callback){
		for(let y=0;y<8;y++){
			for(let x=0;x<8;x++){
				let end = callback(this.squares[y][x],x,y);
				if(end) return;
			}
		}
	}
	toString(){
		let result = '';
		result += '-'.repeat(19) + '\n';
		this.forEach((tile,x,y)=>{
			if(x==0) result += '| ';
			if(tile) result += tile.letter;
			else result += '.';
			if(x==7) result += ' |\n';
			else result += ' ';
		});
		result += '-'.repeat(19);
		return result;
	}
	isCheck(c){
		let k = 'K';
		let pieces_in_danger = [];
		if(c!='white'&&c!='w') k='k';
		this.forEach((t,x,y)=>{
			if(t && t.color != c){
				let moves = t.getPossibleMoves(x,y);
				moves = moves.filter(e=>!(typeof e=='string')).map(e=>this.square(e.x,e.y)).filter(e=>e.letter);
				for(let piece of moves) pieces_in_danger.push(piece.letter);
			}
		});
		return pieces_in_danger.includes(k);
	}
	getSquares(x,y,dx,dy,c,mult=true){
		let squares = [];
		let square;
		for(let i=1;i<8;i++){
			if(i==2 && !mult) break;
			let sx=x+dx*i,sy=y+dy*i;
			let sl = this.square(sx,sy);
			if(sl==-1) break;
			if(sl==0 || sl.color != c){
				squares.push({x:sx,y:sy});
			}
			if(this.square(sx,sy).type) break;
		}
		return squares;
	}
	getPossibleFor(A1){
		let t = XY(A1);
		console.log('possiblities from: '+A1)
		if(this.square(t.x,t.y).type){
			return this.squares[t.y][t.x].getPossibleMoves(t.x,t.y,true);
		}
	}
	get fen(){ // gets fen in current position
		let fen = '';
		for(let y=0;y<8;y++){
			var empty_count = 0;
			for(let x=0;x<8;x++){
				let square = this.squares[y][x]
				if(square){
					if(empty_count != 0){
						fen += empty_count;
						empty_count = 0;
					}
					fen += square.type;
				} else {
					empty_count++;
				}
			}
			if(empty_count != 0){
				fen += empty_count;
				empty_count = 0;
			}
			fen += '/';
		}
		fen = fen.slice(0,-1) + ' ';
		fen += this.turn;
		fen += ' ' + this.castle;
		fen += ' ' + this.enpessant;
		return fen;
	}
	theorize(move_code,make_move=false){ // creates instance of board based on a move from current position
		var nb = new Board(this.fen);
		nb.turn = ot(this.turn);
		if(move_code.toUpperCase() == 'O-O'){
			let r = (this.turn=='w')?7:0;
			nb.squares[r][6] = nb.squares[r][4];
			nb.squares[r][5] = nb.squares[r][7];
			nb.squares[r][4] = null;
			nb.squares[r][7] = null;
			nb.castle = nb.castle.match(/[kq]+/); // remove whites castling rights if white castles
			nb.castle = nb.castle?nb.castle[0]:'';
		} else if (move_code.toUpperCase() == 'O-O-O'){
			let r = (this.turn=='w')?7:0;
			nb.squares[r][2] = nb.squares[r][4];
			nb.squares[r][3] = nb.squares[r][0];
			nb.squares[r][4] = null;
			nb.squares[r][0] = null;
			nb.castle = nb.castle.match(/[KQ]+/); // remove blacks castling rights if black castles
			nb.castle = nb.castle?nb.castle[0]:'';
		} else if (move_code.includes('=')){
			const pt = ['n','b','r','q']
			let p1 = move_code.slice(0,2);
			let p2 = move_code.slice(2,4);
			let p3 = move_code.trim().slice(-1);
			if(p1.length!=2||p2.length!=2||!pt.includes(p3.toLowerCase())){
				console.log('Invalid');
				return;
			}
			let a = XY(p1);
			let b = XY(p2);
			let npcode = nb.squares[a.y][a.x].color=='w'?p3.toUpperCase():p3.toLowerCase();
			nb.squares[b.y][b.x]=new Piece(npcode,this);
			nb.squares[a.y][a.x]=null;
		} else {
			let p1 = move_code.slice(0,2);
			let p2 = move_code.slice(2,4);
			if(p1.length!=2||p2.length!=2){
				console.log('Invalid');
				return;
			}
			let a = XY(p1);
			let b = XY(p2);
			nb.squares[b.y][b.x]=nb.squares[a.y][a.x];
			nb.squares[a.y][a.x]=null;
		}
		// TODO: remove castling rights if the rooks move or are taken, or if the king moves
		if(make_move){
			// cache = {};
			this.lines = [];
			delete exports.board;
			exports.board = nb;
		}
		return nb;
	}
	get valid(){
		return !this.isCheck(ot(this.turn));
	}
	get points(){ // material advantage is calculated
		const points = {p:1,n:3,b:3,q:9,r:5,k:0};
		if(this.pts) return this.pts;
		let wmaterial=0,bmaterial=0;
		for(let s of this.squares.flat()){
			if(s){
				if(s.color=='w'){
					wmaterial += points[s.type.toLowerCase()];
				} else {
					bmaterial += points[s.type.toLowerCase()];
				}
			}
		}
		this.pts = {w:wmaterial,b:bmaterial,o:wmaterial-bmaterial}
		return this.pts;
	}
	generatePossibilities(log=false){
		let move_codes = [];
		this.lines = [];
		this.forEach((t,x,y)=>{ // for each piece, get all movement squares
			if(t&&t.color==this.turn){
				let pos = A1({x,y});
				for(let xy of t.getPossibleMoves(x,y)){
					if(xy.p){
						move_codes.push(pos+A1(xy)+'='+xy.p);
					} else if(typeof xy == 'string'){
						move_codes.push(xy);
					} else {
						move_codes.push(pos+A1(xy));
					}
				}
			}
		});
		let valid_moves = [];
		for(let mc of move_codes){ // for all movements squares, generate a new board if the board is invalid (own's king is in check) board is thrown out, boards saved in hash table (cashe)
			let nb = this.theorize(mc);
			if(nb.valid){
				valid_moves.push(mc);
				if(Object.keys(cache).includes(nb.fen)){
					nb = cache[nb.fen];
					// console.log('State saved in cache')
				} else {
					cache[nb.fen] = nb;
				}
				this.lines.push({mc,fen:nb.fen});
			}
		}
		if(log) console.log('Moves: '+valid_moves.join(','))
		if(valid_moves.length == 0){ // if there are no movement squares the game is over, if king is in check its checkmate else its stalemate
			if(!this.isCheck(this.turn)){
				this.stalemate = true;
				return 'STALEMATE';
			} else {
				this.checkmate = true;
				return 'CHECKMATE';
			}
		}
	}
	async choosePossibilites(depth=1,log=false){
		// depth starts from specified depth and counts down to 1, 
		// if depth is 1, we look at material count
		// if depth is greater than 0, we use the material count from the board based on the move most likely to be made by our opponent
		if(depth <= 3){
			return await this.choosePossibilitesMULTI(depth,log);
		}
		var best_move = '';
		var end_info;
		if(this.apoints && this.adepth > depth){
			console.log('skip');
			return this.bm;
		}
		if(this.lines.length == 0){
			end_info = this.generatePossibilities();
		}
		if(end_info){
			console.log('END SEEN:'+end_info)
			if(end_info == 'STALEMATE'){
				this.apoints = {w:0,b:0,o:0}
			} else if(end_info == 'CHECKMATE'){
				if(this.turn=='b'){
					this.apoints = 1200;
				} else {
					this.apoints = -1200;
				}
				if(log) console.log(this.toString());
			}
			return;
		}
		let ranked_moves = this.lines.sort(()=>Math.random()-.5); // randomize all possible moves to that if there are no best moves any move can occur
		if(depth == 1){
			ranked_moves = ranked_moves.map(m=>{
				return {mc:m.mc,p:cache[m.fen].points.o};
			});
		} else {
			for(let moves of ranked_moves){
				cache[moves.fen].choosePossibilites(depth-1,log);
			}
			ranked_moves = ranked_moves.map(m=>{
				return {mc:m.mc,p:cache[m.fen].apoints};
			});
		}
		let t =this.turn=='w'?.5:-.5;
		ranked_moves = ranked_moves.map(e=>{
			if(e.mc.includes('O')){
				return {mc:e.mc,p:e.p+t};
			} else return e;
		})
		ranked_moves = ranked_moves.sort((a,b)=>b.p-a.p);
		// console.log(`Ranked Moves (depth:${depth}): `+JSON.stringify(ranked_moves));
		let bm;
		if(this.turn=='w'){
			this.apoints = ranked_moves[0].p;
			this.adepth=depth;
			bm = ranked_moves[0].mc;
			this.bm = bm;
			if(depth!=1 && log) console.log(`Best Move (depth ${depth}): ${bm}, points:${this.apoints}`);
			return bm;
		} else {
			this.apoints = ranked_moves[ranked_moves.length-1].p;
			this.adepth=depth;
			bm = ranked_moves[ranked_moves.length-1].mc;
			this.bm = bm;
			if(depth!=1 && log) console.log(`Best Move (depth ${depth}): ${bm}, points:${this.apoints}`);
			return bm;
		}
	}
	async choosePossibilitesMULTI(depth=1,log=false){
		if(depth > 3){
			this.choosePossibilites(depth,log);
			return;
		}
		var best_move = '';
		var end_info;
		if(this.apoints && this.adepth > depth){
			console.log('skip');
			return this.bm;
		}
		if(this.lines.length == 0){
			end_info = this.generatePossibilities(); // store all possible newxt moves in this.lines array
		}
		if(end_info){
			console.log('END SEEN:'+end_info)
			if(end_info == 'STALEMATE'){
				this.apoints = {w:0,b:0,o:0}
			} else if(end_info == 'CHECKMATE'){
				if(this.turn=='b'){
					this.apoints = 1200; // lots of insentive to checkmate / avoid checkmate
				} else {
					this.apoints = -1200;
				}
				console.log(this.toString());
			}
			return;
		}
		let promises = [];
		let ranked_moves = this.lines.sort(()=>Math.random()-.5);
		if(depth == 1){
			ranked_moves = ranked_moves.map(m=>{
				return {mc:m.mc,p:cache[m.fen].points.o};
			});
		} else {
			let cur_fen = moves.fen;
			for(let moves of ranked_moves){
				promises.push(new Promise((res,rej)=>{
					let sub_proc = spawn('node',[__dirname+'\\brancher.js',depth-1,cur_fen]); // spawn a subproccess for each variation of board
					if(log) console.log('starting subproc');
					let waiting = true;
					sub_proc.stdout.on('data',data=>{
						if(log && waiting) console.log('Recieved From SubProc: '+Number(data.toString()));
						if(waiting) cache[moves.fen].apoints = Number(data.toString());
						waiting = false;
						res();
					});
					sub_proc.stderr.on('data',err=>{
						console.log(err.toString());
						rej('Error');
					})
				}));
			}
		}
		return await Promise.all(promises).then(e=>{ // wait for the value of all subproccess before sorting and choosing a move
			let t=this.turn=='w'?.5:-.5;
			if(log) console.log('Recieved All SubProc Responses');
			if(depth != 1){
				ranked_moves = ranked_moves.map(m=>{
					return {mc:m.mc,p:cache[m.fen].apoints};
				});
			}
			ranked_moves = ranked_moves.map(e=>{ // add a half point incentive to castle
				if(e.mc.includes('O')){
					return {mc:e.mc,p:e.p+t};
				} else return e;
			})
			ranked_moves = ranked_moves.sort((a,b)=>b.p-a.p); 
			// sort moves in order of points (all of the best moves for white at beginning and best moves for black at the end)

			// console.log(`Ranked Moves (depth:${depth}): `+JSON.stringify(ranked_moves));
			let bm;
			if(this.turn=='w'){
				this.apoints = ranked_moves[0].p; // we will assume white always makes the best move on blacks turn (0th item in array)
				this.adepth=depth;
				this.bm = bm;
				bm = ranked_moves[0].mc;
				if(depth!=1 && log) console.log(`Best Move (depth ${depth}): ${bm}, points:${this.apoints}`);
				return bm;
			} else {
				this.apoints = ranked_moves[ranked_moves.length-1].p; // we will always assume black makes the best move on whites turn (last item of array)
				this.adepth=depth;
				this.bm = bm;
				bm = ranked_moves[ranked_moves.length-1].mc;
				if(depth!=1 && log) console.log(`Best Move (depth ${depth}): ${bm}, points:${this.apoints}`);
				return bm;
			}
		});
	}
}

exports.board = new Board;
exports.Board = Board;