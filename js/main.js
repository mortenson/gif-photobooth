(function () {

  "use strict";

  var running = false,
    ready = false,
    config = {
    ramp_time: 500,
    frame_delay: 300,
    num_frames: 10,
    rows: 4,
    gutter: 7,
    gutter_color: 'white',
    width: 300,
    height: 900
  },
    footer = {
    height: 0
  };

  if (navigator && navigator.mediaDevices) {
    navigator.mediaDevices.getUserMedia({video: {facingMode: 'user'}}).then(function (stream) {
      video.srcObject = stream;
      video.play();
      video.addEventListener('canplay', function () {
        setTimeout(function () {
          ready = true;
        }, config.ramp_time);
      }, false);
    });
  }

  function sleep (time) {
    return new Promise(function (resolve) { setTimeout(resolve, time); });
  }

  function setStatus (text) {
    statustext.textContent = text;
    console.log(text);
  }

  function startCapture () {
    if (ready && !running) {
      setStatus('GET READY');
      preview.parentElement.classList.remove('active');
      running = true;
      var target_height = ((config.height - footer.height) - ((config.rows + 1) * config.gutter)) / config.rows;
      var target_width = config.width;
      var pose_time = config.frame_delay * config.num_frames;
      var base_canvas = document.createElement('canvas');
      base_canvas.width = config.width;
      base_canvas.height = config.height;
      var frames = [], context, gif;
      for (let i = 0; i < config.rows; ++i) {
        sleep((6000 * i) + 3000 + (pose_time * i)).then(function () {
          for (let count = 0; count < 3; ++count) {
            sleep(1000 * count).then(function () {
              setStatus(3 - count);
            });
          }
        });
        sleep((6000 * (i + 1)) + (pose_time * i)).then(function () {
          for (let j = 0; j < config.num_frames; ++j) {
            sleep(config.frame_delay * j).then(function () {
              setStatus('POSE!');
              document.body.classList.add('pose');
              if (!frames[j]) {
                frames[j] = base_canvas.cloneNode();
                context = frames[j].getContext('2d');
                context.fillStyle = config.gutter_color;
                context.fillRect(0, 0, frames[j].width, frames[j].height);
                context.translate(frames[j].width, 0);
                context.scale(-1, 1);
              }
              else {
                context = frames[j].getContext('2d');
              }
              context.drawImage(video, 0, (i * target_height) + ((i + 1) * config.gutter), target_width, target_height);
              if (j === config.num_frames - 1) {
                setStatus('GET READY');
                document.body.classList.remove('pose');
              }
              if (i === config.rows - 1 && j === config.num_frames - 1) {
                gif = new GIF({
                  workers: 2,
                  workerScript: 'js/gif.js/gif.worker.js',
                  quality: 10
                });
                for (var k in frames) {
                  gif.addFrame(frames[k], {delay: 200});
                }
                gif.on('finished', function (blob) {
                  if (preview.src) {
                    URL.revokeObjectURL(preview.src);
                  }
                  preview.src = URL.createObjectURL(blob);
                  preview.parentElement.classList.add('active');
                });
                gif.render();
                running = false;
                setStatus('CLICK ME');
              }
            });
          }
        });
      }
    }
  }

  statustext.onclick = startCapture;

  document.onkeypress = function (event) {
    if (event.keyCode === 13) {
      startCapture();
    }
  };

}());
