
import { Readable, Writable } from 'stream';
import { readFile } from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { ipcMain } from 'electron';

class InputStream extends Readable {
  _index = 1;

  _read() {
    const i = this._index++;
    readFile(`${__dirname}/../img/step_${i%6}.png`, (err, data) => {
      this.push(data);
    })
  }
}

const inputStream = new InputStream()
const targetStream = new Writable({
  write(chunk, encoding, callback) {
    handleChunk(chunk);
    callback();
  }
});

// const bigInt = require("big-integer");

// const MP4_FTYP = 1718909296;
// const MP4_MOOV = 1836019574;

// let ftyp;
// let moov;

const moov = []

let renderer = null
function handleChunk(data) {
  if (moov.length < 3) {
    moov.push(data);
  }

  if(renderer) {
    renderer.send('stream', data);
  }
}

ffmpeg(inputStream)
    .outputOption('-threads 1')
    .inputOption('-re')
    .inputOption('-r 1')
    .videoCodec('libx264')
    .size('640x?')
    .outputOption('-pix_fmt yuv420p')
    // .outputOption('-movflags frag_keyframe+empty_moov')
    .outputOption('-movflags empty_moov+default_base_moof')
    .outputOption('-vsync 2')
    // .outputOption('-r 12')
    .outputOption('-frag_duration 700000')
    .outputOption('-reset_timestamps 1')
    .noAudio()
    .format('mp4')
    .on('start', function (command) {
      console.log('ffmpeg process started:', command)
    })
    .on('error', function (err, stdout, stderr) {
      console.error('Error:', err)
      console.error('ffmpeg stderr:', stderr)
    })
    .on('end', function (output) {
      console.error('Video created in:', output)
    })
    .pipe(targetStream);

ipcMain.on('stream:open', (e) => {
  renderer = e.sender;
  
  if (moov) {
    moov.forEach(data => renderer.send('stream', data));
  }
})

export function streamTo(_renderer) {
  // renderer = _renderer
}