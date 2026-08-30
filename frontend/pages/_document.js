import { Html, Head, Main, NextScript } from "next/document";

// Fonts are loaded here once, globally, instead of being repeated with
// next/head on every page — avoids Next.js's "Do not add stylesheets
// using next/head" warning and avoids re-fetching on every navigation.
export default function Document() {

  return (

    <Html lang = "en">

      <Head>

        <link rel = "preconnect" href = "https://fonts.googleapis.com" />

        <link rel = "preconnect" href = "https://fonts.gstatic.com" crossOrigin = "anonymous" />

        <link href = "https://fonts.googleapis.com/css2?family=Inter:wght@300..800&family=Lora:wght@400;500&display=swap" rel = "stylesheet" />

        {/* Favicon / logo — shown in the browser tab (address bar area) on every page,
            for both localhost and the deployed site, since files in /public are
            always served from the site root ("/") by Next.js. */}
        <link rel = "icon" href = "/favicon.ico" sizes = "any" />

        <link rel = "icon" type = "image/png" sizes = "192x192" href = "/icon-192.png" />

        <link rel = "apple-touch-icon" href = "/apple-touch-icon.png" />

        <link rel = "manifest" href = "/site.webmanifest" />

        <meta name = "theme-color" content = "#0f77ff" />

      </Head>

      <body>

        <Main />

        <NextScript />

      </body>

    </Html>

  );

}