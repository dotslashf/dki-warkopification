import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function determineSeconds(start: number) {
  const minutes = Math.floor(start / 60)
  const seconds = start - minutes * 60
  return {
    minutes,
    seconds
  }
}

export function determineStart(start: number) {
  const { minutes, seconds } = determineSeconds(start)
  return `00:${minutes}:${seconds}`
}

export const VIDEO_DURATION = 40

export const EXTRACT_VIDEO_COMMAND = (start: string, x: number, y: number) => [
  '-i',
  'input.mp4',
  '-ss',
  start,
  '-t',
  VIDEO_DURATION.toString(),
  '-vf',
  `drawtext=fontfile=/arial.ttf:text='dki-warkopification.vercel.app':x=${20}:y=${y - 40}:fontsize=12:fontcolor=white`,
  '-c:v',
  'libx264',
  '-preset',
  'ultrafast',
  '-r',
  '24',
  '-c:a',
  'copy',
  '-y',
  'temp.mp4',
]

export const MERGE_COMMAND = [
  '-i',
  'temp.mp4',
  '-i',
  'bgm.mp3',
  '-filter_complex',
  '[0:a]volume=0.5[a];[a][1:a]amix=inputs=2[aout]',
  '-map',
  '0:v:0',
  '-map',
  '[aout]',
  '-c:v',
  'copy',
  '-c:a',
  'aac',
  '-strict',
  'experimental',
  '-shortest',
  'output.mp4'
]

export const MERGE_COMMAND_WITHOUT_ORIGINAL = [
  '-i',
  'temp.mp4',
  '-i',
  'bgm.mp3',
  '-t',
  VIDEO_DURATION.toString(),
  '-c:v',
  'copy',
  '-c:a',
  'aac',
  '-strict',
  'experimental',
  '-map',
  '0:v:0',
  '-map',
  '1:a:0',
  '-shortest',
  'output.mp4',
]