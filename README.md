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
- Gamepad passthrough via the standard Gamepad API (DualSense, Xbox, and
  other controllers supported by the kernel)
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
flatpak install flathub org.electronjs.Electron2.BaseApp//24.08
flatpak-builder --user --install --force-clean build-dir flatpak/io.github.greugreu.Helios.yml
```

## How it works

Luna's browser gate is a user-agent check, not a technical requirement — the
stream itself is standard WebRTC. Helios runs Luna in an Electron (Chromium)
window and presents a mainstream Chrome user agent so the service serves the
stream. The Chrome version in the UA tracks the Chromium that Electron
actually ships, so it stays current without manual bumps.

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).
