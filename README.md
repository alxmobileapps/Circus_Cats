# Circus Cats 🐱🔥

A one-tap circus game (same gameplay as Circus Dogs). The cat runs on its own. **Quick tap = small hop, hold longer = higher jump.**
Rings come in different sizes, heights and spacing, and they get smaller as you score.
Sometimes two low rings come very close together; after 10 rings, twin rings appear (one jump through both = +2);
after 20 a circus ball rolls in; after 30 some rings move up and down; after 40 two balls can come bouncing together. Touch the flames, jump over the ring,
or run into its stand and the cat cries. Game over, then try again.

- Every cat makes its own sound on each jump (meow, "mrrp" chirp, snarl, or a big-cat roar) and cries on game over.
- Blue circus-tent theme.
- Portrait game with an **AdMob banner at the top** (see *Ads* below).
- Circus march background music (music button and sound button in the top-right).
- **Cat Shop:** each ring you pass = 1 coin. Spend coins to unlock more cats. **50 cats**:
  - **House cats**: Maine Coon is free, then the first shop cat costs 100 coins and each cat costs 20 more:
    Persian 100, Siamese 120, Ragdoll 140 ... Bombay 640, Balinese 660 (30 house cats).
  - **Big & Wild Cats** (each 50 coins more): Tiger 710, Lion 760, Leopard 810, Cheetah 860 ... Margay 1610,
    Rusty-Spotted Cat 1660 (20 wild cats). Full list and prices in `www/breeds.js`.
- Share your score from the Game Over card (phone share menu with a score picture).
- Best score, coins and unlocked cats are saved on the phone.

## Adding or changing cats

All cats live in **`www/breeds.js`**. Each entry sets the name, price, look (colours, pattern, ears, tail, body shape,
circus ruffle colour) and voice. To use **real recordings or your own art** instead of the built-in ones:

1. Put the files in `www/sounds/` and `www/images/`
2. In that breed's `files` line, point to them:
   ```js
   files: { meow: 'sounds/tiger-roar.mp3', cry: 'sounds/tiger-cry.mp3', gameOver: 'images/tiger-cry.png' }
   ```
Any file left as `null` (or that fails to load) falls back to the built-in sound or drawing.
Every cat uses the same hitbox size, so no cat is easier than another.

## Ads (AdMob)

Settings are in **`www/ads-config.js`** (real Circus Cats AdMob ids). The build copies the App ID into
the Android manifest. The **debug APK always shows Google test ads** so you can play it safely;
the **release AAB/APK uses the real ads**.

## How the Android app is built

Everything runs on GitHub; nothing needs to be installed on your computer.

1. The web game is in `www/` (`index.html` + `game.js` + `breeds.js`).
2. On every push to `main`, the **Build Android app** workflow (Actions tab):
   - wraps the game with Capacitor (`npx cap add android`)
   - runs `scripts/android-setup.py` (portrait, fullscreen, AdMob app id, app icon from `resources/app-icon.png`, version number)
   - builds the APK and AAB
3. Open **Actions → latest run → Artifacts → `circus-cats-android`** to download:
   - `circus-cats-debug-TEST-ADS.apk`: install directly on a phone for testing
   - `playstore-icon-512.png`: the icon for the Play Console
   - `circus-cats-release.aab` / `.apk`: only when the signing secrets below are set

## Signed release for Google Play (optional)

Add these repository secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `KEYSTORE_BASE64` | your `.jks`/`.keystore` file, base64-encoded |
| `KEYSTORE_PASSWORD` | keystore password |
| `KEY_ALIAS` | key alias |
| `KEY_PASSWORD` | key password (can be the same as the keystore password) |

You can reuse the same keystore you use for Circus Dogs.

App ID: `com.alxmobileapps.circuscats`
Privacy policy: https://claude.ai/artifact/4NgoZrMkf1qK1CW7EESm7C
