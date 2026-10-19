"""App Store Connect helper for Circus Cats (runs in GitHub Actions with the App Store API key).

  python scripts/appstore.py status   -> writes out/status.json (what is filled in / missing)
  python scripts/appstore.py fill     -> fills the 1.0 listing from appstore/listing-data.json,
                                         uploads appstore/screenshots-6.9in/*.png, attaches the newest
                                         valid build, review contact (copied from Circus Dogs) + notes
  python scripts/appstore.py submit   -> fill, then submits the version for App Review

Env: APPSTORE_KEY_ID, APPSTORE_ISSUER_ID, ASC_KEY_PATH (cleaned .p8 file)
The repo is public: nothing private (contact name/phone) is ever printed or written to out/.
"""
import glob, hashlib, json, os, sys, time
import jwt, requests

API = "https://api.appstoreconnect.apple.com"
BUNDLE_ID = "com.alxmobileapps.circuscats"
CONTACT_FROM = "com.alxmobileapps.circusdogs"     # review contact details are copied from this app
EDITABLE = {"PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "REJECTED", "METADATA_REJECTED", "INVALID_BINARY"}
OUT = {"notes": [], "errors": []}


def note(m):
    print(m); OUT["notes"].append(m)


def token():
    now = int(time.time())
    return jwt.encode({"iss": os.environ["APPSTORE_ISSUER_ID"], "iat": now, "exp": now + 1100,
                       "aud": "appstoreconnect-v1"}, open(os.environ["ASC_KEY_PATH"]).read(),
                      algorithm="ES256", headers={"kid": os.environ["APPSTORE_KEY_ID"], "typ": "JWT"})


class AscError(Exception):
    def __init__(self, status, body):
        super().__init__(f"{status}: {body[:1500]}"); self.status = status; self.body = body


def call(method, path, body=None, params=None, ok404=False):
    url = path if path.startswith("http") else API + (path if path.startswith("/v") else "/v1" + path)
    r = requests.request(method, url, json=body, params=params, timeout=120,
                         headers={"Authorization": "Bearer " + token(), "Content-Type": "application/json"})
    if ok404 and r.status_code == 404:
        return {}
    if r.status_code >= 300:
        raise AscError(r.status_code, f"{method} {path} -> {r.text}")
    return r.json() if r.content else {}


def one(path, **kw):
    return (call("GET", path, **kw) or {}).get("data")


def app_for(bundle):
    d = call("GET", "/apps", params={"filter[bundleId]": bundle})["data"]
    return d[0] if d else None


def editable_version(app_id):
    vs = call("GET", f"/apps/{app_id}/appStoreVersions", params={"filter[platform]": "IOS", "limit": 20})["data"]
    return vs, next((v for v in vs if v["attributes"].get("appStoreState") in EDITABLE), None)


def builds(app_id):
    d = call("GET", "/builds", params={"filter[app]": app_id, "sort": "-uploadedDate", "limit": 20,
                                         "include": "preReleaseVersion"})
    pre = {x["id"]: x["attributes"]["version"] for x in d.get("included", []) if x["type"] == "preReleaseVersions"}
    res = []
    for b in d["data"]:
        pr = (b["relationships"].get("preReleaseVersion", {}).get("data") or {}).get("id")
        res.append({"id": b["id"], "build": b["attributes"]["version"], "version": pre.get(pr),
                    "state": b["attributes"]["processingState"], "expired": b["attributes"]["expired"],
                    "uploaded": b["attributes"]["uploadedDate"]})
    return res


def editable_appinfo(app_id):
    infos = call("GET", f"/apps/{app_id}/appInfos")["data"]
    for i in infos:
        if i["attributes"].get("appStoreState", i["attributes"].get("state")) in EDITABLE | {"PREPARE_FOR_SUBMISSION", None}:
            return i
    return infos[0]


# ---------------------------------------------------------------- status
def status():
    app = app_for(BUNDLE_ID)
    if not app:
        OUT["app"] = None; OUT["errors"].append("No app record with bundle id " + BUNDLE_ID); return
    a = app["attributes"]
    OUT["app"] = {"id": app["id"], "name": a.get("name"), "sku": a.get("sku"), "primaryLocale": a.get("primaryLocale"),
                  "contentRightsDeclaration": a.get("contentRightsDeclaration")}
    vs, v = editable_version(app["id"])
    OUT["versions"] = [{"id": x["id"], "version": x["attributes"]["versionString"], "state": x["attributes"].get("appStoreState"),
                        "copyright": x["attributes"].get("copyright"), "releaseType": x["attributes"].get("releaseType")} for x in vs]
    OUT["builds"] = builds(app["id"])
    info = editable_appinfo(app["id"])
    OUT["appInfo"] = {"id": info["id"], "attributes": info["attributes"]}
    for rel in ("primaryCategory", "primarySubcategoryOne", "primarySubcategoryTwo"):
        OUT["appInfo"][rel] = (one(f"/appInfos/{info['id']}/{rel}") or {}).get("id")
    OUT["appInfoLocalizations"] = [x["attributes"] for x in call("GET", f"/appInfos/{info['id']}/appInfoLocalizations")["data"]]
    OUT["ageRating"] = (one(f"/appInfos/{info['id']}/ageRatingDeclaration") or {}).get("attributes")
    if v:
        OUT["versionLocalizations"] = []
        for loc in call("GET", f"/appStoreVersions/{v['id']}/appStoreVersionLocalizations")["data"]:
            la = dict(loc["attributes"]); la["description"] = (la.get("description") or "")[:60]
            sets = call("GET", f"/appStoreVersionLocalizations/{loc['id']}/appScreenshotSets")["data"]
            la["screenshotSets"] = {s["attributes"]["screenshotDisplayType"]: len(call("GET", f"/appScreenshotSets/{s['id']}/appScreenshots")["data"]) for s in sets}
            OUT["versionLocalizations"].append(la)
        OUT["versionBuild"] = (one(f"/appStoreVersions/{v['id']}/build") or {}).get("attributes", {}).get("version")
        rd = one(f"/appStoreVersions/{v['id']}/appStoreReviewDetail")
        if rd:
            ra = rd["attributes"]
            OUT["reviewDetail"] = {"contactFilled": all(ra.get(k) for k in ("contactFirstName", "contactLastName", "contactPhone", "contactEmail")),
                                   "demoAccountRequired": ra.get("demoAccountRequired"), "notesLength": len(ra.get("notes") or ""),
                                   "attachments": [x["attributes"].get("fileName") for x in call("GET", f"/appStoreReviewDetails/{rd['id']}/appStoreReviewAttachments")["data"]]}
    OUT["priceSchedule"] = bool(one(f"/apps/{app['id']}/appPriceSchedule", ok404=True))
    try:
        OUT["availability"] = bool(one(f"/v1/apps/{app['id']}/appAvailabilityV2", ok404=True))
    except AscError as e:
        OUT["availability"] = "error " + str(e.status)
    subs = call("GET", "/reviewSubmissions", params={"filter[app]": app["id"], "filter[platform]": "IOS", "limit": 10})["data"]
    OUT["reviewSubmissions"] = [{"id": s["id"], "state": s["attributes"].get("state")} for s in subs]
    dogs = app_for(CONTACT_FROM)
    if dogs:
        dvs = call("GET", f"/apps/{dogs['id']}/appStoreVersions", params={"filter[platform]": "IOS", "limit": 5})["data"]
        OUT["dogsVersions"] = [{"version": x["attributes"]["versionString"], "state": x["attributes"].get("appStoreState")} for x in dvs]


# ---------------------------------------------------------------- fill
def dogs_contact():
    dogs = app_for(CONTACT_FROM)
    for v in call("GET", f"/apps/{dogs['id']}/appStoreVersions", params={"filter[platform]": "IOS", "limit": 5})["data"]:
        rd = one(f"/appStoreVersions/{v['id']}/appStoreReviewDetail")
        if rd and rd["attributes"].get("contactPhone"):
            return {k: rd["attributes"].get(k) for k in ("contactFirstName", "contactLastName", "contactPhone", "contactEmail")}
    return None


def patch(kind, obj_id, attrs=None, rels=None):
    body = {"data": {"type": kind, "id": obj_id}}
    if attrs: body["data"]["attributes"] = attrs
    if rels: body["data"]["relationships"] = rels
    return call("PATCH", f"/{kind}/{obj_id}", body)


def patch_dropping_unknown(kind, obj_id, attrs):
    """PATCH; if Apple rejects some attribute names (they change over time), drop those and retry."""
    attrs = dict(attrs)
    for _ in range(8):
        try:
            return patch(kind, obj_id, attrs)
        except AscError as e:
            try: errs = json.loads(e.body[e.body.index("{"):])["errors"]
            except Exception: raise e
            bad = [x.get("source", {}).get("pointer", "").split("/")[-1] for x in errs]
            bad = [b for b in bad if b in attrs]
            if not bad: raise
            for b in bad: attrs.pop(b); note(f"{kind}: skipped attribute {b} ({errs[0].get('detail', '')[:120]})")
    raise SystemExit("could not patch " + kind)


def upload_parts(ops, data):
    for op in ops:
        part = data[op["offset"]: op["offset"] + op["length"]]
        hdrs = {h["name"]: h["value"] for h in op.get("requestHeaders", [])}
        r = requests.request(op["method"], op["url"], data=part, headers=hdrs, timeout=300)
        if r.status_code >= 300:
            raise SystemExit(f"upload part failed {r.status_code} {r.text[:300]}")


def fill():
    L = json.load(open("appstore/listing-data.json", encoding="utf-8"))
    app = app_for(BUNDLE_ID)
    if not app:
        raise SystemExit("::error::No App Store Connect app with bundle id " + BUNDLE_ID)
    app_id = app["id"]
    vs, v = editable_version(app_id)
    if not v:
        raise SystemExit("::error::No editable iOS version: " + ", ".join(f"{x['attributes']['versionString']}={x['attributes'].get('appStoreState')}" for x in vs))

    # --- build: newest VALID build; the version number must match it (e.g. 1.0.3)
    bl = [b for b in builds(app_id) if b["state"] == "VALID" and not b["expired"]]
    if not bl:
        raise SystemExit("::error::No processed (VALID) build yet")
    b = bl[0]
    if v["attributes"]["versionString"] != b["version"]:
        patch("appStoreVersions", v["id"], {"versionString": b["version"]})
        note(f"Version {v['attributes']['versionString']} renamed to {b['version']} (matches the build)")
    patch("appStoreVersions", v["id"], {"copyright": L["copyright"], "releaseType": "AFTER_APPROVAL"})
    call("PATCH", f"/appStoreVersions/{v['id']}/relationships/build", {"data": {"type": "builds", "id": b["id"]}})
    note(f"Build {b['version']} ({b['build']}) attached")

    # --- app: content rights
    patch("apps", app_id, {"contentRightsDeclaration": "DOES_NOT_USE_THIRD_PARTY_CONTENT"})

    # --- app info: categories, name/subtitle/privacy url, age rating
    info = editable_appinfo(app_id)
    rels = {"primaryCategory": {"data": {"type": "appCategories", "id": "GAMES"}},
            "primarySubcategoryOne": {"data": {"type": "appCategories", "id": "GAMES_CASUAL"}},
            "primarySubcategoryTwo": {"data": {"type": "appCategories", "id": "GAMES_FAMILY"}}}
    patch("appInfos", info["id"], rels=rels)
    note("Category: Games / Casual, Family")
    for loc in call("GET", f"/appInfos/{info['id']}/appInfoLocalizations")["data"]:
        attrs = {"subtitle": L["subtitle"], "privacyPolicyUrl": L["privacyPolicyUrl"]}
        if loc["attributes"].get("name") != L["name"]:
            attrs["name"] = L["name"]
        try:
            patch("appInfoLocalizations", loc["id"], attrs)
        except AscError as e:
            if "name" in attrs and "name" in e.body:
                attrs.pop("name"); patch("appInfoLocalizations", loc["id"], attrs)
                note("App name could not be changed (kept " + str(loc["attributes"].get("name")) + ")")
            else: raise
        note(f"App info ({loc['attributes']['locale']}): subtitle + privacy policy URL")
    ar = one(f"/appInfos/{info['id']}/ageRatingDeclaration")
    if ar:
        cur = ar["attributes"]
        enums = ["alcoholTobaccoOrDrugUseOrReferences", "contests", "gamblingSimulated", "gunsOrOtherWeapons",
                 "horrorOrFearThemes", "matureOrSuggestiveThemes", "medicalOrTreatmentInformation",
                 "profanityOrCrudeHumor", "sexualContentGraphicAndNudity", "sexualContentOrNudity",
                 "violenceCartoonOrFantasy", "violenceRealistic", "violenceRealisticProlongedGraphicOrSadistic"]
        bools = ["gambling", "unrestrictedWebAccess", "lootBox", "messagingAndChat", "parentalControls",
                 "ageAssurance", "userGeneratedContent", "healthOrWellnessTopics", "seventeenPlus"]
        attrs = {k: "NONE" for k in enums if k in cur}
        attrs.update({k: False for k in bools if k in cur})
        if "advertising" in cur: attrs["advertising"] = True
        if "kidsAgeBand" in cur: attrs["kidsAgeBand"] = None
        patch_dropping_unknown("ageRatingDeclarations", ar["id"], attrs)
        note("Age rating answers filled (all None/No, advertising Yes -> 4+)")

    # --- version texts
    for loc in call("GET", f"/appStoreVersions/{v['id']}/appStoreVersionLocalizations")["data"]:
        patch("appStoreVersionLocalizations", loc["id"], {
            "description": L["description"], "keywords": L["keywords"], "promotionalText": L["promotionalText"],
            "supportUrl": L["supportUrl"], "marketingUrl": None})
        note(f"Version texts ({loc['attributes']['locale']}): description, keywords, promo text, support URL")
        # screenshots: replace the 6.9"/6.7" set
        shots = sorted(glob.glob("appstore/screenshots-6.9in/*.png"))
        sets = call("GET", f"/appStoreVersionLocalizations/{loc['id']}/appScreenshotSets")["data"]
        ss = next((s for s in sets if s["attributes"]["screenshotDisplayType"] == "APP_IPHONE_67"), None)
        if ss:
            for old in call("GET", f"/appScreenshotSets/{ss['id']}/appScreenshots")["data"]:
                call("DELETE", f"/appScreenshots/{old['id']}")
        else:
            ss = call("POST", "/appScreenshotSets", {"data": {"type": "appScreenshotSets",
                      "attributes": {"screenshotDisplayType": "APP_IPHONE_67"},
                      "relationships": {"appStoreVersionLocalization": {"data": {"type": "appStoreVersionLocalizations", "id": loc["id"]}}}}})["data"]
        ids = []
        for f in shots:
            data = open(f, "rb").read()
            s = call("POST", "/appScreenshots", {"data": {"type": "appScreenshots",
                     "attributes": {"fileName": os.path.basename(f), "fileSize": len(data)},
                     "relationships": {"appScreenshotSet": {"data": {"type": "appScreenshotSets", "id": ss["id"]}}}}})["data"]
            upload_parts(s["attributes"]["uploadOperations"], data)
            patch("appScreenshots", s["id"], {"uploaded": True, "sourceFileChecksum": hashlib.md5(data).hexdigest()})
            ids.append(s["id"])
        for _ in range(40):
            st = [call("GET", f"/appScreenshots/{i}")["data"]["attributes"].get("assetDeliveryState", {}).get("state") for i in ids]
            if all(x in ("COMPLETE", "FAILED") for x in st): break
            time.sleep(5)
        note(f"Screenshots uploaded: {len(ids)} ({', '.join(str(x) for x in st)})")
        if "FAILED" in st:
            OUT["errors"].append("Some screenshots failed processing")

    # --- review details: contact from Circus Dogs, notes, no sign-in
    c = dogs_contact()
    rd = one(f"/appStoreVersions/{v['id']}/appStoreReviewDetail")
    attrs = {"demoAccountRequired": False, "notes": open("appstore/review-notes.txt", encoding="utf-8").read().strip()}
    if c: attrs.update(c)
    else: OUT["errors"].append("No review contact found on Circus Dogs - fill App Review contact by hand")
    if rd:
        patch("appStoreReviewDetails", rd["id"], attrs)
    else:
        call("POST", "/appStoreReviewDetails", {"data": {"type": "appStoreReviewDetails", "attributes": attrs,
             "relationships": {"appStoreVersion": {"data": {"type": "appStoreVersions", "id": v["id"]}}}}})
    note("App Review info: contact " + ("copied from Circus Dogs" if c else "MISSING") + ", notes, no sign-in")

    # --- price: Free
    if not one(f"/apps/{app_id}/appPriceSchedule", ok404=True):
        pts = call("GET", f"/apps/{app_id}/appPricePoints", params={"filter[territory]": "USA", "limit": 200})["data"]
        free = next(p for p in pts if float(p["attributes"]["customerPrice"]) == 0)
        call("POST", "/appPriceSchedules", {"data": {"type": "appPriceSchedules", "relationships": {
                 "app": {"data": {"type": "apps", "id": app_id}},
                 "baseTerritory": {"data": {"type": "territories", "id": "USA"}},
                 "manualPrices": {"data": [{"type": "appPrices", "id": "${p1}"}]}}},
             "included": [{"type": "appPrices", "id": "${p1}", "attributes": {"startDate": None},
                           "relationships": {"appPricePoint": {"data": {"type": "appPricePoints", "id": free["id"]}}}}]})
        note("Price: Free")
    # --- availability: all countries
    if not one(f"/v1/apps/{app_id}/appAvailabilityV2", ok404=True):
        terr = []
        nxt = "/territories?limit=200"
        while nxt:
            d = call("GET", nxt); terr += [t["id"] for t in d["data"]]; nxt = d.get("links", {}).get("next")
        call("POST", "/v2/appAvailabilities", {"data": {"type": "appAvailabilities",
                 "attributes": {"availableInNewTerritories": True},
                 "relationships": {"app": {"data": {"type": "apps", "id": app_id}},
                                   "territoryAvailabilities": {"data": [{"type": "territoryAvailabilities", "id": "${%s}" % t} for t in terr]}}},
             "included": [{"type": "territoryAvailabilities", "id": "${%s}" % t,
                           "attributes": {"available": True, "releaseDate": None, "preOrderEnabled": False},
                           "relationships": {"territory": {"data": {"type": "territories", "id": t}}}} for t in terr]})
        note(f"Availability: all {len(terr)} countries/regions")
    return app_id, v["id"]


# ---------------------------------------------------------------- submit
def submit(app_id, version_id):
    open_subs = [s for s in call("GET", "/reviewSubmissions", params={"filter[app]": app_id, "filter[platform]": "IOS", "limit": 10})["data"]
                 if s["attributes"].get("state") in ("READY_FOR_REVIEW",)]
    sub = open_subs[0] if open_subs else call("POST", "/reviewSubmissions", {"data": {"type": "reviewSubmissions",
              "attributes": {"platform": "IOS"}, "relationships": {"app": {"data": {"type": "apps", "id": app_id}}}}})["data"]
    items = call("GET", f"/reviewSubmissions/{sub['id']}/items")["data"]
    if not items:
        call("POST", "/reviewSubmissionItems", {"data": {"type": "reviewSubmissionItems", "relationships": {
                 "reviewSubmission": {"data": {"type": "reviewSubmissions", "id": sub["id"]}},
                 "appStoreVersion": {"data": {"type": "appStoreVersions", "id": version_id}}}}})
    patch("reviewSubmissions", sub["id"], {"submitted": True})
    time.sleep(5)
    st = call("GET", f"/reviewSubmissions/{sub['id']}")["data"]["attributes"].get("state")
    v = call("GET", f"/appStoreVersions/{version_id}")["data"]["attributes"]
    note(f"SUBMITTED: review submission {st}, version {v['versionString']} {v.get('appStoreState')}")
    OUT["submitted"] = {"submissionState": st, "version": v["versionString"], "versionState": v.get("appStoreState")}


if __name__ == "__main__":
    os.makedirs("out", exist_ok=True)
    action = sys.argv[1]
    try:
        if action in ("fill", "submit"):
            ids = fill()
            if action == "submit":
                submit(*ids)
        status()
    except AscError as e:
        OUT["errors"].append(str(e)[:3000]); print("::error title=App Store Connect::" + str(e)[:900])
        try: status()
        except Exception: pass
    except SystemExit as e:
        OUT["errors"].append(str(e)); print(e)
    json.dump(OUT, open("out/status.json", "w"), indent=2, default=str)
    for n in OUT["notes"]: print("::notice::" + n)
    sys.exit(1 if OUT["errors"] else 0)
