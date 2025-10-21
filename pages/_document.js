import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#000000" />
        {/* Force desktop layout on small screens before first paint while keeping zoom; keep it enforced if changed later */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function () {
  try {
    // Allow opt-out via localStorage if ever needed
    var optOut = false;
    try { optOut = (localStorage.getItem('forceDesktopViewport') === 'false'); } catch (e) {}

    var minSide = Math.min(screen.width, screen.height);
    var isSmall = minSide < 1100; // broaden threshold to catch more small devices
    if (!optOut && isSmall) {
      var ensureViewport = function() {
        var m = document.querySelector('meta[name="viewport"]');
        if (!m) {
          m = document.createElement('meta');
          m.setAttribute('name', 'viewport');
          document.head.appendChild(m);
        }
        var targetWidth = 1280;
        var scale = Math.min(1, (minSide / targetWidth));
        var content = 'width=' + targetWidth + ', initial-scale=' + scale + ', maximum-scale=5, user-scalable=yes, viewport-fit=cover';
        if (m.getAttribute('content') !== content) {
          m.setAttribute('content', content);
        }
      };
      ensureViewport();

      // Keep it enforced if something modifies the head later
      var obs = new MutationObserver(function(mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var mu = mutations[i];
          if (mu.type === 'childList' || mu.type === 'attributes') {
            ensureViewport();
          }
        }
      });
      obs.observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ['content', 'name'] });
    }
  } catch (e) {}
})();
            `,
          }}
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}

