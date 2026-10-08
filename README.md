# Helios ☀️

**Unofficial [Amazon Luna](https://luna.amazon.com) cloud gaming client for Linux.**

Luna has no Linux app and blocks non-Chromium browsers. Helios gives Luna a
proper home on the Linux desktop: a dedicated app window with controller
support, fullscreen streaming, and a login that sticks, no browser
configuration required.

> Helios is not affiliated with, endorsed by, or sponsored by Amazon.
> Amazon Luna is a trademark of Amazon.com, Inc. You need your own Amazon
> account; game availability depends on your Luna subscription and region.

## Features

- Dedicated window for Luna — launches straight into the service
- Gamepad support over USB or Bluetooth
- Fullscreen streaming with pointer lock and keyboard capture
- Persistent session — log in once
- External links open in your default browser, not inside the app

## Running from source

Requires Node.js 20+.

```sh
git clone https://github.com/Greugreu/helios
cd helios
npm install
npm start
```

## Flatpak

A Flatpak manifest lives in `flatpak/`. Flathub submission is planned; until
then you can build locally:

```sh
flatpak install flathub org.electronjs.Electron2.BaseApp//25.08 org.freedesktop.Sdk.Extension.node24//25.08
flatpak-builder --user --install --force-clean build-dir flatpak/io.github.greugreu.Helios.yml
```

## How it works

Luna's browser gate is a user-agent check, not a technical requirement — the
stream itself is standard WebRTC. Helios runs Luna in an Electron (Chromium)
window and presents a mainstream Chrome user agent so the service serves the
stream. The Chrome version in the UA tracks the Chromium that Electron
actually ships, so it stays current without manual bumps.

Chromium only gives the standard Gamepad API layout to controllers in its
built-in list; others arrive unmapped and Luna ignores them. Helios looks
those up by vendor and product ID in a vendored copy of SDL_GameControllerDB
and remaps them to the standard layout before Luna sees them. Refresh the database
with `npm run update-gamecontrollerdb`.

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).

`src/gamecontrollerdb.txt` is from SDL_GameControllerDB, under the zlib
license; see [src/gamecontrollerdb.LICENSE](src/gamecontrollerdb.LICENSE).
