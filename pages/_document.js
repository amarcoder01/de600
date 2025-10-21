import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
        {/* Force desktop layout on small screens before first paint while keeping zoom */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function () {
  try {
    // Allow opt-out via localStorage if ever needed
    var optOut = false;
    try { optOut = (localStorage.getItem('forceDesktopViewport') === 'false'); } catch (e) {}

    var isSmall = Math.min(screen.width, screen.height) < 900;
    if (!optOut && isSmall) {
      var m = document.querySelector('meta[name="viewport"]');
      if (!m) {
        m = document.createElement('meta');
        m.setAttribute('name', 'viewport');
        document.head.appendChild(m);
      }
      // Emulate desktop width and keep zoom enabled for accessibility
      m.setAttribute(
        'content',
        'width=1280, initial-scale=0.5, maximum-scale=5, user-scalable=yes, viewport-fit=cover'
      );
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
