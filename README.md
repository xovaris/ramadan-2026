# Ramadan 2026 Jerusalem

A single-page Ramadan prayer times viewer for Jerusalem (Ramadan 1447 / 2026).

## Features

- Fajr (Suhoor) and Maghrib (Iftar) times for all 30 days
- Live countdown to the next Suhoor or Iftar
- Ramadan progress bar
- Daily du'a of the day
- Swipe, arrow key, and button navigation
- Dark, light, and high-contrast themes
- Arabic version (`ar.html`)
- PWA-ready (installable to home screen)

## Usage

Open `index.html` in a browser for the basic app experience.

Serve the folder over HTTP if you want installable PWA behavior. For example:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/index.html` or `http://localhost:8000/ar.html`.

## Data

Prayer times are for Jerusalem and are embedded in `data.js`. Times were sourced from [Mawaqit](https://mawaqit.net/).

## License

GPL-3.0. See [LICENSE](LICENSE).