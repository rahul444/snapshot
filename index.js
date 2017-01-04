var express = require('express');
var app = express();
var path = require("path");
var google = require('google-trends-api');
var request = require('request');
var sha1 = require('sha1');
var port = process.env.PORT || 3000;

var players = {};
const MongoClient = require('mongodb').MongoClient
var db;
var accessKey = '';
var twitterVidFilter = ' filter:videos AND -filter:retweets';
// var twitterValidAccts = ' from:NBATV OR from:ESPNNBA OR from:NBAonTNT';

MongoClient.connect('mongodb://ratham:rocketssuck13@ds143608.mlab.com:43608/snapshot-player-log', (err, database) => {
    if (err) return console.log(err)
    db = database
    app.listen(4000, () => {
        console.log('listening on 4000')
    });
});

authorizeTwitter();
// ssoTwitter();

app.get("/", function(req, res) {
    console.log("home page");
    // parseSportsJson();
    // queryTwitter('James Harden');
	// createCollection("James Harden");
    res.sendFile(path.join(__dirname + '/index.html'));
});

function getDatabase(id, name, time, type, callback) {
    db.collection('players').findOne({"_id":id}, function(err, doc) {
		// console.log('in get database');
		if (doc){
			if(doc[name]){
				for(var i = 0; i < doc[name].length; i++){
					if(doc[name][i]["time"] == time){
						// console.log(doc[name][i][type]);
						// return doc[name][i][type];
						callback(doc[name][i][type], time);
						return;
					}
				}
			}
		}
    });
}

function updateDatabase(id, name, data, time) {
    console.log("in update");
    var info = '';
    if (id === "Player Log") {
	    info = "desc";
    } else {
	    info = "tweets";
    }
    db.collection('players').update({"_id": id}, {$addToSet : {[name] : {[info]:data, "time":time}}}, false, true, (err, result) => {
        if (err)
            return console.log(err);
        console.log('saved to database');
    });
};

function updateValidDatabase(id, name, tweets, play, time) {
    console.log("in updateValid");
    db.collection('players').update({"_id": id}, {$addToSet : {[name] : {tweets:tweets, play:play, "time":time}}}, false, true, (err, result) => {
        if (err)
            return console.log(err);
        console.log('saved to validDatabase');
    });
};

function authorizeTwitter() {
	// snapshot-highlights account
	var consumerKey = '4jYJGWChPVj8X3G1UMVjlBenA';
	var consumerSecret = 'bzHQthmltYALMo9n5pNoGFRadKDOfi40kHi8RFqZcdcbWDZPTi';

    var bearerToken = 'Basic ' + new Buffer(consumerKey + ':' + consumerSecret).toString('base64');

	// rest api example
	var headerObject = {
		"Authorization": bearerToken,
		"Content-Type": 'application/x-www-form-urlencoded;charset=UTF-8'
	};

	var requestParams = {
		url: 'https://api.twitter.com/oauth2/token',
		qs: {
			grant_type: 'client_credentials'
		},
		headers: headerObject,
		method: 'POST',
	};

	request(requestParams, function(error, response, body) {
		accessKey = JSON.parse(body)['access_token'];
		// console.log('accessKey: ' + accessKey);
    });
}

function queryTwitter(name, teamAbr, filter, callback) {
	var data = [];
    // console.log('key: ' + accessKey);

	var requestParams = {
		url: 'https://api.twitter.com/1.1/search/tweets.json',
		qs: { q: name + filter, count : '10' },
		headers: { "Authorization" : "Bearer " + accessKey },
		method: 'GET'
	};

	request(requestParams, function(error, response, body) {
		var tweets = JSON.parse(body)['statuses'];
		for (var i = 0; i < tweets.length; i++) {
			if (tweets[i]['lang'] == 'en') {
				var URL;
				if (tweets[i]['entities']['urls'][0]) {
					URL = tweets[i]['entities']['urls'][0]['url'];
				} else {
					URL = undefined;

					var expression = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
					var regex = new RegExp(expression);
					var t = tweets[i]['text'];

					if (t.match(regex)) {
  						URL = t.match(regex);
					} else {
  						console.log("No match");
					}
				}
				data.push(tweets[i]['text']);
                // {
					// url : URL,
					// text : tweets[i]['text'],
					// name: "@" + tweets[i]['user']['screen_name']
					// followers : tweets[i]['user']['followers_count'],
					// favorites : tweets[i]['favorite_count']
				// });
			}
		}
        updateDatabase(teamAbr + " Twitter Log", name, data, new Date().toTimeString().substring(0,5));
		console.log(data);
		callback(data);
	});
}

app.get('/search', function(req, res) {
    var timePeriod = {
        type: 'hour',
        value: 1
    }
	var name = req.query.name;

	var curTime = new Date().toTimeString().substring(0,5);

	queryTwitter(name, 'GSW', twitterVidFilter, function(tweets) {
		res.send(tweets);
	});

	/*for (var i = 0; i < dates.length; i++) {
		var date = dates[i]
		checkTimeRange(name, date, "Player Log", function(play, time) {
			checkTimeRange(name, time, "Twitter Log", function(tweets, time2) {
				console.log("play: " + play);
				console.log("tweets: " + tweets);
				if (play != null && tweets != null) {
					updateValidDatabase("Validated Log", name, tweets, play, time);
				}
			});
		});
	}*/

	/*google.trendData(name, timePeriod)
	.then(function(results) {
		console.log('results of google trends: ' + results);
		var dates = findTrend(results);

		for (var i = 0; i < dates.length; i++) {
			var date = dates[i]
			checkTimeRange(name, date, "Player Log", function(play, time) {
				checkTimeRange(name, time, "Twitter Log", function(tweets, time2) {
					console.log("play: " + play);
					console.log("tweets: " + tweets);
					if (play != null && tweets != null) {
						updateValidDatabase("Validated Log", name, tweets, play, time);
					}
				});
			});
		}

		console.log('findTrend dates: ' + dates);
		res.send(dates);
	})
	.catch(function(err) {
		console.log(err);
	});*/
});

function checkTimeRange(name, time, log, callback) {
	var infoType;
	if(log == "Player Log"){
		infoType = "desc";
	}
	else{
		infoType = "tweets";
	}

	for (var i = 0; i < 3; i++) {
		var curTime = new Date();
		curTime.setHours(time.substring(0,2));
		curTime.setMinutes(time.substring(3));
		curTime.setMinutes(curTime.getMinutes() - i);
		var timeStr = curTime.toTimeString().substring(0,5);

		getDatabase(log, name, timeStr, infoType, function(info, finalTime) {
			if (info != null) {
				console.log('info: ' + info);
				callback(info, finalTime);
				return;
			}
		});
	}
}

function findTrend(inp) {
	var dates = [];
    for (var i = inp[0]['values'].length - 1; i >= 0 ; i--) {
        if (inp[0]['values'][i]['value'] >= 70) {
          var date = new Date(inp[0]['values'][i]['date']);
		//   date.setHours(date.getHours() - 8);
		  dates.push(date.toTimeString().substring(0,5));
        }
    }
	return dates;
}

function getSportsPlays(callback) {
	var options = {
		url: 'https://asripathy:lebronwade1@www.mysportsfeeds.com/api/feed/pull/nba/2016-2017-regular/game_playbyplay.json?gameid=20161101-GSW-POR',
		method: 'GET'
	};

	request(options, function(error, response, body) {
		console.log(body);
		callback(JSON.parse(body));
	});
}

function parseSportsJson() {
	getSportsPlays(function(json) {
		plays = json['gameplaybyplay']['plays']['play'];
		for (var i = 0; i < plays.length; i++) {
			for (var j in plays[i]) {
				if (j === "fieldGoalAttempt") {
					var firstName = plays[i][j]['shootingPlayer']['FirstName'];
					var lastName = plays[i][j]['shootingPlayer']['LastName'];
					var name = firstName + ' ' + lastName;
					var shotType = plays[i][j]['shotType'];
					var date = new Date();
					var dateStr = date.toTimeString().substring(0,5);
					var teamAbr = plays[i][j]['teamAbbreviation'];

					updateDatabase(teamAbr + " Player Log", name, shotType, dateStr);

					if (!(name in players)) {
						players[name] = [];
						queryTwitter(name, teamAbr, twitterVidFilter, function(a) {
							// console.log(a);
						});
					}

					players[name].push({
						time : dateStr,
						desc : shotType
					});
				}
			}
		}
		// console.log(players);
	});
}

app.listen(port, function() {
    console.log('listening on: ' + port);
});
