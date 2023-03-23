let b = require('./matthias_bot.js');
let fen = process.argv;
fen.shift();
fen.shift();
if(fen.length<2){
	console.log('No Fen Found. Exiting');
	process.exit();
}
let depth = Number(fen.shift());
fen = fen.join(' ');
b.board.loadFEN(fen);
async function main(){
	if(depth < 3){
		await b.board.choosePossibilitesMULTI(depth,false);
	} else {
		b.board.choosePossibilites(depth,false);
	}
	console.log(b.board.apoints);
	process.exit();
}
main(); 