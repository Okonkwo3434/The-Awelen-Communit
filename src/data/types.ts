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

export type Lesson = { id: string; title: string; kind: 'video' | 'pdf' | 'quiz'; mins: number };
export type Module = { id: string; title: string; lessons: Lesson[] };
export type Course = {
  id: string;
  space: string;
  track: string;
  title: string;
  headline?: string;
  sub?: string;
  desc?: string;
  icon?: string;
  price: number;        // full price in naira
  instN: number;        // number of installments (1 = pay in full only)
  instAmt: number;      // each installment in naira
  amld?: string;
  mode: 'paid' | 'free' | 'application';
  downloads: string[];
  modules: Module[];
};
export type PaymentSettings = { bankName: string; accountName: string; accountNumber: string; linpayUrl: string };

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

export type Rule = { icon: string; title: string; text: string; hard?: boolean };
export type SiteLink = { id: string; label: string; url: string };
export type Announcement = {
  id: string; title: string; category: string; body: string;
  important: boolean; pinned: boolean; published_at: string;
};

export type SiteData = {
  rules: Rule[];
  links: SiteLink[];
  annCats: string[];
  announcements: Announcement[];
  groups: Group[];
  spaces: Space[];
  tracks: Track[];
  courses: Course[];
  payments: PaymentSettings;
  creator: Creator;
};
