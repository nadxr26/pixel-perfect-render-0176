import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sports Connect | Find Players. Book Grounds. Play Together." },
      { name: "description", content: "Find real players near you, chat live, book grounds and play together in Jaipur." },
      { property: "og:title", content: "Sports Connect | Find Players. Book Grounds. Play Together." },
      { property: "og:description", content: "Find real players near you, chat live, book grounds and play together." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;800&family=DM+Sans:wght@400;600;700&display=swap" },
      { rel: "stylesheet", href: "/sc/style.css" },
    ],
  }),
  component: Index,
});

const SHELL = `<nav class="top"><div class="wrap bar">
 <div class="logo brand" onclick="go('home')"><i>⚽</i><span>SPORTS<b>CONNECT</b></span></div>
 <div class="links" id="links"></div>
 <div class="right" id="right"></div>
</div></nav>
<main class="wrap" id="app"></main>
<div class="bot" id="bot"></div>
<div id="np" hidden></div><div id="modal"></div>`;

const SCRIPTS = [
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js",
  "/sc/img.js",
  "/sc/app.js",
  "/sc/loc.js",
  "/sc/real.js",
  "/sc/matches.js",
  "/sc/follow.js",
];

function loadScript(src: string) {
  return new Promise<void>((resolve) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = false;
    s.onload = () => resolve();
    s.onerror = () => resolve(); // map is optional; app still works offline
    document.body.appendChild(s);
  });
}

function Index() {
  useEffect(() => {
    const w = window as unknown as { __scLoaded?: boolean; sb?: typeof supabase };
    if (w.__scLoaded) return;
    w.__scLoaded = true;
    w.sb = supabase;
    (async () => {
      for (const src of SCRIPTS) await loadScript(src);
    })();
  }, []);
  return <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: SHELL }} />;
}
