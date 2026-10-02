# Focus Reader PWA

## Publish with GitHub Pages

1. Create a new GitHub repository, for example `focus-reader`.
2. Upload **all files and folders in this package** to the repository root.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select `main` and `/(root)`, then click **Save**.
6. After GitHub finishes deploying, open the Pages URL shown in Settings → Pages.

For a project repository named `focus-reader`, the URL normally has the form:
`https://YOUR-USERNAME.github.io/focus-reader/`

## Install on iPad

1. Open the GitHub Pages URL in Safari.
2. Tap Share.
3. Choose **Add to Home Screen**.
4. Launch Focus Reader from the new Home Screen icon.

The PDF itself is selected from Files and processed in the browser. This package
does not contain or upload your PDFs.

## Updating Focus Reader

Replace `index.html` (and, when changed, the other PWA files) in the repository.
GitHub Pages redeploys after the commit.

Note: ordinary GitHub Pages sites are publicly reachable. Do not put PDFs,
annotations, credentials, or other private data in this repository.
