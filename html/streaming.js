// We make use of this 'server' variable to provide the address of the
// REST Janus API. By default, in this example we assume that Janus is
// co-located with the web server hosting the HTML pages but listening
// on a different port (8088, the default for HTTP in Janus), which is
// why we make use of the 'window.location.hostname' base address. Since
// Janus can also do HTTPS, and considering we don't really want to make
// use of HTTP for Janus if your demos are served on HTTPS, we also rely
// on the 'window.location.protocol' prefix to build the variable, in
// particular to also change the port used to contact Janus (8088 for
// HTTP and 8089 for HTTPS, if enabled).
// In case you place Janus behind an Apache frontend (as we did on the
// online demos at http://janus.conf.meetecho.com) you can just use a
// relative path for the variable, e.g.:
//
//     var server = "/janus";
//
// which will take care of this on its own.
//
//
// If you want to use the WebSockets frontend to Janus, instead, you'll
// have to pass a different kind of address, e.g.:
//
//     var server = "ws://" + window.location.hostname + ":8188";
//
// Of course this assumes that support for WebSockets has been built in
// when compiling the gateway. WebSockets support has not been tested
// as much as the REST API, so handle with care!
//
//
// If you have multiple options available, and want to let the library
// autodetect the best way to contact your gateway (or pool of gateways),
// you can also pass an array of servers, e.g., to provide alternative
// means of access (e.g., try WebSockets first and, if that fails, fall
// back to plain HTTP) or just have failover servers:
//
//    var server = [
//      "ws://" + window.location.hostname + ":8188",
//      "/janus"
//    ];
//
// This will tell the library to try connecting to each of the servers
// in the presented order. The first working server will be used for
// the whole session.
//
// var server = null;
// if(window.location.protocol === 'http:')
//   server = "http://" + window.location.hostname + ":8088/janus";
// else
//   server = "https://" + window.location.hostname + ":8089/janus";
var server = "/janus";

var janus = null;
var streaming = null;
var opaqueId = "streaming-"+Janus.randomString(12);

var started = false;
var spinner = null;

var selectedStream = null;


$(document).ready(function() {
  // Initialize the library (all console debuggers enabled)
  Janus.init({debug: "all", callback: function() {
    // Use a button to start the demo
    $('#start').click(function() {
      if(started)
        return;
      started = true;
      $(this).attr('disabled', true).unbind('click');
      // Make sure the browser supports WebRTC
      if(!Janus.isWebrtcSupported()) {
        bootbox.alert("No WebRTC support... ");
        return;
      }
      // Create session
      janus = new Janus(
        {
          server: server,
          success: function() {
            // Attach to streaming plugin
            janus.attach(
              {
                plugin: "janus.plugin.streaming",
                opaqueId: opaqueId,
                success: function(pluginHandle) {
                  streaming = pluginHandle;
                  Janus.log("Plugin attached! (" + streaming.getPlugin() + ", id=" + streaming.getId() + ")");
                  // Setup streaming session
                  updateStreamsList();
                  $('#start').removeAttr('disabled').html("Stop")
                    .click(function() {
                      $(this).attr('disabled', true);
                      janus.destroy();
                      $('#start').attr('disabled', true).html("Bye").unbind('click');
                    });
                },
                error: function(error) {
                  Janus.error("  -- Error attaching plugin... ", error);
                  bootbox.alert("Error attaching plugin... " + error);
                },
                onmessage: function(msg, jsep) {
                  Janus.debug(" ::: Got a message :::");
                  Janus.debug(JSON.stringify(msg));
                  var result = msg["result"];
                  if(result !== null && result !== undefined) {
                    if(result["status"] !== undefined && result["status"] !== null) {
                      var status = result["status"];
                      if(status === 'starting')
                        $('#status').removeClass('hide').text("Starting, please wait...").show();
                      else if(status === 'started')
                        $('#status').removeClass('hide').text("Started").show();
                      else if(status === 'stopped')
                        stopStream();
                    }
                  } else if(msg["error"] !== undefined && msg["error"] !== null) {
                    bootbox.alert(msg["error"]);
                    stopStream();
                    return;
                  }
                  if(jsep !== undefined && jsep !== null) {
                    Janus.debug("Handling SDP as well...");
                    Janus.debug(jsep);
                    // Answer
                    streaming.createAnswer(
                      {
                        jsep: jsep,
                        media: { audioSend: false, videoSend: false },  // We want recvonly audio/video
                        success: function(jsep) {
                          Janus.debug("Got SDP!");
                          Janus.debug(jsep);
                          var body = { "request": "start" };
                          streaming.send({"message": body, "jsep": jsep});
                        },
                        error: function(error) {
                          Janus.error("WebRTC error:", error);
                          bootbox.alert("WebRTC error... " + JSON.stringify(error));
                        }
                      });
                  }
                },
                onremotestream: function(stream) {
                  Janus.debug(" ::: Got a remote stream :::");
                  Janus.debug(JSON.stringify(stream));
                  if($('#remoteaudio').length === 0)
                    $('#stream').append('<audio class="rounded centered hide" id="remoteaudio" autoplay/>');
                  // Show the stream and hide the spinner when we get a playing event
                  $("#remoteaudio").bind("playing", function () {
                    $('#waitingaudio').remove();
                    $('#remoteaudio').removeClass('hide');
                    if(spinner !== null && spinner !== undefined)
                      spinner.stop();
                    spinner = null;
                    // Make the record spin instead
                    startRecordSpinning($('#vinyldisc'), $('#vinylhighlights'));
                  });
                  Janus.attachMediaStream($('#remoteaudio').get(0), stream);
                },
                oncleanup: function() {
                  Janus.log(" ::: Got a cleanup notification :::");
                  $('#waitingaudio').remove();
                  $('#remoteaudio').remove();
                  stopRecordSpinning($('#vinyldisc'), $('#vinylhighlights'));
                }
              });
          },
          error: function(error) {
            Janus.error(error);
            bootbox.alert(error, function() {
              window.location.reload();
            });
          },
          destroyed: function() {
            window.location.reload();
          }
        });
    });
  }});
  $('#vinylhighlights').data('step', 0);
});

function updateStreamsList() {
  var body = { "request": "list" };
  Janus.debug("Sending message (" + JSON.stringify(body) + ")");
  streaming.send({"message": body, success: function(result) {
    if(result === null || result === undefined) {
      bootbox.alert("Got no response to our query for available streams");
      return;
    }
    if(result["list"] !== undefined && result["list"] !== null) {
      $('#streams').removeClass('hide').show();
      var list = result["list"];
      Janus.log("Got a list of available streams");
      Janus.debug(list);
      for(var mp in list) {
        Janus.debug("  >> [" + list[mp]["id"] + "] " + list[mp]["description"] + " (" + list[mp]["type"] + ")");
        selectedStream = list[mp]["id"];
        break;
      }
      startStream();
    }
  }});
}

function startStream() {
  Janus.log("Selected stream id #" + selectedStream);
  if(selectedStream === undefined || selectedStream === null) {
    return;
  }
  var body = { "request": "watch", id: parseInt(selectedStream) };
  streaming.send({"message": body});
  // No remote stream yet
  $('#stream').append('<audio class="rounded centered" id="waitingaudio" />');
  if(spinner == null) {
    var target = document.getElementById('start');
    spinner = new Spinner({top:100}).spin(target);
  } else {
    spinner.spin();
  }
}

function stopStream() {
  var body = { "request": "stop" };
  streaming.send({"message": body});
  streaming.hangup();
  $('#status').empty().hide();
}

function startRecordSpinning(disc, highlights) {
  disc.stop().animate({rotate: '+=20deg'}, 800, 'easeInCubic', function() {
    // 5 deg every 25 ms is 33 1/3rd RPM
    var intervalHandle = setInterval(
      function () {
        disc.animate({rotate: '+=5deg'}, 0);
      },
      25
    );
    disc.data('intervalHandle', intervalHandle);
  });
  var intervalHandle = setInterval(
    function () {
      var step = highlights.data('step');
      var rx = Math.sin(step*(Math.PI/180));
      var ry = Math.cos(step*(Math.PI/180));
      var rrot = 0.25*(Math.floor(Math.sin(step*(Math.PI/(180*3)))*8)-1);
      highlights.animate({
        left: rx + 'px',
        top: ry + 'px',
        rotate: rrot + 'deg'
      }, 0);
      highlights.data('step', step + 5);
    },
    25
  );
  highlights.data('intervalHandle', intervalHandle);
}

function stopRecordSpinning(disc, highlights) {
  var intervalHandle = disc.data('intervalHandle');
  clearInterval(intervalHandle);
  disc.stop().animate({rotate: '+=20deg'}, 800, 'easeOutCubic');
  setTimeout(
    function () {
      var intervalHandle = highlights.data('intervalHandle');
      clearInterval(intervalHandle);
      highlights.stop();
    },
    800
  );
}
