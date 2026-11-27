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
  layout?: string;
  track?: string;
};

export type Track = { id: string; space: string; title: string; desc?: string; home?: string; order?: string[] };

export type Lesson = { id: string; title: string; kind: 'video' | 'pdf' | 'quiz'; mins: number; sum?: string };
export type Module = { id: string; title: string; lessons: Lesson[]; part?: string; about?: string; outcome?: string; worksheet?: string; deliverable?: string };
export type CoursePart = { id: string; title: string; desc?: string };
export type Course = {
  id: string;
  space: string;
  track: string;
  title: string;
  headline?: string;
  sub?: string;
  desc?: string;
  gains?: string[];     // "What you'll walk away with" on the course page
  icon?: string;
  price: number;        // full price, in the course currency
  currency: 'USD' | 'NGN';
  instN: number;        // number of installments (1 = pay in full only)
  instAmt: number;      // each installment, in the course currency
  amld?: string;
  mode: 'paid' | 'free' | 'application';
  downloads: string[];
  modules: Module[];
  parts?: CoursePart[];
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

export type Service = { id: string; icon: string; title: string; tag: string; desc: string };
export type Ebook = {
  id: string; space: string; title: string; sub: string; cat: string; price: number; pages?: number;
  color?: string; course?: string; desc: string; toc?: string[]; author?: string; img?: string;
};
export type AffiliateSettings = { rate: number; cookie: number; min: number };

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
  services: Service[];
  ebooks: Ebook[];
  affiliate: AffiliateSettings;
};
