# Track and Field

Website for a college athletics recruiting and mentoring service.

## Site

`index.html` is the one-page Field Recruit website, with page-level files in `site/` and everything else from `design-systems/02-field-recruit/`. To preview it, serve the repo root:

```
python -m http.server 8000 --bind 127.0.0.1
```

Then open http://127.0.0.1:8000/. The consultation form sends to sam@fieldrecruit.com.au through Web3Forms. Set `WEB3FORMS_KEY` in `site/site.js`; without it the form opens the visitor’s email app instead.

## Design systems

`design-systems/` holds one folder per design system:

- `01-track-dark/`: the original prototype, dark with a track-orange accent. Kept for reference.
- `02-field-recruit/`: the finished system the site uses.

### 02-field-recruit

Light and quiet: paper white, one blue, lowercase Inter Tight, and black and white media with no borders.

- `tokens.css`: colours, type, spacing and motion
- `base.css`: reset, typography and layout utilities
- `components.css`: wordmark, banner, full-screen hero and photos, buttons, marks, logos, rows, disclosures and form
- `styleguide.html`: preview of the system (open it through the local server so the video and fonts load)
- `media/`: the hero video, photos, bird and university logos
- `reference/`: the original mood board

The bird appears only in the banner. Photos and logos stay black and white.

### 01-track-dark

The visual foundation (plain CSS, framework-agnostic):

- `tokens.css`: colours, type, spacing, motion, plus track-surface colour themes (`data-theme` on `<html>`)
- `base.css`: reset, typography and layout utilities
- `components.css`: buttons, cards, badges, forms, nav (with mobile menu), media hero, feature video
- `styleguide.html`: open in a browser to preview everything, with a theme switcher
