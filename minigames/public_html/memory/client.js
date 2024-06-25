/*
	This file provides the client-side logic for the memory card game. This includes
	styling, settings, a leaderboard, and the game itself. It also sends/gets preferences and scores
	to/from the server to save and retrieve the user's scores and settings preferences.
*/

//This is a global variable containing information on the current game
var gameStats = {
	oneCardUp: false,
	cardUpIndex: -1,
	waiting: false, //Use to indicate user cant click
	startTime: 0,
	maxTime: 300*1000,
	timeLeft: 300*1000,
	timeRunning: 0,
	totFails: 0,
	maxFails: 50,
	multiplier: 0,
	playing: false, //Used to indicate game is occurring
	disco: false,
	bombs: false,
	hardcore: false
	//board -> contains all values in board
	//turnedUp -> array indicating which cards are face-up
};

//This is a global variable containing styling information for the 2 themes
const themes = {
	'Tranquil': {
		'body': { 'backgroundColor': '#5899E2', 'background': 'linear-gradient(#5899E2,  #FFFFFF)' },
		'lContent': {'color': 'white'},
		'lHeaders': {'backgroundColor': '#820298'},
		'lDisplay': {'backgroundColor': '#FFD700', 'background': 'linear-gradient(#F2F3F2, #A0A1A0)'},
		'infoCol': {'color': 'white'},
		'card': {'backgroundColor': '#D7F4D2', 'background': 'linear-gradient(135deg, #D7F4D2, #77DD66)'},
		'sLabel': {'backgroundColor': '#228B22', 'color': 'white'}, //Button and header for settings
		'sDisplay': { 'backgroundColor': '#FA86F2', 'background': 'linear-gradient(#FA86F2, #B30041)' },
		'pLabel': {'backgroundColor': 'white', 'color': 'grey'},
		'pDisplay': {'backgroundColor': 'yellow', 'background-image': 'radial-gradient(yellow, green)', 'color': 'black'}
	},
	'EXTREME': {
		'body': { 'backgroundColor': '#FF8B01', 'background': 'linear-gradient(#FF8B01,  #E60001)' },
		'lContent': {'color': '#DC143C'},
		'lHeaders': {'backgroundColor': '#370000'},
		'lDisplay': {'backgroundColor': '#8900AE', 'background': 'linear-gradient(#8900AE,  #330040)'},
		'infoCol': {'color': '#800000'},
		'card': {'backgroundColor': '#6F6B66', 'background': 'linear-gradient(135deg, #6F6B66, #000000)'},
		'sLabel': {'backgroundColor': '#6E260E', 'color': '#DC143C'}, //Button and header for settings
		'sDisplay': { 'backgroundColor': '#FFD22B', 'background': 'linear-gradient(#FFD22B, #700E01)' },
		'pLabel': {'backgroundColor': '#696969', 'color': 'black'},
		'pDisplay': {'backgroundColor': '#008B8B', 'background-image': 'radial-gradient(orange, black)', 'color': 'red'}
	}
};
		
/* This function applies the corresponding style to the given set of elements.
   It can handle both indiviudal elements and sets of elements. 
   
   elems will be one or more DOM elements
   styles will be the value(s) for a key in the themes object
*/
function applyStyles(elems, styles){
	if (elems.length == undefined){ //Single element
		for (const [key, value] of Object.entries(styles)){
			elems.style[key] = value;
		}
	}else{ // Collection of elements
		for (let elem of elems){
			for (const [key, value] of Object.entries(styles)){
				elem.style[key] = value;
			}
		}
	}
}

/* This function changes the theme of the memory card website. It first gets which
   theme to change to, then calls applyStyles on all applicable DOM elements with their
   corresponding key-value(s) pair in the themes object.
*/
function changeTheme(){
	let currTheme = getTheme();
	let themeStyles = themes[currTheme];
	
	if (!themeStyles) return; //No theme provided
	
	//Body styling
	applyStyles(document.body, themeStyles['body']);
	
	//Leaderboard styling
	applyStyles(document.getElementById("leaderboardContents"), themeStyles['lContent']);
	applyStyles(document.getElementById("leaderboardHeaders"), themeStyles['lHeaders']);
	applyStyles(document.getElementById("leaderboardDisplay"), themeStyles['lDisplay']);
	
	//Game Display styling
	applyStyles(document.getElementsByClassName("infoCol"), themeStyles['infoCol']);
	if (!gameStats.disco){ //Don't change card colors when disco is active
		applyStyles(document.getElementsByClassName("memCard"), themeStyles['card']);
	}
	
	//Settings styling
	applyStyles(document.getElementById("settingsTitle"), themeStyles['sLabel']);
	applyStyles(document.getElementById("actualSettings"), themeStyles['sDisplay']);
	applyStyles(document.getElementById("startMem"), themeStyles['sLabel']);
	applyStyles(document.getElementById("partyTitle"), themeStyles['pLabel']);
	applyStyles(document.getElementById("partySettings"), themeStyles['pDisplay']);
}

/* This function gets which theme the website should be. It does this by iterating
   over the 2 theme radio inputs and returning the value for the one that is checked.
*/
function getTheme(){
	let themes = document.getElementsByName('theme');
	for (i = 0; i < themes.length; i++) {
		if (themes[i].checked)
			return themes[i].value;
	}
}

/* This function begins a new game of Memory and is called on the start button being clicked.
   It saves the user's preferences, sets the difficulty/party modifiers, displays the board, and
   sets the gameplay loop (Game updates every 50 ms)
*/
async function startGame(){
	//Save preferences
	savePrefs()

	//Hide start button
	let startButton = document.getElementById("startMem");
	startButton.style.visibility = "hidden";
	
	//Set difficulty
	setDifficulty();
	
	//Extract and set party modifiers
	setPartyMods();
	
	//Populate cards
	boardVals = [];
	populateBoard(boardVals, gameStats.rows, gameStats.columns);
	
	//Display info and board
	setupInfo(gameStats.rows, gameStats.columns, boardVals);
	await displayBoard(gameStats.rows, gameStats.columns, boardVals);
	
	//Start gameplay loop
	gameStats.startTime = Date.now();
	gameStats.playing = true;
	
	let gameInterval = setInterval(() => {
		gameUpdate();
		if (!gameStats.playing){
			clearInterval(gameInterval);
		}
	}, 50);
}

/* This function sets the difficulty of the card game. It iterates through the difficulty
   radio input and upon finding the selected difficulty, sets the diff text to be that and
   extracts the rows and columns information. It also sets the multiplier based on the diff.
*/
function setDifficulty(){
	let diffs = document.getElementsByName('diff');
	let diffHeader = document.getElementById("diffInfo");
	let gameDiff = "";
	for (i = 0; i < diffs.length; i++) {
		if (diffs[i].checked){
			gameDiff = diffs[i].value;
			let tempStr = diffs[i].id;
			diffHeader.innerText = tempStr.charAt(0).toUpperCase() + tempStr.slice(1);
			gameStats.multiplier = 2**i;
			break;
		}
	}
	let gameSize = gameDiff.split('x');
	gameStats.columns = parseInt(gameSize[0]);
	gameStats.rows = parseInt(gameSize[1]);
}
	
/* This function sets the party modifiers for the memory card game. It iterates through
   each modifier's radio inputs and sets the global object gameStat's corresponding variable to true
   or false depending on if the modifier is on or off, respectively.
*/
function setPartyMods(){
	let disco = document.getElementsByName('disco');
	let bombs = document.getElementsByName('bombs');
	let hardcore = document.getElementsByName('hardcore');
	for (i = 0; i < 2; i++) { //Each can only be on or off
		if (disco[i].checked){
			let discoVal = disco[i].value;
			gameStats.disco = (discoVal == "DiscoOn");
		}
		if (bombs[i].checked){
			let bombsVal = bombs[i].value;
			gameStats.bombs = (bombsVal == "BombsOn");
		}
		if (hardcore[i].checked){
			let hcVal = hardcore[i].value;
			gameStats.hardcore = (hcVal == "HardcoreOn");
		}
	}
}

/* This function populates the array representing the board. It does this by creating pairs
   from 0 to boardArea/2. This also accounts for bombs, where if that modifier is active,
   the pair of 0's is replaced with two B's to represent bombs. After the array is populated,
   it is shuffled and returned.
   
   arr is an empty array representing the board
   rows and cols are integers representing the dimensions of the board
*/
function populateBoard(arr, rows, cols){
	for (let i = 0; i < (rows*cols)/2; i++){
		if (i == 0 && gameStats.bombs){
			arr.push("B", "B");
		}else{
			arr.push(i, i);
		}
	}
	shuffle(arr)
	return arr;
}
	
/* This function sets the information for the game. This includes setting variables in the global
   object gameStats and updating the game information text in the middle of the page.
   
   boardVals is the filled+shuffled array representing the board
   rows and cols are integers representing the dimensions of the board
*/
function setupInfo(rows, cols, boardVals){
	//Max time and fails
	let maxTime = parseInt(document.getElementById("timeToFinish").value);
	let maxFails = parseInt(document.getElementById("numFails").value);
	
	//Set variables in global obj
	gameStats.board = boardVals;
	gameStats.turnedUp = Array(rows*cols).fill(0);
	gameStats.maxTime = maxTime*1000;
	gameStats.timeLeft = maxTime*1000;
	gameStats.failsLeft = maxFails;
	gameStats.maxFails = maxFails;
	gameStats.totFails = 0;
	
	//Set whether win will be sent to Leaderboard
	gameStats.sendOnWin = (!gameStats.disco && !gameStats.bombs && !gameStats.hardcore);
	
	//Set maxFails
	let failsInfo = document.getElementById("failsInfo");
	failsInfo.innerText = maxFails.toString();
	
	//Set timer
	let timer = document.getElementById("timerInfo");
	timer.innerText = "0.000 s";
	
	//Set max time
	let timeLeft = document.getElementById("timeLeftInfo");
	timeLeft.innerText = maxTime.toString() + ".000 s";
}

/* This function displays the board for the memory card game. It first clears the board
   of all current cards, calculates the size, rounding, and margin for the cards,
   adds all the cards to the screen via newCard, and finally turns the cards face-down after
   5 seconds of displaying their values.
   
   boardVals is the filled+shuffled array representing the board
   rows and cols are integers representing the dimensions of the board
*/
function displayBoard(rows, cols, boardVals){
	let gameArea = document.getElementById("gameDisplay");
	//Clear all current cards
	while (gameArea.firstChild){
		gameArea.removeChild(gameArea.firstChild);
	}
	
	//Set size/margin/rounding values
	let cardSize = 56/(cols+2)
	let marginAmt = (56 - cols*cardSize)/(cols-1);
	let sizeStr = cardSize.toString() + "vw";
	let marginStr = marginAmt.toString() + "vw";
	
	let roundingStr = (cardSize*0.2).toString() + "vw";

	//Add all cards to screen
	for (let i = 0; i < rows; i++){ //Each row
		for (let j = 0; j < cols; j++){ //Each column
			let card = newCard(i*cols+j, j, cols, sizeStr, roundingStr, marginStr, boardVals);
			gameArea.appendChild(card);
		}
	}
	
	//Show cards for 5 seconds, then hide.
	gameStats.waiting = true;
	return new Promise((resolve) =>{
		setTimeout( () => {
			let ind = 0;
			for (var card of gameArea.children){
				if (gameStats.turnedUp[ind] == 0){
					card.innerText = "";
				}
				ind+=1;
			}
			gameStats.waiting = false;
			resolve();
		}, 5000);
	});
}

/* This function creates a new card to display on the screen. Its style properties and text
   are all set from the parameters, and its colors are determined based on if the disco modifier is active,
   and if it is not, which theme is currently active. Its on-click function is also set.
   
   index represents the index in the board array
   j represents the column the card is in
   cols represents the number of columns in the board
   size represents the size of the card
   rounding represents the amount of rounding the card will have
   margin represents the amount of right-margin the card will have
   vals is the filled+shuffled array representing the board
*/
function newCard(index, j, cols, size, rounding, margin, vals){
	let memCard = document.createElement('div');
	memCard.className = "memCard";
	memCard.id = index.toString();
	memCard.innerText = vals[index];
	memCard.style.width = size;
	memCard.style.height = size;
	memCard.style.lineHeight = size;
	memCard.style.borderRadius = rounding;
	
	if (gameStats.disco){ //Random color gradients!!
		const randColor1 = Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
		const randColor2 = Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
		memCard.style.backgroundColor = "#" + randColor1;
		memCard.style.background = "linear-gradient(135deg, #" + randColor1 + ", #" + randColor2 + ")";
	}else if (getTheme() == "Tranquil"){
		memCard.style.backgroundColor = "#D7F4D2";
		memCard.style.background = "linear-gradient(135deg, #D7F4D2, #77DD66)";
	}else{
		memCard.style.backgroundColor = "#6F6B66";
		memCard.style.background = "linear-gradient(135deg, #6F6B66, #000000)";
	}
	
	//Far right card does need any margin on its right
	if (j != cols-1){
		memCard.style.marginRight = margin;
	}
	let cardIndex = index;
	memCard.onclick = function() {
		clickCard(cardIndex);
	};
	
	return memCard;
}

/* This function shuffles one or two arrays using the Fisher-Yates shuffle.
   If only one array is provided, it is shuffled and returned. If two arrays
   are provided, they are shuffled in the same way. The shuffling of 2 arrays is used
   for the hardcore modifier to re-shuffle the board upon fails.
   
   arr will be an array of the filled board
   arr2 (if given) will be the array of turnedUp in the gameStats object
*/
function shuffle(arr, arr2){
	let currI = arr.length;
	
	while (currI > 0){
		let randI = Math.floor(Math.random() * currI);
		currI--;
		
		[arr[currI], arr[randI]] = [arr[randI], arr[currI]];
		if (arr2 !== undefined){
			[arr2[currI], arr2[randI]] = [arr2[randI], arr2[currI]];
		}	
	}
	
	if (arr2 !== undefined){
		return [arr, arr2];
	}else{
		return arr;
	}
}

/* This function has the logic for when a card in the board is clicked. It first checks if the card can be clicked
   (not turned up, game is running & not waiting). It then checks if it is the first card up in the pair or the second.
   If it is the second, it checks whether the card matches. If they do not, a fail is added and a failing function is called.
   If they do match and are bombs, the game automatically fails. If it is the first card clicked in the pair,
   several gameStats variables are set to indicate this.
   
   index represents the index in the board array the card represents
*/
function clickCard(index){
	if (gameStats.turnedUp[index] == 0 && !gameStats.waiting && gameStats.playing){ //Card is face down when clicked
		let card = document.getElementById(index);
		card.innerText = gameStats.board[index];
		gameStats.turnedUp[index] = 1;
		
		if (gameStats.oneCardUp){ //One card was clicked previously
			let upIndex = gameStats.cardUpIndex;
			let firstCard = document.getElementById(upIndex);
			if (gameStats.board[index] != gameStats.board[upIndex]){ //Cards don't match
				gameStats.waiting = true;
				
				//Add fail
				gameStats.totFails += 1;
				updateFails();
				
				setTimeout(() => {
					cardFail(card, firstCard, index, upIndex);
				}, 1000);
			}else{  //Cards do match
				if (gameStats.board[index] == "B"){ //User clicked 2 bombs!!
					gameStats.playing = false;
					gameEnd(false);
				}
			}
			gameStats.oneCardUp = false;
				
		}else{ //First card clicked in pair
			gameStats.cardUpIndex = index;
			gameStats.oneCardUp = true;
		}
	}
}

/* This function performs the logic for when a fail occurs, and is run 1 second after the fail occurring.
   It turns the mis-matched cards face-down, and if the hardcore modifier is active, shuffles the board.
   
   card and firstCard are the two DOM elements of the selected cards
   i and uI represent the indices of the two cards
*/
async function cardFail(card, firstCard, i, uI){
	//Turn cards face down
	card.innerText = "";
	firstCard.innerText = "";
	gameStats.turnedUp[i] = 0;
	gameStats.turnedUp[uI] = 0;
	gameStats.waiting = false;
	
	//If hardcore, shuffle all cards
	if (gameStats.hardcore){
		shuffle(gameStats.board, gameStats.turnedUp);
		await displayBoard(gameStats.rows, gameStats.columns, gameStats.board);
	}
}

/* This function updates the current card game. This includes updating the time and
   checking if the game is over (win or lose). If the game has been won or lost, an end
   function is called.
*/   
function gameUpdate(){
	updateTime();
	
	let gameState = gameStatus();
	if (gameState == 1){ //win
		gameStats.playing = false;
		gameEnd(true);
	}else if (gameState == 2){ //lose
		gameStats.playing = false;
		gameEnd(false);
	}
}

/* This function checks the current status of the game (ongoing, won, or lost). A win
   occurs when all cards are face-up (or all but one pair when bombs is active). A loss
   occurs when time runs out or the max number of fails is reached. If none of these conditions
   are met, the game is ongoing. The function returns 0, 1, or 2 for ongoing, win, or lose, respectively.
*/
function gameStatus(){
	//Count faceDown cards left
	let faceDown = 0;
	for (faceUp of gameStats.turnedUp){
		if (faceUp == 0){ //A card is not face up
			faceDown += 1;
			if (faceDown > 3){
				break;
			}
		}
	}
	
	//Check for win (all face up, or all but one pair for bombs mode)
	if (faceDown == 0 || (gameStats.bombs && faceDown == 2)){
		return 1;
	}
	
	//Check for loss (max fails or time out)
	if (gameStats.totFails > gameStats.maxFails){ //Fails exceed max
		return 2;
	}else if (gameStats.timeLeft <= 0){ //Time ran out
		return 2;
	}
			
	//Game still ongoing
	return 0;
}

/* This function calculates the time the game has been running and how much time
   the user has left. These values are then displayed in the game information area.
*/
function updateTime(){
	let currTime = Date.now();
	let ms = currTime - gameStats.startTime;
	
	//Time running
	gameStats.timeRunning = ms;
	
	let secondsRunning = Math.floor(ms/1000);
	let msRunning = ms - secondsRunning*1000;
	let runningStr = secondsRunning.toString() + "." + msRunning.toString() + " s";
	let timer = document.getElementById("timerInfo");
	timer.innerText = runningStr;
	
	//Time left
	let msLeft = gameStats.maxTime - ms;
	gameStats.timeLeft = msLeft; //Update time left variable
	
	let secondsLeft = Math.floor(msLeft/1000);
	msLeft -= secondsLeft*1000;
	let leftStr = secondsLeft.toString() + "." + msLeft.toString() + " s";
	let timeLeft = document.getElementById("timeLeftInfo");
	
	if (secondsLeft < 0){ //Don't show negative times
		timeLeft.innerText = "0.000 s";
	}else{
		timeLeft.innerText = leftStr;
	}
	
}

/* This function updates the number of fails left for the game. This includes
   updating the corresponding variable in gameStats and setting the failsLeft text
   in the game information area.
*/
function updateFails(){
	let failsInfo = document.getElementById("failsInfo");
	let failsLeft = gameStats.maxFails - gameStats.totFails;
	if (failsLeft >= 0){ //Only show positive fail #
		failsInfo.innerText = failsLeft.toString();
	}
}

/* This function performs end-of-game logic. If the game was won, a victory message is displayed,
   and if applicable, the score is sent to the leaderboard. If the game was lost, a loss message
   is displayed. After the message is displayed and disappears, the new game button reappears
   
   didWin indicates if the user won (true = won, false = loss)
*/
async function gameEnd(didWin){
	if (didWin){
		gameScore = calculateScore();
		if (gameStats.sendOnWin){
			saveScore(gameScore);
		}
		await endMessage(didWin, gameScore);
		getHighScores();
	}else{
		await endMessage(didWin);
	}
	
	//Re-display button
	let startButton = document.getElementById("startMem");
	startButton.style.visibility = "visible";
	
}

/* This function displays an end-of-game message. If the user won, a rainbow div is displayed showing the
   user's time, # fails, and score. It will also indicate if the result was sent to leaderboard (based on
   if any party mods are active). If the user lost, a blood-red message div is displayed showing their
   time and # of fails, while also telling them their score isnt going to leaderboard. The div
   is then hidden after 10 seconds.
   
   didWin indicates if the user won (true = won, false = loss)
   score represents the score of the game
*/
function endMessage(didWin, score){
	let endDisplay = document.getElementById("endGameDisplay");
	endDisplay.style.visibility = "visible";
	
	let endText = document.getElementById("endText");
	let endStats = document.getElementById("endStats");
	let endLB = document.getElementById("endLB");
	
	let numFails = gameStats.totFails;
	let timeRan = document.getElementById("timerInfo");
	
	if (didWin){
		//Rainbow gradient
		endDisplay.style.background = "linear-gradient(45deg, red, orange, yellow, green, blue, indigo, violet, red)";
		endDisplay.style.backgroundColor = "pink";
		
		endStatus.innerText = "YOU WIN!";
		
		//Set stats text here: extract time from DOM element
		endStats.innerText = "Time: " + timeRan.innerText + "\nFails: " + numFails + "\nScore: " + score;
		
		if (gameStats.sendOnWin){
			endLB.innerText = "Results sent to leaderboard!";
		}else{
			endLB.innerText = "Results will not be sent to leaderboard\n(Party Modifier(s) active)";
		}
		
	}else{
		//Blood red gradient
		endDisplay.style.background = "linear-gradient(rgb(0, 0, 0) 10.6%, rgb(255, 0, 0) 97.7%)";
		endDisplay.style.backgroundColor = "red";
		
		endStatus.innerText = "YOU LOSE!";
		timeStr = "";
		if (gameStats.timeRunning > gameStats.maxTime){
			timeStr += "Time: Maxed/Ran Out";
		}else{
			timeStr += "Time: " + timeRan.innerText;
		}
		
		endStats.innerText = timeStr + "\nFails: " + numFails + "\nScore: N/A";
		endLB.innerText = "Results will not be sent to leaderboard";
		
	}
		
	return new Promise((resolve) =>{
		setTimeout( () => {
			endDisplay.style.visibility = "hidden";
			resolve();
		}, 10000);
	});
}

/* This function calculates the user's score at the end of the game. The base score is based on time
   to complete (faster = higher score) multiplied by the multiplier. Then fails are subtracted from the score,
   with each fail being worth -1000 multiplied by the multiplier.
   After score is calculated, it is returned.
*/
function calculateScore(){
	//Base score is max possible time (300 seconds) - time to finish
	score = (300*1000 - gameStats.timeRunning);
	
	//Multiply score by multiplier (based on difficulty)
	mult = gameStats.multiplier;
	score *= mult;
	
	//Subtract 1000*mult for each fail
	for (let i = 0; i < gameStats.totFails; i++){
		if (score - mult*1000 > 0){
			score-= mult*1000;
		}else{
			score = 0; //Can't get less than 0 
		}
	}
	
	return score;
}

/* This function saves the user's score to the server's DB. It does this via a post request. If an Error
   occurs, the user is alerted.
   
   score is a number representing the user's score.
*/
function saveScore(score) {
    let newScore = score.toString();

    let p = fetch('/memory/score/', {
        method: 'POST',
        body: JSON.stringify({sendScore: newScore}),
        headers: {'Content-Type' : 'application/json'}
    });
    p.catch(()=>{
        console.log('Error With Score Tracking');
        alert('Save Issue: Score not saved. :( ');
    });
}

/* This function gets the top twenty high scores for the memory card game. It does this via a get
   request, and then displays all the returned scores on the leaderboard. If an Error
   occurs, the user is alerted.
*/
function getHighScores(){
	fetch('/get/memhighscores/')
    .then((response) => {
        return response.json();
    }) 
    .then((results) => {
		displayHighScores(results);
    })
    .catch((error) => {
        console.log(error);
    });
}

/* This function displays all of the high scores for the memory card game. It creates
   a new div element for each "slot", which includes the username and score. These slots
   are all added to the leaderboardDisplay DOM.
   
   results is an array of objects containing each user and their corresponding score
*/
function displayHighScores(results){
	
	let lbDisplay = document.getElementById("leaderboardDisplay");
	while (lbDisplay.firstChild){ //Clear currentLB
		lbDisplay.removeChild(lbDisplay.firstChild);
	}
	
	for (let i=0; i < results.length; i++){
		user = results[i].username;
		score = results[i].memScore;
		let newSlot = document.createElement('div');
		newSlot.className = "lbSlot";
		
		let userStr = document.createElement('span');
		userStr.className = "lbSlotUser";
		userStr.innerText = user;
		
		let scoreStr = document.createElement('span');
		scoreStr.className = "lbSlotScore";
		scoreStr.innerText = score.toString();
		
		newSlot.appendChild(userStr);
		newSlot.appendChild(scoreStr);
		
		lbDisplay.appendChild(newSlot);
	}
}
	
/* This function saves the user's preferences to the server's DB via a post request. These preferences
   include the theme, difficulty, max fails/times, and the party modifiers. If an Error
   occurs, the user is alerted.
*/   
function savePrefs(){
	let currTheme = radioSearch(document.getElementsByName('theme'));
	let currDiff = radioSearch(document.getElementsByName('diff'));
	let maxFails = document.getElementById('numFails').value;
	let maxTime = document.getElementById('timeToFinish').value;
	
	let disco = radioSearch(document.getElementsByName('disco'));
	let bombs = radioSearch(document.getElementsByName('bombs'));
	let hardcore = radioSearch(document.getElementsByName('hardcore'));
	
	let prefs = [currTheme, currDiff, maxFails, maxTime, disco, bombs, hardcore];
	
	let p = fetch('/memory/prefs/', {
		method: 'POST',
		body: JSON.stringify(prefs),
		headers: {'Content-Type' : 'application/json'}
    });
	p.catch(()=>{
        console.log('Error With Saving Preferences');
        alert('Save Issue: Preferences not saved. :( ');
    });
}

/* This function gets the user's preferences via a post request. The preferences are then applied
   to the server with the displayPrefs function. If an Error occurs, the user is alerted.
*/
function getPrefs(){
	fetch('/get/memprefs/')
	.then((response) => {
		return response.json();
	})
	.then((results) => {
		displayPrefs(results);
	})
	.catch((error) => {
        console.log(error);
    });
}

/* This function updates the web page to include the user's preferences. This includes setting
   the theme, difficulty, max time/fails, and party modifiers. The theme is then updated at the end
   to account for the theme preference (potentially) changing
   
   arr is an array of strings representing the user's preferences.
*/
function displayPrefs(arr){
	document.getElementById(arr[0]).checked = true; //Theme
	document.getElementById(arr[1]).checked = true; //Difficulty
	let memFails = document.getElementById('memFails'); //Num Fails Allowed
	memFails.querySelector("#numFails").value = arr[2];
	memFails.querySelector("output").innerText = arr[2].toString();
	
	let memTime = document.getElementById('memTime'); //Max allotted Time
	memTime.querySelector("#timeToFinish").value = arr[3];
	memTime.querySelector("output").innerText = arr[3].toString();
	
	document.getElementById(arr[4]).checked = true; //Disco
	document.getElementById(arr[5]).checked = true; //Bombs
	document.getElementById(arr[6]).checked = true; //Hardcore
	
	changeTheme();
}
		
/* This function iterates through an array of radio inputs to find the corresponding one that
   is checked. Upon finding a checked input, the id of that element is returned.
   
   arr is an array of DOM elements
*/
function radioSearch(arr){
	for (i = 0; i < arr.length; i++) {
		if (arr[i].checked){
			return arr[i].id;
		}
	}
	return;
}

/* This function is called on the page loading to get the user's preferences and fill the leaderboard.
*/
async function loadPage(){
	await getHighScores();
	getPrefs();
}
window.onload = loadPage();