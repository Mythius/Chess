let c = require('./iostream.js');
let b = require('./matthias_bot.js');
const DEV = false;

if(DEV) console.log(b);
console.log('Matthias Chess Bot');
console.log('\td to Display');
console.log('\tfen {your fen here} to load position')
console.log('\tm E2E4 to move')
console.log('\tgo (calculates best move)')

async function main(){
	let command = await c.in('');
	if(command == 'q'){
		process.exit();
		return;
	} else if (command == 'd'){
		console.log(b.board.toString());
		console.log(b.board.fen)
		console.log(b.board.turn+' to move');
	} else if (command == 'clear'){
		console.clear();
	} else if (command == 'start'){
		b.board.loadFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -');
	} else if (command == 'go'){
		let mc = await b.board.choosePossibilites(3,DEV);
		console.log('Best Move:'+mc);
	} else if (command == 'eval'){
		let p = b.board.points;
		console.log(`W:${p.w} B:${p.b} O:${p.o}`)
	} else if (command == 'possible'){
		b.board.generatePossibilities(true);
	} else {
		if(!command.includes(' ')){
			console.log('Invalid');
			main();
			return;
		}
		let part1 = command.match(/\w+ /i)[0].trim();
		let part2 = command.match(/ .+/i)[0].trim()
		if(part1 == 'fen'){
			b.board.loadFEN(part2);
		} else if(part1 == 'lp'){
			b.board.getPossibleFor(part2);
		} else if(part1 == 'm'){
			if(part2.includes(' ')){
				part2 = part2.trim().slice(0,2) + part2.match(/ .+/)[0].trim();
			}
			b.board.theorize(part2,true);
		} else if(part1 == 'check'){
			console.log(part2+' is in check: '+b.board.isCheck(part2));
		} else if (part1 == 'best'){
			if(!part2) part2 = 1;
			let mc = await b.board.choosePossibilites(Number(part2),DEV);
			console.log('Best Move:'+mc);
		} else {
			console.log('Invalid');
		}
	}
	main();
}

main();