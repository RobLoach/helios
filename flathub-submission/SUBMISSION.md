# Submitting Helios to Flathub

The two files in this directory are the complete submission payload:

- `io.github.greugreu.Helios.yml` — manifest building from the `v0.1.0` git tag
- `generated-sources.json` — offline npm/electron sources

## Steps (one-time, ~10 minutes)

1. Fork https://github.com/flathub/flathub on GitHub (keep all branches, or at
   least `new-pr`).
2. Clone the `new-pr` branch of your fork and create a submission branch:

   ```sh
   git clone --branch=new-pr git@github.com:Greugreu/flathub.git
   cd flathub
   git checkout -b new-app-io.github.greugreu.Helios
   ```

3. Copy the two files from this directory into the repo root, commit, push:

   ```sh
   cp ~/helios/flathub-submission/io.github.greugreu.Helios.yml .
   cp ~/helios/flathub-submission/generated-sources.json .
   git add io.github.greugreu.Helios.yml generated-sources.json
   git commit -m "Add io.github.greugreu.Helios"
   git push -u origin new-app-io.github.greugreu.Helios
   ```

4. Open a pull request against `flathub/flathub`, base branch **`new-pr`**
   (not master). Fill in the PR template checklist; for the "official" question,
   state clearly that Helios is an unofficial client, not affiliated with
   Amazon, using its own name and branding.

5. The flathubbot will run test builds for x86_64 and aarch64 and comment with
   links. Reviewers may request changes; typical turnaround is days to a couple
   of weeks.

## After acceptance

- A `flathub/io.github.greugreu.Helios` repo is created; you get push access.
  Updates are PRs to that repo bumping the git tag + regenerated sources.
- Electron/dependency updates: bump versions in `package.json`, run
  `npm install`, regenerate `generated-sources.json` with flatpak-node-generator,
  tag a release, update the manifest's tag+commit.

## Notes

- The manifest pins tag `v0.1.0` at commit `e8c1e52a…`. Any code fix before
  acceptance needs a new tag and a manifest bump.
- Local test build of exactly what Flathub will build:

  ```sh
  flatpak run org.flatpak.Builder --user --install --force-clean build-dir \
      flathub-submission/io.github.greugreu.Helios.yml
  ```
