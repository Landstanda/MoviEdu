export function formatClock(totalSec: number): string {
  if (!Number.isFinite(totalSec) || totalSec < 0) {
    return '0:00';
  }
  const s = Math.floor(totalSec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeWord(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z]/g, '');
}
