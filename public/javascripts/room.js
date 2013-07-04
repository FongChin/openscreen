// Enable console logs for debugging
TB.setLogLevel(TB.DEBUG);

session = TB.initSession( sessionId );
session.addEventListener("sessionConnected", sessionConnectedHandler);
session.addEventListener("streamCreated", streamCreatedHandler);

session.connect( apiKey, token );

function sessionConnectedHandler (event) {
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
var interval;

roomDataRef.on("child_added", function( snapshot ){
  console.log( "=======" );
  console.log( snapshot.val() );
  console.log( snapshot.val().viewerUrl );
  var screenShareIframeSource = $("#screenShareIframe").html();
  var template2 = Handlebars.compile( screenShareIframeSource ); 
  var iframeHtml = template2({screenLeapViewerUrl: snapshot.val().viewerUrl });
  console.log( iframeHtml );

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

roomDataRef.on("child_removed", function(oldChildSnapShot){
  console.log('clearing out the divs');
  document.getElementById("iframeDiv").innerHTML = "";
  document.getElementById("stopButtonContainer").innerHTML = "";  
  document.getElementById("shareButtonContainer").innerHTML = htmlForScreenShareButton;

  // notify the user that screenshare has ended
  document.getElementById("alertMsgBox").innerHTML = "Screen share ended";
  document.getElementById("alertMsgBox").style.display = "block";
  interval = setInterval( clearMsgBox , 3000);

});

function clearMsgBox(){
  document.getElementById("alertMsgBox").style.display = "none";
  document.getElementById("alertMsgBox").innerHTML = "";
  clearInterval( interval );
}

screenIsSharing = function(){
  alert("Your screenleap extension is currently in use");
  document.getElementById("shareButtonContainer").innerHTML = htmlForScreenShareButton; 
  return false;
}

makeScreenShareRequest = function(){
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

function startScreenShare(){
  console.log( "check if screen is sharing"); 
  // document.getElementById("shareButtonContainer").innerHTML = "";

   // screenleap.runAfterExtensionIsInstalled( makeScreenShareRequest );
    screenleap.runAfterExtensionIsInstalled(function(){
     screenleap.checkIsSharing(screenIsSharing, makeScreenShareRequest, "EXTENSION");      
   });

//  isInstalled = function(){
//    console.log("in isIstalled");
//    screenleap.checkIsExtensionEnabled(function(){
//      console.log("extension is installed and enabled");
//      // need to check if the extension is in use. if not, share the screen
//    }, function(){
//      console.log("extension is installed but not enabled"); 
//    });
//  }
//
//  isNotInstalled = function(){
//    console.log("extension is not installed yo, imma gon try to install");
//    screenleap.installExtension(function(){
//      console.log("successfully installed");
//    }, function(e){
//      console.log("we failed at installinggg");
//      console.log(e);
//    }
//    );
//  }
//  screenleap.checkIsExtensionInstalled( isInstalled, isNotInstalled );

}


screenleap.screenShareStarted = function() {
  document.getElementById("alertMsgBox").innerHTML = "Your screen is now shared";
  document.getElementById("alertMsgBox").style.display = "block";
  interval = setInterval( clearMsgBox , 4000);
};

screenleap.screenShareEnded = function(){ 
  roomDataRef.remove();
}
