const socket = io();
const canvas = obj('canvas');
ChessGame.load(canvas);

let white_time,black_time;


setInterval(e=>{
	obj('#gamedata').innerHTML = 'White Time: '+msm(white_time)+'Black Time: '+msm(black_time)+'<br>';
	obj('#gamedata').innerHTML += 'Moves:<br>'+ChessGame.moves.join('<br>');
	if(ChessGame.moves.length % 2 == 0){
		if(countdown) white_time--;
	} else {
		if(countdown) black_time--;
	}
},1000/30);

function start(){
	ChessGame.stop();
	setTimeout(()=>{
		black_time = 10 * 60 * 1000/30;
		white_time = 10 * 60 * 1000/30;
		ChessGame.start();
	},500);
}

function msm(milli){
	let time = Math.round(milli / (1000/30));
	let seconds = time % 60;
	let minutes = Math.floor(time / 60);
	return `${minutes}:${('00'+seconds).slice(-2)}<br>`;
}

Touch.init(data=>{
	console.log(data);
	mouse.pos.x = data.pos.x;
	mouse.pos.y = data.pos.y;
	mouse.down = true;
	setTimeout(e=>{
		mouse.down = false;
	},300);
});

function flip(){
	ChessGame.flipBoard();
}


var expanded = false;
function expand(){
	if(expanded){
		obj('expand').style.display='none';
		obj('#toggle').innerHTML = 'More';
		expanded = false;
	} else {
		obj('expand').style.display='initial';
		obj('#toggle').innerHTML = 'Less';
		expanded = true;
	}
}

function copyFENtoClip(){
	if(!ChessGame.board) return;
	navigator.clipboard.writeText(ChessGame.board.getFEN());
}

function getFEN(){
	let fen = prompt('FEN:');
	if(fen){
		ChessGame.board.loadFEN(fen);
	}
}

var countdown = false;
function toggleClock(){
	countdown = !countdown;
}

function compMove(){
	obj('#compmove').disabled = true;
	socket.emit('calcMove',ChessGame.board.getFEN());
}

socket.on('move',move=>{
	obj('#compmove').disabled = false;
	ChessGame.makeMove(move);
});

var puzzles = [];
xml('assets/m8n2.txt',data=>{
	puzzles = data.split('\n').filter(e=>e.split(' ')[0].match(/\//));
	// puzzles = data.split('\n').filter(e=>e.match(/\//));
});

function loadRandomPuzzle(){
	let r = random(0,puzzles.length-1);
	ChessGame.board.loadFEN(puzzles[r]);
}
