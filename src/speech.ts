import * as Speech from 'expo-speech';

export async function speakText(
  text: string,
  voiceId: string | null | undefined,
): Promise<void> {
  Speech.stop();
  Speech.speak(text, {
    language: 'en-US',
    rate: 0.85,
    pitch: 1,
    voice: voiceId ?? undefined,
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
