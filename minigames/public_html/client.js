/*
Login Page / Client Functions

This file handles client-side functionality, and sends requests to server.js 
*/


// index.html functions (login page)
// login function.
function login() {
    let us = document.getElementById("username").value;
    let pw = document.getElementById("password").value;
    let data = {username: us, password: pw};
    let p = fetch('/account/login/', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {"Content-Type": "application/json"}
    });

    p.then((response) => {
        return response.text();
    }).then((text) => {
        console.log(text);
        if (text.startsWith('SUCCESS')) {
            alert(text);
            console.log("Sending to home")
            window.location.href = './home.html';
        } else {
            alert("Login Failed - Wrong Username or Password");
        }
    });
};

// Sends request to create a user
function createUser() {
    let us = document.getElementById('newUsername').value;
    let pw = document.getElementById('newPassword').value;
    if (us == "" || pw == "") {
        alert('Please Do Not Leave Username or Password Blank');
    } else {
        let p = fetch('/account/create/' + us + '/' + encodeURIComponent(pw));
        p.then((response) => {
        return response.text();
        }).then((text) => { 
        alert(text);
        });
        document.getElementById("newUsername").value = '';
        document.getElementById("newPassword").value = '';
    };
};


// Gets a block of HTML that lists any players with usernames matching search box text.
function getSearch() {
    let key = document.getElementById("psearchText").value;
    if (key.length == 0) {
        document.getElementById("presults").innerText = "Please Enter Valid Characters to Search for Players.";
    } else {
        fetch('/search/players/' + key).then((response) => {
            return response.text();
        }).then((text) => {
            document.getElementById("presults").innerHTML = text;
        }).catch((error) => {
            console.log(error);
        });
    }
};

// Gets a block of HTML that lists any players with matching ._ids in user's friend list.
function getFriends() {
    fetch('/get/friends').then((response) => {
        return response.text();
    }).then((text) => {
        document.getElementById("presults").innerHTML = text;
    }).catch((error) => {
        console.log(error);
    });
};

// Makes a request to push selected players ._id to user's friend list.
function addFriend(button) {
    let friendName = button.getAttribute('friend');
    fetch('/add/friend', {
        method: 'POST',
        body: JSON.stringify({friend: friendName}),
        headers: {'Content-Type' : 'application/json'}
    }).then((response) => {
        alert("Friend Added!");
        getSearch();
        return response;
    }).catch((error) => {
        console.log(error);
        alert("Error: Friend Not Added.");
    });
};
