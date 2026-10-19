"""Runs in GitHub Actions (macOS) right after `npx cap add ios`.
Makes the iPhone project game-ready, matching the Android app:
portrait only, fullscreen (no status bar, auto-hiding home bar), AdMob app id,
app icon + splash screen, iPhone-only, version number.
"""
import os, pathlib, plistlib, re

APP = pathlib.Path("ios/App/App")
PBX = pathlib.Path("ios/App/App.xcodeproj/project.pbxproj")
BG = (10, 31, 69)          # #0a1f45, same dark blue as the game frame

def edit(path, fn):
    p = pathlib.Path(path); s = p.read_text(); n = fn(s)
    if n == s: print("WARNING: no change in", path)
    p.write_text(n)

# ---------- AdMob ids from www/ads-config.js ----------
ads_cfg = pathlib.Path("www/ads-config.js").read_text()
m = re.search(r"iosAppId:\s*'([^']*)'", ads_cfg)
IOS_APP_ID = (m.group(1) if m else "").strip()
if not IOS_APP_ID:
    # Google's sample iOS app id: lets the ads library start without crashing.
    # Real ads need your own iOS app id from AdMob (see www/ads-config.js).
    IOS_APP_ID = "ca-app-pub-3940256099942544~1458002511"
    print("::warning::No iosAppId in www/ads-config.js - iPhone app uses Google's sample AdMob id (no real ads)")
print("AdMob iOS app id:", IOS_APP_ID)

# ---------- 1) Info.plist ----------
info_p = APP / "Info.plist"
info = plistlib.loads(info_p.read_bytes())
info["CFBundleDisplayName"] = "Circus Cats"
info["GADApplicationIdentifier"] = IOS_APP_ID
# Google's ad network id (lets Apple attribute ad installs without tracking)
info["SKAdNetworkItems"] = [{"SKAdNetworkIdentifier": "cstr6suwn9.skadnetwork"}]
# Portrait only, like the Android app
info["UISupportedInterfaceOrientations"] = ["UIInterfaceOrientationPortrait"]
info.pop("UISupportedInterfaceOrientations~ipad", None)
info["UIRequiresFullScreen"] = True
# Fullscreen: no status bar (Android hides its bars too)
info["UIStatusBarHidden"] = True
info["UIViewControllerBasedStatusBarAppearance"] = False
# No encryption beyond HTTPS -> skips the export-compliance question on every upload
info["ITSAppUsesNonExemptEncryption"] = False
info_p.write_bytes(plistlib.dumps(info))

# ---------- 2) Auto-hide the home bar, keep taps at the bottom edge for the game ----------
(APP / "MainViewController.swift").write_text("""import UIKit
import Capacitor

class MainViewController: CAPBridgeViewController {
    override var prefersHomeIndicatorAutoHidden: Bool { return true }
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { return .bottom }
}
""")
def storyboard(s):
    return re.sub(r'customClass="CAPBridgeViewController"\s+customModule="Capacitor"',
                  'customClass="MainViewController" customModule="App" customModuleProvider="target"', s)
edit(APP / "Base.lproj/Main.storyboard", storyboard)
# (scripts/ios-project.rb adds MainViewController.swift to the Xcode project)

# ---------- 3) Version (from the GitHub run number) + iPhone only ----------
vc = os.environ.get("VERSION_CODE", "1")
def pbx(s):
    s = re.sub(r"MARKETING_VERSION = [^;]+;", f"MARKETING_VERSION = 1.0.{vc};", s)
    s = re.sub(r"CURRENT_PROJECT_VERSION = [^;]+;", f"CURRENT_PROJECT_VERSION = {vc};", s)
    s = re.sub(r'TARGETED_DEVICE_FAMILY = "[^"]*";', 'TARGETED_DEVICE_FAMILY = 1;', s)
    s = re.sub(r"TARGETED_DEVICE_FAMILY = [0-9,]+;", "TARGETED_DEVICE_FAMILY = 1;", s)
    # Apple: from April 2027 apps must target iOS 15.0 or later (ITMS-90068)
    s = re.sub(r"IPHONEOS_DEPLOYMENT_TARGET = [0-9.]+;", "IPHONEOS_DEPLOYMENT_TARGET = 15.0;", s)
    return s
edit(PBX, pbx)
podfile = pathlib.Path("ios/App/Podfile")
if podfile.exists():
    podfile.write_text(re.sub(r"platform :ios, '[0-9.]+'", "platform :ios, '15.0'", podfile.read_text()))

# ---------- 4) App icon (1024x1024, no transparency - App Store rule) ----------
from PIL import Image
art = Image.open("resources/app-icon.png").convert("RGBA")
icon_dir = APP / "Assets.xcassets/AppIcon.appiconset"
icon_dir.mkdir(parents=True, exist_ok=True)
for f in icon_dir.glob("*.png"): f.unlink()
flat = Image.new("RGBA", art.size, (0, 86, 213, 255)); flat.alpha_composite(art)
flat.convert("RGB").resize((1024, 1024), Image.LANCZOS).save(icon_dir / "AppIcon-1024.png")
(icon_dir / "Contents.json").write_text("""{
  "images" : [
    { "filename" : "AppIcon-1024.png", "idiom" : "universal", "platform" : "ios", "size" : "1024x1024" }
  ],
  "info" : { "author" : "xcode", "version" : 1 }
}
""")

# ---------- 5) Splash screen: game colour + icon (replaces the Capacitor logo) ----------
sp_dir = APP / "Assets.xcassets/Splash.imageset"
sp_dir.mkdir(parents=True, exist_ok=True)
for f in sp_dir.glob("*.png"): f.unlink()
S = 2732
splash = Image.new("RGB", (S, S), BG)
logo = flat.convert("RGB").resize((560, 560), Image.LANCZOS)
splash.paste(logo, ((S - 560) // 2, (S - 560) // 2))
names = ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]
for n in names: splash.save(sp_dir / n)
(sp_dir / "Contents.json").write_text("""{
  "images" : [
    { "idiom" : "universal", "filename" : "%s", "scale" : "1x" },
    { "idiom" : "universal", "filename" : "%s", "scale" : "2x" },
    { "idiom" : "universal", "filename" : "%s", "scale" : "3x" }
  ],
  "info" : { "version" : 1, "author" : "xcode" }
}
""" % tuple(names))

# ---------- 6) Privacy manifest (Apple requires one; the ad SDK declares its own data use) ----------
(APP / "PrivacyInfo.xcprivacy").write_text("""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSPrivacyTracking</key><false/>
  <key>NSPrivacyTrackingDomains</key><array/>
  <key>NSPrivacyCollectedDataTypes</key><array/>
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <dict>
      <key>NSPrivacyAccessedAPIType</key><string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key><array><string>CA92.1</string></array>
    </dict>
    <dict>
      <key>NSPrivacyAccessedAPIType</key><string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
      <key>NSPrivacyAccessedAPITypeReasons</key><array><string>C617.1</string></array>
    </dict>
  </array>
</dict>
</plist>
""")

print("iOS project patched: portrait, fullscreen, AdMob, icon, splash, iPhone-only, version", vc)
