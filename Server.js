var express = require("express"),
    app = express(),
    server = require("http").createServer(app),
    pageGen = require("./PageGen"),
    servio = require("socket.io")(server),
    MidiConvert = require("./MidiConvert"),
    dan = require("./DAN").dan,
    msgHandler = require("./MessageHandler").msgHandler,
    ODFList = require("./ShareVariables").ODFList,
    IDFList = require("./ShareVariables").IDFList;

var iottalkIP = process.argv[2];

console.log(iottalkIP);

app.use(express.static("./webapp"));

app.get("/", function (req, res) {
    pageGen.Page.getMusicBoxPage(req,res,msgHandler.getC());
});
app.get("/musicBoxHidden",function (req,res) {
    pageGen.Page.getMusicBoxHiddenPage(req,res,msgHandler.getC());
});
app.get("/mboxctl|smboxctl", function (req, res) {
    pageGen.Page.getMBoxCtlPage(req,res,iottalkIP,IDFList,msgHandler.getCtlDefaultValObj());
});


msgHandler.setSocketIo(servio);

server.listen((process.env.PORT || 5566), '0.0.0.0');

var musicBoxMacAddr = "MusicBoxes";
dan.init(msgHandler.pull, 'http://' + iottalkIP , musicBoxMacAddr, {

    'dm_name': 'MusicBox',
    'u_name': 'yb',
    'is_sim': false,
    'df_list':ODFList

}, function (result) {
    console.log('register:', result);

    //deregister when app is closing
    process.on('exit', dan.deregister);
    //catches ctrl+c event
    process.on('SIGINT', dan.deregister);
    //catches uncaught exceptions
    process.on('uncaughtException', dan.deregister);

});









