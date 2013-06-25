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
var screenShareDiv = document.getElementsByClassName("right")[0];
var interval;

lastViewerUrlQuery.on("child_added", function( snapshot ){
  console.log( "=======" );
  console.log( snapshot.val().viewerUrl );
  var screenShareIframeSource = $("#screenShareIframe").html();
  var template2 = Handlebars.compile( screenShareIframeSource ); 
  var iframeHtml = template2({screenLeapViewerUrl: snapshot.val().viewerUrl });
  console.log( iframeHtml );

  if ( document.getElementById("shareButtonContainer").innerHTML != "" ){
    document.getElementById("shareButtonContainer").innerHTML = "";

    // add viewerUrl link
    screenShareLinkNode = document.createElement("a");
    screenShareLinkNode.href = snapshot.val().viewerUrl + "&showStop=true&showResize=true";
    screenShareLinkNode.innerText = "open the screen share window in a new window";
    linkDiv = document.createElement("div");
    linkDiv.appendChild( screenShareLinkNode );
    linkDiv.style.margin = "5px 0";
    document.getElementById("stopButtonContainer").appendChild( linkDiv );
  }

  document.getElementById("iframeDiv").innerHTML = iframeHtml;

});

lastViewerUrlQuery.on("child_removed", function(oldChildSnapShot){
  console.log('clearing out the divs');
  document.getElementById("iframeDiv").innerHTML = "";
  document.getElementById("stopButtonContainer").innerHTML = "";  
  document.getElementById("shareButtonContainer").innerHTML = htmlForScreenShareButton;
  document.getElementById("alertMsgBox").innerHTML = "Screen share ended";
  document.getElementById("alertMsgBox").style.display = "block";
  interval = setInterval( clearMsgBox , 3000);

});

function clearMsgBox(){
  document.getElementById("alertMsgBox").style.display = "none";
  document.getElementById("alertMsgBox").innerHTML = "";
  clearInterval( interval );
}

var screenShareData;
function shareScreenApplet(){

  var http = new XMLHttpRequest();
  var url = '/screenleap';
  http.open("GET", url, true); 

  http.onreadystatechange = function(){
    if (http.readyState == 4 && http.status == 200 ){
      screenShareData = JSON.parse( http.responseText );
      console.log( screenShareData );

      screenLeapExtension( screenShareData );
      
      roomDataRef.push().set({ viewerUrl : screenShareData.viewerUrl });
    }
  }

  http.send(null);  
}

function screenLeapExtension( screenShareData ){
  screenleap.checkIsExtensionInstalled(function() {
      console.log("checking extension");
      screenleap.startScreenShare('EXTENSION', screenShareData );
      document.getElementById("stopButtonContainer").innerHTML = "<button class='btn' onclick='screenleap.stopSharing()'>Stop Sharing</button>";
      
  }, function() {
      screenleapInstallExtension(function() {
          screenleap.startScreenShare('EXTENSION', screenShareData);
          document.getElementById("stopButtonContainer").innerHTML = "<button class='btn' onclick='screenleap.stopSharing()'>Stop Sharing</button>";
      }, function(errorMessage) {
          screenShareDiv.innerHTML = "<p>Unable to install the sharing extension for " + errorMessage + ". Visit <a href='http://screenleap.com'>screenleap.com</a> to find out more about screen sharing using screenleap.</p>";
      });
  });

}

screenShareEnded = function(){
  roomDataRef.remove();
}

screenleap.screenShareStarted = function() {
  document.getElementById("alertMsgBox").innerHTML = "Your screen is now shared";
  document.getElementById("alertMsgBox").style.display = "block";
  interval = setInterval( clearMsgBox , 4000);
};

screenleap.screenShareEnded = screenShareEnded;
