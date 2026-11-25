# Apps Script backend

A Google Apps Script, bound to the sheet and deployed as a web app. It is the only thing that accesses the spreadsheet. The app and the command line tool are both clients that make GET requests to the script.

```text
 +--------+                               +----------+
 | client | -- GET /exec?message=... ---> | doGet(e) | --> handleWrite --> append row --> "OK"
 |        | -- GET /exec?read=1&rows=n -> |          | --> handleRead  --> last n rows --> JSON
 +--------+                               +----------+
```

## Setup

1. A Google Sheets Workbook with a named sheet and a header row (setup as below):

    ```text
    Date | Time | Tag | Message | Note
    ```

2. Add the contents of [`code.gs`](code.gs) to an Apps Script, accessed through the Extensions menu.
3. Change the `SHEET_NAME` constant at the top of the script to the relevant sheet name.
4. Set the timezone in Apps Script project settings.
5. Make a new web app deployment (Deploy button). Executing as **Me** and accessible by **Anyone**. Copy the URL ending in `/exec`.
6. Test it in a browser: `</exec URL>?read=1&rows=3`. Should return `[]` for an empty sheet, or a JSON list of rows.

"Anyone" is required for the app and the command line to be able to reach the script without a Google sign-in token. This is why the URL has to be kept secret (see [Security](#security)).

### If the script is edited

This new version of the script needs to be deployed: Manage deployments, Edit, make as a new version, Deploy. The URL stays the same.

## The interface

All requests are GET. The script tells them apart by which parameter is present.

### Write

```text
?message=<text>[&tag=<text>][&note=<text>][&reqId=<digits>]
```

| Parameter | Required | Meaning |
|-----------|----------|---------|
| `message` | yes      | The entry itself |
| `tag`     | no       | Category |
| `note`    | no       | Detail |
| `reqId`   | no       | Unique ID per request (the app and CLI send the time in milliseconds). See [Duplicate protection](#duplicate-protection) |

Values must be URL-encoded. The date and time are added by the script. Each write appends one row in the order `date, time, tag, message, note`.

Response: `OK`.

### Read

```text
?read=1[&rows=<n>]
```

Response: a JSON array, newest first, with one object per row:

```json
[
    {
        "date": "05/11/2026",
        "time": "10:17:31",
        "tag": "food",
        "message": "1/2 tin of wet food",
        "note": "Slightly wetted"
    }
]
```

An empty sheet gives `[]`.

### Errors

The Apps Script has an error catching function that returns the error as plain text starting with `ERROR:`, for example:

```text
ERROR: missing 'message' or 'read' parameter
```

## Things that ~~did~~ can trip me up

### The status code is always 200

Apps Script web apps return HTTP 200 for anything that reaches the code, including errors. So `200` does not necessarily mean the write worked.

Clients must look in the body: `OK`, a JSON array, or `ERROR: ...`. Non-200 codes appear when Google itself refuses the request, for example a failed deployment.

### Duplicate protection

On Android, the HTTP stack can silently retry a request to an `/exec` URL while following its redirect, even though the first attempt already succeeded. On some occasions that inserted the same entry in the sheet multiple times per button press.

The fix for this was the `reqId` parameter. The script remembers each `reqId` for a few minutes (using `CacheService`) and if it sees one again, replies `OK` without writing. A lock around the check and the write stops two overlapping retries both getting through. A request with no `reqId`, such as a testing request from the browser, is always written.

The cache knows nothing about content. Two different entries are only de-duplicated if they share a `reqId`.

### A timeout is not always a failure

If the client times out, the row may have been written. Check the sheet before attempting the same request.

### Why GET for writes?

It is somewhat weird and was mainly chosen for simplicity. A write has side effects and would normally be a POST.

Using GET keeps the App Inventor requiring one URL and one `Get()` block, and allows for browser testing. One possible pitfall is that anything that fetches URLs automatically (link previewer, browser prefetch) could repeat a write. The `reqId` check prevents most of that.

## Security

- **The `/exec` URL is a secret.** Anyone with the `/exec` URL can read and write rows.
- **To change the URL** create a new deployment, update the clients, then archive the old deployment (Manage deployments). The old URL stops working.
