# The Hot Take

A five-minute timer, checklist and report for a quick, recorded expert website review.

Expert review, not user data. Findings are hypotheses.

## What it does

- Counts down from 5:00 while you record yourself reviewing a site
- Shows one block at a time, so your attention stays on the site
- 5-second test: "What is this site about?"
- Task walkthrough: "Does it have what I need?", then How does it work? / What does it mean? / Is it expensive?
- Top-3 summary: three findings, each rated Critical, High Friction, Deficit, Minor or Other
- Optional verbatim quotes: load a transcript (`.vtt`, `.srt`, `.txt`) and the tool suggests lines that match each finding
- Exports the report as Markdown (`.md`)

## Use

- Open the hosted page, or open `index.html` in a browser
- Press Start, or press Space
- Keep the site in a second window or browser split

## Run locally

```
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Privacy

- No account, no backend, no analytics
- Everything stays in your browser
- Your draft is saved in `localStorage` (key `hottake-draft`). Use "Clear" to remove it
- Transcripts are read in the page and never uploaded
- The only external request is the Google Fonts stylesheet

## Limits

- The quote finder is lexical (TF-IDF matching on wording). It misses lines that mean the same thing in different words. You review every pick
- One reviewer, under time pressure, with prior exposure to the site, is an early impression. Look for patterns across several reviewers before acting
- Timing uses the browser clock and a screen wake lock where supported

## Method notes

- 5-second test, task walkthrough and rapid expert review draw on usability inspection methods (for example Nielsen's discount usability engineering and the cognitive walkthrough)
- Verify citations before quoting them publicly

## Files

- `index.html` page markup
- `style.css` styles
- `app.js` timer, report and quote finder
- `netlify.toml` static deploy settings and security headers

## Deploy

- Netlify: connect the repo, no build command, publish directory `.`
- GitHub Pages: serve from the `main` branch root. Netlify's headers file does not apply there

## License

Not yet chosen.

## Author

Mark Opalski, Human Factors Engineer.
