/**
 * Module dependencies.
 */

var express = require('express')
    , http = require('http')
    , googleapis = require('googleapis')
    , OAuth2Client = googleapis.OAuth2Client
    , passport = require('passport')
    , GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

// Use environment variables to configure oauth client.
// That way, you never need to ship these values, or worry
// about accidentally committing them
var oauth2Client = new OAuth2Client(process.env.MIRROR_DEMO_CLIENT_ID,
    process.env.MIRROR_DEMO_CLIENT_SECRET, process.env.MIRROR_DEMO_REDIRECT_URL);

var app = express();

// all environments
app.set('port', 8081);
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);

app.use(passport.initialize());

// passport.use(new GoogleStrategy({
//     returnURL: 'http://localhost:8081/auth/google/return',
//     realm: 'http://localhost:8081'
//   },
//   function(identifier, profile, done) {
//     User.findOrCreate({ openId: identifier }, function(err, user) {
//       done(err, user);
//     });
//   }
// ));


passport.use(new GoogleStrategy({
    clientID: "331114272577-vn1bqa914q589kjt37fadbs8clf7mlmn.apps.googleusercontent.com",
    clientSecret: "JkCeQ1nZD_PxnX5V3aN-paEB",
    callbackURL: "http://localhost:8081/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    console.log('called back');
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));


// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

var success = function (data) {
    console.log('success', data);
};
var failure = function (data) {
    console.log('failure', data);
};
var gotToken = function () {
    googleapis
        .discover('mirror', 'v1')
        .execute(function (err, client) {
            if (!!err) {
                failure();
                return;
            }
            console.log('mirror client', client);
            listTimeline(client, failure, success);
            insertHello(client, failure, success);
            insertContact(client, failure, success);
            insertLocation(client, failure, success);
        });
};

// send a simple 'hello world' timeline card with a delete option
var insertHello = function (client, errorCallback, successCallback) {
    client
        .mirror.timeline.insert(
        {
            "text": "Hello world",
            "callbackUrl": "https://mirrornotifications.appspot.com/forward?url=http://localhost:8081/reply",
            "menuItems": [
                {"action": "REPLY"},
                {"action": "DELETE"}
            ]
        }
    )
        .withAuthClient(oauth2Client)
        .execute(function (err, data) {
            if (!!err)
                errorCallback(err);
            else
                successCallback(data);
        });
};

// send a simple 'hello world' timeline card with a delete option
var insertLocation = function (client, errorCallback, successCallback) {
    client
        .mirror.timeline.insert(
        {
            "text": "Let's meet at the Hacker Dojo!",
            "callbackUrl": "https://mirrornotifications.appspot.com/forward?url=http://localhost:8081/reply",
            "location": {
                "kind": "mirror#location",
                "latitude": 37.4028344,
                "longitude": -122.0496017,
                "displayName": "Hacker Dojo",
                "address": "599 Fairchild Dr, Mountain View, CA"
            },
            "menuItems": [
                {"action":"NAVIGATE"},
                {"action": "REPLY"},
                {"action": "DELETE"}
            ]
        }
    )
        .withAuthClient(oauth2Client)
        .execute(function (err, data) {
            if (!!err)
                errorCallback(err);
            else
                successCallback(data);
        });
};


var insertContact = function (client, errorCallback, successCallback) {
    client
        .mirror.contacts.insert(
        {
            "id": "emil10001",
            "displayName": "emil10001",
            "iconUrl": "https://secure.gravatar.com/avatar/bc6e3312f288a4d00ba25500a2c8f6d9.png",
            "priority": 7,
            "acceptCommands": [
                {"type": "REPLY"},
                {"type": "POST_AN_UPDATE"},
                {"type": "TAKE_A_NOTE"}
            ]
        }
    )
        .withAuthClient(oauth2Client)
        .execute(function (err, data) {
            if (!!err)
                errorCallback(err);
            else
                successCallback(data);
        });
};
var listTimeline = function (client, errorCallback, successCallback) {
    client
        .mirror.timeline.list()
        .withAuthClient(oauth2Client)
        .execute(function (err, data) {
            if (!!err)
                errorCallback(err);
            else
                successCallback(data);
        });
};
var grabToken = function (code, errorCallback, successCallback) {
    oauth2Client.getToken(code, function (err, tokens) {
        if (!!err) {
            errorCallback(err);
        } else {
            console.log('tokens', tokens);
            oauth2Client.credentials = tokens;
            successCallback();
        }
    });
};

// app.get('/', function (req, res) {
//     if (!oauth2Client.credentials) {
//         // generates a url that allows offline access and asks permissions
//         // for Mirror API scope.
//         var url = oauth2Client.generateAuthUrl({
//             access_type: 'offline',
//             scope: 'https://www.googleapis.com/auth/glass.timeline'
//         });
//         res.redirect(url);
//     } else {
//         gotToken();
//     }
//     res.write('Glass Mirror API with Node');
//     res.end();

// });

app.get('/', passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/userinfo.profile',
                                            'https://www.googleapis.com/auth/userinfo.email'] }),
  function(req, res){
    // The request will be redirected to Google for authentication, so this
    // function will not be called.
  });

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/oauth2callback', function (req, res) {
    // if we're able to grab the token, redirect the user back to the main page
    grabToken(req.query.code, failure, function () {
        res.redirect('/');
    });
});
app.post('/reply', function(req, res){
    console.log('replied',req);
    res.end();
});
app.post('/location', function(req, res){
    console.log('location',req);
    res.end();
});

http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});
