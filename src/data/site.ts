import seed from './seed.json';
import type { Course, SiteData, Space, Track } from './types';

// For now the site content comes from seed.json, exported from the original build.
// In a later phase this moves to Supabase (table: site_content) so the admin portal can edit it live.
export const site = seed as unknown as SiteData;

export const spaceById = (id: string) => site.spaces.find((s) => s.id === id);
export const trackById = (id: string) => site.tracks.find((t) => t.id === id);
export const courseById = (id: string) => site.courses.find((c) => c.id === id);
export const flatLessons = (c: Course) => c.modules.flatMap((m) => m.lessons);
export const lessonCount = (c: Course) => flatLessons(c).length;
export const coursesInTrack = (trackId: string) => site.courses.filter((c) => c.track === trackId);

export const naira = (n: number) => '₦' + Number(n || 0).toLocaleString('en-NG');
export const dollars = (n: number) => '$' + Number(n || 0).toLocaleString('en-US');
/** Money in the course's own currency (courses are priced in US dollars or naira). */
export const cm = (c: Pick<Course, 'currency'>, n: number) => (c.currency === 'USD' ? dollars(n) : naira(n));

/* ---------- Tracks: what sits under each track, and where its heading leads ---------- */
// As in the single-file app: a track lists its courses (not the AMLD sprint/Executive Presence courses, which live
// inside their programme spaces) and any spaces placed in it, in the track's own order. A track with a "home"
// space (Track 4 → AMLD Programme) opens that space when its heading is clicked.
export type TrackItem = { k: 'course'; c: Course; href: string; icon: string; title: string } | { k: 'space'; s: Space; href: string; icon: string; title: string };
export const trackNo = (t: Track) => site.tracks.indexOf(t) + 1;
export const trackHref = (t: Track) => (t.home && spaceById(t.home) ? '/space/' + t.home : '/track/' + t.id);
export const trackOfSpace = (s: Space) => site.tracks.find((t) => t.id === s.track || t.home === s.id);
export function trackItems(t: Track): TrackItem[] {
  const its: TrackItem[] = [
    ...site.courses.filter((c) => c.track === t.id && !c.amld).map((c) => ({ k: 'course' as const, c, href: '/course/' + c.id, icon: c.icon || '🎓', title: c.title })),
    ...site.spaces.filter((s) => s.track === t.id && !s.hidden).map((s) => ({ k: 'space' as const, s, href: '/space/' + s.id, icon: s.icon || '✨', title: s.name })),
  ];
  if (t.order?.length) {
    const key = (it: TrackItem) => { const i = t.order!.indexOf(it.k === 'course' ? 'c:' + it.c.id : 's:' + it.s.id); return i < 0 ? 999 : i; };
    its.sort((a, b) => key(a) - key(b));
  }
  return its;
}
