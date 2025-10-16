Git LFS setup instructions

This repository's `.gitattributes` contains recommended patterns for files that should be tracked with Git LFS.

What I added:
- `.gitattributes` — patterns for common binary files (images, archives, media, models, PDFs).
- `GIT_LFS_SETUP.md` — this file (instructions below).

Install Git LFS
---------------
macOS (Homebrew):

  brew install git-lfs

macOS (no Homebrew):
- Download installer from https://github.com/git-lfs/git-lfs/releases and run it.

After installing
----------------
Run in the repo root:

  git lfs install
  git lfs track "*.png" "*.jpg" "*.mp4"  # adjust as needed
  git add .gitattributes
  git add <large files>
  git commit -m "Track large binaries with Git LFS"

If you already have large files committed and want to migrate them into LFS, see:
https://github.com/git-lfs/git-lfs/wiki/Tutorial#migrate-existing-repository

