var canvas = $("#canvas")[0];

canvas.scale = 1;
canvas.position = {'x': 0, 'y': 0};

const M1DEFAULT = 1;
const M1CTRL = 2;
const M1SHIFT = 3;
const M1SHIFTCTRL = 4;

var mouse_state;
var last_transform;

canvas.loadImg = (url, callback) => {
    if(userHasAuth()) {
        var image = new Image();
        image.onload = function (){
            canvas.url = url;
            //canvas.setImg(url);
            canvas.width = image.width; canvas.height = image.height;
            canvas.sendCanvas();
        };
        image.onerror = function(err) { console.log( err)};
        image.src = url;
    }
}
canvas.setImg = (url) => {
    canvas.style.background = `url(${url}) no-repeat local white`;
    console.log(" finished setting image ")
}

canvas.clearCanvas = () => {
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}
canvas.sendCanvas = () => {
    wsend(JSON.stringify({'type':'canvas', 'data': {'dim': {'width': canvas.width, 'height': canvas.height}, 'url': canvas.url}}));
}
canvas.setCanvas = (cdata) => {
    console.log(cdata)
    canvas.clearCanvas();
    canvas.setImg(cdata.url);
    if(canvas.width != cdata.dim.width || canvas.height != cdata.dim.height) {
        canvas.width = cdata.dim.width;
        canvas.height = cdata.dim.height;
        canvas.scale = (0.8 * $("#scroll_field")[0].clientWidth / canvas.width);
        canvas.position.x = 0.2 * $("#scroll_field")[0].clientWidth;
        canvas.position.y = 0.2 * $("#scroll_field")[0].clientWidth;
    }
    for(bulkop of cdata.image) {
        canvas.drawMany(bulkop.data.operation);
    }
    canvas.setTransform();
} 
var csx, csy;
var operation = [];
$('body').on("mousedown mouseup mousemove mousewheel keydown",function(evt){

    var cx = evt.pageX - $("#canvas").offset().left + $('#scroll_field')[0].scrollLeft;
    cx /= canvas.scale;
    var cy = evt.pageY - $("#canvas").offset().top + $('#scroll_field')[0].scrollTop;
    cy /= canvas.scale;

    switch(evt.type) {
        
        case 'mousemove':
            {
                csx = cx;
                csy = cy;

                if(mouse_state) {
                    if(evt.shiftKey || evt.buttons == 4) {
            
                        //move event
                        canvas.position.x += (cx - last_transform.x);
                        canvas.position.y += (cy - last_transform.y);
            
                    }
                    else {
            
                        //draw event
                        const messageBody = {'type': 'draw', 'data': {'last': {x: lastpos.x, y: lastpos.y}, 'new': {x: cx, y: cy}, 'id': getMe().id, 'brush': getMe().brush}};
                        operation.push(messageBody);
                        canvas.draw(messageBody.data);
                        wsend(JSON.stringify(messageBody));

                    }
                } else {
                    last_transform = {x: (cx), y: (cy)};
                }
                setTimeout(function(){lastpos = {x: (cx), y: (cy)}}, 10);
            }
        break;
        case 'mousedown':
            {
                operation = [];
                evt.mdown = true;
                mouse_state = evt;
            }
        break;
        case 'mouseup' :
            {
                mouse_state = null;
                console.log(operation)
                //canvas.drawMany(operation);
                wsend(JSON.stringify({'type': 'bulkdraw', 'data': {operation}}));
            }
        break;
        case 'mousewheel' :
            {
                canvas.scale += (-0.1 * (canvas.scale/2) * (evt.originalEvent.deltaY)/Math.abs((evt.originalEvent.deltaY)));
                canvas.scale = Math.min(10, Math.max(0.05, canvas.scale))
            }
        break;
        case 'keydown' :
            {
                if( evt.key == " " || (evt.ctrlKey && window.navigator.userAgent.search("Mac") != -1)) 
                {
                    evt.preventDefault();
                }
                if(evt.key == 'z' && evt.ctrlKey) {
                    evt.preventDefault();
                    wsend(JSON.stringify({'type':'op', 'data':{'type':'userundo'}}));
                }
            }
        break;
    }
    canvas.setTransform();
}); 

canvas.setTransform = () => {
    canvas.style.transformOrigin = '0px 0px'
    canvas.style.transform = `scale(${canvas.scale}) translateX(${canvas.position.x}px) translateY(${canvas.position.y}px)`;
}
/*
document.onmousemove = (evt) => {
    var cx = evt.pageX - $("#canvas").offset().left + $('#scroll_field')[0].scrollLeft;
    cx /= canvas.scale;
    var cy = evt.pageY - $("#canvas").offset().top + $('#scroll_field')[0].scrollTop;
    cy /= canvas.scale;
    if(mouse_state) {
        if(evt.shiftKey || evt.buttons == 4) {

            //move event
            canvas.position.x += (cx - last_transform.x);
            canvas.position.y += (cy - last_transform.y);

        }
        else {

            //draw event
            const messageBody = {'type': 'draw', 'data': {'last': {x: lastpos.x, y: lastpos.y}, 'new': {x: cx, y: cy}, 'id': myUser.id, 'brush': myUser.brush}};
            canvas.draw(messageBody.data);
            wsend(JSON.stringify(messageBody));
            
        }
    } else {
        last_transform = {x: (cx), y: (cy)};
    }
    canvas.style.transform = `scale(${canvas.scale}) translateX(${canvas.position.x}px) translateY(${canvas.position.y}px)`;
    setTimeout(function(){lastpos = {x: (cx), y: (cy)}}, 10);
}
document.onmousedown = (evt) => { 
    evt.mdown = true;
    mouse_state = evt;
}
document.onmouseup = (evt) => { mouse_state = null; }

document.onwheel = (evt) => {
    console.log(evt);
    canvas.scale += (0.1 * (evt.deltaY)/Math.abs((evt.deltaY)));
    canvas.style.transform = `scale(${canvas.scale}) translateX(${canvas.position.x}px) translateY(${canvas.position.y}px)`;
}

window.addEventListener('keydown', function(e) {
    if( e.key == " " || 
        (e.ctrlKey && this.navigator.userAgent.search("Mac") != -1)) 
    {
        e.preventDefault();
    }
});
*/
canvas.draw = function(pos) {
  if (canvas.getContext) {
      var ctx = canvas.getContext('2d');
      ctx.lineWidth = pos.brush.scaleWithCanvas ? pos.brush.radius/canvas.scale : pos.brush.radius;
      ctx.beginPath();
      ctx.moveTo(pos.last.x, pos.last.y)
      ctx.strokeStyle = pos.brush.color;
      ctx.lineTo(pos.new.x, pos.new.y);
      ctx.stroke();
  }
}
canvas.drawMany = (data) => {
    for(op of data) {
        canvas.draw(op.data);
    }
}