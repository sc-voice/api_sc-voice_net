import { describe, it, expect } from '@sc-voice/vitest';
import should from 'should';
import fs from 'fs';
import path from 'path';
import tmp from 'tmp';
import { exec } from 'child_process';
import util from 'util';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const execPromise = util.promisify(exec);
const AudioTrans = require('../src/audio-trans.cjs');
const MP3_FILES = [
  path.join(__dirname, 'data/1d4e09ef9cd91470da56c84c2da481b0.mp3'),
  path.join(__dirname, 'data/0e4a11bcb634a4eb72d2004a74f39728.mp3'),
];
const COVER_PATH = path.join(__dirname, 'data', 'wheel100.png');

describe('audio-trans', () => {
  it('default ctor', () => {
    var at = new AudioTrans();
    expect(fs.existsSync(COVER_PATH)).toBe(true);
    expect(at).toMatchObject({
      album: undefined,
      album_artist: undefined,
      audioSuffix: '.ogg',
      artist: undefined,
      comment: '',
      composer: undefined,
      copyright: undefined,
      coverPath: undefined,
      cwd: undefined,
      date: undefined,
      genre: undefined,
      languages: undefined,
      publisher: undefined,
      title: undefined,
      version: undefined,
    });
  });
  it('custom ctor', () => {
    let album = 'test-album';
    let album_artist = 'test-album-artist';
    let audioSuffix = 'test-audioSuffix';
    let artist = 'test-artist';
    let cwd = 'test-cwd';
    let comment = 'test-comment';
    let composer = 'test-composer';
    let copyright = 'test-copyright';
    let date = 'test-date';
    let genre = 'test-genre';
    let languages = 'test-languages';
    let publisher = 'test-publisher';
    let title = 'test-title';
    let version = 'test-version';
    let at = new AudioTrans({
      album,
      album_artist,
      audioSuffix,
      artist,
      comment,
      copyright,
      cwd,
      date,
      genre,
      languages,
      publisher,
      title,
      version,
    });
    expect(at).toMatchObject({
      album,
      album_artist,
      audioSuffix,
      artist,
      comment,
      copyright,
      cwd,
      date,
      genre,
      languages,
      publisher,
      title,
      version,
    });
  });
  it('concatAudio(files) returns MP3 file', async () => {
    var tmpPath = tmp.tmpNameSync();
    var guid = path.basename(tmpPath);
    var cwd = path.dirname(tmpPath);
    var audioSuffix = '.mp3';
    let languages = 'test-languages';
    var outpath = path.join(cwd, `${guid}${audioSuffix}`);
    var inpath = path.join(cwd, `${guid}.txt`);
    let coverPath = COVER_PATH;
    fs.writeFileSync(inpath, MP3_FILES.map((f) => `file '${f}'`).join('\n'));

    let publisher = 'test-publisher';
    var at = new AudioTrans({
      cwd,
      genre: 'Dhamma',
      audioSuffix,
      coverPath,
      publisher,
    });
    let composer = 'test-composer';
    let album_artist = 'test-album-artist';
    var title = 'test_title';
    var artist = 'test_artist';
    var comment = 'test_comment';
    var album = 'test_album';
    let copyright = 'test_copyright';
    var date = 'test_date';
    await at.concat({
      date,
      album,
      album_artist,
      artist,
      comment,
      composer,
      copyright,
      inpath,
      languages,
      outpath,
      title,
      version: guid,
    });

    let cmd = `ffprobe -hide_banner ${outpath}`;
    let { stderr: probeOut } = await execPromise(cmd);
    expect(probeOut).toMatch(/title\s*:\s*test_title/imsu);
    expect(probeOut).toMatch(/\bartist\s*:\s*test_artist/imsu);
    expect(probeOut).toMatch(/album\s*:\s*test_album/imsu);
    expect(probeOut).toMatch(/album_artist\s*:\s*test-album-artist/imsu);
    expect(probeOut).toMatch(/comment\s*:\s*test_comment/imsu);
    expect(probeOut).toMatch(new RegExp(`date\\s*:\\s*${date}`, `msiu`));
    expect(probeOut).toMatch(
      new RegExp(`composer\\s*:\\s*${composer}`, `msiu`)
    );
    expect(probeOut).toMatch(
      new RegExp(`publisher\\s*:\\s*${publisher}`, `msiu`)
    );
    expect(probeOut).toMatch(new RegExp(`version\\s*:\\s*${guid}`, `msiu`));
    expect(probeOut).toMatch(
      new RegExp(`languages\\s*:\\s*${languages}`, `msiu`)
    );
    expect(probeOut).toMatch(/genre\s*:\s*Dhamma/imsu);
  });
  it('concatAudio(files) returns Opus file', async () => {
    let tmpPath = tmp.tmpNameSync();
    let guid = path.basename(tmpPath);
    let version = guid;
    let cwd = path.dirname(tmpPath);
    let audioSuffix = '.ogg';
    let outpath = path.join(cwd, `${guid}${audioSuffix}`);
    let inpath = path.join(cwd, `${guid}.txt`);
    let coverPath = COVER_PATH;
    let copyright = 'test_copyright';
    let publisher = 'test-publisher';
    let composer = 'test-composer';
    fs.writeFileSync(inpath, MP3_FILES.map((f) => `file '${f}'`).join('\n'));

    let title = 'test_title';
    let artist = 'test_artist';
    let album_artist = 'test_album_artist';
    let comment = 'test_comment';
    let album = 'test_album';
    let date = 'test_date';
    let at = new AudioTrans({
      cwd, genre: 'Dhamma', audioSuffix, coverPath
    });
    await at.concat({
      title,
      date,
      album,
      artist,
      album_artist,
      comment,
      copyright,
      inpath,
      outpath,
      publisher,
      composer,
      version,
    });

    let cmd = `ffprobe -hide_banner ${outpath}`;
    let { stderr: probeOut } = await execPromise(cmd);
    expect(probeOut).toMatch(/title\s*:\s*test_title/imsu);
    expect(probeOut).toMatch(/\bartist\s*:\s*test_artist/imsu);
    expect(probeOut).toMatch(/album\s*:\s*test_album/imsu);
    expect(probeOut).toMatch(/album_artist\s*:\s*test_album_artist/imsu);
    expect(probeOut).toMatch(/comment\s*:\s*test_comment/imsu);
    expect(probeOut).toMatch(new RegExp(`version\\s*:\\s*${version}`, 'msiu'));
    expect(probeOut).toMatch(
      new RegExp(`publisher\\s*:\\s*${publisher}`, 'msiu')
    );
    expect(probeOut).toMatch(
      new RegExp(`composer\\s*:\\s*${composer}`, 'msiu')
    );
    expect(probeOut).toMatch(new RegExp(`date\\s*:\\s*${date}`, `msiu`));
    expect(probeOut).toMatch(/genre\s*:\s*Dhamma/imsu);
    expect(probeOut).toMatch(/comment\s*:\s*Cover/imsu);
  });
});
