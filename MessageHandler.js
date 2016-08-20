var color = require('./ShareVariables').color;

var cmdHandler = (function () {

    var song = null;
    var songId = -1;
    var playing = false;
    var head = 0;
    var period = 20;
    var room = 0;
    var speakerNum = 7;
    var defaultSpace = 5;
    var mode = 0;
    var space = Array.apply(null, Array(color.length)).map(Number.prototype.valueOf,defaultSpace);
    var servio = null;
    var partition = function (len) {
        var r;
        if (head < len) {
            if (head + period < len) {
                r = {"start": head, "end": head + period};
                head += period;
            }
            else {
                r = {"start": head, "end": len};
                head = len;
            }
            console.log(r);
            return r;
        }
        else {
            return null;
        }
    };
    var sendNotes = function () {
        if( !seekRoom() ){
            console.log('all exit');
            return
        }
        if (song != null){
            var part = song.songPart;
            var r = partition(part.length);
            if (r != null) {
                var p = part.slice(r.start, r.end);
                addNoteToSongEnd(p);
                var o = {songPart: p};
                servio.sockets.in(room % speakerNum).emit('Music-O', o);
                room++;
                playing = true;
            }
            else {
                reset();
                console.log('reset');
            }
        }
    };
    var sendSong = function () {
        addNoteToSongEnd(song.songPart);
        for(var i = 0; i < speakerNum; i++){
            if(defaultSpace-space[i] > 0){
                var scale = Math.ceil(i/2);
                // console.log(scale);
                if(i%2) {
                    sendFeature('Key-O', scale*-1, i);
                    sendFeature('Volume-O', scale*2, i);
                }
                else {
                    sendFeature('Key-O', scale, i);
                    sendFeature('Volume-O',scale*-2,i);
                }

            }
        }
        servio.sockets.emit('Music-O', {songPart:song.songPart});
    };
    var reset = function () {
        playing = false;
        head = 0;
        room = 0;
        song = null;
        servio.sockets.emit("mute",false);
    };
    var addIndexToSongPart = function(part){
        //add unique id for each note in part
        for (var i = 1; i <= part.length; i++)
            part[i-1].index = i;
    };
    var addNoteToSongEnd = function (part) {
        var j = part.length-1;
        for(var i = part.length-2; i >= 0 ; i--){
            if(part[j].time != part[i].time)
                break;
        }
        var max = -1;
        for(var k = i; k <= j; k++){
            var t = parseInt(part[k].time)+parseInt(part[k].duration);
            max = (t > max) ? t : max;
        }
        var lastNote = {duration: '10i',time: max+"i",noteName: 'A3',index:-1};
        part.push(lastNote);
    };
    var seekRoom = function () {
        //seek for non-empty room
        for(var i = 0; i < speakerNum; i++){
            room += i;
            if(defaultSpace-space[room%speakerNum] > 0)// none empty
                break;
        }
        console.log('next play: '+ i);
        if(i == speakerNum)
            return false;
        else
            return true;
    };
    var sendFeature = function(feature,obj,room){
        if(room != undefined)
            servio.sockets.in(room).emit(feature,obj);
        else
            servio.sockets.emit(feature, obj);
    };

    return {
        setSocketIo:function (io) {
            servio = io;
            servio.sockets.on('connection', function (socket) {

                socket.on('join', function (room) {
                    if(playing){
                        servio.to(socket.id).emit("mute",true);
                    }
                    if(space[room] > 0) {
                        socket.join(room);
                        space[room]--;
                        space[room] = (space[room] < 0)? 0 : space[room];
                        servio.sockets.emit('changeSpace',space);
                        servio.to(socket.id).emit("join", {message:"approve",room:room});
                        servio.sockets.in(room).emit("counter",defaultSpace-space[room]);
                    }
                    else
                        servio.to(socket.id).emit("join",{message:"disapprove"});

                });

                //track musicbox playing message
                var playMsg = null;
                socket.on('playMsg',function (msg) {
                    playMsg = msg;
                });

                var findClientsSocketByRoomId = function(roomId) {
                    var roomId = roomId.toString();
                    var rooms = Object.keys(io.sockets.adapter.rooms);

                    if(rooms.indexOf(roomId) != -1) {
                        // console.log(io.sockets.adapter.rooms[roomId]);
                        return io.sockets.adapter.rooms[roomId];
                    }
                    return null;
                };
                var findSocketRoom = function(socket)  {
                    for(var i = 0; i < color.length; i++){
                        if(findClientsSocketByRoomId(i) != null) {
                            var clients = findClientsSocketByRoomId(i)['sockets'];
                            var clientsId = Object.keys(clients);
                            if(clientsId.indexOf(socket.id) != -1)
                                return i;
                        }
                    }
                    return -1;
                };
                //close window
                socket.onclose = function(reason) {

                    var room = findSocketRoom(socket);
                    console.log(room + ' close');
                    if(room == -1)
                        return;
                    socket.leave(room);
                    space[room]++;
                    space[room] = (space[room] > defaultSpace)? defaultSpace : space[room];
                    servio.sockets.emit('changeSpace',space);
                    servio.sockets.in(room).emit("counter",defaultSpace-space[room]);
                    if(mode == 0) {

                        //if only one socket in room mute = false
                        if((defaultSpace - space[room]) == 1)
                            servio.sockets.in(room).emit("mute",false);

                        //leave when playing and there is not other speaker playing in this room
                        if (playMsg != null && playMsg.room == room
                            && playMsg.state == "started" && (defaultSpace - space[room]) == 0) {
                            head = playMsg.noteIndex - 1;
                            sendNotes();
                        }
                    }
                    Object.getPrototypeOf(this).onclose.call(this, reason);
                };

                socket.on('ack', function (ackRoomLastNoteIndex) {
                    if(ackRoomLastNoteIndex == head)
                        sendNotes();
                });

            });
        },
        pull:function (odf_name, data) {

            console.log( odf_name+":"+ data );
            obj = data[0];
            if(obj == "bug") {
                return;
            }
            switch (odf_name){
                case "Music-O":
                    reset();
                    song = obj;
                    // console.log(song);
                    if (songId != -1 && songId != song.songId) {
                        console.log("switch song!");
                        servio.sockets.emit("switchSong");
                    }
                    songId = song.songId;
                    addIndexToSongPart(song.songPart);
                    if(mode == 0)
                        sendNotes();
                    else if(mode == 1)
                        sendSong();

                    break;
                case "Key-O":
                    sendFeature(odf_name,obj);
                    break;
                case "Volume-O":
                    sendFeature(odf_name,obj);
                    break;
                case "Luminance-O":
                    sendFeature(odf_name,obj);
                    break;
                case "Period-O":
                    period = parseInt(obj);
                    break;
                case "C-O":
                    speakerNum = parseInt(obj);
                    break;
                case "N-O":
                    space = Array.apply(null, Array(color.length)).map(Number.prototype.valueOf,parseInt(obj));
                    defaultSpace = parseInt(obj);
                    break;
                case "Mode-O":
                    mode = parseInt(obj);
                    break;
            }
        },
        getSpace:function () {
            return space;
        },
        getSpeaknum:function () {
            return speakerNum;
        }
    };
})();

exports.cmdHandler = cmdHandler;


