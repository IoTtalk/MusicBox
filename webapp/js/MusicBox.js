
var socket = io.connect();
var color = ['#dc143c', '#00bfff', '#ffd700', '#3cb371', '#1e90ff',
    '#ffa500','#9932cc'];
var iOS = function() {
    var iDevices = [
        'iPad Simulator',
        'iPhone Simulator',
        'iPod Simulator',
        'iPad',
        'iPhone',
        'iPod'
    ];
    if (!!navigator.platform) {
        while (iDevices.length) {
            if (navigator.platform === iDevices.pop()){ return true; }
        }
    }
    return false;
};

//DF MusicOut Class
function MusicOut(obj) {

    this.songPart = obj.songPart;
    this.triggerRoom = obj.triggerRoom;

}
MusicOut.prototype = {

    room: -1,

    partArr:[],

    currentPart:null,

    currentPlayIndex:-1,

    synthesizerPoly:new Tone.PolySynth(6, Tone.Synth).toMaster(),

    synthesizerMono:null,

    instruments:[Tone.Synth,Tone.MembraneSynth,
        Tone.MonoSynth,Tone.NoiseSynth,Tone.PluckSynth],

    instrumentIndex:0,

    rhythm:1.0,

    key:0,

    volume:0,

    mute:false,

    changeRhythm:function(songPart,speed){
        for(var i = 0; i < songPart.length; i++){
            var t = Math.ceil(parseInt(songPart[i].time)/speed);
            var d = Math.ceil(parseInt(songPart[i].duration)/speed);
            songPart[i].time = t+"i";
            songPart[i].duration = d+"i";
        }
    },

    changeKey:function (noteName,scale) {

        var c;
        if(noteName.charAt(1) == "#")
            c = parseInt(noteName.charAt(2));
        else
            c = parseInt(noteName.charAt(1));

        c+=scale;

        if(c > 8) c = 8;
        if(c < 1) c = 1;
        noteName = noteName.substr(0, 1) + c + noteName.substr(2);
        return noteName;
    },

    changeInstruments:function (index) {
        var len = MusicOut.prototype.instruments.length;
        if(index < 0 || index > len-1) index = 0;
        var constructor = MusicOut.prototype.instruments[index];
        MusicOut.prototype.synthesizerPoly.dispose();
        MusicOut.prototype.synthesizerPoly.releaseAll();
        if(index != 0)
            MusicOut.prototype.synthesizerPoly = new Tone.PolySynth(1,constructor).toMaster();
        else
            MusicOut.prototype.synthesizerPoly = new Tone.PolySynth(6,constructor).toMaster();

        console.log(index);
    },

    changeVolume:function(decibels){

        MusicOut.prototype.synthesizerPoly.volume.value = decibels;
        // console.log(MusicOut.prototype.synthesizerPoly.volume.value);
    },

    changeColor:function(room,rgb){
        var colorArr = [[110,0,0],[0,95,127],[127,107,0],[39,90,55],
            [15,72,127],[127,82,0],[70,25,102]];

        for(var i = 0; i < 3; i++){
            rgb[i]*=1.2;
            if(rgb[i] > 255)
                rgb[i] = 255;
        }
        var f = true;
        for(var i = 0; i < 3; i++){
            if(rgb[i] != 255)
                f = false;
        }
        if(f)
            return colorArr[room];
        return [rgb[0],rgb[1],rgb[2]];
    },

    clearAllPart:function(){
        if(MusicOut.prototype.currentPart != null && MusicOut.prototype.currentPart.state == "started")
            MusicOut.prototype.currentPart.stop();
        if(MusicOut.prototype.partArr.length != 0) {//partArr is not empty
            for (var i = 0; i < MusicOut.prototype.partArr.length; i++) {
                if (MusicOut.prototype.partArr[i].state == "started") {
                    MusicOut.prototype.partArr[i].stop();
                }
            }
            MusicOut.prototype.partArr = [];
        }
    },

    start:function(){


        if(this.songPart.length != 1) {

            // MusicOut.prototype.changeRhythm(this.songPart,MusicOut.prototype.rhythm);

            var partLen = this.songPart.length-1;


            //displace all note time with first note time offset
            var offset = parseInt(this.songPart[0].time);
            for(var i = 0; i < partLen+1; i++)
                this.songPart[i].time = (parseInt(this.songPart[i].time) - offset)+"i";
            var lastIndex = this.songPart[partLen-1].index;
            MusicOut.prototype.currentPart = new Tone.Part(function (time, note) {

                MusicOut.prototype.currentPlayIndex = note.index;

                if(note.index == -1){
                    $('body').css('background', "#000000");
                    return;
                }
                else{
                    if (note.index == lastIndex)
                        socket.emit("ack", note.index);
                    socket.emit("playMsg",{
                        room:MusicOut.prototype.room,
                        state:MusicOut.prototype.currentPart.state,
                        noteIndex:note.index
                    });
                    $('body').css('background',color[MusicOut.prototype.room]);
                    note.noteName = MusicOut.prototype.changeKey(note.noteName,MusicOut.prototype.key);
                    // MusicOut.prototype.changeInstruments(MusicOut.prototype.instrumentIndex);
                    MusicOut.prototype.changeVolume(MusicOut.prototype.volume);
                    if(!MusicOut.prototype.mute)
                        MusicOut.prototype.synthesizerPoly.triggerAttackRelease(note.noteName, note.duration, time, note.velocity);
                    // console.log('start');
                    console.log(note.index + " " + note.noteName);

                }


            }, this.songPart);

            MusicOut.prototype.currentPart.start();
            MusicOut.prototype.partArr.push(MusicOut.prototype.currentPart);
            refreshAudioCtx();
            Tone.Transport.start();
        }
        else{
            var note = this.songPart[0];
            if(note.noteName !== "keyUp"
                && note.duration == undefined){
                $("body").css('background',color[room]);
                MusicOut.prototype.synthesizerMono.triggerAttack(note.noteName);
            }
            else if(this.songPart[0].noteName === "keyUp")
                $('body').css('background', "#000000");
            else
                MusicOut.prototype.synthesizerMono.triggerAttackRelease(note.noteName,
                    note.duration);
        }
    }

};
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioCtxl = null;
var timeStamp;
var refreshAudioCtx = function () {
    if(Math.floor(Date.now()/ 1000) - timeStamp >=25) {
        if (audioCtxl != null) {
            audioCtxl.close();
        }
        if(MusicOut.prototype.synthesizerPoly != null){
            MusicOut.prototype.synthesizerPoly.releaseAll();
            MusicOut.prototype.synthesizerPoly.dispose();
        }
        audioCtxl = new AudioContext();
        // console.log(audioCtxl);
        Tone.setContext(audioCtxl);
        MusicOut.prototype.synthesizerPoly = new Tone.PolySynth(6, Tone.Synth).toMaster();
        // console.log('refresh');
        timeStamp = Math.floor(Date.now()/ 1000);
        return true;
    }
    else{
        timeStamp = Math.floor(Date.now()/ 1000);
        return false;
    }
};

$(document).ready(function () {

    timeStamp = Math.floor(Date.now()/ 1000);
    var musicObj,music;
    //ODF command from MBoxCtl
    socket.on("Music-O", function (obj) {
        console.log("Music:"+obj);
        //copy obj by using JSON parse and stringify
        musicObj = JSON.parse(JSON.stringify(obj));
        music = new MusicOut(obj);
        music.start();
    });
    socket.on("Key-O", function (obj) {
        MusicOut.prototype.key = parseInt(obj);
        console.log("Key:" + obj);
    });
    socket.on("Volume-O", function (obj) {
        MusicOut.prototype.volume = parseInt(obj);
        console.log("Volume:"+obj);
    });
    socket.on("Instrument-O",function (obj) {
        MusicOut.prototype.instrumentIndex = parseInt(obj);
        console.log("Instrument:"+obj);
    });
    socket.on("Luminance-O",function(obj){
        var lum = parseInt(obj);
        if(lum)
            $("body").css("background",color[MusicOut.prototype.room]);
        else
            $("body").css("background","#000000");

        console.log("Luminance:"+obj)
    });

    //command from MusicBox server
    socket.on("counter",function(num){
       $("#counter").text(num);
    });

    //UI
    socket.on("changeSpace",function (space) {
        $('.entity').each(function( index ) {
            $( this ).text(space[index]);
        });
    });
    socket.on("join",function (obj) {
       if(obj.message == "approve")
           enterRoom(obj.room);

       else if(obj.message == "disapprove")
           alert("room full");
    });
    var enterRoom = function (room) {
        MusicOut.prototype.room = room;
        $(".ui.table").hide();
        $("#counter").show();
        $("body").css("background","#000000");
    };
    $('.entity').click(function () {
        if(iOS()){
            socket.emit("join_iOS",$('.entity').index(this));
        }
        else{
            socket.emit("join",$('.entity').index(this));
        }
    });
    $('#counter').hide();

    socket.on("switchSong",function(){
        console.log('switch song');
        $("body").css("background","#000000");
        MusicOut.prototype.clearAllPart();
    });
    socket.on("mute",function (msg) {
        // console.log("mute"+msg);
        MusicOut.prototype.mute = Boolean(msg);
    });
    socket.on("pause",function () {
        Tone.Transport.pause();
    });
    socket.on("play",function () {
        //audio context has refreshed
        if(refreshAudioCtx()){
            var currentPlayIndex = MusicOut.prototype.currentPlayIndex;
            //music has not ended
            if(currentPlayIndex != -1){
                MusicOut.prototype.currentPart.stop();
                var startIndex = currentPlayIndex - musicObj.songPart[0].index + 1;
                musicObj.songPart = musicObj.songPart.slice(startIndex);
                music = new MusicOut(musicObj);
                console.log(musicObj.songPart);
                music.start();
            }
        }
        else {
            Tone.Transport.start();
        }
    });
});
