# Scientific Calculator

A single-page scientific calculator. Plain HTML, CSS and JavaScript. No libraries.

## Run it
Open the folder in VS Code, install the "Live Server" extension, right-click `index.html`, choose "Open with Live Server".

## Features
+ - × ÷, parentheses, x², xʸ, √, 1/x, %, sin, cos, tan (DEG/RAD switch), log, ln, π, e, n!, Ans, C, backspace. Keyboard typing works.

## Fonts
Self-hosted IBM Plex (SIL Open Font License). Files go in `fonts/`:
- `IBMPlexMono-Medium.woff2`
- `IBMPlexSans-SemiBold.woff2`
- the font license text (OFL) next to them

Get them from the official repo: https://github.com/IBM/plex (Releases). Check the file names in the download and match them in `style.css`. If the files are missing, the page still works with fallback fonts.

## Safety notes
- No `eval()`. `calculator.js` has its own small math reader, so only math can run.
- Limits: input length 200, factorial up to 170, results must be finite numbers.
- No data is stored or sent anywhere. No cookies, no login, no server.
- Fonts are hosted here, not on Google.

## Deploy
GitHub Pages. Follow the current steps: https://docs.github.com/pages (search "Creating a GitHub Pages site").

## Review
This code was written with AI help. A human must read and understand it before real use.