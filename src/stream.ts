
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

const bigInt = require("big-integer");

const MP4_FTYP = 1718909296;
const MP4_MOOV = 1836019574;

let ftyp;
let moov;

let renderer = null
function handleChunk(data) {
  if (!moov) {
    initFragment(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
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
    console.log('Sending ftyp and moov segments to client.');
  
    var ftyp_moov = new Uint8Array(ftyp.length + moov.length);
    ftyp_moov.set(ftyp, 0);
    ftyp_moov.set(moov, ftyp.length);
    renderer.send('stream', ftyp_moov);
  }
})

export function streamTo(_renderer) {
  // renderer = _renderer
}


function binStringToHex2(s) {
  var s2 = new Array(s.length), c;

  for (var i = 0, l = s.length; i < l; ++i) {
      c = s.charCodeAt(i);
      s2[i * 2] = (c >> 4).toString(16);
      s2[i * 2 + 1] = (c & 0xF).toString(16);
  }

  return String.prototype.concat.apply('', s2);
}

function getUint64(data, offset){
  var dat = data.getUTF8String(offset, 8);
  var str = '0x' + binStringToHex2(dat);

  return bigInt(str);
}

function parseMP4(dataView, offset, size)
{
    while (offset < size)
    {
        var len = dataView.getUint32(offset);
        var type = dataView.getInt32(offset + 4);

        if (len == 1)
        {
            // Extended size
            len = getUint64(dataView, offset + 8);
        }

        if (type === MP4_FTYP) {
            ftyp = new Uint8Array(dataView.buffer.slice(offset, len));
        } else if (type === MP4_MOOV) {
            moov = new Uint8Array(dataView.buffer.slice(offset, len));
            break;
        }

        offset = offset + len;
    }
}

function initFragment(buffer) {
    var dataView = new DataView(buffer);

    parseMP4(dataView, 0, buffer.byteLength);
}
