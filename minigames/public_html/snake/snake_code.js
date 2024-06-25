/*

This file handles Ravenous Rattlers' client functionality
*/


// Set canvas interface context:
const render = document.getElementById("gameBoard").getContext("2d");

// Game Board height and width - used for max / min calculations:
const boardHeight = document.getElementById("gameBoard").height;
const boardWidth = document.getElementById("gameBoard").width;

// Declare color of rival and variables for snake and target pieces:
var snakeBlockColor = "";
var targetBlockColor = ""; 
var rivalBlockColor = "black";


// Sets initial canvas background, creates initial blank board on load
render.fillStyle = "grey";
render.fillRect(0, 0, boardWidth, boardHeight);
// Set initial game state to false, is true when game is active:
var activeGame = false;

// Create snake on start:
var player = [{row: 50, col:0}, {row: 25, col:0}, {row:0, col:0}];
var rival = [{row: 575, col: 0}, {row: 600, col: 0}, {row: 625, col: 0}]

// Direction lengths along canvas x/y-axis (negative = left, up, 0,0 is top left corner)
var xDirect = 25;
var yDirect = 0;
var xtarget;
var ytarget;
var score = 0;

// Allows use of arrows for movement, rather than default page scrolling
window.addEventListener("keydown", inputDirect);

// Button functions to start and reset game, respectively:
function startGame(){
    activeGame = true;
    document.getElementById("scoreText").innerText = score;
    setTargetPos();
    placeTarget();
    loopCheck();
};

function restart(){
    displayHighSnakes()
    score = 0;
    xDirect = 25;
    yDirect = 0;
    player = [{row: 50, col:0}, {row: 25, col:0}, {row:0, col:0}];
    rival = [{row: 575, col: 0}, {row: 600, col: 0}, {row: 625, col: 0}];
    startGame();
};

// Sets Game speed and continuation:
function loopRun() {
    render.clearRect(0, 0, boardWidth, boardHeight);
    placeTarget();
  
    loadSnake();
    renderSnake();

    loadRival();
    renderRival();

    loseConditions();
    loopCheck();
};
// Speed, and game status check:
function loopCheck(){
    if(activeGame == true) {
        setTimeout(loopRun, 100);
    }
};


// Randomizer assistant for target piece:
function randomCoords(min, max) {
    // random(): float between 0 and 1 (exclusive)
    // (max - min + 1): gives range of possible values (+ 1 to be inclusive to the min number)
    // + min: Ensures result is at the least min
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Sets and Places target on canvas:
function setTargetPos() {
    const horizPos = Math.floor(boardWidth / 25);
    const vertPos = Math.floor(boardHeight / 25);
    xtarget = randomCoords(0, horizPos - 1) * 25;
    ytarget = randomCoords(0, vertPos - 1) * 25;
    
};
// Place function for target:
function placeTarget() {
    render.fillStyle = "grey";
    render.fillRect(0, 0, boardWidth, boardHeight);
    render.fillStyle = targetBlockColor;
    render.fillRect(xtarget, ytarget, 25, 25);
    render.strokeRect(xtarget, ytarget, 25, 25);
}

// Logistics for Player snake:
function loadSnake(){
    const head = {row: player[0].row + xDirect, col: player[0].col + yDirect};
    player.unshift(head);
    // if food is eaten
    if(xtarget == player[0].row && ytarget == player[0].col){
        score += 1;
        document.getElementById("scoreText").innerText = score; 
        setTargetPos();
    }
    else{
        player.pop()
    }
};

// Places Player snake on canvas:
function renderSnake(){
    player.forEach(snakeBlock => {
        render.fillStyle = snakeBlockColor;
        render.fillRect(snakeBlock.row, snakeBlock.col, 25, 25);
    });
};

// Logistics for Rival Snake:
function loadRival() {
    if (rival.length <= 1) {
        // If Rival defeated, another pops up (resets):
        rival = [{row: 575, col: 0}, {row: 600, col: 0}, {row: 625, col: 0}];
    } else {
        const rhead = {row: rival[0].row, col: rival[0].col};
        // directs rival toward target:
        if (xtarget != rhead.row) {
            if (xtarget < rhead.row) {
                rhead.row -= 25;
            } else if (xtarget > rhead.row) {
                rhead.row += 25;
            }
        } else {
            if (ytarget < rhead.col) {
                rhead.col -= 25;
            } else if (ytarget > rhead.col) {
                rhead.col += 25;
            }
        }

        rival.unshift(rhead);
        // If rival gets to target, resets the target and maintains an extra segment.
        if (xtarget == rhead.row && ytarget == rhead.col) {
            setTargetPos();
        } else {
            rival.pop();
        }
    }
};

// Places Rival on canvas:
function renderRival() {
    rival.forEach(rivalBlock => {
        render.fillStyle = rivalBlockColor;
        render.fillRect(rivalBlock.row, rivalBlock.col, 25, 25);
    });
};

// Player Input Direction: 
function inputDirect(new_direct){
    new_direct.preventDefault();
    const playerInput = new_direct.keyCode;
    // Left: 37, Up: 38, Right: 39, Down: 40
    switch(true) {
        //Right
        case(playerInput == 39 && !(xDirect == -25)):
            xDirect = 25;
            yDirect = 0;
            break;
        //Left
        case(playerInput == 37 && !(xDirect == 25)):
            xDirect = -25;
            yDirect = 0;
            break;
        //Up
        case(playerInput == 38 && !(yDirect == 25)):
            xDirect = 0;
            yDirect = -25;
            break;
        //Down
        case(playerInput == 40 && !(yDirect == -25)):
            xDirect = 0;
            yDirect = 25;
            break;
    }
};


// Game Over Condition Setting:
function loseConditions() {
    switch(true) {
        case (player.length == 2 || score < 0):
            gameOver();
            break;
        case (player[0].row < 0):
            gameOver();
            break;
        case (player[0].row >= boardWidth):
            gameOver();
            break;
        case (player[0].col < 0):
            gameOver();
            break;
        case (player[0].col >= boardHeight):
            gameOver();
            break;
    };
    // if player intersects rival, lose one segment and score goes down by one
    for (let i = 1; i < rival.length; i++) {
        if (rival[i].row == player[0].row && rival[i].col == player[0].col) {
            score -= 1;
            document.getElementById("scoreText").innerText = score;
            player.pop(); 
        }
        // Ouroboros - Rival is hungry and will eat parts of itself to get to target.
        // Helps Balance it from getting too large, while still being a detriment. 
        else if (rival[i].row == rival[0].row && rival[i].col == rival[0].col) {
            rival.pop();
        }
    }
    // if player intersects self - game over. If rival intersect player, it will lose segments.
    for (let i = 1; i < player.length; i++) {
        if (player[i].row == player[0].row && player[i].col == player[0].col) {
            gameOver();
        }
        else if (player[i].row == rival[0].row && player[i].col == rival[0].col) {
            rival.pop();
        }
    }
};

// Game Over Display:
function gameOver(){
    render.font = "50px Fantasy";
    render.textAlign = "center";
    render.fillStyle = "black";
    render.fillText("Game Over!", boardWidth / 2, boardHeight / 2);
    saveScore();
    activeGame = false;
};

// Handles Player Snake color based on selection, then saves to User's associated Schema:
function snakeChange() {
    snakeBlockColor = document.getElementById("playerColor").value;
    saveColors();
}
// Handles Target color based on selection, then saves to User's associated Schema:
function targetChange() {
    targetBlockColor = document.getElementById("targetColor").value;
    saveColors();
}

// Saves score at end game, and server determines if its highest User's attained.
// If so, it saves it to their associated Score Schema:
function saveScore() {
    let newScore = document.getElementById("scoreText").innerText;

    let p = fetch('/snake/score/', {
        method: 'POST',
        body: JSON.stringify({sendScore: newScore}),
        headers: {'Content-Type' : 'application/json'}
    });
    p.catch(()=>{
        console.log('Error With Score Tracking');
        alert('Save Issue: Score not saved. :( ');
    });
}


// On load function to set colors based on Schema:
function setOrigColors() {
    fetch('/snake/pref/')
    .then(response => response.json())
    .then(results => {
        snakeBlockColor = results[0];
        targetBlockColor = results[1];
        document.getElementById("playerColor").value = results[0];
        document.getElementById("targetColor").value = results[1];

    })
    .catch((error) => {
        console.log(error);
    });
};

// Helper function to save selected colors to Schema:
function saveColors() {
    let psnake = document.getElementById("playerColor").value;
    let ptarget = document.getElementById("targetColor").value;
    let info = {snek: psnake, tar: ptarget};
    //console.log(info);
    let p = fetch('/snake/colors/', {
        method: 'POST',
        body: JSON.stringify(info),
        headers: {'Content-Type' : 'application/json'}
    });
    p.catch(()=>{
        console.log('Error With Color Pref');
        alert('Save Issue: Pref not saved!');
    });
}

// Function handles displaying player's high score - and globally highest five:
function displayHighSnakes() {
    fetch('/get/snakehighscores/')
    .then((response) => {
        return response.text();
    }) 
    .then((text) => {
        document.getElementById("scoregrid").innerHTML = text;
    })
    .catch((error) => {
        console.log(error);
    });
};

// On page load, sets colors and displays high scores:
window.onload = function () {
    setOrigColors();
    displayHighSnakes();
}
