// Track 4 programme spaces: AMLD Programme and Executive Presence (with the Critique Wall).
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Space } from '../../data/types';
import { courseById, site } from '../../data/site';
import prog from '../../data/programmes.json';
import { niceError, useAuth } from '../../lib/auth';
import { sendEnquiry, type EnquiryKind } from '../../lib/community';
import { useCourseState } from '../../lib/learning';
import { Avatar, CourseCard, Dialog, Faq, Howto, Rules, Sent, SpaceHead, Steps, Table, Tabs, fields } from '../../components/Kit';
import { Feed } from './Feed';

type AppKind = 'cohort' | 'faculty' | 'corporate' | 'brief';
const APP_KINDS = prog.appKinds as Record<AppKind, [string, string]>;
const SPRINTS = prog.sprints as [string, string, string, string][];
const SPRINT_WEEKS = prog.sprintWeeks as [string, string, unknown][];
const EP_MODS = prog.epMods as { title: string; blurb?: string; out?: string; lessons: string[] }[];
const amldOf = (k: string) => site.courses.filter((c) => c.amld === k);

function TeamInboxHint() {
  const { teamRole } = useAuth();
  return teamRole === 'admin' ? <div className="notice small" style={{ marginTop: 12 }}>📥 Applications and enquiries from these pages arrive in Supabase › Table Editor › <b>enquiries</b> until the admin portal opens.</div> : null;
}

/* ---------- AMLD Programme ---------- */
export function AmldPage({ s }: { s: Space }) {
  const { sub = 'about' } = useParams();
  const tab = ['sprints', 'faculty', 'orgs'].includes(sub) ? sub : 'about';
  const [app, setApp] = useState<AppKind | null>(null);
  const btn = (kind: AppKind, label: string, cls = 'lemon') => <button className={'btn ' + cls} onClick={() => setApp(kind)}>{label}</button>;
  return (
    <>
      <SpaceHead s={s}><Tabs s={s} label="AMLD sections" tab={tab} list={[['about', '🏛️ Overview'], ['sprints', '🧪 Studio Sprints'], ['faculty', '🧑‍🏫 Faculty'], ['orgs', '🏢 For organisations']]} /></SpaceHead>
      {tab === 'sprints' ? <AmSprints btn={btn} /> : tab === 'faculty' ? <AmFaculty btn={btn} /> : tab === 'orgs' ? <AmOrgs btn={btn} /> : <AmAbout s={s} />}
      <Dialog open={!!app} onClose={() => setApp(null)}>{app && <AppForm kind={app} />}</Dialog>
    </>
  );
}

function AmAbout({ s }: { s: Space }) {
  const pk = courseById('peerc');
  return (
    <>
      <section className="card"><h2>Welcome to AMLD</h2>
        <p>You’ve already read the main welcome and our community guidelines, so this page covers only what’s special about AMLD.</p>
        <p>You’ve built something. Maybe a business, maybe a team, maybe a career that has carried you into rooms where the stakes are higher and the margin for error is thinner. AMLD is for that moment. It isn’t a lecture series. It’s a practice ground where seasoned executives, founders and specialists work alongside you on real problems, and where you leave not only knowing more, but showing up differently.</p>
        <h3 style={{ margin: '14px 0 4px' }}>Getting started</h3>
        <Steps list={[
          [<>Start with the {pk ? <Link to={'/course/' + pk.id}>{pk.title}</Link> : 'Executive Peer Circle'} course</>, 'Eight modules on how senior leaders think through complex issues together. You introduce yourself once, in Introduce yourself.'],
          ['Pick your first Studio Sprint', 'Each sprint stands alone. If you’re unsure, start with Strategy or Financial Leadership.'],
          ['Read how AMLD is taught', 'The rhythm, the faculty and how you’re assessed are all below.']]} />
        <div className="row" style={{ marginTop: 10 }}>{pk && <Link className="btn lemon" to={'/course/' + pk.id}>🧠 Open {pk.title}</Link>}<Link className="btn quiet" to={`/space/${s.id}/sprints`}>🧪 See the Studio Sprints</Link></div>
      </section>
      <section className="card"><h2>What makes AMLD different</h2>
        <Rules list={[['🧑‍🏫', 'Practice-First Faculty', 'Every module is led by a Professor of Practice, someone who has sat in the chair you’re preparing for. You spend most of your time doing, not listening.'],
          ['🧪', 'Six-week Studio Sprints', 'Instead of long semesters, you learn in focused six-week blocks that fit around a demanding job.'],
          ['🤝', 'Real client work', 'You solve live problems brought by real businesses, including companies in the Awelen and Business Architects network.'],
          ['🗂️', 'A portfolio, not just a certificate', 'You finish with proof of what you can do: case work, decisions, plans and client sign-offs.'],
          ['✨', 'The Executive Presence capstone', 'The final stage polishes how you communicate, carry yourself and lead in the boardroom, on camera and across cultures.']]} />
      </section>
      <section className="card"><h2>The Practice-First model</h2>
        <p>Most management programmes are taught by people who study business. AMLD is taught by people who run it. Our Professors of Practice are serving and former CEOs, CFOs, founders, bankers, engineers and turnaround specialists. They hand you a real problem, sit beside you while you wrestle with it, and tell you honestly what they would do and why.</p>
        <Rules list={[['📐', '20/80 learning', '20% foundations and frameworks, 80% live work, simulations and problem solving.'], ['👥', 'Co-teaching', 'Every sprint is led by a Professor of Practice and supported by an Academic Facilitator who keeps the learning structured, fair and on track.']]} />
      </section>
      <section className="card"><h2>Where AMLD sits in your journey</h2>
        <Steps list={[[<Link to="/track/t-idea">Idea Discovery &amp; Starters</Link>, 'Find your purpose, your first idea and how the economy shapes it.'],
          [<Link to="/track/t-lead">Management Foundation</Link>, 'Run the enterprise, read the numbers, choose a strategy and plan for results.'],
          [<Link to="/track/t-exec">Driving Change: Transformation &amp; Innovation</Link>, 'See the whole system, think visually, design what people need, decide well in complexity, and build a culture that innovates and wealth that lasts.'],
          ['Advanced Management & Leadership Development', 'Run the business, lead leaders, make the big calls. You are here.'],
          [<Link to="/space/presence">Executive Presence Programme</Link>, 'AMLD’s capstone: be seen, heard and trusted at the top.'],
          [<Link to="/space/crucible">The Crucible Circle</Link>, 'By invitation: a community of leaders shaping ideas together.']]} />
        <p className="small muted" style={{ margin: '10px 0 0' }}>Alongside every stage, <Link to="/space/solutions">Business Solutions</Link> offers coaching, incubation, investor access and turnaround support when you need hands-on help with your own business.</p>
      </section>
      <section className="card"><h2>Your weekly rhythm</h2>
        <Rules list={[['🎙️', 'One evening masterclass', 'With your Professor of Practice, 7:00–8:30 pm WAT, live on Zoom and recorded.'], ['🧪', 'One evening studio session', 'With your team and the Academic Facilitator, 7:00–8:30 pm WAT.'],
          ['🗓️', 'A Saturday clinic', 'Every other week, for drop-in help and Guild Mentor reviews.'], ['⏱️', 'Your own time', 'About 3–5 hours a week of reading, team work and drafting. In total, plan for 6–8 hours a week for six weeks.']]} />
      </section>
      <section className="card"><h2>How you’re assessed</h2>
        <p className="small muted" style={{ margin: '0 0 10px' }}>There are no written exams. You’re assessed on what you produce, against a clear rubric you see on day one.</p>
        <Table head={['Part', 'Weight', 'What it covers']} rows={[['Portfolio', '50%', 'Your diagnosis, options, recommendation, financial model and final presentation'], ['Client evaluation', '30%', 'A signed feedback form from the client on the quality and usefulness of your work'], ['Studio contribution and reflection', '20%', 'How you worked with your team, plus a short written reflection']]} />
      </section>
      <section className="card"><h2>What you earn</h2>
        <Rules list={[['🎓', 'Awelen Practitioner Certificate', 'In the sprint’s subject, for each sprint you complete with a pass.'], ['🏅', 'Awelen Advanced Practitioner Award (AMLD)', 'When you complete any four of the six sprints. This unlocks priority entry to the Executive Presence Cohort.'], ['🌐', 'A public portfolio page', 'On your Awelen profile, to share with employers, investors and boards.']]} />
        <div className="notice warn small" style={{ marginTop: 12 }}><b>An honest note:</b> these are professional certificates from Awelen Entrepreneurs, not university degrees. We are working with academic partners on recognising AMLD sprints for credit in the future, and we’ll tell learners when that’s in place.</div>
      </section>
      <section className="card"><h2>Who AMLD is for</h2>
        <Howto list={[['🚀', 'Founders', 'whose business has outgrown their old way of running it.'], ['📈', 'Senior and mid-level managers', 'preparing for executive roles.'], ['🧭', 'Newly promoted managers', 'who now lead other managers.'], ['🏛️', 'Professionals', 'moving into board, partner or director positions.']]} />
        <p className="small muted" style={{ margin: '12px 0 0' }}>Newer to leading people? Start with <Link to="/track/t-lead">Management Foundation</Link>.</p>
      </section>
    </>
  );
}

type Btn = (kind: AppKind, label: string, cls?: string) => ReactNode;

function AmSprints({ btn }: { btn: Btn }) {
  const cs = amldOf('sprint');
  return (
    <>
      <section className="card"><h2>How a six-week sprint runs</h2>
        <Table head={['Week', 'What you do']} rows={SPRINT_WEEKS.map(([w, d]) => [w, d])} min={480} />
        <p className="small muted" style={{ margin: '10px 0 0' }}>Every masterclass is recorded. Studio sessions are where the team work happens, so try to attend at least four of the six. If a Professor of Practice has to travel, a backup faculty member steps in, so sessions aren’t cancelled.</p>
      </section>
      <section className="card"><div className="spread"><h2 style={{ margin: 0 }}>The six Studio Sprints</h2><span className="small muted">Take them in any order</span></div>
        {cs.length ? <div className="grid" style={{ marginTop: 12 }}>{cs.map((c) => <CourseCard key={c.id} c={c} />)}</div> : <p className="muted small">No sprints listed yet.</p>}
        <p className="small muted" style={{ margin: '12px 0 0' }}>Complete any four to earn the Awelen Advanced Practitioner Award. Open a sprint to see how to join it.</p>
      </section>
      <section className="card"><h2>Inside every sprint</h2>
        <Rules list={[['📣', 'Faculty updates', 'Schedules, recordings and reminders, inside the sprint’s course page and by email.'], ['📋', 'The client brief', 'The brief, background files and the confidentiality agreement every learner signs.'],
          ['👥', 'Your studio team', 'Four to six learners working on the brief together, with an Academic Facilitator.'], ['🙋', 'Ask the Professor', 'Questions for your Professor of Practice during masterclasses and the Saturday clinic.'], ['🗂️', 'Your portfolio', 'Your finished work, ready to share in the Portfolio Showcase.']]} />
      </section>
      <section className="card"><h2>Where the client work comes from</h2>
        <p>Our client briefs come from businesses in the Awelen network, including ventures founded or advised by Awelen and Business Architects Ltd, and partner companies that apply to host a studio. Clients get fresh thinking from capable leaders, and learners get the real thing.</p>
        <p className="small muted">Briefs are chosen so that no business-critical decision depends on student work, and client information is covered by a confidentiality agreement every learner signs.</p>
        <div className="row">{btn('brief', '📋 Offer your business as a client brief', 'quiet')}</div><TeamInboxHint />
      </section>
      <section className="card"><h2>Questions people ask</h2>
        <Faq list={[['Do I need to be a manager to join AMLD?', 'You’ll get the most from it if you already lead people or run a business. If you’re newer, start with Management Foundation.'],
          ['Can I bring a problem from my own business?', 'Yes. In some sprints you can choose to work on your own business as the brief, as long as you share enough information for your team to work with.'],
          ['Do I have to take the sprints in order?', 'No. Each sprint stands alone. We suggest starting with Strategy or Financial Leadership if you’re unsure.'],
          ['Is this a degree?', 'No. AMLD awards professional certificates from Awelen Entrepreneurs, not university degrees.']]} />
      </section>
    </>
  );
}

function AmFaculty({ btn }: { btn: Btn }) {
  const { teamRole } = useAuth();
  return (
    <section className="card"><h2>Learn from people who are still doing it</h2>
      <p>Every sprint is taught by a small faculty team. You always know who to ask, and the people teaching you have done the work themselves.</p>
      <Table head={['Role', 'Who they are', 'What they do for you']} min={680} rows={[
        ['Professor of Practice', 'A senior practitioner with at least 15 years’ experience, usually at C-suite or founder level', 'Leads the sprint, sets the brief, gives expert feedback and shares the real story behind the frameworks'],
        ['Academic Facilitator', 'An experienced educator or coach', 'Runs the studio sessions, keeps the structure, marks against the rubric, supports you when you’re stuck'],
        ['Guild Mentor', 'A mid-career specialist in finance, law, HR, technology or marketing', 'Drops in for single-session reviews, critiques and pitch practice'],
        ['Programme Director', site.creator.name + ', founder of Awelen Entrepreneurs', 'Oversees quality across all sprints and the faculty']]} />
      <h2 style={{ marginTop: 18 }}>Teach with Awelen</h2>
      <p><b>You’ve built, led and lived it. Help the next generation do it better.</b> You don’t need to leave your job or become a full-time academic. You teach one six-week sprint, or a few guest sessions, in the evenings and at weekends, and we handle the rest.</p>
      <Table head={['Role', 'Commitment', 'Who we’re looking for']} min={720} rows={[
        ['Professor of Practice', 'One six-week sprint a year: about 3 hours a week of live teaching plus feedback', 'Serving or former CEOs, CFOs, COOs, founders, bankers and senior specialists with 15+ years’ experience'],
        ['Guild Mentor', 'A few single sessions per sprint', 'Mid-career specialists in finance, law, HR, technology, marketing and operations'],
        ['Executive Presence guest faculty', 'One or two live sessions per Cohort', 'Diplomats and protocol officers, media professionals, image consultants, board chairs'],
        ['Academic Facilitator', 'Every sprint or Cohort: about 6 hours a week', 'Experienced educators, trainers and coaches who love structure and people']]} />
      <h3 style={{ margin: '14px 0 4px' }}>What we take care of</h3>
      <Rules list={[['🧱', 'Course design and support', 'Course design, rubrics and learner support, through your Academic Facilitator.'], ['🎥', 'Platform and recordings', 'Scheduling, recordings and the online platform.'], ['📋', 'Client briefs', 'Client briefs and confidentiality agreements.'], ['🔁', 'Cover', 'A backup faculty member if work or travel calls you away.']]} />
      <h3 style={{ margin: '14px 0 4px' }}>How to apply</h3>
      <Steps list={[['Send a short application', 'Your experience, your areas of expertise and the sprint or module you’d most like to teach.'], ['A conversation with the Programme Director'], ['A 20-minute sample session', 'Delivered to a small panel.'], ['Join the Faculty Lounge', 'Plan your first sprint with your Academic Facilitator.']]} />
      <div className="row" style={{ marginTop: 12 }}>{btn('faculty', '🧑‍🏫 Apply to teach with Awelen')}{teamRole && <Link className="btn quiet" to="/space/faculty">Open the Faculty Lounge</Link>}</div><TeamInboxHint />
    </section>
  );
}

function AmOrgs({ btn }: { btn: Btn }) {
  return (
    <>
      <section className="card"><h2>Your new managers were promoted for their skill. Now help them lead.</h2>
        <p>Most managers are promoted because they were excellent at their old job. Then, overnight, they’re expected to lead people, speak for the team in senior meetings and make calls they’ve never made before. Many struggle quietly, and the cost shows up in team turnover, missed targets and lost talent.</p>
        <p>The Awelen Leadership Transition Programme combines the best of AMLD and Executive Presence into a programme built for your organisation’s newly promoted and high-potential managers.</p>
        <div className="row">{btn('corporate', '🏢 Book a free discovery call for your organisation')}</div>
      </section>
      <section className="card"><h2>What we offer</h2>
        <Table head={['Option', 'What it includes', 'Best for']} min={720} rows={[
          ['New Manager Transition (8 weeks)', 'Leading Leaders sprint content, Executive Communication and Boardroom Readiness modules, live coaching, a capstone presentation to your senior leaders', 'Newly promoted managers and team leads'],
          ['Executive Presence for Senior Leaders (10 weeks)', 'The full Executive Presence Cohort, run privately for your organisation', 'Directors, heads of department, high-potential leaders'],
          ['Company Studio Sprint (6 weeks)', 'A Practice-First sprint where your managers solve a real challenge your company sets', 'Leadership teams working on a live business problem']]} />
      </section>
      <section className="card"><h2>How it works</h2>
        <Steps list={[['Discovery call (free)', 'We learn about your managers, your culture and what success looks like for you.'], ['Tailoring', 'We adapt case studies, examples and the capstone brief to your industry and goals.'],
          ['Delivery', 'Live online sessions, a private cohort space here in the community, and optional in-person days at your offices or in Lagos or Abuja.'], ['Progress reports', 'HR receives attendance and progress updates during the programme and a summary report at the end.'], ['Showcase', 'Participants present their capstone to your senior leadership team.']]} />
      </section>
      <section className="card"><h2>What your organisation gets</h2>
        <Rules list={[['⏩', 'Ready sooner', 'Managers who are ready to lead sooner, with fewer costly mistakes.'], ['🗣️', 'A shared language', 'A shared leadership language across your management layer.'], ['🧪', 'Real work', 'Work on a real company challenge, not just classroom exercises.'], ['📊', 'Clear reporting', 'Clear reporting on participation and progress.'], ['🎓', 'Certificates', 'A certificate for every participant who completes the programme.']]} />
        <p className="small muted" style={{ margin: '12px 0 0' }}>Pricing is per participant, with group discounts for cohorts of 10 or more, or a package price for a private cohort of 12–16. We quote after the discovery call. Venue costs for in-person days are separate.</p><TeamInboxHint />
      </section>
    </>
  );
}

/* ---------- Executive Presence ---------- */
export function PresencePage({ s }: { s: Space }) {
  const { sub = 'about' } = useParams();
  const tab = ['curriculum', 'cohort', 'wall', 'apply'].includes(sub) ? sub : 'about';
  return (
    <>
      <SpaceHead s={s}><Tabs s={s} label="Executive Presence sections" tab={tab} list={[['about', '✨ Overview'], ['curriculum', '📚 Curriculum'], ['cohort', '👥 The Cohort'], ['wall', '🎥 Critique Wall'], ['apply', '📝 Apply']]} /></SpaceHead>
      {tab === 'curriculum' ? <EpCurriculum /> : tab === 'cohort' ? <EpCohort s={s} /> : tab === 'wall' ? <EpWall s={s} /> : tab === 'apply' ? <EpApply /> : <EpAbout s={s} />}
    </>
  );
}

function EpAbout({ s }: { s: Space }) {
  const c = site.creator, cs = [...amldOf('epf'), ...amldOf('epc')];
  return (
    <>
      <section className="card"><h2>Executive presence is a skill. You can learn it.</h2>
        <p>You can know your numbers, your market and your strategy, and still lose the room. Promotions, board seats, investor rounds and big contracts often go to the person who carries themselves with clarity, calm and authority. That’s executive presence. It isn’t something you’re born with. It’s a set of skills you can learn, practise and refine.</p>
        <p>This programme is a modern finishing school for leaders. It goes well beyond etiquette. You’ll sharpen how you speak, write, negotiate, host, dress, show up on camera and hold your ground under pressure, across Nigerian, African and international settings.</p>
        <div className="row" style={{ marginTop: 6 }}><Link className="btn lemon" to={`/space/${s.id}/apply`}>📝 Apply for the next Cohort</Link><Link className="btn quiet" to={`/space/${s.id}/curriculum`}>📚 See the curriculum</Link></div>
      </section>
      <section className="card"><h2>Who it’s for</h2>
        <Howto list={[['📈', 'Senior managers and directors', 'preparing for C-suite or board roles.'], ['🏛️', 'C-suite executives', 'stepping onto bigger stages: boards, investors, media, government.'], ['🚀', 'Founders', 'who now represent their company to investors, partners and the public.'], ['🎓', 'AMLD graduates', 'completing their journey with the capstone.']]} />
        <p className="small muted" style={{ margin: '12px 0 0' }}>The self-paced Foundation suits anyone at manager level and above. The live Cohort is designed for senior managers, directors and executives.</p>
      </section>
      <section className="card"><h2>Two ways to join</h2>
        <Table head={['', 'Foundation', 'Cohort']} min={560} rows={[['Format', 'Self-paced, online', 'Live, small group, online with an in-person finale'], ['Length', 'Your own pace; most finish in 8–12 weeks', '10 weeks, one live session a week plus practice'],
          ['Content', 'All six modules: video lessons, guides, workbooks and exercises', 'Everything in Foundation, plus live coaching on every module'], ['Feedback', 'Self-assessment checklists and peer feedback on the Critique Wall', 'Personal video critiques from faculty, live roleplay and a 1:1 coaching session'],
          ['Guest faculty', 'Recorded masterclasses', 'Live sessions with diplomats, media coaches, image consultants and CEOs'], ['Finale', 'Online capstone submission', 'The Presence Showcase and the Presence Dinner in Lagos or Abuja'], ['Group size', 'Open', 'Up to 16 participants'], ['Award', 'Certificate of Completion', 'Awelen Executive Presence Certificate']]} />
        {cs.length > 0 && <div className="grid" style={{ marginTop: 14 }}>{cs.map((x) => <CourseCard key={x.id} c={x} />)}</div>}
        <p className="small muted" style={{ margin: '12px 0 0' }}>Foundation learners can upgrade to the next Cohort and pay only the difference. AMLD graduates with the Advanced Practitioner Award get priority entry to the Cohort.</p>
      </section>
      <section className="card"><h2>The capstone</h2><p style={{ margin: 0 }}>Every participant finishes with the <b>Presence Showcase</b>: a ten-minute presentation to a panel of faculty and guest executives on a real issue from their work, followed by tough questions. Cohort participants deliver it in person before the <b>Presence Dinner</b>, a formal evening in Lagos or Abuja where they put the etiquette, hosting and networking modules into practice with guests from the Awelen network.</p></section>
      <section className="card"><h2>Your faculty</h2>
        <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}><Avatar name={c.name} size={64} creator />
          <div style={{ minWidth: 0 }}><b>{c.name}</b><div className="small muted">{c.title}</div>
            <p style={{ margin: '10px 0 0' }}>The programme is led by Awele, a Chartered Accountant whose career runs from PricewaterhouseCoopers through executive roles in banking to years as a CEO and consultant. He’s joined by guest faculty from diplomacy, media, image consulting and the boardroom.</p></div></div>
      </section>
      <section className="card"><h2>What you’ll leave with</h2>
        <Rules list={[['🗣️', 'Your executive message', 'A clear, confident message you can deliver in any room.'], ['🎥', 'Recorded proof of progress', 'Your briefing, board presentation and media interview.'], ['🪪', 'A sharper personal brand', 'Online and in person.'], ['🍽️', 'Etiquette and protocol', 'To host, dine and network at the highest level.'], ['🎓', 'A certificate', 'The Awelen Executive Presence Certificate (Cohort) or Certificate of Completion (Foundation).']]} />
      </section>
      <section className="card"><h2>Questions people ask</h2>
        <Faq list={[['Is this just etiquette training?', 'No. Etiquette is one module out of six. Most of the programme is about communication, influence, judgement and composure.'],
          ['I’m an introvert. Is this for me?', 'Yes. Presence isn’t about being loud. Many of the most respected leaders are quiet, and the programme helps you lead in a way that’s true to you.'],
          ['Do I have to complete AMLD first?', 'No. AMLD graduates get priority entry, but experienced managers and executives can join directly.'],
          ['How much time does the Cohort take?', 'About 4–5 hours a week: one 90-minute live session, the lessons, and recording your practice pieces.'],
          ['What if I can’t attend the Presence Dinner?', 'You can present your capstone online. We’d still encourage you to attend; it’s where the learning comes together.']]} />
        <div className="row" style={{ marginTop: 14 }}><Link className="btn lemon" to={`/space/${s.id}/apply`}>📝 Apply for the next Cohort</Link><Link className="btn quiet" to="/space/contact">Ask a question</Link></div>
      </section>
    </>
  );
}

function EpCurriculum() {
  const f = courseById('ep-found');
  const mods = f ? f.modules.map((m) => ({ title: m.title, lessons: m.lessons.map((l) => l.title) })) : EP_MODS;
  return (
    <>
      <section className="card"><h2>Six modules, six lessons each</h2>
        <p style={{ margin: 0 }}>Every lesson comes with a short video, a practical exercise and a workbook page. Cohort participants also get a live session for each module.{f && <> Open <Link to={'/course/' + f.id}>Executive Presence Foundation</Link> to see the lessons as a course.</>}</p></section>
      {mods.map((m, i) => {
        const x = EP_MODS.find((e) => e.title === m.title);
        return (
          <details className="mod card" style={{ padding: 0 }} open={i === 0} key={m.title}>
            <summary style={{ padding: '14px 18px' }}>{m.title}{x?.blurb && <div className="small muted" style={{ fontWeight: 400, marginTop: 2 }}>{x.blurb}</div>}</summary>
            <div style={{ padding: '0 18px 18px' }}>
              <ol className="steps">{m.lessons.map((l) => <li key={l}><div>{l}</div></li>)}</ol>
              {x?.out && <div className="notice small" style={{ marginTop: 10 }}><b>Outcome:</b> {x.out}</div>}
            </div>
          </details>
        );
      })}
    </>
  );
}

function EpCohort({ s }: { s: Space }) {
  return (
    <>
      <section className="card"><h2>Welcome to the Cohort</h2>
        <p>Over ten weeks, you’ll work with a small group of leaders to sharpen how you speak, carry yourself and lead in high-stakes rooms.</p>
        <p>This is a safe place to practise. You’ll record yourself, get honest feedback and try things that feel uncomfortable at first. That’s where the growth is. Everything shared in the Cohort stays in the Cohort.</p>
        <div className="notice"><b>Your first step:</b> post a two-minute video on the <Link to={`/space/${s.id}/wall`}>Critique Wall</Link> introducing yourself as you would to a new board. Don’t polish it. It’s your “before” picture, and you’ll be surprised how far you come.</div>
      </section>
      <section className="card"><h2>The ten weeks</h2>
        <Table head={['Week', 'Focus']} min={440} rows={[['1', 'Orientation, presence audit and your “before” video'], ['2', 'Module 1: Foundations of Executive Presence'], ['3', 'Module 2: Executive Communication'], ['4', 'Module 3: Boardroom Readiness and Stakeholder Diplomacy'], ['5', 'Module 4: Business Etiquette and Global Protocol'],
          ['6', 'Module 5: Image, Personal Brand and Digital Presence'], ['7', 'Module 6: Media Readiness and Leading Under Pressure'], ['8', '1:1 coaching sessions and capstone drafting'], ['9', 'Capstone rehearsal with peer and faculty critique'], ['10', 'Presence Showcase and the Presence Dinner']]} />
      </section>
      <section className="card"><h2>The Presence Dinner</h2>
        <p style={{ margin: 0 }}>A formal evening in Lagos or Abuja that closes the Cohort. You deliver your Presence Showcase, then put the etiquette, hosting and networking modules into practice with guests from the Awelen network. If you can’t attend, you can present your capstone online.</p>
        <div className="row" style={{ marginTop: 12 }}><Link className="btn lemon" to={`/space/${s.id}/apply`}>📝 Apply for the next Cohort</Link></div>
      </section>
    </>
  );
}

function EpWall({ s }: { s: Space }) {
  const { teamRole } = useAuth();
  const f = useCourseState('ep-found'), co = useCourseState('ep-cohort');
  const has = (e: typeof f.enrollment) => !!e && (e.plan === 'free' || e.plan === 'granted' || e.amount_paid > 0);
  const can = !!teamRole || has(f.enrollment) || has(co.enrollment);
  const rules = <div className="card guide"><h3>How we give feedback here</h3><p className="small" style={{ margin: 0 }}>Start with one thing that worked. Then give one specific thing to try next time. Keep it about the performance, not the person. Faculty add a full written or video critique to Cohort videos within three working days.</p></div>;
  if (f.loading || co.loading) return <>{rules}<div className="card empty">Checking your access…</div></>;
  if (!can) return (
    <>{rules}
      <div className="card notice"><b>🔒 The Critique Wall is for Executive Presence learners.</b> <span className="small">It opens when you unlock the Foundation or join a Cohort, so everyone here is practising together.</span>
        <div className="row" style={{ marginTop: 10 }}><Link className="btn sm" to="/course/ep-found">See the Foundation</Link><Link className="btn quiet sm" to={`/space/${s.id}/apply`}>Apply for the Cohort</Link></div></div>
    </>
  );
  return <>{rules}<Feed space={s.id} placeholder="Paste a link to your practice video and say what you’d like feedback on…" /></>;
}

function EpApply() {
  return (
    <>
      <section className="card"><h2>Apply for the next Executive Presence Cohort</h2><p className="small muted" style={{ margin: 0 }}>Places are by short application to keep the group senior and well matched. It takes about five minutes, and every applicant receives a reply.</p><TeamInboxHint /></section>
      <section className="card"><AppForm kind="cohort" inline /></section>
    </>
  );
}

/* ---------- One form for the four programme applications ---------- */
function AppForm({ kind, inline }: { kind: AppKind; inline?: boolean }) {
  const { profile } = useAuth();
  const [sent, setSent] = useState(false); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const I = (n: string, l: string, req: boolean, v = '', ph = '') => <label className="f"><span>{l}</span><input name={n} required={req} defaultValue={v} placeholder={ph || undefined} maxLength={300} /></label>;
  const Sel = (n: string, l: string, opts: string[], pick?: string) => <label className="f"><span>{l}</span><select name={n} defaultValue={pick}>{opts.map((o) => <option key={o}>{o}</option>)}</select></label>;
  const T = (n: string, l: string, req: boolean, ph = '') => <label className="f"><span>{l}</span><textarea name={n} required={req} placeholder={ph || undefined} maxLength={3000} /></label>;
  const who = <div className="fg">{I('name', 'Your name', true, profile?.name || '')}{I('email', 'Email', true, profile?.email || '')}{I('phone', 'Phone or WhatsApp', false, profile?.phone || '')}</div>;
  const job = (orgReq: boolean, orgL = 'Organisation') => <div className="fg">{I('role', 'Your role', true, '', kind === 'corporate' ? 'e.g. HR Manager' : 'e.g. Head of Operations')}{I('org', orgL, orgReq)}</div>;
  const teach = [...SPRINTS.map((x) => 'Sprint: ' + x[1]), ...EP_MODS.map((m) => 'Executive Presence: ' + m.title.replace(/^Module \d+: /, '')), 'Something else'];
  const body = {
    cohort: <>{who}{job(true)}
      <div className="fg">{Sel('f_Seniority', 'Your level', ['Senior manager', 'Director or head of department', 'C-suite executive', 'Founder or CEO'])}{Sel('f_Years in leadership', 'Years leading people', ['Under 5', '5–10', '10–15', '15–20', '20+'], '10–15')}</div>
      <div className="fg">{Sel('f_AMLD so far', 'AMLD sprints completed', ['None yet', '1–3 sprints', 'Advanced Practitioner Award (4+)'])}{Sel('f_Finale city', 'Where you’d attend the Presence Dinner', ['Lagos', 'Abuja', 'Online only'])}</div>
      {T('f_What they want', 'What do you most want from the programme?', true, 'A few sentences about the rooms you need to lead in')}</>,
    faculty: <>{who}{job(false, 'Current organisation')}
      <div className="fg">{Sel('f_Role', 'Role you’re applying for', ['Professor of Practice', 'Guild Mentor', 'Executive Presence guest faculty', 'Academic Facilitator'])}{Sel('f_Years of experience', 'Years of experience', ['10–15', '15–20', '20+'])}</div>
      {Sel('f_Would like to teach', 'What you’d most like to teach', teach)}
      <div className="fg">{I('f_Expertise', 'Your areas of expertise', true, '', 'e.g. corporate finance, turnaround')}{I('f_Profile link', 'LinkedIn or profile link', false, '', 'https://')}</div>
      {T('f_Why', 'Why you, and what you’d bring to learners', true)}</>,
    corporate: <>{who}{job(true)}
      <div className="fg">{Sel('f_Managers to train', 'Managers to train', ['5–10', '10–20', '20–50', '50+'])}{Sel('f_Programme of interest', 'Programme of interest', ['New Manager Transition', 'Executive Presence for Senior Leaders', 'Company Studio Sprint', 'Not sure yet'])}{Sel('f_Timing', 'When you’d like to start', ['This quarter', 'Next quarter', 'Later this year', 'Just exploring'])}</div>
      {T('f_What they need', 'What are your managers facing?', true, 'A few sentences about the situation and what success looks like')}</>,
    brief: <>{who}{job(true, 'Business name')}
      <div className="fg">{I('f_Sector', 'Sector', true, '', 'e.g. Agriculture, Logistics')}{Sel('f_Best sprint', 'Which sprint fits best?', [...SPRINTS.map((x) => x[1]), 'Not sure'])}</div>
      {I('f_Challenge', 'The challenge in one line', true, '', 'e.g. Reaching more customers without raising prices')}{T('f_Situation', 'What’s happening?', true, 'The situation and why it matters now')}
      <label className="row small" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}><input type="checkbox" required style={{ width: 'auto', marginTop: 3 }} /> I understand learners will work on this brief under a confidentiality agreement, and that no business-critical decision should depend on their work.</label></>,
  }[kind];
  const btn = { cohort: 'Send my application', faculty: 'Send my application', corporate: 'Request a discovery call', brief: 'Offer this brief' }[kind];

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const g = fields(e.currentTarget);
    const details: Record<string, string> = {};
    new FormData(e.currentTarget).forEach((v, k) => { if (k.startsWith('f_')) details[k.slice(2)] = String(v).trim(); });
    setBusy(true); setMsg('');
    try { await sendEnquiry({ kind: kind as EnquiryKind, name: g('name'), email: g('email'), phone: g('phone'), org: g('org'), role: g('role'), details }); setSent(true); }
    catch (err) { setMsg(niceError(err)); } finally { setBusy(false); }
  };
  if (sent) return <Sent title={kind === 'corporate' ? 'Thank you. We’ll be in touch to arrange your discovery call' : kind === 'brief' ? 'Thank you for offering a brief' : 'Thank you, your application is in'}><p style={{ margin: 0 }}>The Awelen team will reply by email, usually within a week.</p></Sent>;
  return (
    <form className="stack" onSubmit={submit}>
      {!inline && <><h2>{APP_KINDS[kind][1]}</h2><p className="small muted" style={{ margin: 0 }}>{kind === 'corporate' ? 'Tell us a little about your managers. We’ll reply to arrange a free discovery call.' : kind === 'brief' ? 'Offer a real, non-critical challenge from your business for a Studio Sprint team to work on.' : 'Every applicant receives a reply, whatever the outcome.'}</p></>}
      {body}
      <p className="small muted" style={{ margin: 0 }}>🔒 What you share here is seen only by the Awelen team.</p>
      {msg && <p className="formmsg" role="alert">{msg}</p>}
      <div><button className="btn lemon" disabled={busy}>{busy ? 'Sending…' : btn}</button></div>
    </form>
  );
}
