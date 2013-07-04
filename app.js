var express = require("express");
var querystring = require('querystring');
var http = require('http');
var fs = require('fs');

var app = express();

app.set("views", __dirname);
app.set("view engine", "ejs");
app.use(express.favicon(__dirname + '/public/favicon.ico'));
app.use(express.static(__dirname + '/public'));
app.use(express.favicon(__dirname + '/public/favicon.ico'));

var OTKEY = process.env.OTKEY;
var OTSECRET = process.env.OTSECRET;

var OpenTok = require('opentok');
var opentok = new OpenTok.OpenTokSDK( OTKEY , OTSECRET );

var urlSessions = {};
var screenShareData;

app.get('/', function(req, res){
  res.render("index", {});
});

app.get('/room/:id', function(req, res){
  console.log( process.env.OTKEY );
  if ( urlSessions[ req.params.id ] == undefined ){
    opentok.createSession(function(result){
      sessionId = result;
      urlSessions[ req.params.id ] = sessionId;
      sendResponse( sessionId, res, req.params.id );
    });
  }else{
    sessionId = urlSessions[ req.params.id ];
    sendResponse( sessionId, res, req.params.id );
  }
});

app.post('/screenleap', function(req, res){
  var post_options = {
    host: 'api.screenleap.com',
    path: '/v2/screen-shares',
    method: 'post',
    headers: {
      'accountid' : process.env.SL_ACCOUNT_ID,
      'authtoken' : process.env.SL_AUTH_TOKEN 
    }
  };
  var post_req = http.request(post_options, function(response){
    response.on('data', function(chunk){
      screenShareData = JSON.parse( chunk );
      res.contentType( 'json' );
      res.send( chunk );
    });
  });
  post_req.write("");
  post_req.end();
});

function sendResponse( sessionId, response, id ){
  var token = opentok.generateToken({sessionId: sessionId});
  data = {
    OTkey: OTKEY,
    token: token,
    sessionId: sessionId,
    roomId: id
  }
  response.render( "room", data );
}

app.listen( process.env.PORT || 3000 );

