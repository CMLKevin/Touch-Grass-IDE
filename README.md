# Touch Grass IDE

> The open-source brainrot IDE that YC should have funded.

[![VS Marketplace](https://img.shields.io/visual-studio-marketplace/v/pigeon.touch-grass-ide)](https://marketplace.visualstudio.com/items?itemName=pigeon.touch-grass-ide)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A VS Code extension that detects when AI coding tools (Claude Code, Cursor, Copilot) are generating code, then surfaces a panel with minigames, casino games, and entertainment to fill the wait time. Auto-dismisses when generation completes.

## What is this?

Touch Grass IDE detects when your AI coding tools are generating code, then shows entertainment options to fill the wait time. When generation completes, it auto-minimizes so you can get back to work.

**Features:**
- **4 Built-in Games** - Snake, Flappy Bird, Plinko, and Slots
- **Economy System** - Earn Grass Coins (GC) while coding, bet them in casino games
- **Pomodoro Timer** - Stay productive with work/break cycles
- **Social Media** - YouTube Shorts, TikTok, Twitter, Reddit embeds
- **Achievement System** - 30+ achievements across all rarities
- **Auto-detection** - Detects AI generation in terminal
- **Comprehensive Settings** - Customize everything in-panel
- **Free & Open Source** - No waitlist, no invite codes

## Why?

AI coding tools create awkward 1-5 minute wait times. You're going to check your phone anyway. Touch Grass keeps you in the editor so you're ready when generation completes.

Or maybe this is all a terrible idea and you should actually touch grass. We added an achievement for that too.

## Installation

1. Open VS Code
2. Go to Extensions (Cmd/Ctrl+Shift+X)
3. Search "Touch Grass IDE"
4. Click Install
5. Question your life choices

## Usage

The extension auto-activates when it detects AI generation. You can also manually open it:

- `Cmd/Ctrl+Shift+P` -> "Touch Grass: Open Brainrot Panel"
- `Cmd/Ctrl+Shift+P` -> "Touch Grass: Toggle Auto-Detection"
- `Cmd/Ctrl+Shift+P` -> "Touch Grass: Reset Stats"

## Games

### Classic Games
| Game | Controls | Description |
|------|----------|-------------|
| **Snake** | Arrow keys / WASD | Classic snake with smooth animations and particles |
| **Flappy Bird** | Space / Click | Navigate through pipes, rotation physics |

### Casino Games
Bet your hard-earned Grass Coins!

| Game | Description |
|------|-------------|
| **Plinko** | Drop balls through pegs, hit multipliers up to 110x |
| **Slots** | Spin to win with symbols from 2x to 100x |

## Economy System

- **Earn GC**: 1 Grass Coin per second while actively coding
- **Panel Closed**: Must have panel closed to earn
- **Bet in Casino**: Risk your coins for bigger rewards
- **Configurable**: Adjust earning rate in settings

## Pomodoro Timer

Built-in Pomodoro technique timer:
- 25 minutes work sessions
- 5 minute short breaks
- 15 minute long breaks (every 4 sessions)
- Session tracking and statistics

## Configuration

All settings can be changed in the **Settings** tab within the panel, or via VS Code settings:

```json
{
  "touchgrass.autoDetect": true,
  "touchgrass.autoMinimize": true,
  "touchgrass.brainrotIntensity": "casual",
  "touchgrass.enableAchievements": true,
  "touchgrass.casinoEnabled": true,
  "touchgrass.earningRate": 1,
  "touchgrass.idleTimeout": 30
}
```

### Settings Reference

| Setting | Default | Description |
|---------|---------|-------------|
| `autoDetect` | `true` | Auto-show panel during AI generation |
| `autoMinimize` | `true` | Auto-hide when generation completes |
| `brainrotIntensity` | `"casual"` | Theme: touching-grass / casual / degenerate / terminal |
| `enableAchievements` | `true` | Show achievement notifications |
| `casinoEnabled` | `true` | Enable casino games and GC earning |
| `earningRate` | `1` | Grass Coins earned per second |
| `idleTimeout` | `30` | Seconds before considered idle |

## Achievements

Unlock 30+ achievements as you procrastinate:

### Common
| Achievement | Description |
|-------------|-------------|
| Baby's First Brainrot | Opened the panel for the first time |
| Gamer Moment | Played your first minigame |
| Just a Quick Break | Spent 1 minute in brainrot |
| Doom Scroller | Opened social media |
| Tomato Timer | Completed first Pomodoro |
| Feeling Lucky | Place your first casino bet |

### Uncommon
| Achievement | Description |
|-------------|-------------|
| Snek Master | Score 100+ in Snake |
| Bird Brain | Score 10+ in Flappy Bird |
| AI is Still Cooking | 5 minutes in brainrot |
| Serial Gamer | Play 10 games total |
| Edge Lord | Hit 10x+ multiplier in Plinko |

### Rare
| Achievement | Description |
|-------------|-------------|
| Anaconda | Score 500+ in Snake |
| Flap God | Score 50+ in Flappy Bird |
| Variety Gamer | Play all 4 games |
| Professional Procrastinator | 1 hour total brainrot |
| Lucky 777 | Get triple 7s on slots |

### Legendary
| Achievement | Description |
|-------------|-------------|
| Ouroboros | Score 1000+ in Snake |
| Icarus Who? | Score 100+ in Flappy Bird |
| Touched Grass? Never. | 24 hours total brainrot |
| Whale | Accumulate 10,000 GC |
| JACKPOT! | Win 100x or more on a bet |

### Cursed (Secret)
| Achievement | Description |
|-------------|-------------|
| Sleep is for the Weak | Used between 2-5am |
| Skill Issue | Die in Snake within 3 seconds |
| Rage Quit | Play 5 games in under 2 minutes |
| Broke | Reach 0 GC balance |

## Development

```bash
# Clone the repository
git clone https://github.com/CMLKevin/Touch-Grass-IDE.git
cd Touch-Grass-IDE

# Install dependencies
npm install

# Compile
npm run compile

# Watch mode
npm run watch

# Package extension
npx vsce package
```

### Project Structure

```
src/
├── extension.ts          # Extension entry point
├── panels/
│   └── BrainrotPanel.ts  # Main webview panel (games, UI)
└── core/
    ├── StateManager.ts       # Global state management
    ├── SessionTracker.ts     # Stats and session tracking
    ├── AchievementEngine.ts  # Achievement system
    ├── CurrencyManager.ts    # Grass Coins economy
    ├── ActivityDetector.ts   # AI generation detection
    ├── CodingActivityTracker.ts  # Coding activity monitoring
    └── PomodoroManager.ts    # Pomodoro timer
```

## Contributing

PRs welcome! Ideas for contributions:
- Add new minigames
- Create new achievements
- Improve game animations
- Add new social media integrations
- Localization support

## Changelog

### v1.2.0
- Added Plinko and Slots casino games
- Added Grass Coins economy system
- Added comprehensive Settings panel
- Added Pomodoro timer
- Added social media embeds
- Added 30+ achievements
- Improved game animations and sound effects

### v1.1.0
- Added Flappy Bird
- Added achievement system
- Added auto-detection improvements

### v1.0.0
- Initial release with Snake game

## License

MIT - do whatever you want with it.

---

*This is satire. Please actually touch grass sometimes.*

Made with 🌿 by developers who should probably be working
