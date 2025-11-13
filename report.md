## Report
### Bugs 
- Ambiguous definition of empty cells

    in `removeLine` function
    ```javascript
    var x, y;
    for(y = n ; y >= 0 ; --y) {
        for(x = 0 ; x < nx ; ++x)   
            setBlock(x, y, (y == 0) ? null : getBlock(x, y-1));
    }
    ```
    The game uses $0$ to represent empty cells, but null was used in removeLine function, causing inconsistency

    changed code
    ```javascript
    var x, y;
    for(y = n ; y >= 0 ; --y) {
        for(x = 0 ; x < nx ; ++x)
            setBlock(x, y, (y == 0) ? 0 : getBlock(x, y-1));
    }
    ```

- Wrong bounds for possible drop $x$ coordinates 

    in `getPossibleMoves` function, the following loop
        
    ```
    for (let x = 0; x < nx - piece.type.size; x++)
    ```
    assumes all pieces have uniform size, but rotated pieces can have different effective widths.
    
    I decided to consider all possible drop $x$ coordinates from $0$ to $nx - 1$ but only if i can put it from position $(x, 0)$. 

    So simply adding this line 

    `if(occupied(pieceNew.type, x, 0, pieceNew.dir)) continue;`
    
    and changing line with for lopp to 

    `for (let x = 0; x < nx; x++)`

    resolved problem
- All possible moves stored incorrectly

    In `getPossibleMoves` function 

    ```
    moves.push({piece: piece, x: x, y: y, board: new_blocks});
    ```
    in this line it uses not object piece but iterator to this object. So, when object `piece` is same for all elements of `moves`

    I wrote a function to return copy of object `piece`

    ```javascript
    function copyPiece(piece) {
        pieceNew = Object.assign({}, piece);;
        return pieceNew;
    }
    ```

    and only used copy of `piece` in `getPossibleMoves` function

    ```javascript
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
    ```
- `aggregateHeight` and `columnHeights` calculated incorrectly
    
    In `evaluateBoard` function, to calculate `aggregateHeight` was written something like this
    ```javascript
    for (let y = 0; y < ny; y++) {
        for (let x = 0; x < nx; x++) {
            ...
        }
    }
    ```

    But we want to find some values for each column so order of $x, y$ is swapped, so i changed it to:
    ```javascript
    for (let x = 0; x < nx; x++) {
        for (let y = 0; y < ny; y++) {
            ...
        }
    }
    ```
### Improving current heuristic agent
- `completeLines` only calculates number of lines will be deleted, but when calculating score we have additional points for deleting several lines once at time.
    
    So, lets for each `k` consecutive lines will be deleted add `(k - 1) * 0.5` to `completeLines`
- The higher the hole, the worse it is so lets add additional penalty for them, but so that its influence is not so great try adding with coeficient $0.1$

    So for whole at height $(y)$

    `holes += 1 + (ny - y) * 0.1;`

    $+1$ is to maintain total number of holes
- New feature `maxH`, i do not  want to have my pieces to high so lets define new feature maximum height of non empty cell and substract it from value of board with coefficient $0.23$ 
- New feature `wells`, it is reallyyy hard to get rid of too deep wells so they should also be considered and penalized quadratically, after trying some coeficients $0.3$ seem to be quite optimal for this.
    ```javascript
        for (let x = 0; x < nx; x++) {
            let leftHeight = x > 0 ? columnHeights[x - 1] : ny;
            let rightHeight = x < nx - 1 ? columnHeights[x + 1] : ny;
            let currentHeight = columnHeights[x];
            
            if (currentHeight < leftHeight && currentHeight < rightHeight) {
                let wellDepth = Math.min(leftHeight, rightHeight) - currentHeight;
                wells += wellDepth * wellDepth;
            }
        }
    ```
- **Final heuristic**:  is `-0.51 * aggregateHeight + completeLines * 0.76 - 0.35 * holes
            - 0.18 * bumpiness - wells * 0.3 - 0.23 * maxH`