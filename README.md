Open With add-on
================

Releases
--------

### Firefox
Released versions can be downloaded from https://addons.mozilla.org/firefox/addon/open-with/

Beta versions are sometimes available from https://addons.mozilla.org/firefox/addon/open-with/versions/beta

### Chrome/Chromium
Download from the Chrome store https://chrome.google.com/webstore/detail/open-with/cogjlncmljjnjpbgppagklanlcbchlno. This version also works in Opera.

Hacking
-------

### Firefox
To get a working version of this repo in your Firefox profile, clone it, then link it into your extensions directory as `openwith@darktrojan.net` and start Firefox.
```
git clone git://github.com/darktrojan/openwith.git
realpath openwith > [your profile dir]/extensions/openwith@darktrojan.net
```

### Chrome/Chromium/Opera
To get a working version of this repo in Chrome/Chromium/Opera, clone it, then from the Extensions page, click "Load unpacked extension…". You'll need to update your host file and reinstall it: find and replace `cogjlncmljjnjpbgppagklanlcbchlno` with the ID shown on the Extensions page.

### Edge
Good luck.

Localizing
----------
Please send a pull request. [Here's some information that might be helpful](https://github.com/darktrojan/openwith/issues/141#issue-261143759).
