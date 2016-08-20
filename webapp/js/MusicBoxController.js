var midiDir = "midi/";
var song = null;
var songId = -1;
var track = 0;

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
        dan.push("Music-I",["bug"]);
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
    $('#song').dropdown({
            onChange: function(value, text, $selectedItem) {
                if(songId == $('.inputSong').index($selectedItem))
                    return;
                songId = $('.inputSong').index($selectedItem);
                getMidiFile('http://'+window.location.hostname+':5566/'+midiDir+value+'.mid');
            }
    });
    $('#c').dropdown({
        onChange: function(value, text, $selectedItem) {
            dan.push("C-I",["bug"]);
            dan.push("C-I",[value]);
        }
    });
    $('#n').dropdown({
           onChange: function(value, text, $selectedItem) {
                dan.push("N-I",["bug"]);
                dan.push("N-I",[value]);
           }
    });
    $('#period').dropdown({
        onChange: function(value, text, $selectedItem) {
            dan.push("Period-I",["bug"]);
            dan.push("Period-I",[value]);
        }
    });
    $('#key').dropdown({
        onChange: function(value, text, $selectedItem) {
            dan.push("Key-I",["bug"]);
            dan.push("Key-I",[value]);
        }
    });
    $('#volume').dropdown({
        onChange: function(value, text, $selectedItem) {
            dan.push("Volume-I",["bug"]);
            dan.push("Volume-I",[value]);
        }
    });
    $('#mode').dropdown({
        onChange: function(value, text, $selectedItem) {
            dan.push("Mode-I",["bug"]);
            dan.push("Mode-I",[value]);
        }
    });
    // $('#instrument').dropdown({
    //     onChange: function(value, text, $selectedItem) {
    //         dan.push("Instrument-I",["bug"]);
    //         dan.push("Instrument-I",[$('.inputInstrument').index($selectedItem)]);
    //     }
    // });


    // var chageKnob = function (value,IDFName) {
    //     dan.push(IDFName,["bug"]);
    //     dan.push(IDFName,[value]);
    // };
    // $("#speakerNum").knob({
    //     'min':1,
    //     'max':7,
    //     'change' : function(v){chageKnob($("#speakerNum").val(),"SpeakerNum-I")}
    // });
    // $('#speakerNum').val(7).trigger('change');
    //
    // $("#period").knob({
    //     'min':20,
    //     'max':200,
    //     'data-step':"20",
    //     'change' : function(v){chageKnob(v,"Period-I")}
    // });
    // $('#period').val(20).trigger('change');
    //
    // $("#key").knob({
    //     'min':-7,
    //     'max':7,
    //     'change' : function(v){chageKnob(v,"Key-I")}
    // });
    // $('#key').val(0).trigger('change');
    //
    // $("#volume").knob({
    //     'min':-5,
    //     'max':20,
    //     'change' : function(v){chageKnob(v,"Volume-I")}
    // });
    // $('#volume').val(0).trigger('change');
});
window.onbeforeunload = function(){
    dan.deregister();
};
