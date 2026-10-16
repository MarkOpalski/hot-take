# Security policy

## Report a vulnerability

Do not open a public issue or pull request for a security problem.

1. Open the repository's **Security** tab.
2. Choose **Report a vulnerability**. This opens a private report that only you and the maintainer can see.
3. Include:
   - What you found and where (file, line or page URL)
   - Steps to reproduce
   - The impact you expect
   - Your browser and operating system

Direct link: https://github.com/MarkOpalski/hot-take/security/advisories/new

## What to expect

- This is a one-person, volunteer project. Replies are best effort.
- I aim to acknowledge a report within 7 days and to tell you what I plan to do within 30 days.
- There is no bug bounty.
- I prefer coordinated disclosure. Please give me a reasonable chance to fix the issue before you publish details. I will credit you in the fix unless you ask me not to.

## Supported versions

Only the latest commit on `main` and the live site are supported. There are no versioned releases.

## How the project is built to limit risk

- A single static page. No server, no database, no accounts.
- No third-party code at run time. There are no npm or other package dependencies.
- No requests to other sites. Fonts are self-hosted.
- A strict Content Security Policy (`default-src 'none'`, scripts, styles and fonts from the same site only) and related headers, set in `netlify.toml`.
- Your draft is stored only in your own browser, in `localStorage` under the key `hottake-draft`. Nothing is sent anywhere.
- User text is written to the page with `textContent` and form values. The code does not use `innerHTML`, `eval` or `document.write`.

## In scope

- Cross-site scripting or HTML injection, for example through a transcript file, a pasted transcript or the exported report
- Anything that makes the page send your text to another site
- Weakening or bypassing the Content Security Policy or the other security headers in `netlify.toml`
- A change that adds a dependency, tracker or outside request without disclosure
- Problems in how the draft is stored or cleared

## Out of scope

- Scripts, headers or banners that your hosting provider injects into a hosted copy. The live site runs on Netlify, which adds its own script to some pages.
- Weaknesses in your browser, browser extensions or operating system
- Attacks that need physical or administrator access to the reader's device
- Reports from automated scanners with no demonstrated impact
- Disagreement with the content of a review. The Hot Take outputs one expert's early impression, not data.

## Running your own copy

If you host a copy, keep the headers from `netlify.toml` or reproduce them in your host's configuration. Without them the page still works, but you lose the Content Security Policy protection.
