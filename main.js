fetch("https://api.github.com/repos/oogum-boogum/tunes/contents/abc")
  .then((response) => response.json())
  .then((json) => getScores(json))
  .then((scores) => renderPage(scores))
  .then(() => initAbc());

async function getScores(files) {
  return Promise.all(
    files.map(async (file) => {
      return await fetch(file.download_url).then((response) => response.text());
    })
  ).then((responses) => {
    let scores = {};

    responses.forEach((response) => {
      let scoreName = response
        .split("\n")
        .filter((line) => line.startsWith("T:"))[0]
        .split(":")[1];
      scores[scoreName] = response;
    });

    console.log("Fetched scores", scores);
    return scores;
  });
}

function renderPage(scores) {
  let scoreList = document.getElementById("scoreList");

  Object.keys(scores).forEach((scoreName) => {
    let li = document.createElement("li");
    li.innerHTML = scoreName;
    li.addEventListener("click", (e) => renderScore(scores[scoreName]));

    scoreList.appendChild(li);
  });
}

function renderScore(score) {
  setTune(score, true);
  console.log(score);
}

function initAbc() {
  if (ABCJS.synth.supportsAudio()) {
    synthControl = new ABCJS.synth.SynthController();
    synthControl.load("#audio", cursorControl, {
      displayLoop: true,
      displayRestart: true,
      displayPlay: true,
      displayProgress: true,
      displayWarp: true,
    });
  } else {
    document.querySelector("#audio").innerHTML =
      "<div class='audio-error'>Audio is not supported in this browser.</div>";
  }
}

let abc = "";

var abcOptions = {
  add_classes: true,
  responsive: "resize",
};

function CursorControl() {
  var self = this;

  self.onReady = function () {};
  self.onStart = function () {
    var svg = document.querySelector("#paper svg");
    var cursor = document.createElementNS("http://www.w3.org/2000/svg", "line");
    cursor.setAttribute("class", "abcjs-cursor");
    cursor.setAttributeNS(null, "x1", 0);
    cursor.setAttributeNS(null, "y1", 0);
    cursor.setAttributeNS(null, "x2", 0);
    cursor.setAttributeNS(null, "y2", 0);
    svg.appendChild(cursor);
  };
  self.beatSubdivisions = 2;
  self.onBeat = function (beatNumber, totalBeats, totalTime) {};
  self.onEvent = function (ev) {
    if (ev.measureStart && ev.left === null) return; // this was the second part of a tie across a measure line. Just ignore it.

    var lastSelection = document.querySelectorAll("#paper svg .highlight");
    for (var k = 0; k < lastSelection.length; k++)
      lastSelection[k].classList.remove("highlight");

    for (var i = 0; i < ev.elements.length; i++) {
      var note = ev.elements[i];
      for (var j = 0; j < note.length; j++) {
        note[j].classList.add("highlight");
      }
    }

    var cursor = document.querySelector("#paper svg .abcjs-cursor");
    if (cursor) {
      cursor.setAttribute("x1", ev.left - 2);
      cursor.setAttribute("x2", ev.left - 2);
      cursor.setAttribute("y1", ev.top);
      cursor.setAttribute("y2", ev.top + ev.height);
    }
  };
  self.onFinished = function () {
    var els = document.querySelectorAll("svg .highlight");
    for (var i = 0; i < els.length; i++) {
      els[i].classList.remove("highlight");
    }
    var cursor = document.querySelector("#paper svg .abcjs-cursor");
    if (cursor) {
      cursor.setAttribute("x1", 0);
      cursor.setAttribute("x2", 0);
      cursor.setAttribute("y1", 0);
      cursor.setAttribute("y2", 0);
    }
  };
}

var cursorControl = new CursorControl();

var synthControl;

function setTune(tune, userAction) {
  synthControl.disable(true);
  var visualObj = ABCJS.renderAbc("paper", tune, abcOptions)[0];

  var midiBuffer = new ABCJS.synth.CreateSynth();
  midiBuffer
    .init({
      visualObj: visualObj,
    })
    .then(function (response) {
      console.log(response);
      if (synthControl) {
        synthControl
          .setTune(visualObj, userAction)
          .then(function (response) {
            console.log("Audio successfully loaded.");
          })
          .catch(function (error) {
            console.warn("Audio problem:", error);
          });
      }
    })
    .catch(function (error) {
      console.warn("Audio problem:", error);
    });
}
