# Circus Cats 🐱🔥

A one-tap circus game (same gameplay as Circus Dogs). The cat runs on its own. **Quick tap = small hop, hold longer = higher jump.**
Rings come in different sizes, heights and spacing, and they get smaller as you score.
Sometimes two low rings come very close together; after 10 rings, twin rings appear (one jump through both = +2);
after 20 a circus ball rolls in; after 30 some rings move up and down. Touch the flames, jump over the ring,
or run into its stand and the cat cries. Game over, then try again.

- Every cat makes its own sound on each jump (meow, "mrrp" chirp, snarl, or a big-cat roar) and cries on game over.
- Portrait game with an **AdMob banner at the top** (see *Ads* below).
- Circus march background music (music button and sound button in the top-right).
- **Cat Shop:** each ring you pass = 1 coin. Spend coins to unlock more cats. **50 cats**:
  - **House cats** (+20 coins each): Maine Coon (free), Persian 20, Siamese 40, Ragdoll 60, British Shorthair 80,
    Bengal 100, Scottish Fold 120, Sphynx 140, Russian Blue 160, American Shorthair 180, Norwegian Forest Cat 200,
    Siberian 220, Birman 240, Abyssinian 260, Turkish Angora 280, Exotic Shorthair 300, Oriental Shorthair 320,
    Devon Rex 340, Burmese 360, Himalayan 380, Manx 400, Cornish Rex 420, Tonkinese 440, Somali 460,
    American Curl 480, Egyptian Mau 500, Japanese Bobtail 520, Ocicat 540, Bombay 560, Balinese 580.
  - **Big & Wild Cats** (+50 coins each): Tiger 630, Lion 680, Leopard 730, Cheetah 780, Jaguar 830,
    Snow Leopard 880, Black Panther 930, Cougar / Mountain Lion 980, Caracal 1030, Serval 1080, Lynx 1130,
    Ocelot 1180, Clouded Leopard 1230, Fishing Cat 1280, Pallas's Cat 1330, Sand Cat 1380, Jungle Cat 1430,
    Geoffroy's Cat 1480, Margay 1530, Rusty-Spotted Cat 1580.
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

## Ads (AdMob) — needs your own ids

Settings are in **`www/ads-config.js`**. Circus Cats needs **its own AdMob app** (ids from Circus Dogs can't be reused):

1. AdMob → **Apps → Add app → Android → "Circus Cats"**
2. Create a **Banner** ad unit
3. Paste the App ID and Banner ID into `www/ads-config.js` and set `testing: false`

Until then the file uses Google's official test ids. The **debug APK always shows Google test ads** so you can play it safely.

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
