# Contributing to The Hot Take

Thanks for helping. This is a small tool with one job: help a reviewer keep time, stay focused on the site being reviewed and produce a short, honest report. Contributions that keep it small and focused are the most useful.

## Ways to help

- Report a bug or an accessibility problem
- Suggest a change to the wording of a prompt or check
- Fix a bug or improve the code
- Test in a browser or assistive technology the project has not covered yet

Security problems are different. Do not file them publicly. See [SECURITY.md](SECURITY.md).

## Before you start

- For anything bigger than a typo or a small fix, open an issue first and describe the problem you want to solve. That avoids work on something I cannot accept.
- Look for an existing issue before opening a new one.
- Please keep each pull request to one change.

## Project rules

These keep the tool safe, free and easy to audit. A pull request that breaks one of them will not be merged.

- **No build step.** The files in the repository are the files that ship.
- **No dependencies.** No npm packages, no libraries, no frameworks at run time.
- **No outside requests.** The page must not load anything from another site. Fonts stay self-hosted. The Content Security Policy in `netlify.toml` must not be loosened.
- **No tracking.** No analytics, cookies, fingerprinting or remote logging.
- **Data stays on the device.** Do not add anything that uploads a transcript, a finding or a report.
- **Honest output.** Reports must keep saying that this is an expert review and an early impression, not user data. Do not add wording that overstates certainty.
- **Glanceable.** The reviewer is looking at another site. Show one block at a time. Keep text short, plain and speakable.
- **Accessible.** Target WCAG 2.2 AA: at least 4.5:1 contrast for normal text, 3:1 for large text and interface components, everything usable by keyboard, visible focus, no information carried by colour alone.
- **Fonts.** Any font you add must be under a license that allows redistribution, such as the SIL Open Font License, and its license text must be added to `fonts/LICENSES.md`.

## Set up

You need a static file server and a recent browser.

```
git clone https://github.com/MarkOpalski/hot-take.git
cd hot-take
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Test

The smoke test runs the page in a headless browser under the same security headers as the live site. It checks that the timer runs, the report downloads, quotes can be found, the page makes no outside requests and the browser reports no errors.

```
pip install -r tests/requirements.txt
playwright install chromium
python3 tests/smoke_test.py
```

It must pass before you open a pull request. If your change adds behaviour, add a check for it in `tests/smoke_test.py`.

Also check by hand:

- Keyboard only: you can start, advance, finish and download without a mouse
- A phone-width window and a wide window
- Contrast of any colour you changed

## Keep secrets and junk out

- `.gitignore` already excludes system files, credentials, recordings and transcripts. Do not force-add them.
- Optional but encouraged: install the local checks once, and they run on every commit.

```
pip install pre-commit
pre-commit install
```

- Never commit a real client's site content, a real review or a recording. Use obviously fake data in examples and screenshots.

## Pull requests

1. Fork the repository.
2. Create a branch from `main` with a short name, such as `fix-timer-pause`.
3. Make your change and run the smoke test.
4. Write a clear commit message that says what changed and why. Reference the issue number, for example `Fix pause drift (#12)`.
5. Open a pull request into `main` and fill in the template.

The maintainer reviews every pull request. I may ask for changes or decline a change that does not fit the project. There is no response deadline.

## Licensing of contributions

By submitting a contribution you agree that it is licensed under the [MIT license](LICENSE) of this project, and that you have the right to submit it.

## Be respectful

Keep discussion about the work. Assume good faith, be specific and be kind. The maintainer may close or lock a thread that is not.
