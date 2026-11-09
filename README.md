# 翠杜 / Suito

Howard Xu's independent Rotaeno fan music-video portfolio.

**Website:** https://novahanser.github.io/suito-portfolio/

The site contains the final C1 film, an eight-stage production journal, image previews, critical reflection and credits. C2 and C3 remain in development.

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

Edit the website in `site/`, run `npm run build`, then commit and push to `main`. GitHub Actions validates the site, uploads the static artifact and deploys it to Pages. Pull requests run the build without publishing.

The authoring workspace also retains a C-only export script at `web-portfolio/.tools/prepare-github-release.py`; it synchronises the current local C page and its actual dependencies into this checkout. Original project files, research libraries and design comparisons stay in the authoring workspace.

## Credits

Music: NIWASHI & Aoi. Original Suito cover illustration: 月裏. Rotaeno game assets: Dream Engine Games Limited. Full project and asset credits are available on the website. Font licence notices are included beside the fonts. See `NOTICE.md` for source attribution.
