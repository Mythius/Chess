(function(global){
	const ChessGame = {};
	global.ChessGame = ChessGame;

	var canvas,ctx,board,drawable=[],black,white;
	var playing = false;

	var flipped = true;
	var current_piece = null;
	var turn = -1;
	var black_view = false;
	var moves = [];
	var flip_black = false;

	var en_pessant = null;

	function loadIMG(src){
		let i = new Image(60);
		i.src = src;
		return i;
	}

	function pawnFilter(squares,mycolor,mustkill=false){
		return squares.filter(square=>{
			if(!square) return false;
			if(square.piece && (square.piece.color != mycolor) && mustkill) return true;
			if(square.ENP && mustkill) return true;
			if(!mustkill && !square.piece) return true;
			return false;
		});
	}

	function promotion(pawn,square){
		let color = pawn.side.color[0];
		return new Promise((res,rej)=>{
			let prombox = create('div');
			let pos = square.getCenter();
			if(black_view){
				pos.x = canvas.width - pos.x;
				pos.y = canvas.height - pos.y;
			}
			prombox.style.left = pos.x+canvas.offsetLeft-board.scale/2+'px';
			prombox.style.top = pos.y+canvas.offsetTop-board.scale/2+'px';
			prombox.classList.add('promotion');
			let q = loadIMG(`assets/${color}q.svg`);
			let r = loadIMG(`assets/${color}r.svg`);
			let b = loadIMG(`assets/${color}b.svg`);
			let n = loadIMG(`assets/${color}n.svg`);
			prombox.appendChild(q);
			prombox.appendChild(r);
			prombox.appendChild(b);
			prombox.appendChild(n);
			canvas.parentElement.appendChild(prombox);
			q.on('click',e=>{ prombox.remove(); pawn.element.src=q.src; res('q'); });
			r.on('click',e=>{ prombox.remove(); pawn.element.src=r.src; res('r'); });
			b.on('click',e=>{ prombox.remove(); pawn.element.src=b.src; res('b'); });
			n.on('click',e=>{ prombox.remove(); pawn.element.src=n.src; res('n'); });
		});
	}

	class Side{
		constructor(color,deltaY=1){
			this.color = color;
			this.pieces = [];
			this.deltaY = deltaY;
			let hr = deltaY==1?0:7;
			this.homeRow = hr;
			for(let i=0;i<8;i++){
				let row = hr+deltaY;
				this.addPiece('p',i,row);
			}
			this.kCastle = true;
			this.qCastle = true;
			this.addPiece('r',0,hr);
			this.addPiece('r',7,hr);
			this.addPiece('n',1,hr);
			this.addPiece('n',6,hr);
			this.addPiece('b',2,hr);
			this.addPiece('b',5,hr);
			this.addPiece('k',4,hr);
			this.addPiece('q',3,hr);
		}
		addPiece(p,x,y){
			let piece = new Piece(p.toLowerCase(),this);
			piece.moveTo(board.getTileAt(x,y),true);
			this.pieces.push(piece);
			drawable.push(piece);
		}
		isInCheck(){
			let other_side = black == this ? white : black;
			let other_pieces = other_side.pieces;
			let pieces_in_danger = other_pieces.map(piece=>piece.getPossibleMoves(false)).flat();
			// array of squares that opponent can move to

			let in_check = false;
			for(let square of pieces_in_danger){
				in_check |= (square.piece && square.piece.type == 'k');
			}
			return in_check;
		}
		get castlePriv(){
			return (this.kCastle ? 'K' : '') + (this.qCastle ? 'Q' : '');
		}
	}

	class Piece extends Sprite{
		constructor(type,side){
			super('assets/'+side.color[0]+type+'.svg');
			this.transformX = 1.5;
			this.square = null;
			this.side = side;
			this.color = side.color;
			this.type = type;
			this.promoted = false;
		}
		async moveTo(square,setup=false,record=true){
			let dat = '';
			if(!square){
				console.error('Tried to Move to Invalid Square');
				return;
			}
			if(this.type == 'p' && this.promoted){
				turn *= -1;
				return;
			}
			if(this.type == 'p' && square.ENP){
				board.getTileAt(square.x,this.square.y).piece.capture();
			}
			if(en_pessant){
				en_pessant.ENP = false;
				en_pessant = null;
			}
			if(!setup && this.type == 'p' && Math.abs(this.square.y - square.y) == 2){
				en_pessant = board.getTileAt(this.square.x,this.square.y+this.side.deltaY);
				en_pessant.ENP = true;
			}
			if(this.square && !square.CASTELING && record){
				dat += this.square.toString() + square.toString();
				moves.push(dat);
			}
			if(square.CASTELING){
				let kingside = square.x == 6;
				if(kingside){
					let rook = board.getTileAt(7,this.side.homeRow).piece;
					if(!rook) console.error('INVALID CASTELING FIX CODE');
					rook.moveTo(board.getTileAt(5,this.side.homeRow),false,false);
					moves.push('O-O');
				} else {
					let rook = board.getTileAt(0,this.side.homeRow).piece;
					if(!rook) console.error('INVALID CASTELING FIX CODE');
					rook.moveTo(board.getTileAt(3,this.side.homeRow),false,false);
					moves.push('O-O-O');
				}
			}
			if(this.type == 'k' && !setup){
				this.side.kCastle = false;
				this.side.qCastle = false;
			}
			if(this.type == 'r' && this.square){
				if(this.square.y == this.side.homeRow && this.square.x == 0){
					this.side.qCastle = false;
				} else if(this.square.y == this.side.homeRow && this.square.x == 7) {
					this.side.kCastle = false;
				}
			}
			if(this.type == 'p' && square.y == (7-this.side.homeRow) && !this.promoted){
				this.promoted = true;
				let type = await promotion(this,square);
				moves[moves.length-1] += '=' + type;
				this.type = type;
			}
			if(square.piece) square.piece.capture();
			if(this.square) this.square.piece = null;
			this.square = square;
			this.square.piece = this;
			let ct = square.getCenter();
			this.position = new Vector(ct.x,ct.y);
		}
		getPossibleMoves(include_casteling=true){
			let squares = [];
			let temporary = [];
			let tile = this.square;
			if(this.type == 'p'){
				temporary.push(board.getTileAt(tile.x,tile.y+this.side.deltaY));
				squares = pawnFilter(temporary,this.color,false);
				if(this.square.y == this.side.homeRow+this.side.deltaY && squares.length == 1) temporary.push(board.getTileAt(tile.x,tile.y+this.side.deltaY*2));
				squares = squares.concat(pawnFilter(temporary,this.color,false));
				temporary = [];
				temporary.push(board.getTileAt(tile.x+1,tile.y+this.side.deltaY));
				temporary.push(board.getTileAt(tile.x-1,tile.y+this.side.deltaY));
				squares = squares.concat(pawnFilter(temporary,this.color,true));
			} else if(this.type == 'r'){
				squares = squares.concat(board.getSquares(tile.x,tile.y,0,1,this.color,true));
				squares = squares.concat(board.getSquares(tile.x,tile.y,0,-1,this.color,true));
				squares = squares.concat(board.getSquares(tile.x,tile.y,-1,0,this.color,true));
				squares = squares.concat(board.getSquares(tile.x,tile.y,1,0,this.color,true));
			} else if(this.type == 'n'){
				squares = squares.concat(board.getSquares(tile.x,tile.y,2,1,this.color,false));
				squares = squares.concat(board.getSquares(tile.x,tile.y,2,-1,this.color,false));
				squares = squares.concat(board.getSquares(tile.x,tile.y,-2,1,this.color,false));
				squares = squares.concat(board.getSquares(tile.x,tile.y,-2,-1,this.color,false));
				squares = squares.concat(board.getSquares(tile.x,tile.y,1,2,this.color,false));
				squares = squares.concat(board.getSquares(tile.x,tile.y,-1,2,this.color,false));
				squares = squares.concat(board.getSquares(tile.x,tile.y,1,-2,this.color,false));
				squares = squares.concat(board.getSquares(tile.x,tile.y,-1,-2,this.color,false));
			} else if(this.type == 'b'){
				squares = squares.concat(board.getSquares(tile.x,tile.y,1,1,this.color,true));
				squares = squares.concat(board.getSquares(tile.x,tile.y,1,-1,this.color,true));
				squares = squares.concat(board.getSquares(tile.x,tile.y,-1,1,this.color,true));
				squares = squares.concat(board.getSquares(tile.x,tile.y,-1,-1,this.color,true));
			} else if(this.type == 'q'){
				squares = squares.concat(board.getSquares(tile.x,tile.y,0,1,this.color,true));
				squares = squares.concat(board.getSquares(tile.x,tile.y,0,-1,this.color,true));
				squares = squares.concat(board.getSquares(tile.x,tile.y,-1,0,this.color,true));
				squares = squares.concat(board.getSquares(tile.x,tile.y,1,0,this.color,true));
				squares = squares.concat(board.getSquares(tile.x,tile.y,1,1,this.color,true));
				squares = squares.concat(board.getSquares(tile.x,tile.y,1,-1,this.color,true));
				squares = squares.concat(board.getSquares(tile.x,tile.y,-1,1,this.color,true));
				squares = squares.concat(board.getSquares(tile.x,tile.y,-1,-1,this.color,true));
			} else if(this.type == 'k'){
				squares = squares.concat(board.getSquares(tile.x,tile.y,0,1,this.color,false));
				squares = squares.concat(board.getSquares(tile.x,tile.y,0,-1,this.color,false));
				squares = squares.concat(board.getSquares(tile.x,tile.y,-1,0,this.color,false));
				squares = squares.concat(board.getSquares(tile.x,tile.y,1,0,this.color,false));
				squares = squares.concat(board.getSquares(tile.x,tile.y,1,1,this.color,false));
				squares = squares.concat(board.getSquares(tile.x,tile.y,1,-1,this.color,false));
				squares = squares.concat(board.getSquares(tile.x,tile.y,-1,1,this.color,false));
				squares = squares.concat(board.getSquares(tile.x,tile.y,-1,-1,this.color,false));
				if(include_casteling) squares = squares.concat(canCastle(this));
			}
			return squares;
		}
		capture(){
			if(this.type == 'r' && this.square){
				if(this.square.y == this.side.homeRow && this.square.x == 0){
					this.side.qCastle = false;
				} else if(this.square.y == this.side.homeRow && this.square.x == 7) {
					this.side.kCastle = false;
				}
			}
			let ix = drawable.indexOf(this);
			if(ix != -1) {
				drawable.splice(ix,1);
			}
			ix = this.side.pieces.indexOf(this);
			if(ix != -1) {
				this.side.pieces.splice(ix,1);
			}

		}
		get letter(){
			if(this.side == black){
				return this.type.toLowerCase();
			} else {
				return this.type.toUpperCase();
			}
		}
	}

	var board_instances = [];

	class ChessBoard extends Grid{
		constructor(){
			super(8,8,canvas.width/8);
			this.forEach(tile=>{
				tile.color = (tile.x%2^tile.y%2)===1?'#444':'white';
			});
		}
		draw(){
			this.forEach(tile=>{
				tile.draw();
			});
		}
		getSquares(x,y,dx,dy,mycolor,mult=true){
			let squares = [];
			let tile;
			for(let i=1;i<8;i++){
				if(i==2 && !mult) break;
				let tile = this.getTileAt(x+dx*i,y+dy*i);
				if(!tile || tile.piece?.color == mycolor) break;
				if(tile){
					squares.push(tile);
				}
				if(tile.piece) break;
			}
			return squares;
		}
		getSquareFromCode(code){
			let x = code.charCodeAt(0)-65;
			let y = 7-(Number(code[1])-1);
			return this.getTileAt(x,y);
		}
		getFEN(){
			let fen = '';
			for(let row=0;row<this.height;row++){
				var empty_count = 0;
				for(let cell=0;cell<this.width;cell++){
					let square = this.getTileAt(cell,row);
					if(square.piece){
						if(empty_count != 0){
							fen += empty_count;
							empty_count = 0;
						}
						fen += square.piece.letter;
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
			fen += (turn==-1?'w':'b')+' ';
			let temp = fen;
			fen += white.castlePriv.toUpperCase();
			fen += black.castlePriv.toLowerCase();
			if(temp == fen) fen += '-';
			fen += ' ' + (en_pessant ? en_pessant.toString() : '-');
			return fen;
		}
		// EXAMPLE FEN: rnbqkbnr/ppp1pppp/8/3p4/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -
		loadFEN(fen){
			this.forEach(tile=>{tile.piece=null;});
			let arr = fen.split(' ');//.filter(e=>e.length);
			let board = arr[0].split('/');
			if(board_instances.length == 0 || board_instances[board_instances.length-1] != fen){
				board_instances.push(fen);
			}
			drawable = [this];
			white.pieces = [];
			black.pieces = [];
			for(let row=0;row<this.height;row++){
				let row_text = board[row];
				let i=0;
				for(let cell=0;cell<this.width;cell++){
					if(row_text[i].match(/\d/)){
						cell += Number(row_text[i])-1;
					} else {
						if(row_text[i].charCodeAt(0) > 92){
							black.addPiece(row_text[i],cell,row);
						} else {
							white.addPiece(row_text[i],cell,row);
						}
					}
					i++;
				}
			}
			turn = arr[1] == 'b' ? 1 : -1;
			let whiteCastlePriv = arr[2].match(/[A-Z]/g);
			white.kCastle = false;
			white.qCastle = false;
			if(whiteCastlePriv){
				for(let priv of whiteCastlePriv){
					if(priv == 'K'){
						white.kCastle = true;
					} else {
						white.qCastle = true;
					}
				}
			}
			let blackCastlePriv = arr[2].match(/[a-z]/g);
			black.kCastle = false;
			black.qCastle = false;
			if(blackCastlePriv){
				for(let priv of blackCastlePriv){
					if(priv == 'k'){
						black.kCastle = true;
					} else {
						black.qCastle = true;
					}
				}
			}
			if(arr[3] != '-'){
				en_pessant = this.getSquareFromCode(arr[3]);
				en_pessant.ENP = true;
			}
		}
	}

	Tile.prototype.draw = function(){
		ctx.beginPath();
		let ct = this.getCenter();
		let s = this.grid.scale;
		ctx.save();
		ctx.translate(ct.x,ct.y);
		if(black_view){
			ctx.rotate(Math.PI);
		}
		ctx.rect(-s/2,-s/2,s,s);
		ctx.fillStyle = this.color;
		ctx.fill();
		if(ChessGame.showCoords){
			ctx.beginPath();
			ctx.fillStyle = this.color=='white'?'#444':'white';
			ctx.fillText(this.toString(),-s/2,-s/3);
			ctx.fill();
		}
		if(this.isOption){
			ctx.beginPath();
			ctx.strokeStyle = this.color=='white'?'#444':'white';
			ctx.fillStyle = this.color=='white'?'#444':'white';
			ctx.lineWidth = 8;
			ctx.arc(0,0,this.piece?board.scale/3:10,0,Math.PI*2);
			if(this.piece) ctx.stroke();
			else ctx.fill();
		}
		this.isOption = false;
		this.CASTELING = false;
		ctx.restore();
	}

	Tile.prototype.toString = function(){ return `${String.fromCharCode((this.x)+65)}${(7-this.y)+1}`; }

	Tile.prototype.piece = null;
	Tile.prototype.isOption = false;

	async function controls(){
		let square;
		if(black_view){
			square = board.getActiveTile(canvas.width-mouse.pos.x,canvas.height-mouse.pos.y);
		} else {
			square = board.getActiveTile();
		}
		if(current_piece){
			let moves = current_piece.getPossibleMoves();
			for(let square of moves) square.isOption = true;
		}
		if(square){
			if(mouse.down && square.piece && square.piece.side.deltaY == turn){
				current_piece = square.piece;
				mouse.down = false;
			} else if(mouse.down && square.isOption){
				await current_piece.moveTo(square);
				if(current_piece.side.isInCheck()){
					goBack();
				} else {
					turn *= -1;
					audio.play('assets/click.wav',false,.5);
					board_instances.push(board.getFEN());
				}
				current_piece = null;
				mouse.down = false;
			} else if(mouse.down) {
				current_piece = null;
			}
		}
		if(keys.down('f')){
			keys.keys['f'] = false;
			black_view = !black_view;
		}
	}

	function start(){
		playing = true;
		moves = [];
		ChessGame.moves = moves;
		board_instances = [];
		ChessGame.instances = board_instances;
		drawable = [];
		turn = -1;
		current_piece = null;
		en_pessant = null;
		board = new ChessBoard;
		drawable.push(board);
		black = new Side('black',1);
		white = new Side('white',-1);
		ChessGame.board = board;
		ChessGame.drawable = drawable;
		board_instances.push(board.getFEN());
		loop();
	}

	function goBack(forceout=false){
		if(board_instances.length > 1){
			moves.pop();
			let instance = board_instances[board_instances.length-(forceout?2:1)];
			if(forceout){
				board_instances.pop();	
				board_instances.pop();
			}
			board.loadFEN(instance);
		}
	}

	function canCastle(king){
		let squares = [];
		if(king.side.isInCheck()) return false;
		if(king.side.kCastle){
			let open = true;
			open &= !board.getTileAt(5,king.side.homeRow).piece;
			open &= !board.getTileAt(6,king.side.homeRow).piece;
			if(board.getTileAt(7,king.side.homeRow).piece){
				let rook = board.getTileAt(7,king.side.homeRow).piece;
				// open &= rook.type == 'r';
			} else {
				open = false;
			}
			if(open){
				let square = board.getTileAt(6,king.side.homeRow);
				square.CASTELING = true;
				squares.push(square);
			}
		}
		if(king.side.qCastle){
			let open = true;
			open &= !board.getTileAt(1,king.side.homeRow).piece;
			open &= !board.getTileAt(2,king.side.homeRow).piece;
			open &= !board.getTileAt(3,king.side.homeRow).piece;
			if(board.getTileAt(0,king.side.homeRow).piece){
				open &= board.getTileAt(0,king.side.homeRow).piece.type == 'r';
			} else {
				open = false;
			}
			if(open){
				let square = board.getTileAt(2,king.side.homeRow);
				square.CASTELING = true;
				squares.push(square);
			}
		}
		return squares;
	}

	async function loop(){
		await controls();
		ctx.clearRect(-2,-2,canvas.width+2,canvas.height+2);
		if(playing) setTimeout(loop,1000/30);
		ctx.save();
		// ctx.translate(.5,.5);
		if(black_view){
			ctx.rotate(Math.PI);
			ctx.translate(-canvas.width,-canvas.height);
		}
		for(let thing of drawable){
			if(thing instanceof Piece){
				if(black_view){
					thing.direction = 180;
					if(thing.color=='white' && flip_black){
						thing.direction = thing.dir + 180;
					}
				} else {
					thing.direction = 0;
					if(thing.color=='black' && flip_black){
						thing.direction = thing.dir + 180;
					}
				}
			}
			thing.draw();
		}
		ctx.restore();
	}

	function stop(){
		playing = false;
	}

	function load(canv){
		canvas = canv;
		ctx = canvas.getContext('2d');
		global.canvas = canvas;
		global.ctx = ctx;
		mouse.start(canv);
		keys.start();
		ctx.font = '20px monospace';
	}

	ChessGame.load = load;
	ChessGame.start = start;
	ChessGame.stop = stop;
	ChessGame.moves = moves;
	ChessGame.showCoords = false;
	ChessGame.instances = board_instances;
	ChessGame.flipBoard = function(){
		black_view = !black_view;
	}
	ChessGame.flipBlack = function(){
		flip_black = !flip_black;
	}
	ChessGame.makeMove = async function(move){
		if(move.includes('O')){
			if(turn < 0){ // white
				if(move == 'O-O'){
					move = 'E1G1';
				} else {
					move = 'E1C1';
				}
			} else { // black;
				if(move == 'O-O'){
					move = 'E8G8';
				} else {
					move = 'E8C8';
				}
			}
		}
		current_piece = board.getSquareFromCode(move.slice(0,2)).piece;
		let square = board.getSquareFromCode(move.slice(2,4));
		let moves = current_piece.getPossibleMoves();
		await current_piece.moveTo(square);
		if(current_piece.side.isInCheck()){
			goBack();
		} else {
			board_instances.push(board.getFEN());
		}
		audio.play('assets/click.wav',false,.5);
		current_piece = null;
		turn *= -1;
		mouse.down = false;
	}
	ChessGame.goBack = goBack;
})(this);