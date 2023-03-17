const A1 = t => String.fromCharCode(t.x+65)+(8-t.y);
const XY = A1 => {return{x:A1[0].toUpperCase().charCodeAt(0)-65,y:7-(Number(A1[1])-1)}};

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
		/*
			fen += (turn==-1?'w':'b')+' ';
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
		if(true){ // normal move
			let a = XY(p1);
			let b = XY(p2);
			nb.squares[b.y][b.x]=nb.squares[a.y][a.x];
			nb.squares[a.y][a.x]=null;
		}
		if(make_move){
			delete exports.board;
			exports.board = nb;
		}
	}
}

exports.board = new Board;
