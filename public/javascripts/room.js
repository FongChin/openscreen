//** 
//  JS for screen sharing using extension
//**

// Enable console logs for debugging
TB.setLogLevel(TB.DEBUG);

session = TB.initSession(sessionId);
session.addEventListener("sessionConnected", sessionConnectedHandler);
session.addEventListener("streamCreated", streamCreatedHandler);

session.connect(apiKey, token);

function sessionConnectedHandler(event) {
  subscribeToStreams(event.streams);
  // Create publisher and start streaming into the session
  var publisher = TB.initPublisher(apiKey, 'myPublisherDiv');
  session.publish(publisher);
}

function subscribeToStreams(streams) {
  for (var i = 0; i < streams.length; i++) {
    var stream = streams[i];
    if (stream.connection.connectionId != session.connection.connectionId) {
      // create the div to put the subscriber element into  
      var div = document.createElement('div');
      div.setAttribute('id', 'stream' + stream.streamId );
      document.getElementById("videoDiv").appendChild( div );
      session.subscribe(stream, 'stream' + stream.streamId );

    }
  }
}

function streamCreatedHandler(event) {
  subscribeToStreams(event.streams);
}
//**
//
// OpenTok API integration ends here 
//
//**

//**
//
// ScreenLeap API integration starts here
//
//**
var roomDataRef = new Firebase("https://openscreen.firebaseio.com/" + roomId);
screenIsSharing = false;
// set true if the user is screen share publisher
isPublisher = false;

roomDataRef.on("child_added", function(snapshot){
  var screenShareIframeSource = $("#screenShareIframe").html();
  var template2 = Handlebars.compile(screenShareIframeSource); 
  var iframeHtml = template2({screenLeapViewerUrl: snapshot.val().viewerUrl});
  console.log(iframeHtml);

  document.getElementById("shareButtonContainer").innerHTML = "";
  screenIsSharing = true;

  // add viewerUrl link
  screenShareLinkNode = document.createElement("a");
  screenShareLinkNode.href = snapshot.val().viewerUrl + "&showStop=true&showResize=true";
  screenShareLinkNode.innerText = "open the screen share window in a new window";
  linkDiv = document.createElement("div");
  linkDiv.appendChild( screenShareLinkNode );
  linkDiv.style.margin = "5px 0";
  document.getElementById("stopButtonContainer").appendChild( linkDiv );

  document.getElementById("iframeDiv").innerHTML = ((isPublisher)? "<h4>You are sharing screen now!</h4>" : iframeHtml );
});

roomDataRef.on("child_removed", function(oldChildSnapShot){
  console.log('clearing out the divs');
  document.getElementById("iframeDiv").innerHTML = "";
  document.getElementById("stopButtonContainer").innerHTML = "";  
  document.getElementById("shareButtonContainer").innerHTML = htmlForScreenShareButton;

  alertMsg("Screen share ended");
  screenIsSharing = false;
});

function alertMsg(html){
  html += " <button class='btn btn-mini' id='hideBox' onclick='hideMsgBox();' >Okay</button>"
  document.getElementById("alertMsgBox").innerHTML = html;
  document.getElementById("alertMsgWrapper").style.display = "inline-table";
}

function hideMsgBox(){
  document.getElementById("alertMsgWrapper").style.display = "none";
  document.getElementById("alertMsgBox").innerHTML = "";
}

function screenIsNotSharing(){
  // screenleap extension is not being used. Get screenshare data and start screensharing
  var http = new XMLHttpRequest();
  var url = '/screenleap';

  http.onreadystatechange = function(){
    if (http.readyState == 4 && http.status == 200){
      screenShareData = JSON.parse(http.responseText);
      isPublisher = true;

      // event listener for active screenshare only for publishers
      roomDataRef.onDisconnect().remove();

      // hide the screenshare button for publisher, so the user doesn't click on it twice
      document.getElementById("shareButtonContainer").innerHTML = "";

      // start the screen share
      screenleap.startSharing("EXTENSION" , screenShareData);
      document.getElementById("stopButtonContainer").innerHTML = "<button class='btn' onclick='screenleap.stopSharing()'>Stop Sharing</button>";

      // save viewerUrl on firebase
      roomDataRef.push().set({viewerUrl : screenShareData.viewerUrl});
    }else{
      document.getElementById("shareButtonContainer").innerHTML = htmlForScreenShareButton;
    }
  }
  http.open("POST", url, true); 
  http.send(null);  
}

function screenIsSharing(){
  // notify the user that screenshare extension is in use 
  alertMsg("Your screenleap extension is in use.");
}

function isInstalled(){
  screenleap.checkIsExtensionEnabled(function(){
    // extension is installed and enabled
    // next, need to check if the extension is in use. if not, share the screen
     screenleap.checkIsSharing(screenIsSharing, screenIsNotSharing, "EXTENSION"); 
  }, function(){
    // extension is installed but not enabled
    alertMsg("Your screenleap extension is installed but not enabled. Please enable to share screen.");
  });
}

function isNotInstalled(){
  screenleap.installExtension(isInstalled, function(){});
}

function startScreenShare (){
  // check if screenleap extension is installed
  // isInstalled function will be called if the extension is installed 
  // Otherwise, call isNotInstalled()
  screenleap.checkIsExtensionInstalled(isInstalled, isNotInstalled);
}

