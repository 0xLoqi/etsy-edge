/* TagSpy attribution bridge.
   Captures where a visitor came from (utm params or referrer) into localStorage
   so the extension can attribute the install source on chrome.runtime.onInstalled.
   This survives the Chrome Web Store referrer strip because the extension reads
   it back from an open tagspy.app tab right after install.
   Anonymous: source labels only, no identifiers. */
(function () {
  var KEY = 'tagspy_attr';
  try {
    var params = new URLSearchParams(window.location.search);
    var src = params.get('utm_source');
    var med = params.get('utm_medium');
    var cmp = params.get('utm_campaign');

    if (!src) {
      // No explicit UTM: only record a referrer-derived source on first touch,
      // never overwrite a stored UTM with weaker data.
      if (localStorage.getItem(KEY)) return;
      var ref = document.referrer;
      if (ref) {
        try {
          var host = new URL(ref).hostname.replace(/^www\./, '');
          if (host && host.indexOf('tagspy.app') === -1) src = host;
        } catch (e) { /* unparseable referrer */ }
      }
      if (!src) src = 'direct';
    }

    localStorage.setItem(KEY, JSON.stringify({
      src: src,
      med: med || undefined,
      cmp: cmp || undefined,
      ts: Date.now()
    }));
  } catch (e) { /* localStorage blocked; attribution lost, not critical */ }
})();
