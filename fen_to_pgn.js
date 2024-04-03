const Chess = require('chess.js').Chess;

function fenToPgn(fenList) {
    let pgnContent = '';

    for (let i = 1; i < fenList.length; i++) {
        const chess = new Chess();
        const prevFen = fenList[i - 1];
        const currFen = fenList[i];
        chess.load(prevFen+' 0 1');

        const move = chess.moves({ verbose: true }).find(move => {
            chess.move(move);
            const fenAfterMove = chess.fen();
            chess.undo();
            return fenAfterMove.split(' ').slice(0,3).join(' ') == currFen.split(' ').slice(0,3).join(' ');
        });

        if (!move) {
            console.error(`Error: Could not determine move between positions ${i} and ${i + 1}`);
            return;
        } else {

        }

        const pgnMove = chess.move(move, { sloppy: true });
        pgnContent += (pgnMove.color=='w'?`${(i+1)/2}. `:'') + pgnMove.san + ' ';
    }

    return pgnContent;
}

exports.toPGN = function(fenstring){
    return fenToPgn(fenstring.split(','));
}
