# New "About this course" copy (27 Nov 2026). Run from the repo root:  python3 scripts/course_about.py
# Writes each course's `desc` (the story: why it matters and what changes for the learner) and `gains`
# (what you walk away with) into src/data/seed.json. Fees, the unlock button and module/lesson counts are
# on the course banner, so they are deliberately left out of this copy.
import json, pathlib

ABOUT = {
 'idea': (
  """You know you were made for more than the job you are in, or the life you are living. Maybe you have a dozen ideas and can't choose one. Maybe you have none and wonder if you are "the business type" at all. Either way, the hardest part of starting is not money. It is knowing which idea is truly yours.

This course starts with you, not with a market report. You'll look honestly at the life you want, the knowledge and experience you already carry, and the way entrepreneurs think. From there you'll explore the idea space around you and narrow it down to one idea that fits who you are and what the world will pay for.

Then we prepare you for the road ahead: your first real goal, the people who will hold you up, what it will really cost, and the decision to begin. You finish with clarity, not just enthusiasm.""",
  ["One business idea that fits you, chosen with reasons you can explain to anyone",
   "A clear picture of the knowledge, skills and contacts you can build on today",
   "The entrepreneur's mindset: how founders see problems, risk and opportunity",
   "An honest view of what starting will cost you in money, time and energy",
   "Your first real goal and a support network to help you reach it",
   "The confidence to say \"I'm starting\" and mean it"]),
 'snb': (
  """Most new businesses don't fail because the founder lacked passion. They fail because nobody checked, early enough, whether customers would pay, whether the business could deliver, and whether the numbers would ever add up.

This course walks you through every building block of a business model, one at a time, the way a seasoned adviser would sit with you. You start with your own why, then work out exactly who your customers are and what they will value, how you'll reach them, how you'll make money, what it takes to deliver, who you need beside you, and what it all costs, right down to the profit on a single sale.

Nothing stays in your head. Every lesson adds a page to your own model, and you finish by presenting a complete, costed first draft. Every assumption you make is written down as a "We believe…" statement, ready to be tested with real customers in Course 2.""",
  ["A complete, costed first-draft business model for your own business",
   "A clear vision, mission, values and first-year goals",
   "A sharp picture of your customers and the value you promise them",
   "Pricing and revenue streams you can defend, and unit economics that show your profit per sale",
   "A brand identity, channels and customer relationships that fit your market",
   "A list of the assumptions to test before you put serious money in"]),
 'bmd2': (
  """A business model on paper is a set of guesses. Some of those guesses will make you money. Others could quietly sink you. The only way to know which is which is to test them before you bet your savings, your loan or your reputation on them.

This course shows you how. You'll turn every assumption into a "We believe…" statement and sort it by the three questions that decide every business: will customers want it, can we deliver it, and will it make money? Then you'll design small, cheap tests and prototypes that give you real evidence, learn to read what the evidence is telling you, and change the model with confidence instead of fear.

Markets move, so the course ends by teaching you to keep your model current long after launch. You can take it straight after Course 1, or on its own if you already have a model to test.""",
  ["A tested business model backed by evidence, not just hope",
   "A ranked list of your riskiest assumptions and a test for each one",
   "Low-cost prototypes and experiments you can run in days, not months",
   "A simple way to decide whether to persevere, adjust or pivot",
   "A habit of reviewing and updating your model as the market changes",
   "A final model you can present to partners, lenders and investors"]),
 'econ': (
  """You can have a great product and a loyal customer, and still watch your business struggle because the naira fell, interest rates jumped or a new policy changed the rules overnight. Every business lives inside an economy. The founders who survive are the ones who see the weather coming and pack an umbrella.

This course makes the economy make sense. Without jargon or heavy maths, you'll learn to read an economic outlook and turn it into business decisions: when to stock up, when to borrow, when to hold prices and when to expand. You'll see how government spending, taxes and borrowing reach your customers' pockets, what jobs and education trends tell you about tomorrow's market, and why fairness and sustainability are good business, not charity.

You'll also learn to see and serve the base of the pyramid, the millions of customers most businesses overlook.""",
  ["The confidence to read an economic forecast and know what it means for you",
   "A simple way to turn inflation, exchange-rate and interest-rate news into decisions",
   "An understanding of how government policy reaches your business and your customers",
   "Early-warning signals to watch so you are not caught off guard",
   "Fresh ideas for serving customers at the base of the pyramid",
   "A sustainability lens that protects your business for the long term"]),
 'run': (
  """Having a good business model is one thing. Running the business every day is another. Suddenly you are the salesperson, the accountant, the HR department and the person who fixes the generator. Or you were the best at your job, got promoted, and now you lead people who used to be your peers. Nobody prepares you for this shift.

This course is the bridge from idea to enterprise. You'll set the business up properly, with the right legal structure and a board that adds value, prepare a workplace that works, win and keep your first customers, and grow on customer money instead of debt. Then you'll build your team and its rhythm, learn to make good decisions when the facts are incomplete, and write the business plan and pitch that raise money.

You'll follow Adaeze as she builds Zuri Kitchens, a Lagos cloud kitchen, and Kofi, a newly promoted engineering lead in Accra. Their mistakes and wins become your shortcut.""",
  ["The shift from doing everything yourself to managing through others",
   "A business set up properly: legal structure, governance and a useful board",
   "A practical plan to win, serve and keep your first customers",
   "Bootstrapping skills that keep you in control of your business",
   "A team rhythm of meetings, goals and follow-up that gets things done",
   "A business plan and pitch you can take to lenders and investors"]),
 'fin': (
  """Have you ever nodded through a finance presentation, hoping nobody would ask what you think? Or signed off a budget you didn't fully understand? You are not alone. Many capable leaders were never taught to read the numbers, and it quietly limits their influence, their decisions and their careers.

This course changes that for good. Finance is taught as a leadership skill, not an accounting exam. You'll learn the language of money, see your business clearly through its three financial statements, spot what the numbers are really telling you, and plan and steer with budgets and forecasts. Then you'll use numbers to make confident decisions, tell a compelling story with financial data, and protect the business against shocks.

The stories move between global and pan-African settings, with real currencies, so everything you learn applies to the business in front of you.""",
  ["Fluency in the language of money, so you can hold your own in any boardroom",
   "The ability to read an income statement, balance sheet and cash-flow statement with ease",
   "Quick diagnostic checks that reveal problems before they become crises",
   "Budgets and forecasts that actually steer the business",
   "A sound way to judge investments, pricing and cost decisions",
   "The skill to present numbers as a clear story that wins support"]),
 'strat': (
  """Many organisations have a "strategy" that is really a long wish list. Everything is a priority, so nothing is. Meanwhile competitors who made a few bold, clear choices pull ahead. Strategy is not a document. It is the courage to choose what you will do, and what you will not do.

This course teaches you to make those choices. You'll start with an honest diagnosis of where you really stand, understand how value is created and captured, decide where to play and how to win, and narrow everything down to a few big moves. Then you'll learn to turn those moves into what your team actually does on Monday morning.

You'll learn from companies whose choices made or broke them, including Southwest Airlines, IKEA, Apple, Netflix, Nokia, Dangote and GTBank, alongside African and global stories you will recognise.""",
  ["A clear, honest diagnosis of your organisation's real position",
   "A sharp answer to where you will play and how you will win",
   "The discipline to say no, and the few big moves that matter most",
   "A way to see where your business creates and captures value",
   "A strategy your team can understand and act on next week",
   "Lessons from the strategic wins and failures of well-known companies"]),
 'plan': (
  """You've made your strategic choices. Now the hard part begins. Too many plans are beautifully written, presented once, and then left on a shelf while the business carries on as usual. A plan only matters if it runs the business every month.

This course shows you how to build that kind of plan. You'll turn strategic choices into clear priorities, measurable targets, a budget, named owners and a monthly rhythm of review. Layer by layer, you'll connect the big intent to the value drivers, initiatives and financial forecast that make it real, then align your whole organisation behind it and keep it alive with scorecards and honest reviews.

You'll follow ChromaCoat, a Nigerian paint manufacturer, through every layer of its plan, with real figures in naira. It works best after Winning Choices, our strategy course.""",
  ["A complete strategic plan, from strategic intent to monthly dashboard",
   "Priorities, targets and initiatives that connect directly to your strategy",
   "A financial forecast tied to the plan, not a separate spreadsheet",
   "Clear owners and accountability for every part of the plan",
   "A scorecard and review rhythm that keep the plan alive all year",
   "A way to renew the plan as conditions change"]),
 'scale': (
  """Growth feels wonderful until things start to break. Customers complain, good staff leave, decisions pile up on your desk and profit doesn't grow as fast as sales. That is the difference between growing and scaling. Growth adds revenue. Scaling adds revenue faster than cost and complexity.

This course shows you how to scale without the organisation breaking. You'll find out whether you are truly ready, design a structure that grows with you, and build systems and processes that work without you in the room. Then you'll build the team for the next stage, learn to lead through others, protect the culture that made you successful, and replicate what works in new locations and markets.

Stories move between global and pan-African settings, so you see how scaling looks in markets like yours.""",
  ["A clear answer to whether your organisation is ready to scale, and what to fix first",
   "A structure with clear roles and decision rights that can grow",
   "Systems and processes that run without you",
   "A plan for the people and leaders you need at the next stage",
   "A culture that survives growth instead of being diluted by it",
   "A playbook for replicating success in new places"]),
 'systems': (
  """You fix one problem and two more appear somewhere else. Targets are met but results get worse. The same crisis returns every year, no matter who is in charge. These are not bad-luck problems. They are system problems, and they don't yield to harder work or a new memo.

This course teaches you to see the whole system before you act. You'll learn practical mapping tools you can use on Monday morning, recognise the traps behind recurring problems, and find the leverage points where a small, well-placed change makes a big difference. Then you'll redesign your organisation around what you have seen, and lead change that lasts.

It is hands-on from the first lesson. You pick one stubborn problem you own, apply every tool to it, and finish with a Systems Change Brief you can present to your board, minister or team.""",
  ["The ability to see why smart fixes keep failing in your organisation",
   "Simple, practical tools to map any problem as a system",
   "Recognition of the common traps behind recurring problems",
   "Leverage points where a small change makes the biggest difference",
   "A redesign of your organisation around one real problem you own",
   "A Systems Change Brief ready to present"]),
 'visual': (
  """Some problems are simply too complicated for words. Meetings go round in circles, people talk past each other and good decisions get lost in long emails. The leaders who cut through are often the ones who pick up a pen and say, "Let me show you."

This course teaches you to think, decide and lead with simple pictures. No drawing talent is needed. Every tool uses circles, boxes, lines, arrows and stick figures, and you'll learn the whole visual alphabet early on. From there you'll map the big picture, diagnose what is really happening, compare options and decide, win people over, and show your plan in a way people remember.

You choose one real decision or problem on your desk at the start and work on it throughout, so you finish with a Visual Leadership Playbook built for your own team.""",
  ["A toolkit of more than 30 simple visual frameworks for leaders",
   "The confidence to lead a meeting from a whiteboard or flipchart",
   "Faster, clearer decisions on complicated problems",
   "Pictures that align teams and win over stakeholders",
   "One real leadership challenge mapped and worked through",
   "A Visual Leadership Playbook for your team"]),
 'design': (
  """Your organisation is very good at doing what it already does. But the challenges in front of you now, such as new customers, new competitors and new expectations, can't be solved by doing the same things more efficiently. They need discovery.

This course gives senior leaders a practical way to lead that discovery. You'll bring a live strategic challenge from your own organisation and carry it through every stage of design thinking: understanding people deeply at an executive level, defining the right problem, generating bold ideas, and testing them cheaply before you commit serious money. Then you'll learn to build design thinking into how your organisation works.

It is workshop-style throughout. You finish with a pitch for your solution and a 90-day action plan you can start the following week.""",
  ["A live strategic challenge worked through with design thinking",
   "Executive-level empathy tools that reveal what customers and staff really need",
   "The skill to frame the right problem before anyone jumps to solutions",
   "Fast, low-cost ways to test ideas before committing budgets",
   "A final pitch and a 90-day action plan",
   "A plan to embed design thinking across your organisation"]),
 'culture': (
  """Good companies rarely stop growing because they run out of ideas. They stop because the way they work kills the ideas they already have. Departments guard their territory, managers check every detail, and "agility" becomes a word on a slide rather than a way of working.

This course names the three killers of growth, silos, micro-management and the agility illusion, and shows you how to break each one. You'll diagnose your own organisation honestly, see the hidden cost of each killer, and discover the pod structure: small, empowered, cross-functional teams that move fast and own results. Then you'll learn to lead the shift and make it stick.

Every module ends with a hands-on workshop on your own company, so you finish with a real plan, not just insight.""",
  ["An honest diagnosis of what is slowing innovation in your organisation",
   "Practical ways to break down silos and get departments working together",
   "The confidence to hand over decisions without losing control",
   "A clear test for whether your organisation is truly agile",
   "A design for pods: small teams that move fast and own results",
   "A change plan to lead the culture shift and make it last"]),
 'decide': (
  """The decisions that keep leaders awake are rarely the ones with clear answers. Information is incomplete, the stakes are high, people disagree and every option carries a cost. Clever analysis alone won't carry you through. Neither will gut feeling alone.

This course teaches you to decide well in complexity by bringing four things together: your Head (clear reasoning, thinking in probabilities and guarding against bias), your Heart (values, emotion, intuition, conscience and courage), Models (frameworks that make sense of the situation and the people in it) and Tools (practical techniques for testing, weighing, committing and learning).

For those who decide on behalf of society, the course includes the Policymaker's Pause: the moment before a public decision when a leader asks who carries its cost, when, and with what dignity. Two cases, a subsidy reform and a currency redesign, return throughout as studies of design and impact, with no blame or praise. You finish with a personal decision charter and a 90-day plan.""",
  ["A reliable way to make good decisions when the way ahead is not clear",
   "Protection against the biases that trip up even experienced leaders",
   "The courage and clarity to act on your values under pressure",
   "Proven models for reading the situation and the people involved",
   "Practical tools for weighing options and making the call",
   "A personal decision charter and a 90-day plan"]),
 'wealth': (
  """Earning well and building wealth are not the same thing. A big contract, a bonus or the sale of a business can disappear within a few years, while steady, disciplined choices build wealth that outlives you. Many people with good incomes still feel one emergency away from trouble.

This course helps you turn your breakthrough into lasting wealth. You'll measure what you really own, set money rules that hold even when life gets busy, and turn income into assets that keep working for you. Then you'll put the right structures and advisers in place, protect what you have built, use your wealth to lift the people around you, and pass on capability as well as money to the next generation.

The course teaches principles, not personal financial, legal or tax advice, and rules differ from country to country.""",
  ["A true picture of your net worth and where your money really goes",
   "Simple money rules that hold, whatever your income",
   "A plan to turn income into assets that grow",
   "The structures and advisers that protect and grow your wealth",
   "Protection against the common ways wealth is lost",
   "A legacy plan that passes on values and capability, not just money"]),
 'ep-found': (
  """Some leaders walk into a room and people lean in. They speak and people listen. They are trusted with the hardest conversations. That isn't luck or personality. It is executive presence, and it can be learned.

This is a modern finishing school for leaders, at your own pace. You'll sharpen how you speak, write, negotiate, host, dress, show up on camera and hold your ground under pressure, in Nigerian, African and international settings. Every lesson pairs a short video with a practical exercise, and you get feedback through self-assessment and from peers on the Critique Wall.

If you later want live coaching, you can move up to the next Executive Presence Cohort and pay only the difference.""",
  ["Greater confidence and authority in meetings, boardrooms and on stage",
   "Clear, persuasive writing and speaking that moves people to act",
   "Board readiness and the diplomacy to handle senior stakeholders",
   "Polished etiquette for local and international settings",
   "A personal brand and digital presence that match your ambition",
   "Calm under pressure, including with the media, and a Certificate of Completion"]),
 'ep-cohort': (
  """Reading about presence is not the same as practising it in front of people who will tell you the truth. The Executive Presence Cohort is for senior leaders who want to be coached live, in a small group of peers at their level.

You get everything in Executive Presence Foundation, plus live coaching on every module, personal video critiques from faculty, live roleplay, a one-to-one coaching session and sessions with diplomats, media coaches, image consultants and CEOs. Plan for about four to five hours a week: one 90-minute live session, the lessons and recording your practice pieces.

The programme ends with the Presence Showcase and the Presence Dinner, a formal evening in Lagos or Abuja. You can present your capstone online if you can't attend. Places are by short application, to keep the group senior and well matched.""",
  ["Personal feedback from faculty on how you actually come across",
   "Live practice in the situations that matter most to you",
   "A one-to-one coaching session focused on your goals",
   "Time with diplomats, media coaches, image consultants and CEOs",
   "A network of senior peers who have grown alongside you",
   "The Awelen Executive Presence Certificate"]),
 'peerc': (
  """At the top, the hardest issues don't belong to any one institution. Youth unemployment, food security, power, the cost of capital, trust between business and government: no CEO, board or ministry can solve them alone. And the higher you rise, the fewer people you can think out loud with.

This course is for leaders at the top of business and government who want to think together with peers about the issues that shape nations. You'll learn how senior leaders build trust and think together, exercise judgement in complexity, work where business meets government, govern at the highest level, allocate capital for the long term and build institutions that outlast their founders. You'll also look after the most important asset of all: yourself at the summit.

The course ends with your circle in action on a grand challenge, and the commitments you make together.""",
  ["A trusted circle of peers to think with on the hardest issues",
   "Sharper judgement for complex, high-stakes situations",
   "Practical ways to work across the line between business and government",
   "Governance and capital decisions that build long-term value",
   "Ideas for building institutions that outlast their founders",
   "Commitments to act on a grand challenge with your circle"]),
}

SPRINT_INTRO = {
 'amld-strategy': ("Every business reaches the point where what made it successful stops working. Sales flatten, a competitor changes the game, or the market moves on. This sprint teaches you to see where the business really makes money, and where it should go next, by doing it for a real company.", "“Our core product is stalling. Where do we grow?”"),
 'amld-finance': ("Leaders who understand money make better decisions and raise capital on better terms. This sprint teaches you to read the numbers like a CFO, manage cash and raise and price capital, by working on a real company's finances.", "“We need to raise funds. Are we ready, and on what terms?”"),
 'amld-leaders': ("Leading people and leading leaders are different jobs. When your managers are stretched and good people are leaving, the answer is rarely another policy. This sprint teaches you to shape culture, hiring and succession by solving it for a real company.", "“Our managers are stretched and turnover is rising.”"),
 'amld-ops': ("If the business stops when you step away, you don't own a business, it owns you. This sprint teaches you to design processes, data and technology choices that make the business run without you, by fixing it for a real company.", "“We're growing, but everything still depends on the founder.”"),
 'amld-growth': ("Growth comes from the right customers, the right price, the right channels and partners who open doors you can't open alone. This sprint teaches you to plan and test a real expansion for a real company.", "“We want to enter a new state or country.”"),
 'amld-turn': ("When revenue falls, every decision matters and there is little time to get it right. This sprint teaches you to steer through trouble: risk, boards, compliance and the hard calls, on a real company facing a real challenge.", "“Revenue fell 30% this year. What do we cut, keep and fix?”"),
}
SPRINT_NAME = {'amld-strategy': 'Strategy & Business Model Renewal', 'amld-finance': 'Financial Leadership & Capital', 'amld-leaders': 'Leading Leaders & Building Teams',
               'amld-ops': 'Operations, Systems & Digital Transformation', 'amld-growth': 'Growth, Markets & Partnerships', 'amld-turn': 'Turnaround, Risk & Governance'}
for k, (intro, brief) in SPRINT_INTRO.items():
    ABOUT[k] = (
        intro + f"""

You won't learn from slides alone. You'll work in a studio team of four to six on a live brief from a partner business, led by a Professor of Practice and supported by an Academic Facilitator. A typical brief: {brief}

Plan for about six to eight hours a week: one evening masterclass, one evening studio session, a Saturday clinic every other week and your own team work. You're assessed on your portfolio, the client's signed evaluation and your contribution to the studio.""",
        ["Real experience solving a live problem for a real business",
         "A portfolio of work that proves what you can do, not just a certificate",
         "A signed evaluation from the client you worked for",
         "Coaching from a Professor of Practice who has done it",
         "A strong network of fellow senior professionals",
         f"The Awelen Practitioner Certificate in {SPRINT_NAME[k]}"])

p = pathlib.Path('src/data/seed.json')
d = json.loads(p.read_text())
missing = [c['id'] for c in d['courses'] if c['id'] not in ABOUT]
assert not missing, missing
for c in d['courses']:
    c['desc'], c['gains'] = ABOUT[c['id']][0].strip(), ABOUT[c['id']][1]
p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
print('updated', len(d['courses']), 'courses')
