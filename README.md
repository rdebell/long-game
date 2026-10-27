# Long Game

A phone-sized training log for alternating pull-up and push-up days. Open it in the browser, add it to the iPhone home screen, and keep every workout in this browser. There is no account and no server.

The first launch is already placed mid-program:

- Push-ups, goal 100, week 12 day 2, last set 55+ (39, 50, 39, 35, 55+)
- Pull-ups, goal 40, week 8 day 3, last set 18+

A new exercise from the list still starts from a max test. The template goals are 20 pull-ups, 100 push-ups, 20 chin-ups, 30 dips, 50 squats, and 40 sit-ups. Any of those can be changed before the first session.

## Run locally

```bash
npm install
npm run dev
```

The dev server is at http://127.0.0.1:43123. The service worker is part of the production build, so use the preview below when you want to check offline or Add to Home Screen.

```bash
npm test
```

## Build

```bash
npm run build
```

The static site is written to **`dist/`**.

Preview that folder, including the service worker:

```bash
npm run preview
```

## Deploy

Upload the **contents** of `dist/` to any static host: Netlify, Cloudflare Pages, Amazon S3, GitHub Pages, or a plain web server. Serve them at the site root. Routes look like `/#/exercise/push-ups`, so the host does not need SPA rewrite rules.

HTTPS is required for the home-screen install and the service worker. Localhost is the exception.

On iPhone, open the site in Safari, tap Share, then Add to Home Screen. The icon opens full screen. The notch and the home indicator are left clear, and after the first visit the app shell loads offline. Workouts stay in `localStorage` under `long-game/state/v1`. Settings has JSON export and import if you want a copy outside the browser.

An App Store build is not required.

## How the numbers are chosen

Each day has five sets. The last one is a max set, written as N+: do as many as you can, and at least N. You pass the day only when every logged set (including pencil edits) reaches its target. The next session then moves to the next day and the last-set floor goes up. Miss any set and that same week and day comes back, with the same targets, until you complete it. The result screen says either “Target hit, next workout unlocked” or “Missed target, repeat this workout next time”. Both attempts stay in the history.

The last-set floors are one integer per session, from today through the goal. If the remaining gain is at least as large as the number of steps left, every step is at least +1 and the extras are spread evenly. If the gain is smaller than the steps left, the climb happens first and the goal is held after that, so the next day is still harder whenever you are below the goal. Days before the current one ramp up into today’s floor so the carousel is filled in; they are not a record of past workouts.

The other sets in a day are a fixed wave of that floor: 71%, 91%, 71%, 64%, then the floor itself. Rounding those shares of 55 is 39, 50, 39, 35, 55. The wave is the same every day, so a higher floor does not reshuffle the shape. It is an original progression, not a copied chart. If you change the set count, the same shape is resampled and the last set stays the floor.

Rest starts at a base (60 seconds on the starter plans) and adds 15 seconds per week, capped at 10 minutes. Edit plan can change the goal, the period in weeks, days per week, sets, the rest base, and the weekly rest increase. Saving rebuilds the floors from the current week and day. The log is left alone. A goal lower than today’s max set is rejected. A period that is too short to contain the current week is extended, and a next-day jump of 8 or more reps is called out as steep.

A max test places a new plan: the first floor is about 60% of the test, and the length is derived from the gap to the goal (about 4% of the goal per week, between 6 and 30 weeks). A retest does not move your week and day. It sets the upcoming floor to about 75% of the test and redraws only what is still ahead, still ending on the goal.

Home suggests one exercise per calendar day. The same exercise waits at least one full day. You can still open a workout by hand, including a repeat of a missed day.
