var express = require('express');
var app = express();
var path = require("path");
var google = require('google-trends-api');
var port = process.env.PORT || 3000;

app.get("/", function(req, res) {
    console.log("home page");
    res.sendFile(path.join(__dirname + '/index.html'));
});

function findTrend(inp) {
  var total = 0;
  var numVals = 0;
  for(var i = inp[0]['values'].length - 1; i >= 0 ; i--){
    if(inp[0]['values'][i]['value'] >= 90){
      console.log(inp[0]['values'][i]['date']);
      return inp[0]['values'][i]['date'];
    }
  }
}

app.get('/search', function(req, res) {
    console.log('searching for: ' + req.query.name);

    var timePeriod = {
        type: 'hour',
        value: 1
    }

    google.trendData(req.query.name, timePeriod)
    .then(function(results) {
        //console.log(JSON.stringify(results));
        res.send("Trend Found:\n" + JSON.stringify(results));
        findTrend(results);
    })
    .catch(function(err) {
        console.log(err);
    });
});

app.listen(port, function() {
    console.log('listening on: ' + port);
});
