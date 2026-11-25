// Which sheet tab to read/write.
const SHEET_NAME = "Vappu";

function doGet(e) {
  // Entry point for all GET requests.
  // Apps Script only allows one doGet per script, so this sends request to
  // the right handler based on which query parameter is present, rather
  // than an explicit ?action=.
  if (e.parameter.message !== undefined) {
    return handleWrite(e);
  } else if (e.parameter.read !== undefined) {
    return handleRead(e);
  } else {
    // Neither parameter present: malformed request.
    return errorResponse("missing 'message' or 'read' parameter");
  }
}

function handleWrite(e) {
  try {
    // Deduplication Guard
    // The Android HTTP stack (used by App Inventor) can silently retry 
    // requests if connection issues occur while following Google's 302 redirects.
    // This can cause doGet/doPost to fire multiple times on a single button press.
    //
    // reqId is a unique timestamp sent by App Inventor (Clock1.GetMillis).
    // Use CacheService to store seen reqIds for 5 minutes. If a duplicate 
    // reqId arrives, skip writing to the sheet and immediately return "OK".
    const reqId = e.parameter.reqId;
    const cache = CacheService.getScriptCache();

    if (reqId) {
      if (cache.get(reqId) !== null) {
        // Already added, this is a retry of the same button press.
        return ContentService
          .createTextOutput("OK")
          .setMimeType(ContentService.MimeType.TEXT);
      }
      // Mark this reqId as seen.
      // 300s (5 min) expiration time is comfortably longer than the
      // retry window, short enough not to matter for cache limits.
      cache.put(reqId, "1", 300);
    }
    // If reqId is absent (most likely a test request),
    // this falls through to a normal, unconditional write below.

    // Grab the target sheet by tab name. This must match exactly, case-sensitive.
    // getActiveSpreadsheet() works because this script is part of the sheet itself
    // (created by: Extensions > Apps Script).
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

    // Guard against the tab being renamed/deleted.
    // Without this, sheet.appendRow() throws Apps Script's own generic
    // error page. Which is not a clean, app-readable message.
    if (!sheet) {
      return errorResponse("sheet '" + SHEET_NAME + "' not found");
    }

    // Capture the request time server-side.
    // While we do send reqId which is the time of button press, it is
    // safer and less messy to let the server time be a consistent source
    // of time in case of client side time issues.
    const now = new Date();

    // Use the script's timezone rather than hardcoding one.
    // Easier this way (eg. Finland: EET/EEST).
    const tz = Session.getScriptTimeZone();

    const date = Utilities.formatDate(now, tz, "dd/MM/yyyy");
    const time = Utilities.formatDate(now, tz, "HH:mm:ss");

    // e.parameter.<name> reads a query string parameter.
    // The `|| ""` allows an absent parameter to be recorded as an empty
    // string instead of `undefined`, keeping appendRow() clean.
    const message = e.parameter.message || "";
    const tag     = e.parameter.tag || "";
    const note    = e.parameter.note || "";

    // Column order here must match the sheet's existing layout:
    // date, time, tag, message, note
    sheet.appendRow([date, time, tag, message, note]);

    // Response body returned to whatever called this.
    // App Inventor's Web1.Get() can read this back to confirm success.
    return ContentService
      .createTextOutput("OK")
      .setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    // Catches anything not caught above. Such as quotas, API updates, etc.
    // Without this, unhandled failures would end up received by the app as
    // generic errors rather than a string it can detect and show to the user.
    return errorResponse(err.message);
  }
}

function handleRead(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

    if (!sheet) {
      return errorResponse("sheet '" + SHEET_NAME + "' not found");
    }

    // ?rows=N tells how many entries to return: default 3 if absent or invalid.
    const requested = parseInt(e.parameter.rows, 10);
    const n = isNaN(requested) ? 3 : requested;

    // Gets the last row with content
    const lastRow = sheet.getLastRow();

    // Row 1 is the header, so if lastRow is 1 or 0 there's no data yet.
    // getRange() throws if asked for a height of 0 or less.
    if (lastRow < 2) {
      return ContentService
        .createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Clamp startRow to row 2 so a large N never reaches back into the header.
    // Returns fewer than N rows near the top of the sheet rather than erroring.
    const startRow = Math.max(2, lastRow - n + 1);
    const numRows = lastRow - startRow + 1;

    // Cols A:E - date, time, tag, message, note.
    // row[0]=date, row[1]=time, row[2]]=tag, row[3]=message, row[4]=note.
    // getDisplayValues() returns the string as shown in the cell.
    // getValues() returns the value stores under the covers.
    const rows = sheet.getRange(startRow, 1, numRows, 5).getDisplayValues();

    // getDisplayValues() returns oldest-first (sheet order); reverse for
    // newest-first display in the app.
    const result = rows.reverse().map(function (row) {
      return { date: row[0], time: row[1], tag: row[2], message: row[3], note: row[4] };
    });

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return errorResponse(err.message);
  }
}

// Single function to defines the error response.
// Every failure in the script roduces the same "ERROR: ..." prefix.
// App Inventor can then check for that prefix regardless of which request
// type or failure caused it.
function errorResponse(detail) {
  return ContentService
    .createTextOutput("ERROR: " + detail)
    .setMimeType(ContentService.MimeType.TEXT);
}
