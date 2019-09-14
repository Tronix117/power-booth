import express from 'express';
import {Readable, Writable, PassThrough} from 'stream';
import videoshow = require('videoshow');
import { readFile } from 'fs';

import ffmpeg = require('fluent-ffmpeg');
import multi = require('multi-write-stream');

const app = express()
app.get('/', srv);
app.listen(8080);


class InputStream extends Readable {
  _index = 1;

  _read() {
    const i = this._index++;
    readFile(`${__dirname}/img/step_${i%6}.png`, (err, data) => {
      this.push(data);
    })
  }
}

const inputStream = new InputStream()


const videoOptions = {
  fps: 25,
  videoBitrate: 1024,
  videoCodec: 'libx264',
  size: '640x?',
  audioBitrate: '128k',
  audioChannels: 2,
  format: 'mp4',
  pixelFormat: 'yuv420p'
}

const stream = multi();
const targetStream = new Writable({
  write(chunk, encoding, callback) {
    console.log(chunk);
    callback();
  }
});
const outputStream = ffmpeg(inputStream)
  .inputOption('-re')
  // .inputOption('-r 12')
  .videoCodec('libx264')
  .size('640x?')
  .outputOption('-pix_fmt yuv420p')
  .outputOption('-movflags frag_keyframe+empty_moov')
  .outputOption('-vsync 2')
  // .outputOption('-r 24')
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


function srv(req, res) {
  res.contentType('video/mp4');
  res.set({
    'Content-Range': `bytes */*`,
    'Accept-Ranges': 'bytes',
    'Content-Transfer-Encoding': 'binary',
    'Content-Type': 'video/mp4',
    'Content-Length': 1000000,
  });
  res.status(206);
  // const pass = new PassThrough();
  // stream.add(pass);
  // pass.pipe(res);
  // res.on('close', () => stream.remove(pass));
  outputStream.pipe(res);
}