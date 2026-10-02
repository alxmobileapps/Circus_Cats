/* =====================================================================
 * ADMOB SETTINGS  (Circus Cats)
 * =====================================================================
 * IMPORTANT: Circus Cats needs its OWN AdMob app + banner ad unit
 * (the Circus Dogs ids can't be reused for a different app).
 * In AdMob: Apps -> Add app -> Android -> "Circus Cats", then create a Banner
 * ad unit, and paste both ids below, then set testing: false.
 * Until then these are Google's official TEST ids (safe, show test ads only).
 *
 * appId     AdMob App ID (copied into the Android manifest by the build)
 * bannerId  Banner ad unit shown at the top of the screen
 * testing   false = real ads. The build automatically switches the DEBUG
 *           test APK to Google test ads, so you can play it on your own
 *           phone without risking invalid clicks. The Play Store release
 *           (AAB) uses the ids below.
 * childDirected  true = the game is listed for children too (Google Play Families policy):
 *                family-safe (G-rated), non-personalized ads, no advertising ID
 * ===================================================================== */
window.CIRCUS_ADS = {
  appId: 'ca-app-pub-3940256099942544~3347511713',
  bannerId: 'ca-app-pub-3940256099942544/9214589741',
  testing: true,
  childDirected: true
};
