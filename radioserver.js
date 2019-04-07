const player = require('play-sound')(opts = {})
const express = require('express');
const fs = require('fs');
const schedule = require('node-schedule');
const dateTime = require('node-datetime');
const app = express();
const port = 3443
debug = true
var logcontent = ""
var audio
var scheduleContent
var scheduledJobs = [];

audioPath = './audio/'
// currentAudioFile = './audio/startupBeep.wav'
currentAudioFile = 'startup.wav'
nowPlaying = "nothing"

let sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function dateRightNow() {
  var dt = dateTime.create();
  return dt.format('Y-m-d H:M:S');
}
function log(text) {
  if (debug) {
    console.log(dateRightNow().toString() + " " + text.toString().replace(/<[^>]*>/, ''));
  }
  logcontent = logcontent + "\n" + dateRightNow().toString() + " " + text;
}

function radio_setFile(file) {
  currentAudioFile = file;
}
function radio_play() {
  if (nowPlaying != "nothing") {
      log("Something is already playing, Killing that first.");
      radio_stop();
      setTimeout(radio_play,1000);
  } else {
    nowPlaying = currentAudioFile;
    log("Play Audio '" + audioPath + currentAudioFile + "'")
    audio = player.play(audioPath + currentAudioFile, function (err) {
      if (err) {
        log("Audio killed");
      } else {
        log("Audio ended");
      }
      log("Audio finished");
      nowPlaying = "nothing";
    });
  }
}
function radio_stop() {
  if (debug == true) { log("Kill Audio") }
  audio.kill()
}

function scheduleRadioJob(cronarg, filename) {

  var j = schedule.scheduleJob(cronarg, function(){
    radio_setFile(filename);
    radio_play();
  });
  scheduledJobs.push(j);

}

function cancelAllScheduledRadioJobs() {
  log("Cancelling all currently scheduled jobs");

  scheduledJobs.forEach(function(value){
    value.cancel(value);
  });

  log("All previously scheduled jobs now cancelled");

}

function scheduleRadioJobs() {
  log("Scheduling Jobs for Radio");

  scheduleContent = null

  scheduleContent = fs.readFileSync("schedule.config");

  var lines = scheduleContent.toString().split(",");
  var linenum = 1;

  lines.forEach(function(value){
    var scheduleLine = value.split(" ");
    //Check that it's 6 chunks long
    if (scheduleLine.length != 6) {

      log("<span class='ohno'>ERROR: Schedule line " + linenum + " contains invalid config. Not scheduling. </span>");

    } else {

      //Take scheduleLine[5] (the audio file), and strip any newline. Otherwise this can cause issues if the last line has a blank newline beneath it
      var newAudioFile = scheduleLine[5].toString().replace(/\n$/, '')
      //Put the cronline back together. We do this by reducing the scheduleLine to items 0-4, then joining by space.
      var newScheduleLine = scheduleLine.slice(0,5).join(" ").toString().replace(/\n/, '');

      if (fs.existsSync("audio/" + newAudioFile)) {

        scheduleRadioJob(newScheduleLine, newAudioFile)
        log("Scheduled audio file '" + newAudioFile + "' with schedule '" + newScheduleLine + "'")

      } else {

        log("<span class='ohno'>ERROR: Schedule line " + linenum + " referenced audio file '" + newAudioFile + "'. This is not in the folder /audio. Not scheduling. </span>");

      }

    }
    linenum += 1;
  });

  log("All radio jobs now scheduled");

}

// Webapp Code
function startListening() {

	// https.createServer({key: privateKey, cert: certificate}, app).listen(port, (err) => {
	//   if (err) {
	//     return console.log('something bad happened', err)
	//   }
	//   console.log(`server is listening on ${port}`)
	// });
  app.listen(port, () => console.log(`control server listening on port ${port}`))

}

app.get('/', (request, response) => {
  response.writeHead(302, {
  'Location': '/app'
  });
  response.end();
});
app.get('/api/log', (request, response) => {
	// console.log("GET /api/log");
	response.send(logcontent);
});
app.get('/api/nowplaying', (request, response) => {
	// console.log("GET /api/log");
	response.send(nowPlaying);
});
app.get('/api/schedule', (request, response) => {
	// console.log("GET /api/log");
	response.send(scheduleContent);
});
app.get('/api/schedule/reload', (request, response) => {
	// console.log("GET /api/log");
  cancelAllScheduledRadioJobs();
  scheduleRadioJobs();
	response.send({"status":"Done","error":0});
});
app.get('/api/play/:id', (request, response) => {
	// log("GET /api/play");
  radio_setFile(request.params.id);
  radio_stop();
  radio_play();
	response.send('{"status":"Playing","error":0}');
});
app.get('/api/play', (request, response) => {
  radio_play();
	response.send('{"status":"Playing","error":0}');
});
app.get('/api/stop', (request, response) => {
  radio_stop();
	response.send('{"status":"Stopped","error":0}');
});
app.use('/app', express.static('client'));



//starting
startListening()
scheduleRadioJobs()
radio_play()
//setTimeout(radio_stop, 2000);
