// Teach on Awelen: the plans a creator subscribes to in order to run their own learning community on the platform
// (their own copy of an app like Awelen Community). Prices are in US dollars a month; yearly billing is 10 months'
// price for 12 months. 0 in a limit means unlimited. Edit here to change prices or limits.
export type Tier = {
  id: 'starter' | 'creator' | 'growth' | 'pro' | 'inst';
  name: string;
  blurb: string;
  price: number | null;   // US dollars a month; null = priced by contract
  courses: number;
  learners: number;
  ai: number;             // AI writing requests a month
  plugins: number;
  team: number;           // team editors besides the creator
  fee: number;            // platform fee on course sales, %
  popular?: boolean;
  feats: string[];
};

export const TIERS: Tier[] = [
  {
    id: 'starter', name: 'Starter', blurb: 'Try the platform and launch your first course.', price: 0,
    courses: 1, learners: 100, ai: 20, plugins: 2, team: 0, fee: 10,
    feats: ['1 course', 'Up to 100 learners', 'Welcome page, community, events and member spaces', 'Paystack and bank transfer payments', '20 AI writing requests a month', '2 plugins'],
  },
  {
    id: 'creator', name: 'Creator', blurb: 'For a creator selling their first paid courses.', price: 17,
    courses: 3, learners: 500, ai: 100, plugins: 4, team: 1, fee: 5,
    feats: ['Up to 3 courses', 'Up to 500 learners', 'Installment payments and promo codes', 'Certificates', '100 AI writing requests a month', '4 plugins and 1 team editor'],
  },
  {
    id: 'growth', name: 'Growth', blurb: 'A full learning community: courses, coaching and events.', price: 20, popular: true,
    courses: 10, learners: 2000, ai: 300, plugins: 8, team: 3, fee: 3,
    feats: ['Up to 10 courses in tracks', 'Up to 2,000 learners', 'Everything in Creator', 'Paid coaching and event bookings', 'eBook library and affiliate programme', '300 AI writing requests a month', '8 plugins and 3 team editors'],
  },
  {
    id: 'pro', name: 'Pro', blurb: 'Run a full learning business under your own brand.', price: 35,
    courses: 0, learners: 10000, ai: 800, plugins: 0, team: 10, fee: 1,
    feats: ['Unlimited courses', 'Up to 10,000 learners', 'Everything in Growth', 'Your own web address and branding', 'Programmes, cohorts and applications', '800 AI writing requests a month', 'All plugins and 10 team editors'],
  },
  {
    id: 'inst', name: 'Institution', blurb: 'For universities, NYSC, companies and training bodies.', price: null,
    courses: 0, learners: 0, ai: 0, plugins: 0, team: 0, fee: 0,
    feats: ['Many creators under one account', 'Bulk enrolment of students or staff', 'White label and single sign-on', 'Reports for management', 'Dedicated support'],
  },
];

export const tierById = (id: string) => TIERS.find((t) => t.id === id);
export const lim = (n: number) => (n ? n.toLocaleString('en-US') : 'Unlimited');
export const rank = (id: string) => TIERS.findIndex((t) => t.id === id);
