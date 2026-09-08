import { createVideoPlayer } from 'expo-video';

export const UNPLAYABLE_FILE_MESSAGE =
  'This file can’t play on this tablet. Convert it to MP4 (H.264) and try again.';

export function probeVideoDuration(uri: string, timeoutMs = 15000): Promise<number | null> {
  return new Promise((resolve) => {
    let settled = false;
    const player = createVideoPlayer({ uri });
    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        player.release();
      } catch {
        // ignore
      }
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') {
        const duration = player.duration;
        finish(Number.isFinite(duration) && duration > 0 ? duration : null);
      } else if (status === 'error') {
        finish(null);
      }
    });
  });
}
