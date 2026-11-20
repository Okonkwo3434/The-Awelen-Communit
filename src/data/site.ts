import seed from './seed.json';
import type { Course, SiteData } from './types';

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
