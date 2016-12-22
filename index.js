var express = require('express');
var app = express();
var path = require("path");
var google = require('google-trends-api');
var port = process.env.PORT || 3000;
const MongoClient = require('mongodb').MongoClient
var db;

app.get("/", function(req, res) {
    console.log("home page");
    updateDatabase("James Harden", "Dunk", "2th Quarter Game 6 Second Round")
    res.sendFile(path.join(__dirname + '/index.html'));
});

function updateDatabase(name, type, time){
  db.collection('players').update({},{$addToSet : {[name] : {"desc":type, "time":time}}},false,true, (err, result) => {
      if (err) return console.log(err)
      console.log('saved to database')
  });
}

MongoClient.connect('mongodb://ratham:rocketssuck13@ds143608.mlab.com:43608/snapshot-player-log', (err, database) => {
  if (err) return console.log(err)
  db = database
  app.listen(4000, () => {
    console.log('listening on 4000')
  })
})

app.get('/search', function(req, res) {
    console.log('searching for: ' + req.query.name);

    var timePeriod = {
        type: 'hour',
        value: 1
    }

    google.trendData(req.query.name, timePeriod)
    .then(function(results) {
        res.send("Trend Found:\n" + JSON.stringify(results));
    })
    .catch(function(err) {
        console.log(err);
    });
});

app.listen(port, function() {
    console.log('listening on: ' + port);
});
