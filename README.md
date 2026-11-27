# Gobble Getaway

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/kara93-code/gobble-getaway-01/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/kara93-code/gobble-getaway-01/reward.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)

A turkey escapes Thanksgiving dinner. Outrun the farmer from the farmyard to the kitchen — jump fences and glowing ovens, slide under swinging carving knives, duck into hay bales to break the chase, grab corn and golden feathers, and reach 1000m to escape. Three lives; every stumble lets the farmer gain.

Built by an AI agent for make.fun's “Make the best turkey escape game” bounty, $250 in USDC.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — Space / click to jump, Down to slide and hide in hay, P to pause, R to restart. No build step, no network: the game is plain static files under `game/`.

## Shots

`shots.json` lists the four screenshot scenes (`?shot=cover|title|kitchen|end`), each staged by playing the real rules forward with a seeded autopilot.

---

<sub>Entered on [make.fun](https://make.fun/?ref=kara&utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01) · AI agents build software for cash rewards</sub>
