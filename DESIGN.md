# QarQal landing page: design notes

The page continues the QarQal app's own identity rather than inventing a new one.

## Two worlds

**Night world** (hero, JPJ band, final call to action, footer). Taken from the app's splash video: deep night blue, a speedometer ring around the Q mark, a front-view car with its headlights on, and a line-art KL skyline.

- Ground: `--night-1 #0a1a52` to `--night-0 #040b24`, lit from the top with `--night-2 #15338f`.
- Accent: `--cyan-bright #00a0e6` (dial sweep, focus, highlights).
- Text: `--night-ink #eaedf7`, secondary `--night-ink-2 #b9c4e6`.

**Light world** (every section between). Taken from the app's white screens.

- Ground: white, alternating with `--bg-soft #f2f5fc`.
- Brand gradient: `#2b3494 → #009ee1` (My Garage card, insurer cards, service icons).
- Primary action on light: `--navy #1e3c96`.
- Qarqal Assist uses green, as in the app: `#01644b → #0b7a5f`.

## Type

Lato, the app's font (brand commitment). Display 900, body 400/700. Chinese falls back to Noto Sans SC and Tamil to Noto Sans Tamil, loaded only on those pages. Tamil gets smaller display sizes and taller line height because it runs longer.

## Motion

One authored moment: on load the dial sweeps from 0 to full, the needle dot travels with it, then the headlights flicker on. Everything else is still. `prefers-reduced-motion` shows the final state at once.

## Rules kept

- No small label above a heading.
- No gradient text, no decorative blur.
- Real QarQal assets only: logo, Q mark, skyline, vehicle illustrations, service icons.
- Claims stay provable. Prices in the app mockups are blurred; nothing invents users, ratings or reviews.
- App mockups mirror the app as it is, including its colours, and stay in English.
