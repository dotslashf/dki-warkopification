'use client';

import { InputFile } from '@/components/InputFile';
import { Button } from '@/components/ui/button';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { useEffect, useRef, useState } from 'react';

import bgm from '../bgm.json';
import { VideoPreview } from './VideoPreview';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { MERGE_COMMAND, determineStart } from '@/lib/utils';

import { z, ZodError } from 'zod';
import { useToast } from './ui/use-toast';

interface FileDataWithBuffer {
  buffer: ArrayBuffer;
}

const schema = z.object({
  startSeconds: z.number().min(0).max(1000),
  base64: z.string(),
});

export default function Layout() {
  const { toast } = useToast();
  const [loaded, setLoaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const ffmpegRef = useRef(new FFmpeg());
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const videoResultRef = useRef<HTMLVideoElement>(null);
  const [videoBase64, setVideoBase64] = useState<string | undefined>(undefined);
  const [seconds, setSeconds] = useState<number>();

  const load = async () => {
    setIsDownloading(true);
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    const ffmpeg = ffmpegRef.current;
    ffmpeg.on('log', ({ message }) => {
      console.log(message);
    });
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        'application/wasm'
      ),
    });
    setLoaded(true);
    setIsDownloading(false);
  };

  useEffect(() => {
    load();
  }, []);

  async function handleFileUpload(base64File: string) {
    setIsPreviewLoading(true);
    setVideoBase64(base64File);
    const ffmpeg = ffmpegRef.current;
    ffmpeg.writeFile('input.mp4', await fetchFile(base64File));
    await ffmpeg.exec(['-i', 'input.mp4', '-c:v', 'copy', 'output.mp4']);
    const data = (await ffmpeg.readFile('output.mp4')) as FileDataWithBuffer;
    videoPreviewRef.current!.src = URL.createObjectURL(
      new Blob([data.buffer], { type: 'video/mp4' })
    );
    setIsPreviewLoading(false);
  }

  async function mergeFile() {
    try {
      schema.parse({ startSeconds: seconds ?? 0, base64: videoBase64 });
      setIsMerging(true);
      const { start, end } = determineStart(seconds ?? 0);
      const ffmpeg = ffmpegRef.current;
      await ffmpeg.writeFile('input.mp4', await fetchFile(videoBase64));
      await ffmpeg.writeFile('bgm.mp3', await fetchFile(bgm.base64));
      await ffmpeg.exec([
        '-i',
        'input.mp4',
        '-ss',
        start,
        '-t',
        end,
        '-an',
        '-c:v',
        'copy',
        '-y',
        'temp.mp4',
      ]);
      await ffmpeg.exec(MERGE_COMMAND);
      const data = (await ffmpeg.readFile('output.mp4')) as FileDataWithBuffer;
      videoResultRef.current!.src = URL.createObjectURL(
        new Blob([data.buffer], { type: 'video/mp4' })
      );
      setIsMerging(false);
    } catch (error) {
      console.error(error);
      if (error instanceof ZodError) {
        console.error(error.issues);
        error.errors.map((error) => {
          toast({
            title: 'Error',
            description: `${error.path.join('.')} ${error.message}`,
          });
        });
      }
    }
  }

  function handleDownload() {
    if (!videoResultRef.current?.src.includes('blob')) {
      return toast({
        title: 'Error',
        description: 'Please merge the video first',
      });
    }
    const a = document.createElement('a');
    a.href = videoResultRef.current!.src;
    a.download = 'result.mp4';
    a.click();
  }

  return (
    <main className="flex space-y-4 min-h-screen flex-col md:p-24 p-6 ${inter.className} bg-slate-100">
      <h1 className="font-bold text-center text-2xl">dki-warkopification</h1>
      <div className="flex flex-col space-y-2 h-full">
        <InputFile
          onFileUpload={handleFileUpload}
          isLoading={isPreviewLoading}
        />
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="seconds">Start Seconds</Label>
          <Input
            id="seconds"
            type="number"
            onChange={(event) => {
              const { value } = event.target;
              setSeconds(Number(value));
            }}
          />
        </div>
        <Button onClick={mergeFile}>
          {isDownloading ? (
            <span className="flex">
              <svg
                className="animate-spin mr-2 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Downloading FFmpeg...{' '}
            </span>
          ) : isMerging ? (
            <svg
              className="animate-spin mr-2 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : (
            'Merge'
          )}
        </Button>
      </div>
      <div className="md:col-span-2 h-full w-full">
        <VideoPreview
          videoPreviewRef={videoPreviewRef}
          videoResultRef={videoResultRef}
        />
      </div>
      <Button onClick={handleDownload}>Download</Button>
    </main>
  );
}