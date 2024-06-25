/*

This file handles server functionality
*/

const mongoose = require('mongoose');
const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const app = express();
const port = 80;
const gameTypes = ['asteroid', 'memory', 'snake', 'typing'];

const db = mongoose.connection;

//const mongoDBURL = 'mongodb://127.0.0.1:27017/minigames';
const mongoDBURL = 'mongodb://127.0.0.01/minigames';

mongoose.connect(mongoDBURL, {useNewUrlParser: true});
db.on('error', () => {console.log("MongoDB Connection Error")});

app.use(cookieParser());
app.use(express.json());

// User Schema - Contains base information for users.
// Friends contains array of .ids to other user schemas,
// preferences is a string ._id reference to a user-specific preference schema,
// and scores is likewise a string ._id reference to the user-specific scores schema.
var UserSchema = new mongoose.Schema( {
    username: String,
    salt: Number,
    hash: String,
    friends: Array,
    preferences: String,
    scores: String
});
var User = mongoose.model('User', UserSchema);

// Preferences Schema - contains game-specific default settings saved as arrays on
// User account creation.
var PrefSchema = new mongoose.Schema( {
    asteriod: Array,
    memory: ['tranquil', 'easy', 50, 300, 'discoOff', 'bombsOff', 'hardcoreOff'],
    snake: Array,
    typing: Array
});
var Pref = mongoose.model('Pref', PrefSchema);

// Scores Schema - contains highscores / score tracking for users.
var ScoresSchema = new mongoose.Schema( {
    astScore: Number,
    memScore: Number,
    snekScore: Number,
    typeScore: Number
});
var Scores = mongoose.model('Scores', ScoresSchema);

// UserScores Schema
var UserScoresSchema = new mongoose.Schema({
  userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
  },
  score: {
      type: Number,
      required: true
  },
  gameType: {
      type: String,
      enum: gameTypes,
      required: true
  }
});
var UserScores = mongoose.model('UserScores', UserScoresSchema);

let sessions = {};

// Adds session for login, with random id number.
function addSession(username) {
    let sid = Math.floor(Math.random() * 10000);
    let now = Date.now();
    sessions[username] = {id: sid, time: now};
    return sid;
}

// Removes session when timed out (Approx 10 minutes).
function removeSessions() {
    let now = Date.now();
    let usernames = Object.keys(sessions);
    for (let i=0; i < usernames.length; i++ ) {
        let last = sessions[usernames[i]].time;
        if (last + 60000 * 10 < now) {
            delete sessions[usernames[i]];
        }
    }
    console.log(sessions);
}

// Checks for time out every minute, and removes if so - 
setInterval(removeSessions, 60000);


// Main authentication function, checks for session / cookie validity.
// Redirects to main login page if timed out (index.html).
function authenticate(req, res, next) {
    let c = req.cookies;
    console.log('auth request:');
    console.log(c);
    if (c != undefined && c.login != undefined) {
        if (sessions[c.login.username] != undefined &&
            sessions[c.login.username].id == c.login.sessionID) {
                next();
        } else {
            console.log("redirecting due to mismatch")
            res.redirect('/index.html');
        }
    } else {
        console.log("redirecting due to mismatch")
        res.redirect('/index.html');
    }
};

// Covers authentication for main, and game pages:
app.use('/home.html', authenticate);
app.use('/snake/snake_index.html', authenticate); 
app.use('/memory/memory.html', authenticate);
app.use('/typing-speed-game/index.html', authenticate);
app.get('/home.html', (req, res, next) => {
    console.log('another');
    next();
});

app.use(express.static('public_html'));

// Creates account for user, and associates them with a default Scores and Preferences Schemas by ._id.
app.get('/account/create/:username/:password', (req, res) => {
    let p1 = User.find({username: req.params.username}).exec();
    p1.then( (results) => { 
      if (results.length > 0) {
        res.end('That username is already taken.');
      } else {
        // New Default Base Scores and Preferences:
        var newScore = new Scores({
          astScore: 0,
          memScore: 0,
          snekScore: 0,
          typeScore: 0
        });
        
        newScore.save();
        var newPref = new Pref({
          asteriod: [],
          memory: [],
          snake: ["#00ff00", "#ff0000"], // default settings for snake
          typing: []
        });
        newPref.save();

        // New User Creation, associated w/ above ._ids:
        let newSalt = Math.floor((Math.random() * 1000000));
        let toHash = req.params.password + newSalt;
        var hash = crypto.createHash('sha3-256');
        let data = hash.update(toHash, 'utf-8');
        let newHash = data.digest('hex');
       
        var newUser = new User({ 
          username: req.params.username,
          salt: newSalt,
          hash: newHash,
          preferences: newPref._id,
          scores: newScore._id
        });
        newUser.save().then( (doc) => {
          res.end('Created new account!');
        }).catch( (err) => { 
            console.log(err);
            res.end('Failed to create new account.');
        });
      }
    });
    p1.catch( (error) => {
      res.end('Failed to create new account.');
    });
  });

  // Login Request handling.
  app.post('/account/login/', (req, res) => {
    let u = req.body.username;
    let p = req.body.password;

    if (!u || !p) {
      res.status(401).json({
        msg: 'Username and password is required!',
        status: 'fail'
    });
      return;
    }

    let p1 = User.find({username:u}).exec();
    p1.then( (results) => {
      for(let i = 0; i < results.length; i++) {
  
        let existingSalt = results[i].salt;
        let toHash = req.body.password + existingSalt;
        var hash = crypto.createHash('sha3-256');
        let data = hash.update(toHash, 'utf-8');
        let newHash = data.digest('hex');
        
        if (newHash == results[i].hash) {
          let sid = addSession(u);
          console.log("Username: " + u);
          res.cookie("login", {username: u, sessionID: sid, userId: results[0]._id}, {maxAge: 60000*10});
          res.end('SUCCESS');
          return;
        } 
      } 
      res.end('login failed');
    });
});


/* This posts the user's score in the memory game to the leaderboard, if applicable. If the user's New
   score is higher than what is in the database, the db is updated with the new score. Otherwise,
   nothing happens.
*/
app.post('/memory/score/', async function(req, res) {
	let memPlayer = req.cookies.login.username;
	let { sendScore } = req.body;
	let score = parseFloat(sendScore);
	//console.log("Snake Player: " + snakePlayer + " | Score: " + score);
	let playerCheck = await User.findOne({username: memPlayer}).exec();
	let scoresCheck = await Scores.findOne({_id: {$in: playerCheck.scores }}).exec();

	if (scoresCheck.memScore < score) {
		scoresCheck.memScore = score;
		console.log('Score saved successfully')
		scoresCheck.save();
		res.end("NEWSCORE");
	} else {
		res.end("OLDSCORE");
	}
});

/* This gets the high scores for the memory card game and returns a formatted version of them to the
   client. The top twenty scores and their associated users are sent back.
*/
app.get('/get/memhighscores/', async function (req, res) {
	let memPlayer = req.cookies.login.username;
	let playerCheck = await User.findOne({username: memPlayer}).exec();
	let scoresCheck = await Scores.findOne({_id: {$in: playerCheck.scores }}).exec();

	let toptwenty = await Scores.find({}).sort({memScore: -1}).limit(20);
	let mappedtwenty = toptwenty.map(doc => doc._id.toString());
	// finds users who's scores associate with the array'd values:
	let userResults = await User.find({ 'scores': { $in: mappedtwenty }});
	// combines the results of the above into an object in the form [{username : mem score}, etc]
	let formattedScores = toptwenty.map(doc => { 
		let user = userResults.find(user => user.scores === doc._id.toString());
		return {username: user ? user.username : 'Unknown', memScore: doc.memScore};
	});

	res.send(formattedScores);
});

/* This posts the user's preferences for the memory card game to the database. */
app.post('/memory/prefs/', async function(req, res) {
	let name = req.cookies.login.username;
	let user = await User.findOne({username: name}).exec();
	let memPrefs = await Pref.findOne({_id: { $in: user.preferences }}).exec();

	for (let i = 0; i < req.body.length; i++){
	  memPrefs.memory[i] = req.body[i];
	}

	memPrefs.save();
	res.end("Preferences Saved");
});

/* This gets the user's preferences from the database and returns them to the client.*/
app.get('/get/memprefs/', async function(req, res) {
	let name = req.cookies.login.username;
	let user = await User.findOne({username: name}).exec();
	let memPrefs = await Pref.findOne({_id: { $in: user.preferences }});
	res.send(memPrefs.memory);
});

// Checks to see if user's snake score is better than old one, and saves if true.
app.post('/snake/score/', async function(req, res) {
  let snakePlayer = req.cookies.login.username;
  let { sendScore } = req.body;
  let score = parseFloat(sendScore);
  //console.log("Snake Player: " + snakePlayer + " | Score: " + score);
  let playerCheck = await User.findOne({username: snakePlayer}).exec();
  let scoresCheck = await Scores.findOne({_id: {$in: playerCheck.scores }}).exec();

  if (scoresCheck.snekScore < score) {
    scoresCheck.snekScore = score;
    console.log('Score saved successfully')
    scoresCheck.save();
    res.end("NEWSCORE");
  } else {
    res.end("OLDSCORE");
  }
});

// This request, through much pain/sweat/tears/swearing, first outputs the user's highest current snake score
// as a specific HTML block.
// Then it searches for all the scores by snake - specifically - , sorts them into descending order, and takes
// the first 5. It then maps those 5's ._ids to an array as a string. After that, the function grabs all the 
// users who're associated with those ._ids and maps them together into a dictionary-esque object. 
// Finally, each element of that object is converted to little HTML blocks and kicked back to client.
app.get('/get/snakehighscores/', async function (req, res) {
  let name = req.cookies.login.username;
  let playerCheck = await User.findOne({username: name}).exec();
  let scoresCheck = await Scores.findOne({_id: {$in: playerCheck.scores }}).exec();
  let results = "<br><div style = 'border:2px solid black'><br>" + name + "'s High Score: " + scoresCheck.snekScore + 
  " <br><br></div><br><br><div><b><u>Top 5 High Scores:</b></u></div><br>";
  // topfive sorts all scores highest to lowest, then takes the first 5
  let topfive = await Scores.find({}).sort({snekScore: -1}).limit(5);
  // maps them to an array, and strings their _ids:
  let mappedfive = topfive.map(doc => doc._id.toString());
  // finds users who's scores associate with the array'd values:
  let userResults = await User.find({ 'scores': { $in: mappedfive }});
  // combines the results of the above into an object in the form [{username : snake score}, etc]:
  let formattedScores = topfive.map(doc => { 
    let user = userResults.find(user => user.scores === doc._id.toString());
    return {username: user ? user.username : 'Unknown', snekScore: doc.snekScore};
  });

  formattedScores.forEach(item => {
    results += "<div style = 'border:2px solid black'><br>" + item.username + ": " + item.snekScore + 
    "<br><br></div><br><br>"
  })

  res.send(results);
  
});

// This function changes user's specific preferences for the snake game. 
// [0] element is user's snake color.
// [1] element is user's target color.
app.post('/snake/colors/', async function(req, res) {
  let name = req.cookies.login.username;
  let snekColor = req.body.snek;
  let tarColor = req.body.tar;

  let user = await User.findOne({username: name}).exec();
  let snakePref = await Pref.findOne({_id: { $in: user.preferences }}).exec();

  snakePref.snake[0] = snekColor;
  snakePref.snake[1] = tarColor;
  //console.log(snakePref);
  snakePref.save();
  res.end("Colors Saved");
})

// Sends current settings for user's snake and target - usually used on window load.
app.get('/snake/pref/', async function(req, res) {
  let results = [];
  let name = req.cookies.login.username;
  let user = await User.findOne({username: name}).exec();
  let snakePref = await Pref.findOne({_id: { $in: user.preferences }});

  results = snakePref.snake;
  res.send(results);
});

// Middleware for authenticating API requests
function auth_api(req, res, next) {
  // check if API request is authenticated
 let c = req.cookies;
 console.log('auth request:');
 console.log(c);

 if (c != undefined && c.login != undefined) {
     if (sessions[c.login.username] != undefined &&
         sessions[c.login.username].id == c.login.sessionID) {
         next();
     } else {
         res.status(401).json({
             msg: 'Authentication failed due to session mismatch'
         });
     }
 } else {
     res.status(401).json({
         msg: 'Authentication failed due to missing credentials'
     });
 }
}

//Function to update existing user score or create score for new user
async function updateOrCreateUserScore(userId, score, gameType) {
  try {
      // Find the existing user score
      const existingUserScore = await UserScores.findOne({ userId: userId, gameType: gameType }).exec();

      // Check if no existing score or new score is greater
      if (!existingUserScore || score > existingUserScore.score) {
          // Update or create the user score
          const updatedUserScore = await UserScores.findOneAndUpdate(
              { userId: userId, gameType: gameType },
              { $set: { score: score } },
              { upsert: true, new: true }
          ).exec();

          return updatedUserScore;
      } else {
          // Existing score is greater, no need to update
          return existingUserScore;
      }
  } catch (error) {
      console.error('Error updating user score:', error);
      throw error;
  }
}

//Function to fetch the top 3 scores
async function getTopUserScores(gameType, limit = 3) {
  try {
      const topScores = await UserScores.find({ gameType: gameType })
          .sort({ score: -1 }) // Sort in descending order
          .limit(limit) // Limit the results to the top N scores
          .populate({
              path: 'userId',
              select: 'username' // Select only the 'username' field from the 'User' collection
          })
          .exec();

      return topScores.map(score => ({
          username: score.userId.username,
          score: score.score
      }));
  } catch (error) {
      console.error('Error fetching top scores:', error);
      throw error;
  }
}
// Route for updating or creating user high scores through API
app.post('/api/user-high-score/', auth_api, async function(req, res) {
//update or create user high score, return leaderboard
const cookieData = req.cookies.login;
const gameType = req.body.gameType;
const score = req.body.score;

if (!gameType || !score) {
  res.status(401).json({
      status: 'fail',
      msg: 'All fields are required!'
  });
  return;
}
if (!gameTypes.includes(gameType)) {
  res.status(401).json({
      status: 'fail',
      msg: 'Game type is invalid!'
  });
  return;
}

let userId;
const user = await User.findOne({ username: cookieData.username }).select('_id').exec();
userId = user._id;

try {
  const updatedUserScore = await updateOrCreateUserScore(userId, score, gameType);
      res.status(200).json({
          status: 'success',
          msg: 'User score updated successfully',
          userScore: updatedUserScore.score,
          leaderboard: await getTopUserScores('typing')
      });
  } catch (error) {
      res.status(500).json({
          status: 'error',
          msg: 'Internal Server Error'
      });
  }
});

// Route for retrieving user's high score and leaderboard through API
app.get('/api/get-high-score/', auth_api, async function(req, res) {
  // retrieve user's high score and leaderboard
    const gameType = 'typing';
    const {userId} = req.cookies.login
    let myScore = 0

    if (!gameType) {
      res.status(401).json({
          status: 'fail',
          msg: 'All fields are required!'
      });
      return;
    }
    if (!gameTypes.includes(gameType)) {
      res.status(401).json({
          status: 'fail',
          msg: 'Game type is invalid!'
      });
      return;
    }

    const userScore = await UserScores.findOne({ userId: userId, gameType: gameType })
        .populate({
            path: 'userId',
            select: 'username' // Select additional fields from the 'User' collection if needed
        })
        .exec();

    if (userScore?.score !== undefined) myScore = userScore.score;
    
    res.status(200).json({
        status: 'success',
        leaderboard: await getTopUserScores(gameType),
        myHighScore: myScore
    });
});

/**
 * post new asteroids score
 */
app.post('/api/asteroid/user-score', async function(req, res) {
  let username = req.cookies.login.username;
  let player = await User.findOne({username: username}).exec();
  let score = req.body.score;

  let newScore = new UserScores({
    userId: player.id,
    score: score,
    gameType: 'asteroid'
  });


  try {
    await newScore.save();
    res.end(JSON.stringify({text: 'Asteroids score saved successfully'}));
  } catch (err) {
    console.log(err)
    return res.status(500).send('Failed to save asteroids score');
  }
});


/**
 * if score is high score, save it to scores schema it
 */
app.post('/api/asteroid/user-high-score', async function(req, res) {
  let username = req.cookies.login.username;
  let player = await User.findOne({username: username}).exec();
  let score = req.body.score;

  let scoresCheck = await Scores.findOne({_id: {$in: player.scores }}).exec();

  try {
    if (scoresCheck.astScore < score) {
      scoresCheck.astScore = score;
      await scoresCheck.save();
      res.end(JSON.stringify({newHighScore: true, score: score}));
    } else {
      res.end(JSON.stringify({newHighScore: false}));
    }
  } catch (err) {
    console.log(err)
    return res.status(500).send('Something went wrong');
  }
});

/**
 * get user's high score
 */
app.get('/api/asteroid/get-user-high-score', async function(req, res) {
  let username = req.cookies.login.username;
  let player = await User.findOne({username: username}).exec();

  let scoresCheck = await Scores.findOne({_id: {$in: player.scores }}).exec();

  let highScore = scoresCheck.astScore;

  try {
    res.end(JSON.stringify({highScore: highScore}));

  } catch (err) {
    console.log(err)
    return res.status(500).send('Something went wrong');
  }
});


/**
 * get asteroids leaderboards
 */
app.get('/api/asteroid/get-global-leaderboards', async function(req, res) {

  let users = await User.find({}).exec();

  let leaderboardArr = [];

  // for each user, add an object of their name and highest asteroids score to leaderboardArr
  for (let i = 0; i < users.length; i++) {
    let leaderboardObj = {};
    let scoresId = users[i].scores;
    let userScores = await Scores.findById(scoresId);
    let astScore = userScores.astScore;
    let name = users[i].username;

    leaderboardObj.name = name;
    leaderboardObj.score = astScore;
    leaderboardArr.push(leaderboardObj);
  }

  // sort by asteroids score in descending order
  leaderboardArr.sort((a, b) => b.score - a.score);

  // limit leaderboard to 5 highest scores
  leaderboardArr = leaderboardArr.slice(0,4);

  try {
    res.end(JSON.stringify({leaderboards: leaderboardArr}));
  } catch (error) {
    console.log(error)
    return res.status(500).send('Something went wrong');
  }

});


// This function gets any players with usernames matching :key, returning combined and digestable HTML blocks.
app.get('/search/players/:key', async function (req, res) {
  let results = '';
  let keyword = req.params.key;
  let user = await User.findOne({username: req.cookies.login.username}).exec();
  //console.log(user)
  let playersList = await User.find({username: {$regex: keyword, $options: 'i'}}).exec();
  playersList.forEach(player => {
      if (!user.friends.includes(player._id)) {
        results += "<div style='border: 2px solid black'><br>Username: " + player.username + "    |    " +
        "<input type='button' friend='" + player.username + "' value='Add Friend' onclick=addFriend(this) class=sebutton><br><br></div><br>";
      } else {
        results += "<div style='border: 2px solid black'><br>Username: " + player.username + "    |    " +
        "<b>Added</b><br><br></div><br>";
      }
  });
  res.send(results);
});


// Similar to above, but with associated ._ids found in user's current friends array.
app.get('/get/friends', async function (req, res) {
  let results ='';
  let user = await User.findOne({username: req.cookies.login.username}).exec();
  let friendsList = await User.find({_id: {$in: user.friends}});
  friendsList.forEach(player => {
    results += "<div style='border: 2px solid black'><br>Username: " + player.username + "    |    " +
    "<b>Added</b><br><br></div><br>";
  });
  res.send(results);
});

// Adds selected friend to user's friends array by User ._id.
app.post('/add/friend', async function (req, res) {
  let user = req.cookies.login.username;
  let newFriend = req.body.friend;

  let friendSearch = await User.findOne({username: newFriend}).exec();

  await User.findOneAndUpdate({username: user}, {$push: {friends: friendSearch._id}});

  res.end('ADDED');
});

// Listens intently to the port.
app.listen(port, () => {console.log('server has started'); });