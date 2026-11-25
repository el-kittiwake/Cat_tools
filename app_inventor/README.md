# Android app (App Inventor)

An MIT App Inventor app for Androud, containing two screens:

| Screen       | Job |
|--------------|-----|
| `Screen1`    | Log entries (food, medication, weight etc.) to the Google Sheet |
| `screenCalc` | Daily food calculator: a wet amount given as a fraction of a tin, topped up with dry |

The project is plain MIT App Inventor: blocks and layouts, no extensions and nothing to build locally. It was last built with App Inventor `nb207a`.

```text
 phone
+-------------------------+   HTTPS GET    +---------------------+
| Screen1                 |--------------->| Apps Script web app |
|   logging, recents      |<---------------|   (see apps_script) |
|   local list (TinyDB)   |  "OK" / JSON   +---------------------+
+-------------------------+
| screenCalc   (offline)  |
|   assets/foods.json     |
+-------------------------+
```

## Files

| Path                 | What |
|----------------------|------|
| `cat_log.aia`        | The App Inventor project |
| `media/foods.json`   | The prebuilt feeding charts, as included in the `.aia` |
| `media/mouselog.jpg` | The app icon |

A `.aia` is a zip of the screens (`.scm` layouts and `.bky` blocks) plus the media files.

## Getting it running

Requires an Android phone, an App Inventor account and a working [backend](../apps_script/README.md).

1. In App Inventor choose *Projects, Import project (.aia) from my computer* and pick `cat_log.aia`.
2. Install it: *Build, Android App (.apk)*.
3. On first launch the app asks for the script URL. Paste the `/exec` URL from the backend. You can change it later with **Set URL**.

> **The `/exec` URL is essentially a password.** It is stored on the phone only, not in the project. Anyone who has it can write to and read the sheet.

Clearing the app's data in Android settings wipes everything it stores, including the URL.

## Logging (Screen1)

```text
+--------------------------------------------+
| [tag spinner v]              [Food calc]   |
| [ log text ............... ] [Add log]     |
| [ optional note .......... ] [Set URL]     |
| [Reuse item]  [Delete item]  [Clear list]  |
| Last Status:  <status>                     |
| Most recent spreadsheet entries:           |
|   (latest rows from the sheet)             |
| Most recent cat*logged entries:            |
|   (this phone's local list)                |
+--------------------------------------------+
```

Pick a tag, add a message, add a note if desired, and press **Add log**. The tags are `food`, `medication`, `weight`, `puke`, `behaviour`, `action` and `event`. Ideally they should be kept in step with the list in `cli/catlog.py`.

### Status line

| Status                             | Meaning |
|------------------------------------|---------|
| `Pending`                          | Request sent |
| `Success (Code: 200)`              | The script answered normally |
| `Possible failure`              | Bad response, or an error from the script |
| `Possible failure: timed out` | No answer within 10 seconds. Check the sheet before retrying. |
| `Failed: connection problem`       | Couldn't reach the script |
| `Ready`                            | Shown at start up |
| `URL saved`, `Enter message first` | Self-explanatory |

Saying "possible" is a deliberate design choice. The app can't be certain, and a timeout doesn't mean the row wasn't written.

### The two lists

- **Most recent spreadsheet entries:** the ten latest rows from the sheet, newest first. They load a few seconds after launch and refresh after adding an entry. If a read fails, the app retries three times and then marks the heading "not refreshed".
- **Most recent cat\*logged entries:** what *the phone* has entered, newest first. It is kept to make reusing entries easy, and it doesn't sync with the other phone or the sheet.

Select an item in either list and press:

- **Reuse item** to copy its tag, message and note into the boxes. It doesn't send anything.
- **Delete item** to remove it from the local list, after a confirmation. This never touches the sheet.
- **Clear list** to empty the local list, after a confirmation.

An entry is saved to the local list before the request goes out, so a failed send never loses your text. An identical repeat goes to the Google sheet every time but appears once in the local list.

Message and note text is URL-encoded before sending, so `&`, `#`, `+` and `%` are safe.

## Food calculator (screenCalc)

Opened from the **Food calc** button on `Screen1`, and closed with Back. It works fully offline.

The vet-diet charts give a daily amount in grams for each weight. The app takes a wet amount, as a fraction of a tin, and tops up with dry:

```text
wetDaily  = chart value for the weight, wet food        (g/day)
dryDaily  = chart value for the weight, dry food        (g/day)
wetGrams  = tinFraction * package_g                     (g given as wet)
fraction  = min( wetGrams / wetDaily , 1 )              (share of the day covered)
dryAmount = (1 - fraction) * dryDaily                   (g of dry to add)
```

The result reads like:

- `Wet: 78 g (50% of 156 g daily allowance)`
- `Wet: 200 g (over daily allowance of: 156 g)`, if more than the daily allowance is entered
- `Dry: 62 g`, or `Dry: none needed`

The tin fraction goes in sixteenths, from 0 up to 4 whole tins, using the `-` / `+` buttons (1/16 steps), the `-1 tin` / `+1 tin` buttons, or the quick-select buttons (0, 1/8, 1/4, 1/2, 3/4, 1).

Between chart points the app interpolates linearly. It never extrapolates: a weight outside the chart gives "Weight out of range" rather than a guess. Weight, food choices and the tin fraction are remembered between visits.

### foods.json

```json
{
    "version": 1,
    "foods": [
        {
            "name": "Example wet food",
            "type": "wet",
            "package_g": 85,
            "points": [[2, 105], [3, 140]]
        },
        {
            "name": "Example dry food",
            "points": [[2, 30], [3, 40]]
        }
    ]
}
```

| Field       | Meaning |
|-------------|---------|
| `version`   | A whole number. Increase on revision. |
| `name`      | Shown in the spinner. Required |
| `type`      | `wet` or `dry`. Missing means dry |
| `package_g` | Tin or pouch size in grams. Required and above 0 for wet, `null` for dry |
| `points`    | `[weightKg, gramsPerDay]` pairs, in ascending weight order, at least two |

The figures in the repo are the food manufacturers' feeding guides for one cat. They are not veterinary advice.

### Changing the food list

- In the app press **Update foods** and pick a newer file from the phone. It is accepted only if it is valid and its `version` is higher than the one in use.
- The **Reset** button drops an imported file and goes back to the built-in list.
- In App Inventor edit `media/foods.json`, increase `version`, upload it over the old one in App Inventor's Media panel, and rebuild. A phone with an imported file that has a higher version keeps it until you press **Reset**.

The app checks the shape of the file, not its contents. It doesn't check weight ordering or duplicate names, and a file that isn't JSON at all will show an App Inventor error.

## What the app stores

Everything stays on the phone, in App Inventor's `TinyDB`, unencrypted.

| Screen       | Namespace  | Keys |
|--------------|------------|------|
| `Screen1`    | `TinyDB1`  | `scriptUrl`, `catlogEntries` (local list) |
| `screenCalc` | `foodCalc` | `weight`, `wetFood`, `dryFood`, `sixteenths`, `foodsJson` |

## Known quirks

- A write that times out may still have reached the sheet. Check before resending.
- If a write fails, the entry is in the local list but the boxes are already cleared. Use **Reuse item**, then **Add log**.
- The number of rows shown from the Google sheet are a hard-coded value in the app. Changing that means editing the read URL in the App Inventor blocks.
