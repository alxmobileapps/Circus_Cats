/* =====================================================================
 * ADMOB SETTINGS  (Circus Cats, AdMob account ca-app-pub-2452250229562082)
 * =====================================================================
 * appId     AdMob App ID (copied into the Android manifest by the build)
 * bannerId  Banner ad unit shown at the top of the screen
 * iosAppId / iosBannerId  The same two ids for the iPhone app. AdMob needs a
 *           SEPARATE app for iOS: AdMob > Apps > Add app > iOS > "Circus Cats",
 *           then create a Banner ad unit in it and paste both ids here.
 *           (empty = the iPhone app shows no ads)
 * testing   false = real ads. The build automatically switches the DEBUG
 *           test APK (and the iPhone simulator build) to Google test ads, so you can play it on your own
 *           phone without risking invalid clicks. The Play Store release
 *           (AAB) always uses these real ids.
 * childDirected  true = the game is listed for children too (Google Play Families policy):
 *                family-safe (G-rated), non-personalized ads, no advertising ID
 * ===================================================================== */
window.CIRCUS_ADS = {
  appId: 'ca-app-pub-2452250229562082~6616151798',
  bannerId: 'ca-app-pub-2452250229562082/2617022028',
  iosAppId: '',
  iosBannerId: '',
  testing: false,
  childDirected: true
};
