# catlog: command line tool

`catlog.py` logs entries to the Google sheet from a terminal, and shows the latest entries if desired. It talks to the [Apps Script backend](../apps_script/README.md).

- Python 3.9 or newer (it uses `str.removeprefix`).
- Standard library only, so there is nothing to `pip install`.
- Works on Linux (and probably macOS and Windows).

## Setup

1. A Google sheet and deployed apps script is needed, from this the `/exec` URL is the key to using the tool.
2. Copy `.env.example` to `.env`, and in the same directory place `catlog.py`, and set the URL:

    ```text
    CATLOG_URL=https://script.google.com/macros/s/.../exec
    ```

3. Try it:

    ```text
    ./catlog.py show              # Linux after chmod +x catlog.py
    py catlog.py show             # Windows
    ```

`catlog.py` reads `.env` itself, from the same directory. If an environment variable called `CATLOG_URL` already exists it takes priority over the file.

> **The `/exec` URL is essentially a password.** Anyone who has it can write to and read the sheet. `.env` is in `.gitignore` and should not be shared.

## Usage

```text
catlog add MESSAGE [-t TAG] [-n NOTE] [-l X]
catlog show [X]
```

### add

| Argument           | Meaning |
|--------------------|---------|
| `MESSAGE`          | The entry text. Required, and should be first. Quote it if it has spaces |
| `-t`, `--tag`      | One of `food`, `medication`, `weight`, `puke`, `behaviour`, `action`, `event` |
| `-n`, `--note`     | Optional detail text |
| `-l`, `--logged X` | If desired, will show the last X entries, including the just added entry |

```text
$ catlog add "1/2 tin of wet food" -t food -n "Slightly wetted"
Write success.
Added message: 1/2 tin of wet food
       tagged: food
         note: Slightly wetted
```

`-t` and `-n` can come in either order. Tag and note are both optional. Tag is a good idea though, as it helps to filter the sheet when needed.

### show

`show` fetches the latest X entries (default 3, and X must be at least 1):

```text
$ catlog show 2
Fetched 2 previous entries.
   Date    |   Time   |    Tag     |          Entry          |    Note
05/11/2026 | 11:40:12 | puke       | PUKE                    | Mostly wet food, food smell
05/11/2026 | 10:17:31 | food       | 1/2 tin of wet food     | Slightly wetted
```

Dates and times are formatted by the script. Entries are shown newest first.

## Launchers

The launchers allow running `catlog` from anywhere.

### Linux

The simplest way is a symlink:

```text
chmod +x catlog.py
ln -s "$PWD/catlog.py" ~/.local/bin/catlog    # chosen directory for link
```

`catlog.sh` acts as a wrapper: it changes into the project directory and runs `catlog.py` with the arguments it was given. `DIR` inside the script must be the location of `catlog.py` and `.env`. Make the script executable and put it on the PATH as `catlog`.

### Windows (not thoroughly tested)

The other user of this script uses Windows. I have minimal Windows experience so the following is considered wobbly. AI tools were used to write most of this, and to the best of my ability I confirmed it was sound. It works as far as the Windows user can tell.

1. Install Python 3.9 or newer from python.org. During setup select "Add python.exe to PATH" (or similar), or rely on the `py` launcher that the installer provides.
2. Create `.env` from a terminal with `copy .env.example .env`, then edit it.
3. Run it with `py catlog.py show`. If `py` isn't found, try `python`.
4. For a short `catlog` command, use `catlog.bat`. It runs `catlog.py` from its own directory, using `py` if available and `python` otherwise, so keep the two together with `.env` beside them. Add that directory to your user PATH: Start, search "environment variables", "Edit environment variables for your account", select `Path`, Edit, New. Open a new terminal and `catlog show` works from anywhere. No admin rights are needed.

Quoting differs by shell:

- **cmd.exe:** only double quotes group words. Single quotes are literal.
- **PowerShell:** single quotes are literal. Double quotes expand `$variables`.
- `&`, `^` and `%` inside a message can misbehave in cmd.exe. Windows Terminal with PowerShell is smoother.
- If non-ASCII text (Finnish letters, emoji) comes out garbled, try Windows Terminal or `set PYTHONUTF8=1`.

## Errors

Failures print one line to stderr and exit with status 1. They start with `cat*log error:`.

| Message | Meaning |
|---------|---------|
| `CATLOG_URL not set (checked the environment and .env next to catlog.py)` | An `/exec` URL was not found. Check `.env` is in the same directory as the script (and isn't called `.env.txt` on Windows) |
| `HTTP: <code>`      | The request to Google failed |
| `network: <reason>` | Tool couldn't reach the script (offline etc.) |
| `system: <detail>`  | Operating system error |
| `unexpected response: <text>` | The script answered with something the tool didn't understand |
| `ERROR: ...`        | The script reported a problem. It keeps its own prefix, so it reads `cat*log error: ERROR: ...` |

Mistakes in the command itself are reported by `argparse`, with a usage line.

## Known quirks

- **Timeout isn't necessarily a failure.** Requests time out after 20 seconds, and the row may still have been written. Run `catlog show` before attempting to add again.
- **The `show` entry column is padded to 30 characters.** Longer messages aren't truncated, but they push the note column out of line.
- **The `.env` reader is minimal:** It can only handle `KEY=value` lines, an optional `export `, optional quotes around the value, and `#` comment lines. Comments at the end of a line and multi-line values aren't supported.
