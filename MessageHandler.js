var color = require('./ShareVariables').color;

var msgHandler = (function () {

    var song = null;
    var songId = -1;
    var playing = false;
    var head = 0;
    var period = 20;
    var volume  = 0;
    var room = 0;
    var C = 7;
    var N = 5;
    var mode = 0;
    var space = Array.apply(null, Array(color.length)).map(Number.prototype.valueOf,N);
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
            // console.log(r);
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

        // find all iOS socket connection and send light signal without songPart,
        // because iOS is not support tonejs
        for(var i = 0; i < iOSClient.length; i++){
            if(iOSClient[i].room == (room%C)){
                servio.to(iOSClient[i].id).emit('Luminance-O',1);
            }
        }
        if (song != null){
            //reset MusicBox page volume and key
            sendFeature("Volume-O",volume);
            sendFeature("Key-O",0);

            var part = song.songPart;
            var r = partition(part.length);
            if (r != null) {
                var p = part.slice(r.start, r.end);
                addNoteToSongEnd(p);
                var o = {songPart: p};
                servio.sockets.in(room % C).emit('Music-O', o);
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
        for(var i = 0; i < C; i++){
            // console.log(N-space[i]);
            if(N-space[i] > 0){
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
                servio.sockets.in(i).emit('Music-O', {songPart:song.songPart,mode:1});
            }
        }
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
        for(var i = 0; i < C; i++){
            room += i;
            if(N-space[room%C] > 0){// none empty
                if(N-space[room%C] == 1)
                    servio.sockets.in(room%C).emit("mute",false);
                break;
            }
        }
            // console.log('next play: '+ room%C);
        if(i == C)
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
    var iOSClient = [];
    var receiveSongAckNum = 0;
    return {
        setSocketIo:function (io) {
            servio = io;
            servio.sockets.on('connection', function (socket) {

                //update space for MusicBox page
                socket.on('initSpace',function () {
                    servio.sockets.emit('changeSpace',space);
                });
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
                        servio.sockets.in(room).emit("counter",N-space[room]);
                    }
                    else
                        servio.to(socket.id).emit("join",{message:"disapprove"});

                });
                socket.on('join_iOS',function (room) {
                    if(space[room] > 0) {
                        //iOS is not support tonejs so manage iOS socket in other way
                        socket.room = room;
                        socket.iOS = true;
                        iOSClient.push(socket);
                        // space[room]--;
                        // space[room] = (space[room] < 0)? 0 : space[room];
                        // servio.sockets.emit('changeSpace',space);
                        servio.to(socket.id).emit("join", {message:"approve",room:room});
                        // servio.sockets.in(room).emit("counter",N-space[room]);
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
                    var room;
                    if(socket.iOS) {
                        room = socket.room;
                        // console.log('iOS close' + room);
                        if(room == undefined)
                            return;
                        // space[room]++;
                        // space[room] = (space[room] > N)? N : space[room];
                        // servio.sockets.emit('changeSpace',space);
                        // servio.sockets.in(room).emit("counter",N-space[room]);
                        //remove iOS socket from iOSClient array
                        var index = iOSClient.indexOf(socket);
                        if (index > -1)
                            iOSClient.splice(index, 1);
                    }
                    else{
                        room = findSocketRoom(socket);
                        // console.log(room + ' close');
                        if(room == -1)
                            return;
                        socket.leave(room);
                        space[room]++;
                        space[room] = (space[room] > N)? N : space[room];
                        servio.sockets.emit('changeSpace',space);
                        servio.sockets.in(room).emit("counter",N-space[room]);
                        if(mode == 0) {

                            //if only one socket in room mute = false
                            if ((N - space[room]) == 1)
                                servio.sockets.in(room).emit("mute", false);

                            //leave when playing and there is not other speaker playing in this room
                            if (playMsg != null && playMsg.room == room
                                && playMsg.state == "started" && (N - space[room]) == 0) {
                                head = playMsg.noteIndex - 1;
                                // console.log(head);
                                sendNotes();
                            }
                        }
                    }
                    // console.log('close:'+room);
                    Object.getPrototypeOf(this).onclose.call(this, reason);
                };

                socket.on('partEndAck', function (ackRoomLastNoteIndex) {

                    //make iOS MusicBox dark if there are some sockets light last turn.
                    for(var i = 0; i < iOSClient.length; i++)
                        servio.to(iOSClient[i].id).emit("Luminance-O",0);

                    // console.log(ackRoomLastNoteIndex+" "+head);
                    if(ackRoomLastNoteIndex == head)
                        sendNotes();
                });

                socket.on('receiveSongAck',function () {
                    //calculate established socket number
                    receiveSongAckNum++;
                    var socketNum = 0;
                    for(var i = 0; i < C; i++)
                        socketNum += N-space[i];
                    if(receiveSongAckNum == socketNum) {
                        servio.sockets.emit('playMode1');
                        receiveSongAckNum = 0;
                    }
                });

                socket.on('ctl',function(cmd){
                    switch(cmd){
                        case "pause":
                            servio.sockets.emit("pause");
                            break;
                        case "play":
                            servio.sockets.emit("play");
                            break;
                    }
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
                    if (songId != -1) {
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
                    volume = parseInt(obj);
                    break;
                case "Luminance-O":
                    sendFeature(odf_name,obj);
                    break;
                case "Period-O":
                    period = parseInt(obj);
                    break;
                case "C-O":
                    C = parseInt(obj);
                    break;
                case "N-O":
                    var newN = parseInt(obj);
                    for(var i = 0; i < C; i++)
                        space[i] = newN - (N - space[i])
                    N = newN;
                    break;
                case "Mode-O":
                    mode = parseInt(obj);
                    break;
            }
        },
        getSpeaknum:function () {
            return C;
        },
        getCtlDefaultValObj:function () {
            return  {
                C:C,
                N:N,
                Mode:mode,
                Period:period
            };
        }
    };
})();

exports.msgHandler = msgHandler;


