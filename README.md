
``` text
      ><
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

Tools to help with the care of our foster cats. As it stands, two tools are present, bundled into the cat*log app.

These tools are:

1. An android frontend to write a line of cat health/wellbeing data to a google sheet.
2. A food mass calculator.

The focus of this README is tool 1, a simple two-person logging setup. Consisting of an Android app (created using MIT App Inventor) that writes timestamped entries to a Google Sheet through a Google Apps Script web app.

``` text
Android app  --GET->  Apps Script web app  ->  Google Sheet
(App Inventor)        (doGet: write / read)
```

This is a very simple method and very useful for simle stuff like this. There are no servers, no API keys and no service accounts. The script runs as the sheet's owner, so it needs no separate authentication. Caution is still required when publishing code.

## Files

| Filename |       |
|----------|-------|
| `code.gs`        | Apps Script. Located on the actual sheet itself, copied here. |
| `cat_log*.aia`   | The App Inventor project (import via Projects > Import project) |

## Sheet layout

One tab representing the cat (named in `SHEET_NAME` at the top of the script, as of this publication this is set to `Vappu`), with a header row in row 1 and these columns:

| A | B | C | D | E |
|---|---|---|---|---|
| Date | Time | Tag | Message | Note |

## Backend setup

1. In a sheet set up as above, go to menu: Extensions > Apps Script, paste in the contents of `code.gs`, and set `SHEET_NAME` to the name of the desired tab to work on.
2. Each change to the code needs to be deployed: Menu: Deploy > New deployment > Web app
   - Execute as: Me
   - Who has access: Anyone
3. Authorise with Google when prompted. Google will warn the app is unverified. That is expected for your own script (Advanced > Go to project).
4. Copy the deployment URL ending in `/exec`.

> To edit the script later. Use Deploy > Manage deployments > Edit > New version, otherwise the old code stays active.

## API

Both endpoints use GET against the `/exec` URL. URL-encode all values. Both endpoints can be tested in the browser or via wget etc.

### Write

``` text
<exec-url>?message=<text>&tag=<text>&note=<text>&reqId=<digits>
```

- `message` is required; `tag` and `note` are optional.
- Date and time are generated on the backend (using the script time zone, see notes).
- `reqId` is optional but recommended: a unique number per submission (the app sends epoch milliseconds). It was realised that the Android HTTP stack can sometimes retry requests silently, this was causing duplicate rows. The script remembers each `reqId` for 5 minutes and skips repeats.
- Returns `OK`.

### Read

``` text
<exec-url>?read=1&rows=3
```

- Returns the last `rows` entries (default 3), newest first, as JSON:
  `[{"time": "...", "tag": "...", "message": "...", "note": "..."}]`
- Returns `[]` if the sheet has no data rows.

Errors always come back as plain text starting with `ERROR:`, so the client only needs to check for that prefix.

## App Inventor notes

- Two Web components: one for writes, one for reads.
- The write response is checked for `ERROR:`; anything else counts as success.
- The read is fired a few seconds after launch by a clock timer. If the response doesn't start with `[`, the timer is re-armed to retry.
- Submission history is kept locally in TinyDB on the device. It is not synced and is not part of the `.aia`.
- Layout was a challenge. Nested scroll containers in particular caused a lot of struggles in App Inventor. One major issue was ListViews falling off of the bottom of the screen or being made too small by other ListViews. This was fixed by putting ListViews directly in the arrangement with a percentage or Fill parent height rather than wrapping them in a VerticalScrollArrangement.

## Stuff to be wary of

- With "Anyone" access and no auth, *anyone* in possession of the `/exec` URL is able to write to and read from it.
- Timestamps use the *script project's* time zone (Project Settings), not the spreadsheet's.
- Dates and times are written as strings that Sheets parses into real date/time values, so the columns need to be formatted as date or time.
