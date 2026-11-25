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

Tools to help with the care of our foster cats.

As it stands, three tools are present. The first two are bundled into the cat_log app-inventor app, the third is a separate command line python script (catlog.py). These are facilitated by a Google apps script.

These tools collectively perform these two things:

1. **Log events** (food, medication, weight, puke, notable behaviour) to a Google Sheet, so the vet or adoption agency gets dates and numbers instead of "um, I think maybe Tuesday ish?".
2. **Work out the daily food**: how much dry food completes a cat's daily allowance after choosing a certain fraction of a tin of wet food.

It is a personal project that runs on two phones and two computers. It is tidy enough to share. However, it comes with no support, roadmap, or logo that isn't a weasel.

This documentation is mostly an aide for my memory and project log.

## How the parts fit together

```text
                                               Google
 +----------------------+                      +--------------------+
 | cat_log app          |---- HTTPS GET ------>|  Apps Script       |     +--------------+
 | (App Inventor)       |<--- "OK" / JSON -----|  web app (doGet)   |<--->| Google Sheet |
 +----------------------+                      |                    |     +--------------+
                                               |                    |
 +----------------------+                      |                    |
 | catlog.py            |---- HTTPS GET ------>|                    |
 | (terminal)           |<--- "OK" / JSON -----|                    |
 +----------------------+                      +--------------------+
```

The Apps Script is the only thing that accesses the sheet. Both clients just make GET requests to its `/exec` URL. The food calculator never goes near the network.

## Parts of the project

| Folder          | What | Details |
|-----------------|------|---------|
| `apps_script/`  | The Google Apps Script backend that reads and writes to/from the sheet | [README](apps_script/README.md) |
| `app_inventor/` | The Android app: logging screen and food calculator | [README](app_inventor/README.md) |
| `cli/`          | `catlog.py`, the same logging facility from a terminal, with launchers for Linux and Windows | [README](cli/README.md) |

## Getting it running

Requires a Google account, and then whichever client needed for the system it operates from.

1. **Backend.** A google sheet with the apps script deployed is required before any of the tools will work. An `/exec` URL is the key to the whole shebang.
2. **Phone.** Import `app_inventor/cat_log.aia` into App Inventor, build and install it, then paste the `/exec` URL when the app asks.
3. **Terminal.** Copy `cli/.env.example` to `.env` in a desired directory, copy the `/exec` URL into it, and run `catlog.py show` from the same directory.

## Known quirks

- **The `/exec` URL is SECRET.** There is no authentication. Anyone who has the URL can add rows to the sheet and read submitted rows. `.env` is in `.gitignore` for that reason.
- **Tags.** The CLI enforces them (`choices` in `catlog.py`) and the app lists them in a spinner. The script ultimately accepts any tag.
- **The feeding charts aren't veterinary advice.** `foods.json` holds figures for one cat's vet-approved foods. The app does arithmetic on them and that is all.

## AI usage

I use AI tools for code review, rubberducking and helping to write READMEs.

## Licence

There is nothing proprietary or special here. It is licensed under [The Unlicense](LICENSE).
