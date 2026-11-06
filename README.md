``` text
      ><>
    .-||-.                   /\_/\
   /  CAT \                 ( o.o )
  /________\                 > ^ <
  | .--.   |                /|   |\
  | |()|   |               / |   | \
  |_|__|___|              /__|___|__\
 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
                          ,--o--.   Y    /\/\/\
                       __|_______|__|___|______|__
                      |                           |
                      |                           |

                      "CAT TOOLS"
```

# Cat Tools

Tools to help with the care of our foster cats. As it stands, three tools are present. The first two are bundled into the cat*log app, the third is a separate command line tool.

These tools are:

1. [An android frontend](#1-logging-screen) to write a line of cat health/wellbeing data to a google sheet.
2. [A food amount calculator](#2-food-calculator).
3. [A command line frontend](#3-command-line-tool) to the same google sheet, for logging and reading entries from a terminal.

## Files

| Filename       |       |
|----------------|-------|
| `code.gs`      | Apps Script. Located on the actual Google sheet itself, copied here. |
| `cat_log*.aia` | The App Inventor project (import via Projects > Import project) |
| `catlog.py`    | The command line tool (Python 3, only standard library) |
| `catlog.sh`    | Shell wrapper for `catlog.py`, loads `.env`, then runs script |
| `.env.example` | Template for `.env`, only one variable, the script URL for the sheet |
| `LICENSE`      | The Unlicense (public domain) |

## 1. Logging screen

The main app screen (`Screen1`) is part of a simple logging setup. This part of the app writes timestamped entries to a Google Sheet through a Google Apps Script web app.

```text
Android app  --GET->  Apps Script web app  ->  Google Sheet
(App Inventor)        (doGet: write / read)
```

This is a very simple method of writing to a Google sheet, very useful for simple stuff like this. There are no servers, no API keys and no service accounts. The script runs as the sheet's owner, so it needs no separate authentication. Caution is still required when publishing code.

### Sheet layout

One tab representing the cat (named in `SHEET_NAME` at the top of the script, as of this publication this is set to `Vappu`), with a header row on row 1 and these columns:

| A | B | C | D | E |
|---|---|---|---|---|
| Date | Time | Tag | Message | Note |

### Backend setup

1. In a sheet set up as above, go to menu: Extensions > Apps Script, paste in the contents of `code.gs`, and set `SHEET_NAME` to the name of the desired tab to work on.
2. Each change to the code needs to be deployed: Menu: Deploy > New deployment > Web app
   - Execute as: Me
   - Who has access: Anyone
3. Authorise with Google when prompted. Google will warn the app is unverified. That is expected for your own script (Advanced > Go to project).
4. Copy the script deployment URL ending in `/exec`.

To edit the script later. Use Deploy > Manage deployments > Edit > New version, otherwise the old code stays active.

### App setup

1. Import the `.aia` into App Inventor (Projects > Import project).
2. In the Blocks for `Screen1`, find the global variable `scriptURL`. In this repo it is set to `placeholder for exec url`. Replace it with the script URL ending in `/exec`.
3. Build and install the app.

### API

Both endpoints use GET against the `/exec` URL. URL-encode all values. Both endpoints can be tested in the browser or via wget etc.

#### Write

``` text
<exec-url>?message=<text>&tag=<text>&note=<text>&reqId=<digits>
```

- `message` is required; `tag` and `note` are optional.
- Date and time are generated on the backend (using the script time zone, see notes).
- `reqId` is optional but recommended: a unique number per submission (the app sends epoch milliseconds). It took a while to realise that the Android HTTP stack can sometimes retry requests silently, this was causing duplicate rows. The script remembers each `reqId` for 5 minutes and skips repeats.
- Returns `OK`.

#### Read

``` text
<exec-url>?read=1&rows=3
```

- Returns the last `rows` entries (default 3), newest first, as JSON:
  `[{"time": "...", "tag": "...", "message": "...", "note": "..."}]`
- Returns `[]` if the sheet has no data rows.

Errors always come back as plain text starting with `ERROR:`, so the client only needs to check for that prefix.

### App Inventor notes

- Two Web components: one for writes, one for reads.
- The write response is checked for `ERROR:`; anything else counts as success.
- The read is fired a few seconds after launch by a clock timer. If the response doesn't start with `[`, the timer is re-armed to retry.
- Submission history is kept locally in TinyDB on the device. It is not synced and is not part of the `.aia`.
- The tag spinner holds a fixed list of tags. These should be the same as the list in `catlog.py` (§3).
- Layout was a challenge. Nested scroll containers in particular caused a lot of struggles in App Inventor. One major issue was ListViews falling off of the bottom of the screen or being made too small by other ListViews. This was fixed by putting ListViews directly in the arrangement with a percentage or Fill parent height rather than wrapping them in a VerticalScrollArrangement.

### Stuff to be wary of

- With "Anyone" access and no auth, *anyone* in possession of the `/exec` URL is able to write to and read from it.
- That URL is the only secret in this project. It lives in the app's `scriptURL` variable and in the command line tool's `.env`. The `.aia` here ships with a placeholder and `.env` is in `.gitignore`.
- Timestamps use the *script project's* time zone (Project Settings), not the spreadsheet's.
- Dates and times are written as strings that Sheets parses into real date/time values, so the columns need to be formatted as date or time.

## 2. Food calculator

A second screen (`screenCalc`) that works out how much wet and dry food to give in a day, given a target cat weight and how much wet food has already been decided on.
It is stand-alone, offline and requires nothing more than the app to be running. It contains a Web component, but this is only used for its JSON decoder.

### Usage

1. Enter a target weight (in kg) into the text box.
2. Pick a wet food brand and how much of a tin to give, in sixteenths:
   Buttons for 0, 1/8, 1/4, 1/2, 3/4, 1/1 of a tin are provided, or `-` / `+` to step by 1/16.
3. Pick a dry food brand and press Calculate.

The app calculates:

```text
wetDaily   = daily grams of the wet food at the target weight
wetGrams   = (sixteenths / 16) * package_g
fraction   = wetGrams / wetDaily            (capped at 1)
dryAmount  = (1 - fraction) * dryDaily      (dryDaily = daily grams of the dry food)
```

App outputs (example):

```text
Wet: 21 g (50% of 42 g)
Dry: 18 g
```

The app informs if the chosen wet amount exceeds the daily allowance.

### Daily amounts (`foodForWeight`)

Each food has a feeding guide: a list of `[weight, grams per day]` points. The amount for any weight is found by linear interpolation between two surrounding points, and extrapolated from the nearest two points if the weight falls outside the guide.

### Food data (`foods.json`)

Foods live in a `foods.json` asset (illustrative example below), read by a File component at startup (`//foods.json`) and decoded into a list of dictionaries. Changing the food list means editing the asset and rebuilding the app. Not really a problem for personal use.

```json
[
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
```

| Field       | Meaning |
|-------------|---------|
| `name`      | Shown in a spinner object |
| `type`      | `"wet"` or `"dry"`. Defaults to dry if missing |
| `package_g` | Grams per tin (wet foods only, used for the sixteenths calculation) |
| `points`    | Manufacturer provided feeding guide: `[weight_kg, grams_per_day]` pairs, in ascending weight order |

The `foods.json` inside the `.aia` is not the example above. It holds the manufacturers' published feeding guide figures for the foods we use. The diets our cats are on are prescribed by our vet as our cats have special needs, nothing here is to be taken as cat care advice.

### Errors

Problems show in the result labels as `ERROR:` plus a short reason.

### Rough edges

These are the rough edges I have noticed, no doubt there are more. I am not too concerned for a personal use app.

- A hidden debug label (`DEBUGLABELREMOVELATER`) is still in the layout and is written to by `foodForWeight`. An omission when building the last version.
- The target weight box defaults to a fixed value of 2.75 kg. Probably would be better to save that and fetch it when needed.

## 3. Command line tool

A command line frontend (`catlog`) for the same Google Sheet, better when sitting at a desk than a phone would be. It works with the same Apps Script as the Android app does, so entries from both end up in the same place. It is written in Python 3.7 using only the standard library. There is nothing to install, no virtual environment and no keys or credentials.

```text
catlog (terminal)  --GET->  Apps Script web app  ->  Google Sheet
(catlog.py)                 (same one the app uses)
```

### Setup

1. Set up the backend as with §1.
2. Copy `.env.example` to `.env` and set `CATLOG_URL` to your deployment URL ending in `/exec`.
3. Make the scripts executable: `chmod +x catlog.py catlog.sh`.

The wrapper (`catlog.sh`) changes into the directory holding the project, loads `.env` and runs `catlog.py` with whatever arguments it was given. As it stands, `DIR` is hard-coded, so edit it to wherever you keep the files. Without the wrapper, load the variable yourself (`source .env`) and run `./catlog.py` directly.

### Usage

```text
catlog add <message> [-t TAG] [-n NOTE] [-l X]
catlog show [X]
```

| Command / option    | Meaning |
|---------------------|---------|
| `add <message>`     | Add an entry. Message is required (surround in quotes if it has spaces). |
| `-t`, `--tag TAG`   | Entry tag. One of `food`, `medication`, `weight`, `puke`, `behaviour`, `action`, `event`. Optional. |
| `-n`, `--note NOTE` | Entry note. Optional. |
| `-l`, `--logged X`  | After adding, also show the X most recent entries (including the one just added). Optional. |
| `show [X]`          | Show the X most recent entries, newest first. Defaults to 3. |

X must be a whole number of 1 or more.

Examples:

```text
catlog add "1/2 tin of wet food" -t food -n "Slightly wetted"
catlog add PUKE -t puke -n "Mostly wet food, food smell" -l 5
catlog show 4
```

Output of `show` (example):

```text
Fetched 4 previous entries.
   Date    |   Time   |    Tag     |             Entry       |    Note
05/11/2026 | 19:40:12 | puke       | PUKE                    | Mostly wet food, food smell
05/11/2026 | 10:17:31 | food       | 1/2 tin of wet food     | Slightly wetted
05/11/2026 | 08:05:31 | medication | 1 tablet                |
04/11/2026 | 21:15:03 | puke       | Small, after breakfast  |
```

Date and time come from the backend, so entries match those written by the app. Each write also carries a `reqId` (epoch milliseconds), the same as the app sends.

### Errors

Every failure goes through one function (`fail()`): a message on stderr starting with `cat*log error:` and exit status 1. This covers HTTP errors, network failures and timeouts (20 seconds), `ERROR:` replies from the Apps Script, responses that are not what was expected (such as an HTML page from a misconfigured deployment) and a missing `CATLOG_URL`. Mistakes in the command itself are reported by argparse with the usage text and exit status 2.

### Rough edges

- `CATLOG_URL` is the same secret as in §1. Keep `.env` out of git.
- The tag list is only enforced by the command line tool (`choices` in `build_parser()`), the Apps Script accepts any tag. The list is duplicated in the app's tag spinner, keep the same tags in both.
- When showing logged events, the entry column is padded to 30 characters. Longer messages are not truncated but push the note column out of line.
- Errors from the Apps Script keep their own prefix, so they read `cat*log error: ERROR: ...` in the terminal.
