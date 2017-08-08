(function () {


  "use strict";

  var running = false,
    ready = false,
    base_config = {
      ramp_time: 500,
      frame_delay: 300,
      num_frames: 10,
      prep_time: 6000,
      rows: 4,
      gutter: 7,
      gutter_color: 'black',
      width: 200,
      height: 900,
      style: 'none'
    };

  for (var name in base_config) {
    if (window['config_' + name]) {
      window['config_' + name].value = base_config[name];
    }
  }

  function config (name) {
    if (window['config_' + name] && window['config_' + name].value.length) {
      var value = window['config_' + name].value;
      if (name === 'gutter_color' || name === 'style') {
        return value;
      }
      else if (parseInt(value)) {
        return parseInt(value);
      }
    }
    return base_config[name];
  }

  function getTargetHeight () {
    return (config('height') - ((config('rows') + 1) * config('gutter'))) / config('rows');
  }

  function sleep (time) {
    return new Promise(function (resolve) { setTimeout(resolve, time); });
  }

  function setStatus (text, body_class) {
    statustext.textContent = text;
    console.log(text);
    document.body.classList = body_class || '';
  }

  function startCapture () {
    if (ready && !running) {
      setStatus('Get ready...', 'ready');
      preview.parentElement.classList.remove('active');
      running = true;
      var target_height = getTargetHeight();
      var target_width = config('width');
      var pose_time = config('frame_delay') * config('num_frames');
      var base_canvas = document.createElement('canvas');
      base_canvas.width = config('width');
      base_canvas.height = config('height');
      var frames = [], context, gif;
      for (let i = 0; i < config('rows'); ++i) {
        if (config('prep_time') > 3000) {
          sleep((config('prep_time') * i) + (config('prep_time') - 3000) + (pose_time * i)).then(function () {
            for (let count = 0; count < 3; ++count) {
              sleep(1000 * count).then(function () {
                setStatus(3 - count, 'count');
              });
            }
          });
        }
        sleep((config('prep_time') * (i + 1)) + (pose_time * i)).then(function () {
          for (let j = 0; j < config('num_frames'); ++j) {
            sleep(config('frame_delay') * j).then(function () {
              setStatus('Pose!', 'pose');
              if (!frames[j]) {
                frames[j] = base_canvas.cloneNode();
                context = frames[j].getContext('2d');
                context.fillStyle = config('gutter_color');
                context.fillRect(0, 0, frames[j].width, frames[j].height);
              }
              else {
                context = frames[j].getContext('2d');
              }
              context.drawImage(videomirror, 0, (i * target_height) + ((i + 1) * config('gutter')), target_width, target_height);
              if (j === config('num_frames') - 1) {
                setStatus('Get Ready...', 'ready');
              }
              if (i === config('rows') - 1 && j === config('num_frames') - 1) {
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
                  var url = URL.createObjectURL(blob);
                  preview.src = url;
                  downloadlink.href = url;
                  downloadlink.download = 'photobooth.gif';
                  preview.parentElement.classList.add('active');
                  setStatus('Click me');
                });
                gif.render();
                running = false;
                setStatus('Loading GIF');
              }
            });
          }
        });
      }
    }
  }

  statustext.onclick = startCapture;

  closelink.onclick = function () {
    preview.parentElement.classList.remove('active');
  };

  document.onkeypress = function (event) {
    if (event.keyCode === 13) {
      startCapture();
    }
  };

  if (navigator && navigator.mediaDevices) {
    var interval;
    navigator.mediaDevices.getUserMedia({video: {facingMode: 'user'}}).then(function (stream) {
      video.srcObject = stream;
      video.play();
      video.addEventListener('canplay', function () {
        if (interval) {
          clearInterval(interval);
        }
        var canvas = fx.canvas();
        setTimeout(function () {
          ready = true;
          setStatus('Click me');
          interval = setInterval(function () {
            var target_height = getTargetHeight();
            var target_width = config('width');
            videomirror.width = target_width;
            videomirror.height = target_height;
            var context = videomirror.getContext('2d');
            context.imageSmoothingEnabled = false;
            var ratio  = Math.max(target_width  / video.videoWidth, target_height / video.videoHeight);
            var x = (target_width - video.videoWidth * ratio) / 2;
            var y = (target_height - video.videoHeight * ratio) / 2;
            context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, x, y, video.videoWidth * ratio, video.videoHeight * ratio);
            canvas.draw(canvas.texture(videomirror));
            var style = config('style');
            switch (style) {
              case 'grayscale':
                canvas.hueSaturation(-1, -1);
                break;
              case 'sepia':
                canvas.sepia(1);
                break;
              case 'beauty':
              case 'purikura':
                canvas.denoise(80).brightnessContrast(.1, 0);
                break;
              case 'vignette':
                canvas.vignette(0.5, 0.7);
                break;
              case 'motionblur':
                canvas.zoomBlur(videomirror.width / 2, videomirror.height / 2, 0.2);
                break;
              default:
                break;
            }
            canvas.update();
            context.translate(videomirror.width, 0);
            context.scale(-1, 1);
            context.drawImage(canvas, 0, 0, videomirror.width, videomirror.height);
            if (style === 'purikura') {
              context.drawImage(purikura.children[0], 0, 0, videomirror.width, videomirror.height);
            }
          }, 10);
        }, config('ramp_time'));
      }, false);
    }).catch(function () {
      setStatus('Webcam issues 😭', 'error');
    });
  }
  else {
    setStatus('Incompatible browser 😭', 'error');
  }

}());
