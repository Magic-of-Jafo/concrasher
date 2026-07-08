# Hero rotation images

Drop images here (`.jpg` / `.png` / `.webp` / `.avif`) and they join the front
page hero rotation immediately: the server picks one at random on every page
view. No restart needed.

Sizing: the band renders at **8:3 on desktop** and **4:3 on mobile**,
`object-fit: cover`, anchored center. Aim for at least 1600px wide; expect the
top/bottom or sides to crop depending on the viewport. A bottom-weighted scrim
is applied automatically so the rotating headline stays readable over any
photo — avoid images whose key subject sits in the lower-left corner (that's
the headline zone).

When the folder is empty, the designed stage-light scene renders instead.

This folder is the interim mechanism; the admin upload UI (with a per-image
anchor-point control) replaces it later.
