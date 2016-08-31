var midiDir = "midi/";
var song = null;
var songId = -1;
var track = 0;
var socket = io.connect();

//retrieve file
var getFileBlob = function (url, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = "blob";
    xhr.addEventListener('load', function() {
        cb(xhr.response);
    });
    xhr.send();
};
var getMidiFile = function(filePathOrUrl) {
    getFileBlob(filePathOrUrl, function (blob) {
        toBinary(blob);
    });
};
var toBinary = function (blob) {
    var reader = new FileReader();

    reader.onloadend = function () {
        song = MidiConvert.parseParts(reader.result)[track];
        var obj = {songPart: song, songId: songId};
        // dan.push("Music-I",["bug"]);
        dan.push("Music-I",[obj]);
    };
    reader.readAsBinaryString(blob);
};


$(function () {

    //iottalk communication
    function pull (odf_name, data) {
        console.log( odf_name+":"+ data );
    }
    var genMacAddr = function () {
        var macAddr = '';
        for (var i = 0; i < 5; i++)
            macAddr += '0123456789abcdef'[Math.floor(Math.random() * 16)];
        return macAddr;
    };
    var macAddr = genMacAddr();
    document.title = 'MBoxCtl(' + macAddr+')';
    dan.init(pull, 'http://' + iottalkIP , macAddr, {
        'dm_name': 'MBoxCtl',
        'u_name': 'yb',
        'is_sim': false,
        'df_list': IDFList
    }, function (result) {
        console.log('register:', result);
    });

    //ui
    $('#c').dropdown({
        onChange: function(value, text, $selectedItem) {
            // dan.push("C-I",["bug"]);
            dan.push("C-I",[value]);
            $("#cVal").text(value + " clusters");
        },
        allowReselection: true
    });
    $('#n').dropdown({
        onChange: function(value, text, $selectedItem) {
            // dan.push("N-I",["bug"]);
            dan.push("N-I",[value]);
            $("#nVal").text(value + " spaces");
        },
        allowReselection: true
    });
    $('#period').dropdown({
        onChange: function(value, text, $selectedItem) {
            // dan.push("Period-I",["bug"]);
            dan.push("Period-I",[value]);
            $("#periodVal").text(value + " notes");
        },
        allowReselection: true
    });

    $('#mode').dropdown({
        onChange: function(value, text, $selectedItem) {
            // dan.push("Mode-I",["bug"]);
            dan.push("Mode-I",[value]);
        },
        allowReselection: true
    });

    var activeSongListByIndex = function(index){
        $(".list").each(function(index){
            if(index&1)
                $(this).css("background","#efefef");
            else
                $(this).css("background","#fafafa");
            $(".list").eq(index).prop("active",false);
        });
        $(".list").eq(index).prop("active",true);
        $(".list").eq(index).css("background","#00bd9b");

        var value =  $(".list").eq(index).attr("name");
        songId = index;
        getMidiFile('http://'+window.location.hostname+':5566/'+midiDir+value+'.mid');

        //chang control button to pause icon
        var controlBtn = $('.play');
        if(controlBtn.length != 0){
            controlBtn.unbind('click');
            controlBtn.attr('class', 'pause');
            controlBtn.bind('click',pause);
        }

    };
    $(".list").click(function(a) {
        activeSongListByIndex($(".list").index(this));
    });
    $(".left").click(function(){
        var currentIndx = -1;
        $(".list").each(function(index){
            if($(this).prop("active") == true)
                currentIndx = index;

        });
        if(currentIndx != -1){
            currentIndx--;
            var i = (currentIndx)%($(".list").length);
            activeSongListByIndex(i);
        }
    });
    $(".right").click(function(){
        var currentIndx = -1;
        $(".list").each(function(index){
            if($(this).prop("active") == true)
                currentIndx = index;
        });
        if(currentIndx != -1){
            currentIndx++;
            var i = (currentIndx)%($(".list").length);
            activeSongListByIndex(i);
        }
    });
    var play = function(){
        $(this).unbind('click');
        $(this).attr('class', 'pause');
        $(this).bind('click',pause);
        socket.emit('ctl','play');
    };
    var pause = function(){
        $(this).unbind('click');
        $(this).attr('class', 'play');
        $(this).bind('click',play);
        socket.emit('ctl','pause');

    };
    $(".play").bind('click',play);


    $(".repeat").click(function(){
        var currentIndx = -1;
        $(".list").each(function(index){
            if($(this).prop("active") == true)
                currentIndx = index;
        });
        if(currentIndx != -1)
            activeSongListByIndex(currentIndx);
    });
    $(".bar").change(function(){
        // dan.push("Volume-I",["bug"]);
        dan.push("Volume-I",[this.value]);
    });

});
window.onbeforeunload = function(){
    dan.deregister();
};
