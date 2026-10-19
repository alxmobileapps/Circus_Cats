"""Puts the App Review notes and the screen recording on the editable iOS version
in App Store Connect (App Review Information -> Notes + Attachment).

Usage: python scripts/appstore-review.py <recording.mp4> <notes.txt>
Env:   APPSTORE_KEY_ID, APPSTORE_ISSUER_ID, ASC_KEY_PATH (cleaned .p8 file)
Does not submit anything for review.
"""
import hashlib, os, sys, time
import jwt, requests

API = "https://api.appstoreconnect.apple.com/v1"
BUNDLE_ID = "com.alxmobileapps.circuscats"
EDITABLE = {"PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "REJECTED", "METADATA_REJECTED",
            "INVALID_BINARY", "WAITING_FOR_REVIEW"}


def token():
    now = int(time.time())
    return jwt.encode({"iss": os.environ["APPSTORE_ISSUER_ID"], "iat": now, "exp": now + 1100,
                       "aud": "appstoreconnect-v1"}, open(os.environ["ASC_KEY_PATH"]).read(),
                      algorithm="ES256", headers={"kid": os.environ["APPSTORE_KEY_ID"], "typ": "JWT"})


def call(method, path, body=None, params=None):
    url = path if path.startswith("http") else API + path
    r = requests.request(method, url, json=body, params=params, timeout=120,
                         headers={"Authorization": "Bearer " + token(), "Content-Type": "application/json"})
    if r.status_code >= 300:
        sys.exit(f"::error title=App Store Connect::{method} {path} -> {r.status_code}: {r.text[:500]}")
    return r.json() if r.content else {}


def main(video, notes_file):
    notes = open(notes_file, encoding="utf-8").read().strip()
    app = call("GET", "/apps", params={"filter[bundleId]": BUNDLE_ID})["data"][0]
    versions = call("GET", f"/apps/{app['id']}/appStoreVersions",
                    params={"filter[platform]": "IOS", "limit": 20})["data"]
    v = next((x for x in versions if x["attributes"].get("appStoreState") in EDITABLE), None)
    if not v:
        sys.exit("::error::No editable iOS version found: " +
                 ", ".join(f"{x['attributes']['versionString']}={x['attributes'].get('appStoreState')}" for x in versions))
    print("Version", v["attributes"]["versionString"], v["attributes"].get("appStoreState"))

    rd = call("GET", f"/appStoreVersions/{v['id']}/appStoreReviewDetail").get("data")
    if rd:
        call("PATCH", f"/appStoreReviewDetails/{rd['id']}",
             {"data": {"type": "appStoreReviewDetails", "id": rd["id"], "attributes": {"notes": notes}}})
    else:
        rd = call("POST", "/appStoreReviewDetails", {"data": {"type": "appStoreReviewDetails",
                  "attributes": {"notes": notes},
                  "relationships": {"appStoreVersion": {"data": {"type": "appStoreVersions", "id": v["id"]}}}}})["data"]
    print("Notes updated (%d characters)" % len(notes))

    # replace any earlier attachments
    for a in call("GET", f"/appStoreReviewDetails/{rd['id']}/appStoreReviewAttachments").get("data", []):
        call("DELETE", f"/appStoreReviewAttachments/{a['id']}")
        print("Removed old attachment", a["attributes"].get("fileName"))

    data = open(video, "rb").read()
    name = os.path.basename(video)
    att = call("POST", "/appStoreReviewAttachments", {"data": {"type": "appStoreReviewAttachments",
               "attributes": {"fileName": name, "fileSize": len(data)},
               "relationships": {"appStoreReviewDetail": {"data": {"type": "appStoreReviewDetails", "id": rd["id"]}}}}})["data"]
    for op in att["attributes"]["uploadOperations"]:
        part = data[op["offset"]: op["offset"] + op["length"]]
        hdrs = {h["name"]: h["value"] for h in op.get("requestHeaders", [])}
        r = requests.request(op["method"], op["url"], data=part, headers=hdrs, timeout=300)
        if r.status_code >= 300:
            sys.exit(f"::error::Attachment upload part failed: {r.status_code} {r.text[:300]}")
    call("PATCH", f"/appStoreReviewAttachments/{att['id']}", {"data": {"type": "appStoreReviewAttachments",
         "id": att["id"], "attributes": {"uploaded": True, "sourceFileChecksum": hashlib.md5(data).hexdigest()}}})
    for _ in range(20):
        st = call("GET", f"/appStoreReviewAttachments/{att['id']}")["data"]["attributes"].get("assetDeliveryState", {})
        if st.get("state") in ("COMPLETE", "FAILED"):
            break
        time.sleep(5)
    print("Attachment", name, len(data), "bytes, state:", st)
    if st.get("state") == "FAILED":
        sys.exit("::error::Attachment processing failed: %s" % st)
    print(f"::notice title=App Review::Notes + {name} added to version {v['attributes']['versionString']}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
