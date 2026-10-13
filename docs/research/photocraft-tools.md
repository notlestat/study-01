# PhotoCraft reference inspection

Date: 13–14 October 2026. Scope: familiar placement and undo conventions for STUDY/01. No Photoshop installation was found in the bounded Applications check. PhotoCraft was available through its local command connection.

## Observations

The PhotoCraft command inventory exposed `layer.translate` with dx/dy, `edit.transform` with a six-value affine matrix or quad, `image.imageSize` with dimensions/resampling, anchored canvas size and `edit.undo`. On a disposable 320×240 document, a raster fill moved to bounds [20,10,320,240], then undo restored [0,0,320,240]. A 90-degree matrix transform produced [40,-40,240,320], and undo again restored the original bounds. History reported Move and Free Transform. The test document was closed without saving.

STUDY's original implementation adopts movement, free transform, image fit and one-gesture undo. Image file resampling, perspective quads and Photoshop action compatibility are not implemented.

## REA evidence and limits

REA opened `/Applications/PhotoCraft.app/Contents/MacOS/PhotoCraft`, a universal Mach-O executable. SHA256: `89e61df2ec5f72a2a4f35424f9433b342c372875171674c91130188e1612a75f`. Signature inspection identified `ai.storyteller.photocraft` with hardened runtime. Evidence ID: `ev_e20ec75a6970526c42afc70de8113d5fbfb7c6c12b3f555ad62c07ef90a73e77`.

Native dispatch metadata inspection returned a resource constraint: the selected Apple metadata snapshot exceeded the provider's 64 MiB budget. No decompiled transform or undo implementation is claimed. Signature evidence identifies the binary; command/runtime observations concern the connected PhotoCraft session and do not prove that binary's internal algorithm. The REA target was closed.

No vendor source, binary, texture or action package is included in STUDY. Raw local evidence is retained outside the repository in `/private/tmp/study01-photocraft-evidence-20261013.json`.
