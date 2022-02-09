var sendTime = 0;
var receiveTime = 0;

var randomColor = () => {
  return 'rgb(' + Number.parseInt((Math.random()*100) + 155) + ', ' + Number.parseInt((Math.random()*100) + 155) + ', ' + Number.parseInt((Math.random()*100) + 155) + ')';
  //return 'hsl(' + Number.parseInt(Math.random()*360) + ', ' + Number.parseInt((Math.random()*40) + 60) + ', ' + Number.parseInt((Math.random()*40) + 60) + ')';
}

function wsend(msg) {
  console.log(msg)
  if(ws && ws.readyState == 1) {
    sendTime = Date.now();
    return ws.send(msg);
  }
  return console.log("failed to send " + msg)
}
function wclose(code) {
  if(ws && ws.readyState == 1) {
    return wsend(JSON.stringify({'type':'close', 'data': code}));
  }
}

function getCookie(index) {return document.cookie.split(';').length < index ? "" : document.cookie.split(';')[index].trim()}
function findCookie(regex) {
  for(cookie of document.cookie.split(';')) {
    if(cookie.search(regex)) { return cookie; }
  }
  return false;
}

function advJSONParse(jstr) {
  var json = JSON.parse(jstr);
  getLeaf(json);
  function getLeaf(j) {
    if(typeof j == 'string') { return j; }
    for (var key of Object.keys(j)) {
      if(typeof j[key] === 'object' && j[key].length == 1) { j[key] = j[key][0] }
      getLeaf(j[key]);
    }
  }
  return json;
}

function toggleLoading(elem) {
  $(elem).toggleClass('loading');
}

document.resetZoom = () => {
  document.body.style.zoom = 1;
  document.body.style.msTransform = 'scale(1)';
  document.body.style.transform = 'scale(1)';
}

var ws;
var container;
var field;
var clear;
var errTooltip;


window.onload = () => {

  document.resetZoom();

  container = document.getElementById("main");
  field = document.getElementById("scroll_field");
  $("#users")[0] = document.getElementById("users");
  clear = document.getElementById("clear");
  errTooltip = document.getElementById("err_tooltip")
  $.getScript("landing.js", function() {
    console.log("loaded landing.js")
  });
  
  window.onbeforeunload = () => {
    //updates go here before reload
    wclose(1000);
  }

}

const tryCode = (code, callback) => {
  fetch(`/join?code=${code}`, {method: "GET"})
    .then(response => response.json())
    .then(data => { console.log(data); callback(data) });
}

/*  allow for script caching
*/

  $.ajaxSetup({
    cache: true
  });
  jQuery.cachedScript = function( url, options ) {
    options = $.extend( options || {}, {
      dataType: "script",
      cache: true,
      url: url
    });
    return jQuery.ajax( options );
  };

/*
*/

const fetchScripts = async () => {
  return new Promise((resolve, reject) => {

    $.cachedScript( "canvas.js" ).done(function( script, textStatus ) {
      console.log( textStatus && "loaded cached canvas" );
    }).fail(function( jqxhr, settings, exception ) {
      console.log("canvas not cached");

      $.getScript("canvas.js")

      .done(function( script, textStatus ) {
        console.log( textStatus && "loaded canvas" );
      })
      .fail(function( jqxhr, settings, exception ) {
        console.log("error loading canvas")
        reject(exception);
      });

    })

    $.cachedScript( "user.js" ).done(function( script, textStatus ) {
      console.log( textStatus && "loaded cached user" );
      resolve();
    }).fail(function( jqxhr, settings, exception ) {
      console.log("user not cached");

      $.getScript("user.js")

      .done(function( script, textStatus ) {
        console.log( textStatus && "loaded user" );
        resolve();
      })
      .fail(function( jqxhr, settings, exception ) {
        console.log("error loading user")
        reject(exception);
      });

    })

    /*
    $.getScript("canvas.js")

    .done(function( script, textStatus ) {
      console.log( textStatus && "loaded canvas" );
    })
    
    .then(function() {
      
      $.getScript("user.js")
      
      .done(function( script, textStatus ) {
        console.log( textStatus && "loaded user" );
        resolve();

      })
      
      .fail(function( jqxhr, settings, exception ) {
        console.log("error loading user")
        reject(exception);

      });

    })
    
    .fail(function( jqxhr, settings, exception ) {
      console.log("error loading canvas")
      reject(exception);

    });*/
    
    // $.getScript("canvas.js")
    // .done(function( script, textStatus ) {
    //   console.log( textStatus && "loaded canvas" );
    //   $.getScript("user.js")
    //   .done(function( script, textStatus ) {
    //     console.log( textStatus && "loaded user" );
    //     resolve();
    //   })
    //   .fail(function( jqxhr, settings, exception ) {
    //     console.log("error loading user")
    //     reject(exception);
    //   });
    // })
    // .fail(function( jqxhr, settings, exception ) {
    //   console.log("error loading canvas")
    //   reject(exception);
    // });
  });
    /*
    $.getScript("canvas.js", function() {
      console.log("loaded canvas.js")
      $.getScript("user.js", function() {
        console.log("loaded user.js")
        resolve();
      });
    });
  });*/
}

const joinBoard = async (board, callback) => {
  fetchScripts().then(function() {
    socketStart(board, callback);
  }, function(error) {
    console.log(error);
  });
}

const socketStart = async (board, callback) => {

    const serverAddress = `ws://3.84.15.164:${board.port}`;
  
    console.log(`Connecting to ${serverAddress}`);

    try {
      let retries = 0;
      while (retries < 50) {
        console.log(`establishing connection... retry #${retries}`);
        await runSession(serverAddress, callback);
        await new Promise(r => setTimeout(r, 1000));
        retries++;
      }
  
      console.log("Reached maximum retries, giving up.");
    } catch (e) {
      console.log(e);
    }
  
  };

var lastpos = {x: 0, y: 0}
var id;
var users = []

  ///////
 ///////

  async function runSession(address, callback) {

    try {
      ws = new WebSocket(address);
    } catch (err) { console.log(err) }

    ws.addEventListener("open", () => {
      console.log("connected to server");
      sendBrush({'color': randomColor(), 'radius': 5, 'scaleWithCanvas': true});
    });
  
    ws.addEventListener("message", ({ data }) => {

      receiveTime = Date.now();
      setResponseTime(receiveTime - sendTime);

      if(data instanceof Blob) {
        try {
          data.text().then(text => {
            text = JSON.parse(text);
            canvas.draw(text.data);
          });
        } catch(err) {
            console.log(err)
        }
      } else 
      {
        data = JSON.parse(data);
        switch(data.type) {

          case 'auth': {
            id = data.data.id;
            auth = data.data.auth;
            document.getElementById("id").innerText = data.data.auth + "_" + data.data.id
            break;
          }

          case 'canvas': {
            canvas.setCanvas(data.data[0], (canvas.url != data.data[0].url), callback);
            break;
          }
            
          case 'draw': {
            canvas.draw(data.data[0])
            break;
          }

          case 'get': {
            canvas.sendCanvas();
            break;
          }
            
          case 'users': {

            setUsers(data.data);
            break;

          }

          case 'op': {

            switch(data.data.type) {
              case 'userbrush':
                receiveBrush(data);
                break;
              case 'username':
                receiveName(data.data.data);
                break;
              case 'userundo':
                canvas.receiveUndo(data.data.data);
                break;
              case 'clearcanvas':
                canvas.clearCanvas();
                break;
              case 'canvasbg':
                canvas.setImg(data.data.data[0]);
                break;
              default:
                break;
            }
            break;

          }

          default: {
            console.log("received unknown message:");
            console.log(data);
            break;
          }
         
        }
      }
    });

    clear.onclick = (evt) => {
      ws.send(JSON.stringify({'type':'op', 'data':{'type':'clearcanvas', 'data':''}}));
    }
    clear.onmouseenter = (evt) => {
      if(!userHasAuth()) {
        errTooltip.currentElem = "clear";
        errTooltip.style.visibility = 'visible';
      }
    }
    clear.onmouseleave = (evt) => {
      if(errTooltip.currentElem = "clear") {
        errTooltip.style.visibility = 'hidden';
      }
    }
    clear.onmousemove = (evt) => {
      document.documentElement.style.setProperty('--mouse-x', evt.offsetX + 5 + "px");
      document.documentElement.style.setProperty('--mouse-y', evt.offsetY + 5 + "px");
    }


    window.onkeyup = function(evt) {
      if(evt.code == 'Space') {
        sendBrush({'color': randomColor(), 'radius': 5, 'scaleWithCanvas': true});
      }
    }

    window.onclose = () => {
      wclose(1000);
    }

    $("#pdfb")[0].onclick = function(e) {
      e.preventDefault();
      var t = Date.now();
      console.log("started getting")
      //toggleLoading($("#scroll_field"));
      return fetch("/", {body: new FormData($("#pdfpost")[0]), method: "POST"})
      .then(response => response.json())
      .then(data => {
        console.log(data)
        canvas.loadImg(data.url); 
        $("#pdfpr")[0].value = data.url; 
        console.log("took " + (Date.now() - t) + " ms");
      });
    }

    return new Promise((resolve) => {
      ws.addEventListener("close", (e) => {
        console.log("Connection lost with server.");
        console.log(e);
        //window.open(window.location.href, '_self');
        resolve();
      });
    });
  }
  