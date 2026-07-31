#!/usr/bin/env python3
"""Fetch today's Mumbai gold rates and write assets/data/gold-rate.json.

Source: https://www.candere.com/gold-rate-today/mumbai

The page renders its rates server-side, so a plain request is enough — no
browser needed. We anchor on the dated "Last 10 Days (1g)" table because it
is per-gram, comma-free and carries its own date, which lets us verify we
read the row we think we did.

Every figure is checked before it is written: the karat rates must be the
correct purity fractions of 24K and the 24K rate must be plausible. If any
check fails the script exits non-zero and writes nothing, so a restructured
page or a garbled figure can never quietly become a wrong product price.

Usage:
    python3 scripts/fetch-gold-rate.py [--out PATH] [--from-file PATH]
"""

import argparse
import datetime
import html
import json
import os
import re
import sys
import urllib.request

URL = "https://www.candere.com/gold-rate-today/mumbai"
DEFAULT_OUT = os.path.join("assets", "data", "gold-rate.json")

# 995 fine gold against the 999 that "24K" is quoted at on retail pages.
FINENESS_995 = 995 / 999

# A karat rate must sit this close to its purity fraction of 24K.
RATIO_TOLERANCE = 0.01
PLAUSIBLE_24K = (1000, 100000)   # rupees per gram


class RateError(Exception):
    """Raised when the page cannot be trusted to give a correct rate."""


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "miro-gold-rate/1.0"})
    with urllib.request.urlopen(req, timeout=45) as response:
        return response.read().decode("utf-8", "replace")


def to_text(page):
    stripped = re.sub(r"<script.*?</script>|<style.*?</style>", " ", page, flags=re.S | re.I)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "\n", stripped)))


def extract(page):
    text = to_text(page)

    table = re.search(r"Last 10 Days \(1g\)(.{0,400})", text, re.I)
    if not table:
        raise RateError("per-gram 10-day table not found — the page structure changed")

    row = re.search(
        r"([A-Z][a-z]{2} \d{1,2}, \d{4})\s*\|?\s*"
        r"₹\s*([\d,]+)\s*\|?\s*₹\s*([\d,]+)\s*\|?\s*₹\s*([\d,]+)\s*\|?\s*₹\s*([\d,]+)",
        table.group(1),
    )
    if not row:
        raise RateError("could not read the most recent dated row")

    def number(raw):
        return float(raw.replace(",", ""))

    date = row.group(1)
    k24, k22, k18, k14 = (number(row.group(i)) for i in range(2, 6))

    if not PLAUSIBLE_24K[0] < k24 < PLAUSIBLE_24K[1]:
        raise RateError("24K rate %s is outside the plausible band %s" % (k24, PLAUSIBLE_24K))

    for label, value, purity in (("22K", k22, 22 / 24), ("18K", k18, 18 / 24), ("14K", k14, 14 / 24)):
        actual = value / k24
        if abs(actual - purity) > RATIO_TOLERANCE:
            raise RateError(
                "%s/24K is %.4f but should be about %.4f — figures look wrong"
                % (label, actual, purity)
            )

    return {
        "source": "candere.com",
        "sourceUrl": URL,
        "city": "Mumbai",
        "rateDate": date,
        "fetchedAt": datetime.datetime.now(datetime.timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z"),
        "unit": "INR per gram",
        "perGram": {
            "k24_999": round(k24, 2),
            "k24_995": round(k24 * FINENESS_995, 2),
            "k22": round(k22, 2),
            "k18": round(k18, 2),
            "k14": round(k14, 2),
        },
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default=DEFAULT_OUT, help="where to write the JSON")
    parser.add_argument("--from-file", help="parse a saved copy instead of fetching (for testing)")
    args = parser.parse_args()

    try:
        page = open(args.from_file, encoding="utf-8", errors="replace").read() if args.from_file else fetch(URL)
        data = extract(page)
    except RateError as err:
        print("gold rate NOT updated: %s" % err, file=sys.stderr)
        return 1
    except Exception as err:  # network, DNS, timeout
        print("gold rate NOT updated: could not fetch the page (%s)" % err, file=sys.stderr)
        return 1

    # Leave the file alone when the rate itself hasn't moved. `fetchedAt`
    # changes on every run, so rewriting unconditionally would produce a
    # commit — and a site rebuild — every single day for no reason.
    if os.path.exists(args.out):
        try:
            with open(args.out, encoding="utf-8") as handle:
                previous = json.load(handle)
            unchanged = (
                previous.get("rateDate") == data["rateDate"]
                and previous.get("perGram") == data["perGram"]
            )
            if unchanged:
                print("%s — unchanged at 24K ₹%s/g, leaving the file as is"
                      % (data["rateDate"], data["perGram"]["k24_999"]))
                return 0
        except (ValueError, OSError):
            pass  # unreadable previous file — fall through and rewrite it

    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, ensure_ascii=False)
        handle.write("\n")

    print("%s — 24K ₹%s/g (995 ₹%s), 18K ₹%s, 14K ₹%s" % (
        data["rateDate"], data["perGram"]["k24_999"], data["perGram"]["k24_995"],
        data["perGram"]["k18"], data["perGram"]["k14"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
