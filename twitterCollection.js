function createCollection(name) {
	var accessKey = '813161160451112960-3qtSfRBeni1ffunzYcur2VaGXieXN7p' + ':' + '7jwyEdf35e8vDH4SWqlPuUBluBnSJnXxttUo9i7NOWpNA';
    var requestParams = {
        url: 'https://api.twitter.com/1.1/collections/create.json',
        qs: {name: name},
        headers: {"Authorization" : "Bearer " + accessKey },
        method: 'POST'
    };

    request(requestParams, function(error, response, body){
         console.log(body);
    }); 
}

function nonceGenerator() {
	var text = '';
	var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	for (var i = 0; i < possible.length; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

function getSignatureBase(type, url, requestString){
	var returnString = "";
	returnString += type + "&";
	returnString += encodeURIComponent(url) + "&";
	returnString += encodeURIComponent(requestString);
	return returnString;
}

function getSignatureKey(consumerSecret, tokenSecret){
	var returnString = "";
	returnString += encodeURIComponent(consumerSecret) + "&";
	returnString += encodeURIComponent(tokenSecret);
	return returnString;
}

function ssoTwitter() {
	// snapshot-highlights account
	var consumerKey = '4jYJGWChPVj8X3G1UMVjlBenA';
	var consumerSecret = 'bzHQthmltYALMo9n5pNoGFRadKDOfi40kHi8RFqZcdcbWDZPTi';
	var accessToken = '813161160451112960-3qtSfRBeni1ffunzYcur2VaGXieXN7p';
	var accessTokenSecret = '7jwyEdf35e8vDH4SWqlPuUBluBnSJnXxttUo9i7NOWpNA';

	var nonce = nonceGenerator();
	var buffer = new Buffer(nonce);
	var nonce = buffer.toString('base64');

	var sigBase = getSignatureBase('POST', 'https://api.twitter.com/1.1/collections/create.json', 'JamesHarden');
	var sigKey = getSignatureKey(consumerSecret, accessTokenSecret);

	var signature = sha1(sigBase + sigKey);

// + encodeURIComponent(nonce) + 
    var authStr = 'OAuth oauth_consumer_key="' + encodeURIComponent(consumerKey) + '", oauth_nonce="kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg' + '", oauth_signature="' + encodeURIComponent(signature) + '", oauth_signature_method="HMAC-SHA1", oauth_timestamp="' + Math.round(new Date().getTime()/1000) + '", oauth_token="' + encodeURIComponent(accessToken) + '", oauth_version="1.0"';

	console.log(sigKey);
	console.log(sigBase);
	console.log('sig: ' + signature);

	// rest api example
	var headerObject = {
		"Authorization": authStr,
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
		console.log(JSON.parse(body));
		accessKey = JSON.parse(body)['access_token'];
    });
}