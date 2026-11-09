# 翠杜 / Suito

Howard Xu's independent Rotaeno fan music-video portfolio.

**Website:** https://novahanser.github.io/suito-portfolio/

The site presents the final C1 film in a YouTube viewing layout, a 32-second 3:4 teaser and a 4:5 promotional image in Instagram post layouts. It includes an eight-stage C1 production journal with 23 figures, image previews, a 669-word critical reflection and credits. Platform interactions are local previews. No social audience metrics or account identities are fabricated.

## Structure

- `site/index.html`: the maintained C portfolio, served as the homepage.
- `site/assets/`: website images, styles, scripts, fonts and the viewing copy of the film.
- `tools/`: dependency-free validation, build and local preview.
- `.github/workflows/pages.yml`: GitHub Pages deployment on pushes to `main`.
- `dist/`: generated output; excluded from Git.

## Local preview

Use Node.js 22 or newer. No package installation is needed.

```sh
npm run build
npm run preview
```

The preview address is printed in the terminal. The server supports video byte ranges for seeking.

## Updates

Prepare and check changes locally. Commit or publish only when explicitly requested by the owner. For an approved release, run `npm run build`, review the intended changes, then commit and push to `main`. GitHub Actions validates the site, uploads the static artifact and deploys it to Pages. Pull requests run the build without publishing.

The authoring workspace also retains a C-only export script at `web-portfolio/.tools/prepare-github-release.py`; it synchronises the current local C page and its actual dependencies into this checkout. Original project files, research libraries and design comparisons stay in the authoring workspace.

## Credits

Music: NIWASHI & Aoi. Original Suito cover illustration: 月裏. Rotaeno game assets: Dream Engine Games Limited. Full project and asset credits are available on the website. Font licence notices are included beside the fonts. See `NOTICE.md` for source attribution.
