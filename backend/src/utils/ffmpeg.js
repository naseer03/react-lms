const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

/**
 * Run a single FFmpeg command, returns a Promise.
 * Rejects with the stderr output if the process exits non-zero.
 */
const runFFmpeg = (args, label) => {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', args, { windowsHide: true });
    let stderr = '';
    ffmpeg.stderr.on('data', (d) => { stderr += d.toString(); });
    ffmpeg.on('error', (err) => {
      logger.error(`[FFmpeg:${label}] spawn error: ${err.message}`);
      reject(new Error(`FFmpeg spawn failed: ${err.message}. Is FFmpeg installed and on PATH?`));
    });
    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        const tail = stderr.slice(-600);
        logger.error(`[FFmpeg:${label}] exited ${code}: ${tail}`);
        return reject(new Error(`FFmpeg [${label}] exited ${code}: ${tail}`));
      }
      resolve();
    });
  });
};

/**
 * Convert an uploaded video to multi-bitrate HLS.
 * Runs one FFmpeg process per quality (360p / 720p / 1080p) sequentially.
 * Writes a master.m3u8 manifest once all renditions succeed.
 *
 * @param {string} inputPath  Absolute path to the raw uploaded video
 * @param {string} outputDir  Directory where HLS files will be written
 * @returns {Promise<{ duration: number, manifestPath: string }>}
 */
const convertToHLS = async (inputPath, outputDir) => {
  ensureDir(outputDir);

  const renditions = [
    {
      name: '360p',
      scale: 'scale=w=640:h=360:force_original_aspect_ratio=decrease',
      videoBitrate: '800k',
      audioBitrate: '96k',
      bandwidth: 800000,
      resolution: '640x360',
    },
    {
      name: '720p',
      scale: 'scale=w=1280:h=720:force_original_aspect_ratio=decrease',
      videoBitrate: '2800k',
      audioBitrate: '128k',
      bandwidth: 2800000,
      resolution: '1280x720',
    },
    {
      name: '1080p',
      scale: 'scale=w=1920:h=1080:force_original_aspect_ratio=decrease',
      videoBitrate: '5000k',
      audioBitrate: '192k',
      bandwidth: 5000000,
      resolution: '1920x1080',
    },
  ];

  for (const r of renditions) {
    const rendDir = path.join(outputDir, r.name);
    ensureDir(rendDir);

    const args = [
      '-i', inputPath,
      '-hide_banner',
      '-loglevel', 'error',
      // Video
      '-vf', r.scale,
      '-c:v', 'libx264',
      '-b:v', r.videoBitrate,
      '-preset', 'veryfast',
      '-profile:v', 'main',
      // Audio
      '-c:a', 'aac',
      '-b:a', r.audioBitrate,
      '-ar', '44100',
      // HLS options
      '-f', 'hls',
      '-hls_time', '6',
      '-hls_playlist_type', 'vod',
      '-hls_segment_filename', path.join(rendDir, 'seg%03d.ts'),
      '-hls_flags', 'independent_segments',
      '-y',
      path.join(rendDir, 'index.m3u8'),
    ];

    logger.info(`[FFmpeg] Encoding ${r.name} for: ${path.basename(inputPath)}`);
    await runFFmpeg(args, r.name);
    logger.info(`[FFmpeg] ${r.name} complete`);
  }

  // Write master playlist
  const manifestPath = path.join(outputDir, 'master.m3u8');
  const masterContent = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    '',
    `#EXT-X-STREAM-INF:BANDWIDTH=${renditions[0].bandwidth},RESOLUTION=${renditions[0].resolution}`,
    `${renditions[0].name}/index.m3u8`,
    '',
    `#EXT-X-STREAM-INF:BANDWIDTH=${renditions[1].bandwidth},RESOLUTION=${renditions[1].resolution}`,
    `${renditions[1].name}/index.m3u8`,
    '',
    `#EXT-X-STREAM-INF:BANDWIDTH=${renditions[2].bandwidth},RESOLUTION=${renditions[2].resolution}`,
    `${renditions[2].name}/index.m3u8`,
  ].join('\n');

  fs.writeFileSync(manifestPath, masterContent);
  logger.info(`[FFmpeg] master.m3u8 written: ${manifestPath}`);

  const duration = await getDuration(inputPath).catch(() => 0);
  logger.info(`[FFmpeg] HLS conversion complete. Duration: ${duration}s`);

  return { duration, manifestPath };
};

/**
 * Get video duration in seconds using ffprobe.
 */
const getDuration = (filePath) => {
  return new Promise((resolve, reject) => {
    const probe = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ], { windowsHide: true });

    let output = '';
    probe.stdout.on('data', (d) => { output += d.toString(); });
    probe.on('error', (err) => reject(new Error(`ffprobe spawn failed: ${err.message}`)));
    probe.on('close', (code) => {
      if (code !== 0) return reject(new Error('ffprobe exited non-zero'));
      const dur = parseFloat(output.trim());
      resolve(isNaN(dur) ? 0 : Math.round(dur));
    });
  });
};

/**
 * Extract a JPEG thumbnail at a given time offset.
 */
const extractThumbnail = (inputPath, outputPath, timeOffset = 5) => {
  const args = [
    '-ss', String(timeOffset),
    '-i', inputPath,
    '-vframes', '1',
    '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease',
    '-q:v', '3',
    '-y',
    outputPath,
  ];
  return runFFmpeg(args, 'thumbnail');
};

module.exports = { convertToHLS, getDuration, extractThumbnail };
