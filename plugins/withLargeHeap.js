const { withAndroidManifest } = require('expo/config-plugins');

/** Allow ExoPlayer / copies of feature-length MP4s more Java heap on Android. */
function withLargeHeap(config) {
  return withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application?.[0];
    if (app?.$) {
      app.$['android:largeHeap'] = 'true';
    }
    return mod;
  });
}

module.exports = withLargeHeap;
