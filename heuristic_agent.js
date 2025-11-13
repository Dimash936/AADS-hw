// Heuristic evaluation function
function evaluateBoard(board) {
    let maxH = 0;
    let aggregateHeight = 0;
    let completeLines = 0;
    let holes = 0;
    let bumpiness = 0;
    let columnHeights = new Array(nx).fill(0);

    // Calculate aggregate height and column heights
    for (let x = 0; x < nx; x++) {
        for (let y = 0; y < ny; y++) { 
            if (board[x][y] !== 0) {
                columnHeights[x] = ny - y;
                maxH = Math.max(maxH, ny - y);
                aggregateHeight += columnHeights[x];
                break;
            }
        }
    }

    // Calculate complete lines
    let cons = 0;
    for (let y = 0; y < ny; y++) {
        var complete = true;
        for (let x = 0; x < nx; x++) {
            if (board[x][y] === 0) {
                complete = false;
                break;
            }
        }
        if (complete) {
            completeLines += 1;
            cons += 1;
        } else {
            if(cons > 1) completeLines += (cons - 1) * 0.5;
            cons = 0;
        }
    }
    if(cons > 1) completeLines += (cons - 1) * 0.5;
    // Calculate holes
    for (let x = 0; x < nx; x++) {
        let blockFound = false;
        for (let y = 0; y < ny; y++) {
            if (board[x][y] !== 0) {
                blockFound = true;
            } else if (blockFound && board[x][y] === 0) {
                holes += 1 + (ny - y) * 0.1;
            }
        }
    }
    // Calculate bumpiness
    for (let x = 0; x < nx - 1; x++) {
        bumpiness += Math.abs(columnHeights[x] - columnHeights[x + 1]);
    }
    let wells = 0;
    // Wells
    for (let x = 0; x < nx; x++) {
        let leftHeight = x > 0 ? columnHeights[x - 1] : ny;
        let rightHeight = x < nx - 1 ? columnHeights[x + 1] : ny;
        let currentHeight = columnHeights[x];
        
        if (currentHeight < leftHeight && currentHeight < rightHeight) {
            let wellDepth = Math.min(leftHeight, rightHeight) - currentHeight;
            wells += wellDepth * wellDepth;
        }
    }
    return -0.51 * aggregateHeight + completeLines * 0.76 - 0.35 * holes
            - 0.18 * bumpiness - wells * 0.3 - 0.23 * maxH;
}

// Function to deep copy the blocks array
function copyBlocks(blocks) {
    let new_blocks = [];
    for (let x = 0; x < nx; x++) {
        new_blocks[x] = [];
        for (let y = 0; y < ny; y++) {
            new_blocks[x][y] = blocks[x][y];
        }
    }
    return new_blocks;
}

function copyPiece(piece) {
    pieceNew = Object.assign({}, piece);;
    return pieceNew;
}
// Generate all possible moves for the current piece
function getPossibleMoves(piece) {
    let moves = [];
    // For each rotation of the piece
    for (let dir = 0; dir < 4; dir++) {
        for (let x = 0; x < nx; x++) {
            let pieceNew = copyPiece(piece);
            pieceNew.dir = dir;
            if(occupied(pieceNew.type, x, 0, pieceNew.dir)) continue;
            let y = getDropPosition(pieceNew, x);
            let new_blocks = copyBlocks(blocks);
            eachblock(piece.type, x, y, pieceNew.dir, function(x, y) {
                new_blocks[x][y] = pieceNew.type;
            });
            moves.push({piece: pieceNew, x: x, y: y, board: new_blocks});
        }
    }
    return moves;
}

function getPossibleMovesOnBoard(piece, board) {
    let moves = [];

    for (let dir = 0; dir < 4; dir++) {
        for (let x = 0; x < nx; x++) {

            let pieceNew = copyPiece(piece);
            pieceNew.dir = dir;

            if (occupiedOnBoard(pieceNew.type, x, 0, pieceNew.dir, board))
                continue;

            let y = getDropPositionOnBoard(pieceNew, x, board);

            let new_board = copyBlocks(board);
            eachblock(pieceNew.type, x, y, pieceNew.dir, (xx, yy) => {
                new_board[xx][yy] = pieceNew.type;
            });

            moves.push({
                piece: pieceNew,
                x: x,
                y: y,
                board: new_board
            });
        }
    }

    return moves;
}

function selectBestMove(piece, board) {
    let moves = getPossibleMoves(piece);
    let bestMove = null;
    let bestScore = -Infinity;
    moves.forEach(move => {
        let score = evaluateBoard(move.board);
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    });
    return bestMove;
}
function beamSearch(piece, nextPiece, beamWidth = 5, depth = 2) {
    let bestMove = null;
    let bestScore = -Infinity;
    
    // Get all possible moves for current piece on current board
    let currentMoves = getPossibleMoves(piece);
    
    // If we're at depth 1, just use regular heuristic
    if (depth === 1) {
        return selectBestMove(piece);
    }
    
    // For each current move, evaluate with next piece
    for (let move of currentMoves) {
        let currentScore = evaluateBoard(move.board);
        
        // If we have depth > 1, consider next piece
        if (depth > 1 && nextPiece) {
            let nextMoves = getPossibleMoves(nextPiece, move.board);
            
            if (nextMoves.length > 0) {
                // Take best move for next piece
                let bestNextScore = -Infinity;
                for (let nextMove of nextMoves) {
                    let nextScore = evaluateBoard(nextMove.board);
                    if (nextScore > bestNextScore) {
                        bestNextScore = nextScore;
                    }
                }
                
                // Add the best next move score to current score
                currentScore += bestNextScore * 0.7; // Discount factor for future moves
            }
        }
        
        if (currentScore > bestScore) {
            bestScore = currentScore;
            bestMove = move;
        }
    }
    
    return bestMove || selectBestMove(piece); // Fallback to simple agent
}
// Function to get the drop position of the piece
function getDropPosition(piece, x) {
    let y = 0;
    while (!occupied(piece.type, x, y + 1, piece.dir)) {
        y++;
    }
    return y;
}

function getDropPositionOnBoard(piece, x, board) {
    let y = 0;
    while (!occupiedOnBoard(piece.type, x, y + 1, piece.dir, board)) {
        y++;
    }
    return y;
}
