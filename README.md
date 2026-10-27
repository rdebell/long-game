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

The dev server is at http://127.0.0.1:43123/long-game/. The service worker is part of the production build, so use the preview below when you want to check offline or Add to Home Screen.

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

The public site is [https://rdebell.github.io/long-game/](https://rdebell.github.io/long-game/). The Vite `base` is `/long-game/`, and routes stay on the hash (`/#/exercise/push-ups`).

Every push to `main` runs `.github/workflows/pages.yml`. That workflow builds `dist/` and publishes it to the `gh-pages` branch with the default `GITHUB_TOKEN`. The one manual step is in the GitHub repo: **Settings → Pages → Build and deployment → Deploy from a branch → `gh-pages` / root**.

`public/.nojekyll` is copied into `dist/` so GitHub Pages serves the files as-is.

The same `dist/` folder can be uploaded to another static host. This build expects to be served from `/long-game/`.

## Log a workout to Apple Health

A home-screen web app cannot write Apple Health. After a hit or a miss, the result screen shows **Log to Health** when that setting is on (it starts on). The button opens an Apple Shortcut named **Long Game to Health**. Change the name in Settings if you name the shortcut something else. Settings also links to the same steps as this section.

The workout screen stores its open time and the time the last set was logged. The length is the nearest whole minute, and at least 1. Those times stay on the workout in history. Reps stay in Long Game. Health only receives the workout type, the start, and the length.

When the workout ends, Long Game copies the minutes to the clipboard, for example `12`. That is the fallback. The button opens:

```
shortcuts://run-shortcut?name=Long%20Game%20to%20Health&input=text&text=%7B%22minutes%22%3A12%2C%22start%22%3A%222026-10-27T15%3A04%3A00.000Z%22%7D
```

The `text` parameter is JSON, so the shortcut can use Get Dictionary from Input:

```
{"minutes":12,"start":"2026-10-27T15:04:00.000Z"}
```

`minutes` is the length. `start` is when the workout screen opened, as UTC ISO-8601. For this example the session ran from 15:04 to 15:16. If the URL does not leave Long Game, open the shortcut yourself. With no shortcut input it reads the clipboard, which is only the minute count.

Build the shortcut once in the Shortcuts app:

1. Tap + and name it **Long Game to Health**. The name has to match Settings.
2. Leave the top action as **Receive Text input from Share Sheet**. The input type stays Text.
3. Add **If**. Condition: **Shortcut Input** **has any value**. Shortcut Input is what Get Shortcut Input returns, and it is what the button sends.
4. Inside If, add **Set Variable**. Name it `Payload`. Set it to **Shortcut Input**.
5. Inside Otherwise, add **Get Clipboard**, then **Set Variable** `Payload` to the **Clipboard**.
6. Under End If, add a second **If**: `Payload` **begins with** `{`. The JSON starts with a brace. The clipboard is only digits, so it does not.
7. Inside that If, add **Get Dictionary from Input** and choose `Payload`. **Get Dictionary Value** for `minutes`, and **Set Variable** `Minutes` to it. **Get Dictionary Value** for `start`. **Get Dates from Input** on that text. If you get a list, **Get Item from List** and take the first item. **Set Variable** `Start` to that date. The text looks like `2026-10-27T15:04:00.000Z`. If Get Dates comes back empty, pass the start text itself into the Date field below.
8. Inside Otherwise, **Set Variable** `Minutes` to `Payload`. Add **Date** set to **Current Date**. Add **Adjust Date** and subtract `Minutes` **minutes**. **Set Variable** `Start` to the adjusted date. That estimates the start as now minus the length.
9. Under End If, add Health’s **Log Workout**. Type: **Functional Strength Training**. Date: `Start`. Duration: `Minutes`, unit **minutes**. Leave calories and distance empty.
10. Optional: add **Open URL** with `https://rdebell.github.io/long-game/` if you want a browser tab afterward. The home-screen app stays in the app switcher. Switch back to Long Game if Safari opens instead.

The first run asks permission to write Health data. Allow it. That prompt happens once.

To try the clipboard path, copy `12`, run the shortcut from Shortcuts, and confirm a functional strength workout of 12 minutes. Then finish a workout in Long Game and tap Log to Health.

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
