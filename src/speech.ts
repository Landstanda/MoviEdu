import * as Speech from 'expo-speech';

export type SpeakOpts = {
  voiceId?: string | null;
  rate?: number;
  pitch?: number;
};

export async function speakText(text: string, opts: SpeakOpts = {}): Promise<void> {
  Speech.stop();
  Speech.speak(text, {
    language: 'en-US',
    rate: opts.rate ?? 0.9,
    pitch: opts.pitch ?? 1,
    voice: opts.voiceId ?? undefined,
  });
}

export function stopSpeech(): void {
  Speech.stop();
}

export async function listEnglishVoices(): Promise<Speech.Voice[]> {
  const voices = await Speech.getAvailableVoicesAsync();
  const english = voices.filter((v) => v.language?.toLowerCase().startsWith('en'));
  english.sort((a, b) => a.name.localeCompare(b.name));
  return english.length ? english : voices;
}
