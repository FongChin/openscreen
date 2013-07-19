//** 
//  JS for screen sharing using extension
//**
//
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

var roomDataRef = new Firebase( "https://openscreen.firebaseio.com/" + roomId );
var lastViewerUrlQuery = roomDataRef.endAt().limit(1);
// screen share publisher
isPublisher = false;

roomDataRef.on("child_added", function(snapshot){
  console.log("=======");
  console.log(snapshot.val());
  console.log(snapshot.val().viewerUrl);
  var screenShareIframeSource = $("#screenShareIframe").html();
  var template2 = Handlebars.compile( screenShareIframeSource ); 
  var iframeHtml = template2({screenLeapViewerUrl: snapshot.val().viewerUrl });
  console.log(iframeHtml);

  document.getElementById("shareButtonContainer").innerHTML = "";

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

function alertMsg(html){
  html += " <button class='btn btn-mini' id='hideBox' onclick='hideMsgBox();' >Okay</button>"
  document.getElementById("alertMsgBox").innerHTML = html;
  document.getElementById("alertMsgWrapper").style.display = "inline-table";
}

function hideMsgBox(){
  document.getElementById("alertMsgWrapper").style.display = "none";
  document.getElementById("alertMsgBox").innerHTML = "";
}

roomDataRef.on("child_removed", function(oldChildSnapShot){
  console.log('clearing out the divs');
  document.getElementById("iframeDiv").innerHTML = "";
  document.getElementById("stopButtonContainer").innerHTML = "";  
  document.getElementById("shareButtonContainer").innerHTML = htmlForScreenShareButton;

  alertMsg("Screen share ended");
});

function screenIsNotSharing(){
  // screenleap extension is not being used, then get screenshare data and start screensharing
  console.log("screen is not sharing");
  var http = new XMLHttpRequest();
  var url = '/screenleap';

  http.onreadystatechange = function(){
    if (http.readyState == 4 && http.status == 200 ){
      screenShareData = JSON.parse( http.responseText );

      console.log( screenShareData );

      isPublisher = true;
      // event listener for active screenshare only for publishers
      roomDataRef.onDisconnect().remove();

      // hide the screenshare button for publisher, so he doesn't click on it twice
      document.getElementById("shareButtonContainer").innerHTML = "";

      // start the screen share
      screenleap.startSharing( "EXTENSION" , screenShareData );
      document.getElementById("stopButtonContainer").innerHTML = "<button class='btn' onclick='screenleap.stopSharing()'>Stop Sharing</button>";
      roomDataRef.push().set({ viewerUrl : screenShareData.viewerUrl });

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

function startScreenShare (){
  console.log( "check if screen is sharing"); 

    isInstalled = function(){
      screenleap.checkIsExtensionEnabled(function(){
        console.log("extension is installed and enabled");
        // need to check if the extension is in use. if not, share the screen
         screenleap.checkIsSharing(screenIsSharing, screenIsNotSharing, "EXTENSION"); 
      }, function(){
        console.log("extension is installed but not enabled"); 
        alertMsg("Your screenleap extension is installed but not enabled. Please enable to share screen.");
      });
    }
  
    isNotInstalled = function(){
      temphtml = "Extension is not installed. <a target='_blank' href='https://chrome.google.com/webstore/detail/screenleap/hpcipbhehomfgjbgnajdhiahhdeeffbg'>Install</a> the extension and try again.";
      alertMsg(temphtml);
    }
    screenleap.checkIsExtensionInstalled( isInstalled, isNotInstalled );

}



