/*

This file handles Typing Speed client functionality
*/
document.addEventListener("DOMContentLoaded", async function () {
  let inputText = "";
  let paragraph = "";
  let wordCount = 0;
  let accuracy = 0;
  let startTime = null;
  let disabled = false;
  let timeChallenge = 5; // Initial time set to 1 minute
  let timer = null;
  let errors = 0;
  let timeLeft = 0;

    // Load a sample paragraph on initial render
    function loadParagraph() {
      paragraph = paragraphs[Math.floor(Math.random() * paragraphs.length)];
      document.querySelector(".paragraph").innerText = paragraph;
    }

    // Update timer every second and check if time challenge has been met
    function updateTimer() {
      const elapsedTime = (Date.now() - startTime) / 1000 / 60; // in minutes

      if (elapsedTime >= timeChallenge) {
        clearInterval(timer);
        disabled = false;

        updateMyScore(wordCount);

        showResult();
      } else {
        timeLeft = Math.floor(timeChallenge * 60 - elapsedTime * 60);
        updateStats();
      }
    }

    // Handle input change events and update corresponding state variables
    function handleInputChange(e) {
      const text = e.target.value;
      inputText = text;

      // Calculate word count
      const words = text.trim().split(/\s+/);
      wordCount = words.length;

      // Calculate accuracy
      const paragraphWords = paragraph.trim().split(/\s+/);
      let correctWords = 0;
      let numErrors = 0;

      words.forEach((word, index) => {
        if (word === paragraphWords[index]) {
          correctWords += 1;
        } else {
          numErrors += 1;
        }
      });

      errors = numErrors;
      accuracy = ((correctWords / wordCount) * 100).toFixed(2);

      updateStats();
    }

    // Start the typing game and set a timer
    function startGame() {
      startTime = Date.now();
      timer = setInterval(updateTimer, 1000);
      disabled = true;
      updateStats();
    }

    // Show the game result
    function showResult() {
      alert(`Game Over!\nWord Count: ${wordCount}\nAccuracy: ${accuracy}%`);
    }

    // Reset the game to initial state
    function restartGame() {
      inputText = "";
      wordCount = 0;
      accuracy = 0;
      startTime = null;
      clearInterval(timer);
      timer = null;
      errors = 0;
      timeLeft = 0;
      loadParagraph();
      disabled = false;

      // Clear input field
      document.querySelector(".text-input").value = "";

      updateStats();
    }

    // Update the UI with the current statistics
    function updateStats() {
        document.querySelector(".word-count").innerText = wordCount;
        document.querySelector(".accuracy").innerText = accuracy + "%";
        // document.querySelector(".time-left").innerText = formattedTimetimeLeft + " seconds";
        document.querySelector(".time-left").innerText = formattedTime(timeLeft);
        document.querySelector(".text-input").disabled = !disabled;
        document.querySelector(".start-button").disabled = disabled;
    }

    // Attach event listeners
    document
      .querySelector(".time-challenge-input")
      .addEventListener("change", function (e) {
        inputTime = parseFloat(e.target.value); // Set the initial time
        // setTimeChallenge(e.target.value);
        if (inputTime>5){
          alert("Maximum time limit is 5 minutes. Set it to 5");
          inputTime = 5;
        }
        timeChallenge = inputTime;
      });

    document
      .querySelector(".text-input")
      .addEventListener("input", handleInputChange);
    document.querySelector(".start-button").addEventListener("click", startGame);
    document
      .querySelector(".restart-button")
      .addEventListener("click", restartGame);

    // Initial load
    loadParagraph();

    // Load Leaderboard Data
    const {myHighScore, leaderboard} = await fetchHighScore();

    renderLeaderBoard(myHighScore, leaderboard);
});

//Post method to update the score
const updateMyScore = async score => {
    const data = {
        "gameType": "typing",
        "score": score
    };
    
    let response = await fetch('/api/user-high-score/', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {"Content-Type": "application/json"}
    });

    const res = await response.json();

    renderLeaderBoard(res.userScore, res.leaderboard);
}

const ucfirst = str => {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

const formattedTime = sec => {
    let minutes = Math.floor(sec / 60);
    let seconds = sec % 60;

    // Formatting to mm:ss
    let formattedTime = `${minutes}:${(seconds < 10 ? '0' : '')}${seconds} mins`;

    return formattedTime;
}
//rendering the leaderboard and displaying the highscore
const renderLeaderBoard = async (myHighScore, leaderboard) => {
    const elHighScore = document.querySelector('.high-score');
    const elLearnBoard = document.querySelector('.leaderboard-table');

    if (myHighScore > 0) {
        elHighScore.innerHTML = `
            High Score: <span>${myHighScore}</span>
        `;
    }

    let markup = `
        <tr>
            <th>Position</th>
            <th>User</th>
            <th>Score</th>
        </tr>
        ${!leaderboard.length ? `
            <tr>
                <td>No result found!</td>
            </tr>
        ` :leaderboard.map((el, i) => {
            return `
                <tr>
                    <td>#${i+1}</td>
                    <td>${ucfirst(el.username)}</td>
                    <td>${el.score}</td>
                </tr>
            `
        }).join('')}
    `;

    elLearnBoard.innerHTML = markup;
}
// Functiom=n to get highscore
const fetchHighScore = async () => {
    let response = await fetch('/api/get-high-score/', {
        method: 'GET',
        headers: {"Content-Type": "application/json"}
    });

    const data = await response.json();

    return data;
}

