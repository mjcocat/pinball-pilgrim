# Pinball Pilgrim

A one-thumb storybook launch game. Fling a tiny runaway knight from a castle catapult and bounce,
ricochet and tumble as far across the kingdom as you can.

No build step, no dependencies, no external assets: plain ES modules, Canvas 2D for the art and
Web Audio synthesis for every sound.

## Run it

```sh
npm start            # serves the folder at http://localhost:5173
# or any static server, e.g.  python3 -m http.server 5173
```

Open the URL on a phone or desktop browser. (ES modules need `http://`, so opening `index.html`
straight from disk will not work.) Add `?seed=1234` to load a specific kingdom.

```sh
npm test             # headless tuning check: 300 seeded runs per bot, fails if balance drifts
npm run sim          # same stats table without the pass/fail check
```

## Controls

| Action | Touch / mouse | Keyboard |
| --- | --- | --- |
| Launch | Press anywhere, drag back to set angle and power, release | |
| Kick (burst up and forward) | **KICK** button | `Space` or `K` |
| Shield (hazards become bounces, landings stay bouncy) | **SHIELD** button | `S` or `Shift` |
| Restart | Restart button, or **Launch again** | `R` |
| Mute | Sound button opens volume and mute | `M` |

You start each run with 3 kicks and 2 shields. Anything with a **golden glow** (royal banners and
golden springboards) refills one of each. The run ends when the knight rolls to a stop.

## The kingdom

Five regions cycle forever, each with its own palette and mix of props: Castle Meadows, Mushroom
Wood, Market Village, Windmill Hills and Bell Abbey.

| Prop | What it does |
| --- | --- |
| Mushroom | Pops you upward; bigger caps pop harder |
| Bell | Powerful bounce, always onward and upward, and rings the next note of the tune |
| Banner | Catches you and flings you forward at a fixed angle |
| Awning | Slanted cloth that redirects a fall into forward speed |
| Windmill | Strong shove up and forward |
| Ramp | Converts ground speed into a launch |
| Golden springboard / royal banner | Big launch or catch, plus a recharge |
| Haystack | Soft landing that costs some speed |
| Puddle | Hit it fast and shallow to skip like a stone; otherwise it slows you |
| Goat, bramble, goose | Hazards. Funny and recoverable; a shield turns them into bounces |

Bounces in quick succession build a chain, and each link plays the next note of a tune that gains
harmony, bass and sparkle as the chain grows.

Best distance, cosmetics, volume and the tutorial flag are saved in `localStorage`. Plume colours
and cape patterns unlock at distance milestones (250 m to 2000 m).

## Project layout

```
index.html, styles.css   page shell, HUD and cards
src/main.js              run flow, input, sim events -> visuals and sound
src/core/                DOM-free game logic (also runs under Node)
  config.js              every tuning number, regions, cosmetics
  world.js               seeded terrain and prop generation, chunk by chunk
  sim.js                 knight physics, prop interactions, events
src/render/              Canvas drawing: scenery, props, knight, particles, camera
src/audio/sound.js       synthesised sound palette
src/ui/hud.js            DOM overlay
tools/sim.mjs            bot harness for balance tuning
tools/serve.mjs          tiny static server
```

To add a prop: give it a weight in a region in `config.js`, a spawn case in `world.js`, a `touch`
case in `sim.js`, a draw function in `render/props.js`, and its feedback in `main.js`. Then run
`npm test` to see what it does to run lengths.

## Known limitations

- Sound was verified to run without errors but tuned without listening on real speakers; levels
  may want adjusting by ear.
- Tested in headless Chrome at phone-landscape, phone-portrait and desktop sizes. Not yet tried on
  physical iOS or Android devices.
- Props are trigger volumes rather than solid bodies, so the knight passes behind poles and stalls.
- No offline/PWA install, no haptics, no leaderboard.
