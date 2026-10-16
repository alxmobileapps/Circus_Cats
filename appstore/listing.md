# Circus Cats – App Store Connect listing

Copy each field into App Store Connect. Character limits are shown in brackets; every text below fits.

## 1. Create the app (App Store Connect → Apps → + → New App)

| Field | Value |
|---|---|
| Platform | iOS |
| Name [30] | Circus Cats  *(if the name is taken: `Circus Cats: Ring of Fire`)* |
| Primary language | English (U.S.) |
| Apple Account | alx.mobileapps@gmail.com |
| Bundle ID | com.alxmobileapps.circuscats *(register it first in developer.apple.com → Identifiers)* |
| SKU | CIRCUSCATS-IOS-001 |
| User access | Full Access |

## 2. App Information

| Field | Value |
|---|---|
| Subtitle [30] | Jump through rings of fire! |
| Category | Games |
| Game subcategories | Casual, Family |
| Content rights | No, it does not contain, show, or access third-party content |
| Age rating | answers in section 6 → result **4+** |

## 3. Pricing and Availability

- Price: **Free** (USD 0), all countries
- In-app purchases: **none** (coins are earned only by playing)
- iPad: not offered (iPhone-only build). On Mac with Apple silicon: leave **unchecked**.

## 4. Version page (1.0)

**Promotional Text [170]**

New cats to unlock and new tricks in the ring! Twin rings, gliding rings and bouncing circus balls, and 50 cats and Big & Wild Cats to collect. How far can your cat go?

**Description [4000]**

Step right up to the greatest show under the big blue tent! Circus Cats is a one-tap circus game: your cat runs on its own, and you help it leap through rings of fire.

Quick tap for a small hop. Hold for a big leap. Jump through the rings and don't touch the flames!

HOW TO PLAY
• Tap to hop, hold to jump higher
• Fly through each flaming ring to score and earn a coin
• Twin rings: one jump through both for +2
• Watch out for rolling circus balls, gliding rings, and bouncing ball pairs later on
• Touch the fire or the ring's stand and your cat cries. Try again and beat your best!

50 CATS TO COLLECT
Unlock 30 house cats in the Cat Shop: Maine Coon, Persian, Siamese, Ragdoll, British Shorthair, Bengal, Scottish Fold, Sphynx, Russian Blue and many more. Save up for 20 Big & Wild Cats too: Tiger, Lion, Leopard, Cheetah, Jaguar, Snow Leopard, Black Panther, Lynx and more. Every cat has its own look and voice: a meow, a chirp, a snarl or a mighty roar.

FEATURES
• Simple one-tap controls anyone can learn in seconds
• Gets faster and trickier the higher you score
• Circus march music and fun sound effects (switch them off anytime)
• Share your score picture with friends
• Your best score, coins and cats are saved on your phone
• No account, no sign-up, no in-app purchases

Circus Cats is free and supported by a small, family-friendly banner ad.

**Keywords [100]**

cat,kitten,kitty,tiger,lion,leopard,cheetah,jump,fire,ring,hoop,tap,arcade,casual,endless,runner,pet

**Support URL**

https://claude.ai/artifact/4NgoZrMkf1qK1CW7EESm7C  *(the game's privacy/support page)*

**Marketing URL** (optional): leave empty

**Privacy Policy URL** (App Privacy section)

https://claude.ai/artifact/4NgoZrMkf1qK1CW7EESm7C

**Copyright**

2026 ALX Mobile Apps

**Screenshots**

Upload 3–10 portrait screenshots under **iPhone 6.9" Display** (1320 × 2868 or 1290 × 2796). The `ios-simulator-screenshot.png` from each "Build iOS app" run is the right size to start with.

**Build**: choose the build that the "Build iOS app" GitHub workflow uploaded to TestFlight.

**App Review Information**

- Sign-in required: **No**
- Contact: your name and phone, email alx.mobileapps@gmail.com
- Notes:

> Circus Cats is a one-tap game. Tap the screen to start; tap for a small hop and hold for a bigger jump through the flaming rings. Coins are earned by passing rings and can be spent in the Cat Shop (title screen) to unlock other cats. There are no accounts and no in-app purchases. The app shows a Google AdMob banner; all ad requests are child-directed and non-personalized, the advertising identifier is not used, and the app does not request App Tracking Transparency permission.

## 5. App Privacy (App Store Connect → App Privacy)

Based on Google's App Store data disclosure for the Google Mobile Ads SDK (the game itself sends nothing to the developer).

**Do you or your third-party partners collect data from this app?** Yes

| Data type | Used for | Linked to user | Used for tracking |
|---|---|---|---|
| Location → Coarse Location (from IP address) | Third-Party Advertising, Analytics | No | No |
| Identifiers → Device ID | Third-Party Advertising, Analytics | Yes | No |
| Usage Data → Product Interaction | Third-Party Advertising, Analytics | Yes | No |
| Usage Data → Advertising Data | Third-Party Advertising, Analytics | Yes | No |
| Diagnostics → Crash Data | App Functionality, Analytics | No | No |
| Diagnostics → Performance Data | App Functionality, Analytics | Yes | No |

"Used for tracking: No" because the app never asks for App Tracking Transparency permission, so the advertising identifier (IDFA) is unavailable, and ads are child-directed and non-personalized. If you ever turn on personalized ads, you must add the tracking prompt and change these answers to "Yes".

## 6. Age rating questionnaire

| Question | Answer |
|---|---|
| Parental controls / age assurance | No |
| Unrestricted web access | No |
| User-generated content | No |
| Messaging and chat | No |
| Advertising | Yes |
| Violence (cartoon, fantasy, realistic) | None |
| Profanity or crude humor | None |
| Mature or suggestive themes | None |
| Horror or fear themes | None |
| Medical or treatment info | None |
| Alcohol, tobacco or drugs | None |
| Sexual content or nudity | None |
| Simulated gambling / contests / loot boxes | None / No |
| Made for Kids (Kids category) | **No** (third-party ads aren't allowed in the Kids category) |

Expected rating: **4+**.

## 7. Export compliance

Already answered inside the build (`ITSAppUsesNonExemptEncryption = NO`), so App Store Connect won't ask.
