var csmapi = require("./CSMAPI").csmapi;
var msgHandler = require("./MessageHandler").msgHandler;
var servio = null;
//map socket id and mac
var mboxctlDict = {};

var mboxctlHandler = (function () {
    return {
        setSocketIo: function (io) {
            servio = io;
            servio.sockets.on('connection', function (socket) {
                socket.on('mboxctlMacAddr',function (mac) {
                    mboxctlDict[socket.id] = mac;
                    socket.onclose = function(reason) {
                        csmapi.deregister(mboxctlDict[socket.id],function () {
                            console.log("mboxctl: deregister");
                        });
                        delete mboxctlDict[socket.id];
                        Object.getPrototypeOf(this).onclose.call(this, reason);
                    };
                    socket.on('ctl',function(cmd){
                        switch(cmd.name){
                            case "pause":
                                servio.sockets.emit("pause");
                                break;
                            case "play":
                                servio.sockets.emit("play");
                                break;
                            case "repeatSong":
                                msgHandler.setRepeatSong(cmd.value);
                                console.log("repeatSong: " + cmd.value);
                                break;
                        }
                    });
                });

            });
        }

    }
})();

exports.mboxctlHandler = mboxctlHandler;
