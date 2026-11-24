# Reference build (24 November 2026)

These two files are the blueprint for bringing the updated courses into the React app.

## Awelen_Community_Edited_11.html
The single-file app with every track, course, module and lesson updated. Open it in a browser to see how things should look and behave.

This is the public copy. The admin passcode check has been taken out, so passcode sign-in is switched off here. Team sign-in through Supabase still works. Awele keeps the full private copy.

## courses-2026-11-24.json
The same course data, exported as JSON so it can go straight into `src/data/seed.json` or the database:
- `tracks`: each track's id, title, description and the order of its courses and spaces.
- `courses`: each course with its modules and lessons, lesson summaries, price and currency. Learner progress and payment records are left out.

## What changed since the Phase 1 seed
- **Track 1, Idea Discovery & Starters:** Idea Discovery, Business Model Development 1 and 2, Understanding Economic Outlook.
- **Track 2, Management Foundation:** Now Run It, Financial Intelligence for Leaders, Winning Choices, Plans That Perform, Built to Scale.
- **Track 3, Driving Change: Transformation & Innovation:** Systems Thinking, Visual Thinking, Design Thinking for Executives, Innovation Culture Shift, Building Sustainable Wealth.
- **Track 4, AMLD:** Executive Presence, Executive Peer Circle, Portfolio Showcase, The Crucible Circle.
- **Removed:** Opportunity Recognition, Leading Yourself First, the old Driving Change course and the old Executive Peer-Circle room.
- **Fees in US dollars** (`currency: "USD"`, pay in full):

  | Course | Fee |
  | --- | --- |
  | Idea Discovery | $50 |
  | Business Model Development 1 | $100 |
  | Business Model Development 2 | $75 |
  | Understanding Economic Outlook | $75 |
  | Now Run It | $50 |
  | Financial Intelligence for Leaders | $100 |
  | Winning Choices | $100 |
  | Plans That Perform | $100 |
  | Built to Scale | $150 |
  | Systems Thinking | $150 |
  | Visual Thinking | $150 |
  | Design Thinking for Executives | $100 |
  | Innovation Culture Shift | $150 |
  | Building Sustainable Wealth | $100 |
  | Executive Presence Foundation | $150 |
  | Executive Peer Circle | $150 |

  Paystack needs USD switched on for the account before dollar payments work. The `paystack-verify` function and the payment tables also need a currency field.
