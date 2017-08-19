var express = require('express');
var app = express();
var path = require("path");
var google = require('google-trends-api');
var request = require('request');
var sha1 = require('sha1');
var constants = require('./CONSTANTS.js');
var port = process.env.PORT || 3000;

var teams = ["ATL", "BKN", "BOS", "CHA", "CHI", "CLE", "DAL", "DEN", "DET", "GSW", "HOU", "IND", "LAC", "LAL", "MEM", "MIA", "MIL", "MIN", "NOP", "NYK", "OKC", "ORL", "PHI", "PHX", "POR", "SAC", "SAS", "TOR", "UTA", "WSH"];
var playersToTweets = {};
const MongoClient = require('mongodb').MongoClient
var db;
var accessKey = '';
var twitterVidFilter = ' filter:videos AND -filter:retweets';
// var twitterValidAccts = ' from:NBATV OR from:ESPNNBA OR from:NBAonTNT';


// ROUTES
app.get("/", function(req, res) {
  console.log("home page");
  // deleteTables(teams);
  // createTables(teams);
  // parseSportsJson();
  res.sendFile(path.join(__dirname + '/index.html'));
  // googleTrend('Donald Trump', function(resp) {
  //   res.send(resp);
  // });
});

app.get('/search', function(req, res) {
  var team = req.query.name;

  // queryTwitter('Stephen Curry', team, twitterVidFilter, function(tweets) {
  // 	res.send(tweets);
  // });

	trendsByTeam(team, function(dates) {
		// res.send(dates);
	});
});


// DATABASE CODE
// MongoClient.connect('mongodb://' + constants.mongoCredentials + '@ds143608.mlab.com:43608/snapshot-player-log', (err, database) => {
MongoClient.connect('mongodb://ratham:rocketssuck13@ds143608.mlab.com:43608/snapshot-player-log', (err, database) => {
    if (err) return console.log(err)
    db = database
    app.listen(4000, () => {
        console.log('listening on 4000')
    });
});

function getPlayersOnTeam(team, callback) {
	db.collection('players').findOne({"_id":team + " Player Log"}, function(err, doc) {
		var players = Object.keys(doc);
		players.shift();
		callback(players);
	});
}

function deleteTables(teams){
	var baseLogs = ["Player Log", "Twitter Log"];
	for(var i = 0; i < teams.length; i++){
		var logName = teams[i] + " " +  baseLogs[0];
		var logName2 = teams[i] + " " + baseLogs[1];
		db.collection('players').deleteOne( { "_id":  logName} );
		db.collection('players').deleteOne( { "_id":  logName2} );
  }
  db.collection('players').deleteOne( { "_id":  "Validated Log"} );
}

function createTables(teams){
	var baseLogs = ["Player Log", "Twitter Log"];
	for(var i = 0; i < teams.length; i++){
		var logName = teams[i] + " " +  baseLogs[0];
		var logName2 = teams[i] + " " + baseLogs[1];
		db.collection('players').insert( { "_id":  logName} );
		db.collection('players').insert( { "_id":  logName2} );
  }
  db.collection('players').insert( { "_id":  "Validated Log"} );
}

function queryDatabase(id, name, time, type, callback) {
    db.collection('players').findOne({"_id":id}, function(err, doc) {
		// console.log('in get database');
		if (doc){
			if(doc[name]){
				for(var i = 0; i < doc[name].length; i++){
					if(doc[name][i]["time"] == time){						
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
    if (id.includes("Player Log")) {
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

function findClosestPlay(name, time, log, callback) {
	var infoType;
	console.log('--------------in findClosestPlay');
	if (log.includes("Player Log")) {
		infoType = "desc";
	} else {
		infoType = "tweets";
	}

	for (var i = 0; i < 3; i++) {
		var curTime = new Date();
		curTime.setHours(time.substring(0,2));
		curTime.setMinutes(time.substring(3));
		curTime.setMinutes(curTime.getMinutes() - i);
		var timeStr = curTime.toTimeString().substring(0,5);

		queryDatabase(log, name, timeStr, infoType, function(info, finalTime) {
			if (info != null) {
				console.log('info: ' + info);
				callback(info, finalTime);
				return;
			}
		});
	}
}


// TWITTER API CODE
authorizeTwitter();

function authorizeTwitter() {
	// snapshot-highlights account
	var consumerKey = '4jYJGWChPVj8X3G1UMVjlBenA';
	var consumerSecret = 'bzHQthmltYALMo9n5pNoGFRadKDOfi40kHi8RFqZcdcbWDZPTi';
	// var consumerKey = constants.twitterConsumerKey;
	// var consumerSecret = constants.twitterConsumerSecret;

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
				data.push(tweets[i]['text']);
			}
		}
    updateDatabase(teamAbr + " Twitter Log", name, data, new Date().toTimeString().substring(0,5));
		console.log(data);
		callback(data);
	});
}


// GOOGLE TRENDS CODE
function googleTrend(inp, callback) {
  var end = new Date();
  var start = new Date();
  start.setDate(end.getDate() - 1);
  var options = {
    keyword: inp,
    startTime: start,
    endTime: end
  }
  google.interestOverTime(options).then(function(results) {
    // console.log('results of google trends: ' + results);
    callback(results);
    // console.log(findTrend(results));
  }).catch(function(err) {
    console.log(err);
  });
}

function findTrend(inp) {
  inp = JSON.parse(inp);
  var timelineData = inp.default.timelineData;
  // console.log('------------------timelinedata-------------------');
  // console.log(timelineData);
  var dates = [];
  for (let i = 0; i < timelineData.length; i++) {
    var trendPoint = timelineData[i];
    if (trendPoint.value >= 70) {
      var date = new Date(0); // The 0 there is the key, which sets the date to the epoch
      date.setUTCSeconds(parseInt(trendPoint.time));
      dates.push(date.toTimeString().substring(0,5));
    }
  }
	return dates;
}


// SPORTS PLAYBYPLAY CODE
function getSportsPlays(callback) {
	// var options = {
	// 	url: 'https://' + constants.sportsCredntials + '@www.mysportsfeeds.com/api/feed/pull/nba/2016-2017-regular/game_playbyplay.json?gameid=20170104-POR-GSW',
	// 	method: 'GET'
	// };

	var options = {
		url: 'https://asripathy:lebronwade1@www.mysportsfeeds.com/api/feed/pull/nba/2016-2017-regular/game_playbyplay.json?gameid=20170104-POR-GSW',
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

					// if (!(name in playersToTweets)) {
						// playersToTweets[name] = [];
						queryTwitter(name, teamAbr, twitterVidFilter, function(tweets) {
							// console.log(tweets);
						});
					// }

					playersToTweets[name].push({
						time : dateStr,
						desc : shotType
					});
				}
			}
		}
		// console.log(players);
	});
}

function trendsByTeam(team, callback) {
	getPlayersOnTeam(team, function(players) {
		console.log(players);
    for (var i = 0; i < players.length; i++) {
      var name = players[i];
      googleTrend(name, function(results) {
        // console.log('results of google trends: ' + results);
        var dates = findTrend(results);
				console.log('------------------findtrend dates-------------------');
				console.log(dates);
				for (var i = 0; i < dates.length; i++) {
					var date = dates[i];
					findClosestPlay(name, date, team + " Player Log", function(play, time) {
						console.log('--------------------------------play: ' + play);
						queryTwitter(name, teamAbr, twitterVidFilter, function(tweets) {
							// console.log(tweets);
							console.log("-------------------------------play: " + play);
							console.log("-------------------------------tweets: " + tweets);
							if (play != null && tweets != null) {
								var desc = name + ": " + play;
								updateValidDatabase("Validated Log", team, tweets, desc, time);
							}
						});
					});
				}
        callback(dates);
      });
    }
  });
}



app.listen(port, function() {
    console.log('listening on: ' + port);
});
