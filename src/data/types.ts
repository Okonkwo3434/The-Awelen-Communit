// Shapes of the data carried over from the original build (see seed.json).
export type Group = { id: string; name: string };

export type Space = {
  id: string;
  name: string;
  icon: string;
  type: string;
  group: string;
  img?: string;
  theme?: string;
  headline?: string;
  desc?: string;
  navSub?: string;
  hidden?: boolean;
  style?: string;
};

export type Track = { id: string; space: string; title: string; desc?: string };

export type CourseSummary = {
  id: string;
  space: string;
  track: string;
  title: string;
  headline?: string;
  sub?: string;
  price: number;
  amld?: string;
  modules: number;
  lessons: number;
};

export type Creator = {
  name: string;
  title: string;
  email: string;
  phone: string;
  whatsapp?: string;
  location: string;
  hours: string;
  tagline?: string;
  fdesc?: string;
  copy?: string;
  banner: { kicker: string; headline: string; sub: string; img?: string };
};

export type SiteData = {
  groups: Group[];
  spaces: Space[];
  tracks: Track[];
  courses: CourseSummary[];
  creator: Creator;
};
