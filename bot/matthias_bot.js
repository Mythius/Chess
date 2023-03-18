const A1 = t => String.fromCharCode(t.x+65)+(8-t.y);
const XY = A1 => {return{x:A1[0].toUpperCase().charCodeAt(0)-65,y:7-(Number(A1[1])-1)}};
const ot = t => t=='w'?'b':'w';

var cache = {};

class Piece{
	constructor(l,b){
		this.type = l;
		this.color = (l==l.toUpperCase())?'w':'b';
		this.board = b;
	}
	getPossibleMoves(x,y,log=false){
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
		} else if(to == 'p'){
			let dy = this.color=='w'?-1:1;
			let hr = this.color=='w'?6:1;
			let f1 = b.square(x,y+dy);
			let f2 = b.square(x,y+dy*2);
			let l = b.square(x-1,y+dy);
			let r = b.square(x+1,y+dy);
			if(!f1.type){
				pos_sqrs.push({x,y:y+dy});
				if(!f2.type && y==hr){
					pos_sqrs.push({x,y:y+dy*2})
				}
			}
			if(l!=-1&&l!=0&&l.color!=this.color){
				pos_sqrs.push({x:x-1,y:y+dy});
			}
			if(r!=-1&&r!=0&&r.color!=this.color){
				pos_sqrs.push({x:x+1,y:y+dy});
			}
		}
		if(log) console.log(`Moves for ${A1({x,y})} are: `+pos_sqrs.map(e=>A1(e)).join(', '))
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
				moves = moves.map(e=>this.square(e.x,e.y)).filter(e=>e.letter);
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
	get fen(){
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
		/*
			let temp = fen;
			fen += white.castlePriv.toUpperCase();
			fen += black.castlePriv.toLowerCase();
			if(temp == fen) fen += '-';
			fen += ' ' + (en_pessant ? en_pessant.toString() : '-');
		*/
		return fen;
	}
	theorize(move_code,make_move=false){
		let p1 = move_code.slice(0,2);
		let p2 = move_code.slice(2,4);
		if(p1.length!=2||p2.length!=2){
			console.log('Invalid');
			return;
		}
		let nb = new Board(this.fen);
		nb.turn = ot(this.turn);
		if(true){ // normal move
			let a = XY(p1);
			let b = XY(p2);
			nb.squares[b.y][b.x]=nb.squares[a.y][a.x];
			nb.squares[a.y][a.x]=null;
		}
		if(make_move){
			cache = {};
			this.lines = [];
			delete exports.board;
			exports.board = nb;
		}
		return nb;
	}
	get valid(){
		return !this.isCheck(ot(this.turn));
	}
	get points(){
		const points = {p:1,n:3,b:3,q:9,r:5,k:0};
		let wmaterial = this.squares.flat().filter(e=>e&&e.color=='w').map(e=>e.type.toLowerCase()).reduce((a,c)=>points[c]+Number(a),0);
		let bmaterial = this.squares.flat().filter(e=>e&&e.color=='b').map(e=>e.type.toLowerCase()).reduce((a,c)=>points[c]+Number(a),0);
		return {w:wmaterial,b:bmaterial,o:wmaterial-bmaterial};
	}
	generatePossibilities(log=false){
		let move_codes = [];
		this.lines = [];
		this.forEach((t,x,y)=>{
			if(t&&t.color==this.turn){
				let pos = A1({x,y});
				for(let xy of t.getPossibleMoves(x,y)){
					move_codes.push(pos+A1(xy));
				}
			}
		});
		let valid_moves = [];
		for(let mc of move_codes){
			let nb = this.theorize(mc);
			if(nb.valid){
				valid_moves.push(mc);
				if(Object.keys(cache).includes(nb.fen)){
					nb = cache[nb.fen];
					console.log('State saved in cache')
				} else {
					cache[nb.fen] = nb;
				}
				this.lines.push({mc,fen:nb.fen});
			}
		}
		if(log) console.log('Moves: '+valid_moves.join(','))
		if(valid_moves.length == 0){
			if(this.isCheck(this.turn)){
				this.stalemate = true;
				return 'STALEMATE';
			} else {
				this.checkmate = 'L';
				return '#L';
			}
		}
		// if(log) console.log('Moves: '+move_codes.join(','))
	}
	choosePossibilites(depth=1){
		var best_move = '';
		var end_info;
		// if(this.apoints && this.adepth > depth){
		// 	console.log('skip');
		// 	return;
		// }
		if(this.lines.length == 0){
			end_info = this.generatePossibilities();
		}
		if(end_info) return;
		let ranked_moves = this.lines.sort(()=>Math.random()-.5);
		if(depth == 1){
			ranked_moves = ranked_moves.map(m=>{
				return {mc:m.mc,p:cache[m.fen].points.o};
			});
		} else {
			for(let moves of ranked_moves){
				cache[moves.fen].choosePossibilites(depth-1);
			}
			ranked_moves = ranked_moves.map(m=>{
				return {mc:m.mc,p:cache[m.fen].apoints};
			});
		}
		ranked_moves = ranked_moves.sort((a,b)=>b.p-a.p)
		// console.log(`Ranked Moves (depth:${depth}): `+JSON.stringify(ranked_moves));
		let bm;
		if(this.turn=='w'){
			this.apoints = ranked_moves[0].p;
			this.adepth=depth;
			bm = ranked_moves[0].mc;
			console.log(`Best Move (depth ${depth}): ${bm}, points:${this.apoints}`);
			return bm;
		} else {
			this.apoints = ranked_moves[ranked_moves.length-1].p;
			this.adepth=depth;
			bm = ranked_moves[ranked_moves.length-1].mc;
			console.log(`Best Move (depth ${depth}): ${bm}, points:${this.apoints}`);
			return bm;
		}
	}
}

exports.board = new Board;
