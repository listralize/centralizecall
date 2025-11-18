import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { mkdir } from 'fs/promises';

const execAsync = promisify(exec);

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/videos';
const THUMBNAIL_DIR = process.env.THUMBNAIL_DIR || '/data/thumbnails';

// Garantir que diretórios existem
await mkdir(UPLOAD_DIR, { recursive: true });
await mkdir(THUMBNAIL_DIR, { recursive: true });

/**
 * Gerar thumbnail de um vídeo usando FFmpeg
 * @param {string} videoPath - Caminho completo do vídeo
 * @param {string} outputPath - Caminho completo para salvar thumbnail
 * @returns {Promise<void>}
 */
export async function generateThumbnail(videoPath, outputPath) {
  try {
    console.log('🖼️  Gerando thumbnail:', outputPath);
    
    // Usar FFmpeg para extrair frame do segundo 1
    const command = `ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -vf "scale=640:-1" -q:v 2 "${outputPath}" -y`;
    
    await execAsync(command);
    
    console.log('✅ Thumbnail gerado com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao gerar thumbnail:', error);
    
    // Tentar frame 0 se segundo 1 falhar
    try {
      console.log('⚠️  Tentando frame 0...');
      const fallbackCommand = `ffmpeg -i "${videoPath}" -vframes 1 -vf "scale=640:-1" -q:v 2 "${outputPath}" -y`;
      await execAsync(fallbackCommand);
      console.log('✅ Thumbnail gerado (frame 0)!');
      return true;
    } catch (fallbackError) {
      console.error('❌ Falha total ao gerar thumbnail:', fallbackError);
      return false;
    }
  }
}

/**
 * Cortar vídeo (trim)
 * @param {string} videoPath - Caminho do vídeo original
 * @param {string} outputPath - Caminho do vídeo cortado
 * @param {number} startTime - Tempo inicial em segundos
 * @param {number} endTime - Tempo final em segundos
 * @returns {Promise<void>}
 */
export async function trimVideo(videoPath, outputPath, startTime, endTime) {
  try {
    console.log(`✂️  Cortando vídeo: ${startTime}s - ${endTime}s`);
    
    const duration = endTime - startTime;
    
    // FFmpeg trim com re-encode rápido
    const command = `ffmpeg -i "${videoPath}" -ss ${startTime} -t ${duration} -c:v libx264 -preset ultrafast -crf 23 -c:a aac "${outputPath}" -y`;
    
    const { stdout, stderr } = await execAsync(command);
    console.log('✅ Vídeo cortado com sucesso!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao cortar vídeo:', error);
    throw new Error(`Failed to trim video: ${error.message}`);
  }
}

/**
 * Obter duração do vídeo
 * @param {string} videoPath - Caminho do vídeo
 * @returns {Promise<number>} Duração em segundos
 */
export async function getVideoDuration(videoPath) {
  try {
    const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;
    const { stdout } = await execAsync(command);
    return parseFloat(stdout.trim());
  } catch (error) {
    console.error('❌ Erro ao obter duração:', error);
    return null;
  }
}

/**
 * Obter informações do vídeo
 * @param {string} videoPath - Caminho do vídeo
 * @returns {Promise<object>} Informações do vídeo
 */
export async function getVideoInfo(videoPath) {
  try {
    const command = `ffprobe -v error -show_format -show_streams -of json "${videoPath}"`;
    const { stdout } = await execAsync(command);
    const info = JSON.parse(stdout);
    
    const videoStream = info.streams.find(s => s.codec_type === 'video');
    const audioStream = info.streams.find(s => s.codec_type === 'audio');
    
    return {
      duration: parseFloat(info.format.duration),
      size: parseInt(info.format.size),
      bitrate: parseInt(info.format.bit_rate),
      video: videoStream ? {
        codec: videoStream.codec_name,
        width: videoStream.width,
        height: videoStream.height,
        fps: eval(videoStream.r_frame_rate) // "30/1" -> 30
      } : null,
      audio: audioStream ? {
        codec: audioStream.codec_name,
        sampleRate: audioStream.sample_rate,
        channels: audioStream.channels
      } : null
    };
  } catch (error) {
    console.error('❌ Erro ao obter info do vídeo:', error);
    return null;
  }
}
