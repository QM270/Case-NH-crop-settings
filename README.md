# ACS Crop Settings

A phone-friendly reference for the Automatic Crop Settings (ACS) recommended combine
settings used by Case IH Axial-Flow and New Holland CR/CX combines. Installs to a
home screen on iOS and Android, works offline, and needs no server.

## Put it online

1. Create a new GitHub repository and upload every file in this folder, keeping the
   `icons/` folder intact.
2. Repository **Settings → Pages → Build and deployment**, source **Deploy from a
   branch**, branch `main`, folder `/ (root)`. Save.
3. After a minute the site is live at `https://<user>.github.io/<repo>/`.

The `.nojekyll` file is an empty, zero-byte file. GitHub Pages only checks whether it
exists. It isn't strictly required here — Jekyll only skips files and folders whose
names start with `_` or `.`, and this project has none — but it's cheap insurance if
you later add a folder like `_data`. If it's easier, create it directly on GitHub:
**Add file → Create new file**, type `.nojekyll` as the name, leave the body blank,
and commit.

## Install on a phone

- **iPhone/iPad** — open the URL in Safari, tap Share, then *Add to Home Screen*.
- **Android** — open in Chrome, tap the menu, then *Install app* / *Add to Home screen*.

Once installed it runs full screen and works with no signal, which is the point in a
field. The service worker caches everything on first load.

## Using it

- **Brand** picks Case IH or New Holland; **machine configuration** picks the rotor or
  body variant underneath it.
- **Manage list** hides crops you never grow. Hidden crops keep their values.
- **Edit values** overrides anything for the selected crop and configuration. Edited
  fields get a dot beside the label, and *Restore factory* undoes them.
- **Share crop** sends one crop as readable text (any messaging app) or as a JSON file.
- **Backup** exports everything you've changed so you can move it to another phone.

Edits are saved in the browser's local storage on that device. They are not synced.

## Where the data comes from

Extracted from display firmware version 41.02:

| Source file | App ID | Tables |
|---|---|---|
| `AFX_Flagship_FRED_41_02_00_00.hx1` | 1732 | `g_FactoryCropSettingsAFXSubsetV2`, `...SmallTube` |
| `CX_CR_Flagship_FRED_41_02_00_00.hx1` | 1733 | `g_FactoryCropSettingsCRSubset{V2,StdNarrow,StdWide,TwinNarrow,TwinWide}`, `g_FactoryCropSettingsCXSubsetV2` |

Each `.hx1` is a plain-text header followed by Intel-HEX, which decodes to a gzipped
tar containing a PowerPC ELF binary. The settings tables are named objects in
`.rodata`. Values are 16-bit big-endian. Crop names come from a 50-entry string pool
that is the `crop_type_e` enum, and each record's first field is that enum value —
so crop identification is read directly, not inferred.

Sieve openings and concave clearance are stored in the firmware as whole millimetres,
and the app displays them exactly as-is. (Earlier versions converted sieves to the
nearest 1/16 inch to match the Pro 700's on-screen display; that conversion has been
removed so mm is shown throughout, matching the raw firmware values directly.)

### Confidence

- **Confirmed** — Case IH standard AFX rotor. Oats, Wheat-Spring, Canola and Lentils
  were photographed on a 9250 and match the extracted table exactly, field for field.
  Those four also carry spreader speed, feeder speed, rasp bar counts and module codes
  read off the monitor.
- **Extracted, unverified** — everything else. The decoding is the same and the values
  are agronomically sensible, but no monitor photo has confirmed them.
- **Provisional** — the CX conventional table. Its record format differs and two fields
  remain unidentified, so the field labels are inferred from value ranges.

### Known quirks in the factory data

- Some CR records store a rotor range with the minimum above the maximum
  (Triticale, Buckwheat and Millet read 1550–1400). That is how it sits in the
  firmware; it has not been "corrected".
- A few records in `CRSubsetStdWide`, `CRSubsetTwinNarrow` and `CRSubsetTwinWide`
  carry out-of-range crop IDs or repeat a crop. Those are skipped.
- Spreader speed, feeder speed, rasp bar counts and module configuration codes are
  produced by code (`SetNonSpikedRaspBarsValuesAFX` and similar), not stored in a
  table, so they are blank except on the four confirmed crops.

## Editing the built-in defaults

`data.js` holds the factory values as plain JSON. Change a number there and commit, and
every user of your hosted copy gets it — unlike in-app edits, which stay on one device.
Bump `CACHE` in `sw.js` when you do, or installed copies will keep serving the old file.

## Files

```
index.html            app shell
styles.css            styling
app.js                logic
data.js               extracted factory settings — edit to change defaults
manifest.webmanifest  install metadata
sw.js                 offline cache
icons/                home screen icons
.nojekyll             empty file, optional (see above)
```

Not affiliated with, endorsed by, or supported by CNH Industrial, Case IH or New
Holland. Always verify settings against your own machine before relying on them.
