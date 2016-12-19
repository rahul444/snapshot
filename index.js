var express = require('express');
var app = express();
var path = require("path");
var google = require('google-trends-api');

var port = process.env.PORT || 3000;

app.get("/", function(req, res) {
    console.log("home page");
    res.sendFile(path.join(__dirname + '/index.html'));

    var timePeriod = {
        type: 'hour',
        value: 4
    }

    google.trendData('liverpool', timePeriod)
    .then(function(results) {
        console.log(JSON.stringify(results));
        findTrend(results);
    })
    .catch(function(err) {
        console.log(err);
    });
});

function findTrend(inp) {
    
}

app.get("/search", function(req, res) {
    console.log(req.body.name);
    res.send("you sent");
});

app.listen(port, function() {
    console.log('listening on: ' + port);
});