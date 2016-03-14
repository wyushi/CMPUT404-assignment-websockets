(function () {

var canvas = document.getElementById('c'),
    star = document.getElementById('star'),
    host = window.location.host,
    context = canvas.getContext("2d"),
    W = canvas.width  = window.innerWidth-6,
    H = canvas.height = window.innerHeight-50,
    world = {},
    drawNext = true,
    counter = 0,
    wscounter = 0,
    socket = null;

console.log(star);

function debug(str) {
    var debugDiv = document.getElementById('debug');
    debugDiv.innerHTML = "" + str;
}

function requestJSON(url, callback) {
    var xhr = new XMLHttpRequest();

    xhr.open('GET', url, true);
    xhr.onload = function () {
        callback(JSON.parse(this.responseText));
    };
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.setRequestHeader("Accept", "application/json");
    xhr.send();
}

function send(data) {
    socket.send(JSON.stringify(data))
}

function draw(context, entity) {
    var x = entity["x"],
        y = entity["y"],
        r = entity["radius"]
        isStar = entity["starImage"];

    context.lineWidth = 3;
    context.fillStyle = entity["colour"];
    context.strokeStyle = context.fillStyle;

    context.beginPath();
    if (isStar) {
        context.drawImage(star, x - r/2, y - r/2, r, r);
    } else {
        context.arc(x, y, (r)?r:50, 0, 10.0 * Math.PI, false);
    }
    context.stroke();
}

function prepEntity(entity) {
    if (!entity["colour"]) {
        entity["colour"] = "#FF0000";
    }
    if (!entity["radius"]) {
        entity["radius"] = 50;
    }
    return entity;
}

function clearFrame() {
    context.moveTo(0,0);
    context.fillStyle = "#000";
    context.fillRect(0,0,W,H);
}

// This actually draws the frame
function renderFrame() {
    clearFrame();
    for (var key in world) {
        var entity = world[key];
        draw(context, prepEntity(entity));
    }
}

// Signals that there's something to be drawn
function drawNextFrame() {
    drawNext = true;
}

// This optionally draws the frame, call this if you're not sure if you should update
// the canvas
function drawFrame() {
    if (drawNext) {
        renderFrame();
        drawNext = false;
    }
}

// This is unpleasent, canvas clicks are not handled well
// So use this code, it works well on multitouch devices as well.

function getPosition(e) {
    if ( e.targetTouches && e.targetTouches.length > 0) {
        var touch = e.targetTouches[0];
        var x = touch.pageX  - canvas.offsetLeft;
        var y = touch.pageY  - canvas.offsetTop;
        return [x,y];
    } else {
        var rect = e.target.getBoundingClientRect();
        var x = e.offsetX || e.pageX - rect.left - window.scrollX;
        var y = e.offsetY || e.pageY - rect.top  - window.scrollY;
        var x = e.pageX  - canvas.offsetLeft;
        var y = e.pageY  - canvas.offsetTop;
        return [x,y];
    }
}

function addEntity(entity, data) {
    world[entity] = data;
    var ent = {};
    ent[entity] = data;
    send(ent);
}

function addEntityWithoutName(data) {
    //var name = "X"+Math.floor((Math.random()*100)+1);
    var name = "X"+(counter++)%100;
    addEntity(name,data);
}

// canvas + mouse/touch is complicated 
// I give you this because well the mouse/touch stuff is a total
// pain to get right. This has some out of context bug too.
mouse = (function() {
    // Now this isn't the most popular way of doing OO in 
    // Javascript, but it relies on lexical scope and I like it
    // This isn't 301 so I'm not totally bound to OO :)
    var self;    
    self = {
        clicked: 0,
        // these are listener lists append to them
        mousemovers: [],
        mousedraggers: [],
        mousedowners: [],
        mouseuppers: [],
        callListeners: function(listeners,x,y,clicked,e) {
            for (i in listeners) {
                listeners[i](x,y,clicked,e);
            }
        },
        wasClicked: function(e) {
            var pos = getPosition(e);
            var x = pos[0];
            var y = pos[1];
            if (x >= 0 && x <= W && y >= 0 && y <= H) {
                return 1;
            } else {
                return 0;
            }
        },
        mousedown: function(e) {
            e.preventDefault();
            if (self.wasClicked(e)) {
                var pos = getPosition(e);
                var x = pos[0];
                var y = pos[1];
            self.clicked = 1;
                self.callListeners(self.mousedowners,x,y,self.clicked,e);
                //addEntityWithoutName({'x':x,'y':y,'colour':'red'});
            }
        },
        mouseup: function(e) {
            e.preventDefault();
            //alert(getPosition(e));
            if (self.wasClicked(e)) {
                var pos = getPosition(e);
                var x = pos[0];
                var y = pos[1];
            //self.poppin(x,y);
            self.clicked = 0;
                self.selected = -1;
                self.callListeners(self.mouseuppers,x,y,self.clicked,e);
                //addEntityWithoutName({'x':x,'y':y,'colour':'blue'});
            }
        },
        touchstart: function(e) {
            self.lasttouch = e;                                         
            return self.mousedown(e);
        },
    touchend: function(e) {
            var touch = (self.lasttouch)?self.lasttouch:e;
            return self.mouseup(touch);
    },
    mousemove: function(e) {
            e.preventDefault();
            if (self.wasClicked(e)) {
                var pos = getPosition(e);
                var x = pos[0];
                var y = pos[1];
            if (self.clicked != 0) {
                //self.squeakin(x,y);
                self.callListeners(self.mousedraggers,x,y,self.clicked,e);
            }
                self.callListeners(self.mousemovers,x,y,self.clicked,e);
            }            
    },
    touchmove: function(e) {
            self.lasttouch = e;                                         
            return self.mousemove(e);
    },
    // Install the mouse listeners
    mouseinstall: function() {
            canvas.addEventListener("mousedown",  self.mousedown, false);
            canvas.addEventListener("mousemove",  self.mousemove, false);
            canvas.addEventListener("mouseup",    self.mouseup, false);
            canvas.addEventListener("mouseout",   self.mouseout, false);
            canvas.addEventListener("touchstart", self.touchstart, false);
            canvas.addEventListener("touchmove",  self.touchmove, false);
            canvas.addEventListener("touchend",   self.touchend, false);
    }
    };
    // Force install!
    self.mouseinstall();
    return self;
})();

// Add the application specific mouse listeners!
mouse.mousedowners.push(function(x,y,clicked,e) {
    var entity = {
        'x': x,
        'y': y,
        'colour': 'white'
    };
    addEntityWithoutName(entity);
});

mouse.mouseuppers.push(function(x,y,clicked,e) {
    var entity = {
        'x': x,
        'y': y,
        'colour': 'yellow'
    };
    addEntityWithoutName(entity);
});

mouse.mousedraggers.push(function(x,y,clicked,e) {
    var entity = {
        'x': x,
        'y': y,
        'colour': 'green',
        'radius': 50,
        'starImage': true
    };
    addEntityWithoutName(entity);
});

function update() {
    drawFrame();
}

function downloadWorld() {
    var url = 'http://' + host + "/world";
    requestJSON(url, function (data) {
        console.log('----- world downloaded ----')
        for (var entity in data) {
            world[entity] = data[entity];
        }
        drawNextFrame();
    });
}

function wsSetup() {
    var url = "ws://" + host + "/subscribe";
    console.log(url);
    socket = new WebSocket(url);

    socket.onopen = function() {
        console.log('----- socket open ----');
        downloadWorld();
    };

    socket.onerror = function(msg) {
        debug("WebSocket Error:" + msg.data);
    };

    socket.onmessage = function(msg) {  
        try {
            debug("WebSocket Recv:" + msg.data);
            var packet = JSON.parse(msg.data);
            for (var entity in packet) {
                world[entity] = packet[entity];
                drawNextFrame();
            }
        } catch (e) {
            alert("socket on message: " + e);
        }
    };
}


debug("Test");
wsSetup();

// 30 frames per second
setInterval( update, 1000/30.0);

})();






