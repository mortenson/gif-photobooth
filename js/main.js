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
      gutter_color: '#000000',
      width: 200,
      height: 900,
      style: 'none',
      auto_download: 0
    };

  for (var name in base_config) {
    var input = document.getElementById('config_' + name);
    if (input) {
      input.value = base_config[name];
    }
  }

  function config (name) {
    var input = document.getElementById('config_' + name);
    if (input && input.value.length) {
      var value = input.value;
      if (name === 'gutter_color' || name === 'style') {
        return value;
      }
      else if (name === 'auto_download') {
        return input.checked;
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
    var status = document.getElementById('statustext');
    status.textContent = text;
    status.blur();
    document.body.classList = body_class || '';
  }

  function prepFrames () {
    var frames = [], context;
    for (var i = 0; i < config('num_frames'); ++i) {
      frames[i] = document.createElement('canvas');
      frames[i].width = config('width');
      frames[i].height = config('height');
      context = frames[i].getContext('2d');
      context.fillStyle = config('gutter_color');
      context.fillRect(0, 0, frames[i].width, frames[i].height);
    }
    return frames;
  }

  function setCountdown (i) {
    if (config('prep_time') > 3000) {
      var pose_time = config('frame_delay') * config('num_frames');
      sleep((config('prep_time') * i) + (config('prep_time') - 3000) + (pose_time * i)).then(function () {
        for (let count = 0; count < 3; ++count) {
          sleep(1000 * count).then(function () {
            setStatus(3 - count, 'count');
          });
        }
      });
    }
  }

  function drawPose (frame, i) {
    var target_height = getTargetHeight();
    var target_width = config('width');
    var context = frame.getContext('2d');
    var video = document.getElementById('videomirror');
    context.drawImage(video, 0, (i * target_height) + ((i + 1) * config('gutter')), target_width, target_height);
  }

  function compileGIF (frames) {
    var gif = new GIF({
      workers: 2,
      workerScript: 'js/gif.js/gif.worker.js',
      quality: 10
    });
    for (var i in frames) {
      gif.addFrame(frames[i], { delay: 200 });
    }
    var preview = document.getElementById('preview');
    gif.on('finished', function (blob) {
      if (preview.src) {
        URL.revokeObjectURL(preview.src);
      }
      var url = URL.createObjectURL(blob);
      preview.src = url;
      var downloadlink = document.getElementById('downloadlink');
      downloadlink.href = url;
      downloadlink.download = 'photobooth.gif';
      if (config('auto_download')) {
        downloadlink.click();
        downloadlink.style.display = 'none';
      }
      else {
        downloadlink.style.display = 'block';
      }
      document.getElementById('preview-wrapper').classList.add('active');
      setStatus('Click me');
    });
    gif.render();
    running = false;
    setStatus('Loading GIF');
  }

  function startCapture () {
    if (ready && !running) {
      setStatus('Get ready...', 'ready');
      document.getElementById('preview-wrapper').classList.remove('active');
      running = true;
      var num_frames = config('num_frames');
      var frame_delay = config('frame_delay');
      var pose_time = frame_delay * num_frames;
      var frames = prepFrames();
      var rows = config('rows');
      for (let i = 0; i < rows; ++i) {
        setCountdown(i);
        sleep((config('prep_time') * (i + 1)) + (pose_time * i)).then(function () {
          for (let j = 0; j < num_frames; ++j) {
            sleep(frame_delay * j).then(function () {
              setStatus('Pose!', 'pose');
              drawPose(frames[j], i);
              if (j === num_frames - 1) {
                setStatus('Get Ready...', 'ready');
              }
              if (i ===rows - 1 && j === num_frames - 1) {
                compileGIF(frames);
              }
            });
          }
        });
      }
    }
  }

  document.getElementById('statustext').onclick = startCapture;

  document.getElementById('closelink').onclick = function () {
    preview.parentElement.classList.remove('active');
  };

  document.onkeypress = function (event) {
    if (event.keyCode === 13) {
      if (document.getElementById('preview-wrapper').classList.contains('active')) {
        document.getElementById('preview-wrapper').classList.remove('active');
      }
      else {
        startCapture();
      }
    }
  };

  function drawVideoMirror (canvas) {
    var video = document.getElementById('video');
    var target_height = getTargetHeight();
    var target_width = config('width');
    var videomirror = document.getElementById('videomirror');
    videomirror.width = target_width;
    videomirror.height = target_height;
    var context = videomirror.getContext('2d');
    context.imageSmoothingEnabled = false;
    var ratio  = Math.max(target_width  / video.videoWidth, target_height / video.videoHeight);
    var x = (target_width - video.videoWidth * ratio) / 2;
    var y = (target_height - video.videoHeight * ratio) / 2;
    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, x, y, video.videoWidth * ratio, video.videoHeight * ratio);
    canvas.draw(canvas.texture(videomirror));
  }

  function applyStyles (canvas) {
    var videomirror = document.getElementById('videomirror');
    var context = videomirror.getContext('2d');
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
      var purikura = document.getElementById('purikura');
      context.drawImage(purikura.children[0], 0, 0, videomirror.width, videomirror.height);
    }
  }

  if (navigator && navigator.mediaDevices) {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } }).then(function (stream) {
      var video = document.getElementById('video');
      video.srcObject = stream;
      video.play();
      video.addEventListener('canplay', function () {
        var canvas = fx.canvas();
        setTimeout(function () {
          ready = true;
          setStatus('Click me');
          setInterval(function () {
            drawVideoMirror(canvas);
            applyStyles(canvas);
          }, 100);
        }, config('ramp_time'));
      }, false);
    }).catch(function () {
      setStatus('Webcam issues. Did you deny access? 😿', 'error');
    });
  }
  else {
    setStatus('Incompatible browser. Chrome latest works! 😿', 'error');
  }

}());
