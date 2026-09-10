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

export function formatBytes(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n < 0) {
    return 'Size unknown';
  }
  if (n < 1024) return `${Math.round(n)} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${Math.round(mb)} MB`;
  const gb = mb / 1024;
  return `${gb < 10 ? gb.toFixed(1) : gb.toFixed(1)} GB`;
}

export function formatApproxMinutes(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return '—';
  return `${Math.max(1, Math.round(sec / 60))} min`;
}

export function displayMovieTitle(title: string, fileUri?: string): string {
  const t = title?.trim();
  if (t) return t;
  const part = fileUri?.split(/[/\\]/).pop() || '';
  const decoded = decodeURIComponent(part).replace(/\.[^.]+$/, '').trim();
  return decoded || 'Movie';
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeWord(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z]/g, '');
}
