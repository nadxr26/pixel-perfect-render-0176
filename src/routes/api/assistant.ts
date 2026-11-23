import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .min(1)
    .max(40),
  context: z.string().max(12000).optional(),
});

const GUIDE = `You are "Coach", the personal voice assistant inside Sports Connect, a website for finding sports players, hosting/joining matches and booking grounds in Jaipur, India.
Speak naturally, warmly and briefly (2-6 short sentences, or a short numbered list for steps). Your replies may be read aloud, so avoid tables and long markdown. Reply in the language the user writes in (English, Hindi or Hinglish).
Only use the real data given in LIVE DATA. Never invent players, matches, grounds, prices or phone numbers. If something isn't in the data, say so and point to the right page.

HOW THE WEBSITE WORKS
- Navigation: top bar on desktop, bottom bar on mobile: Home, Players, Matches, Grounds, Host, Messages, My Matches, Profile, plus a bell for notifications.
- Account: Sign up with name, email, password (confirm), city, sports, skill level and optional profile photo. You may need to confirm your email. Log in / log out from the top right. You stay logged in after refresh. Forgot password sends a reset link.
- Profile: edit name, city, sports, skill level, photo; see Followers / Following counts and lists; location settings (share location on/off, update location). Exact coordinates are never shown to others, only distance.
- Players (find nearby players): open Players, allow location; you see real registered players with sports, skill, online status / last seen and distance. Filter by sport and skill. Tap a player to view profile, Follow, Chat, or Invite to a match. If nobody is near, it says "No players nearby yet".
- Skill levels: Beginner = new or casual, learning basics. Intermediate = plays regularly, knows the rules, decent fitness and technique. Advanced = strong, competitive, experienced players. "All Players" (when hosting) = anyone of any level may join.
- Following: Follow / Following button on player cards and profiles. Tap again to unfollow. You can't follow yourself.
- Messages: tap Chat on a player's profile, or open Messages. Real-time chat with unread badges and "Seen" receipts. You get a notification for new messages.
- Hosting a match: open Host (or "Host a Match" after booking a ground). Choose title, sport, ground, date, start and end time, max players, skill level, fee, description. Submit -> it appears for every logged-in user under Matches and in your My Matches. Dates can't be in the past.
- Joining: open Matches, filter by sport/skill, tap Join Match. You can't join twice, join a full, cancelled or past match, or join your own booked match. If full you can join the waitlist; when someone leaves, the waitlist moves up automatically. Leave from My Matches.
- Grounds: Grounds page lists Jaipur venues. Filters: sport, area, venue type (Government/Public or Private), free or paid, booking. FREE public grounds show "Select Ground" (no booking/payment). Private turfs show "Call to Book" (dials the phone) and some show "Book Ground".
- Ground booking & cost split: Book Ground -> enter date, time, total ground price and players required. Cost per player = ground price / players (rounded up) + Rs 10 Sports Connect fee. Example: Rs 200 / 20 players = Rs 10 + Rs 10 = Rs 20 each. Confirm -> "Ground Booked Successfully" -> Host a Match (pre-filled, ground/price/players locked). When the match is full, each player sees "Pay (Demo)" - no real money is charged. The host's Manage Match shows payment status and can remove players.
- Cancelling: only the host can cancel. Open My Matches -> your hosted match -> Cancel Match and confirm. It shows MATCH CANCELLED; nobody can join or pay. Players who joined can use Leave instead.
- Notifications: bell icon shows new messages, players joining your match, new matches.
- Background wallpaper changes with the selected sport.
You can't perform actions for the user; explain the steps and which page/button to use.`;

export const Route = createFileRoute("/api/assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Invalid request", { status: 400 });
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("Assistant is not configured", { status: 500 });

        // Real venue list from the shared database (public read).
        let venues = "";
        try {
          const url = process.env["SUPABASE_URL"];
          const anon = process.env["SUPABASE_PUBLISHABLE_KEY"];
          if (url && anon) {
            const r = await fetch(
              `${url}/rest/v1/venues?select=name,area,sports,kind,access,bookable,phone,price_per_hour&active=eq.true&limit=60`,
              { headers: { apikey: anon } },
            );
            if (r.ok) {
              const rows = (await r.json()) as Array<{ name: string; area: string; sports: string[] | null; access: string; price_per_hour: number | null; phone: string | null }>;
              venues = rows
                .map(
                  (v) =>
                    `${v.name} (${v.area}; ${v.sports?.join("/") ?? ""}; ${v.access === "free" ? "FREE public" : "private paid"}${v.price_per_hour ? `; Rs ${v.price_per_hour}/hr` : ""}${v.phone ? `; phone ${v.phone}` : ""})`,
                )
                .join("\n");
            }
          }
        } catch {
          /* venues optional */
        }

        const instructions = `${GUIDE}\n\nLIVE DATA\nGrounds:\n${venues || "(unavailable)"}\n${parsed.data.context ?? ""}`;

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          signal: request.signal,
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: "openai/gpt-6-astra",
            instructions,
            input: parsed.data.messages.map((m) => ({ role: m.role, content: m.content })),
            reasoning: { effort: "low" },
            store: false,
            stream: true,
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const msg =
            upstream.status === 402
              ? "The assistant is out of AI credits right now."
              : upstream.status === 429
                ? "The assistant is busy. Please try again in a moment."
                : "The assistant couldn't answer right now.";
          return new Response(msg, { status: upstream.status || 500 });
        }

        const enc = new TextEncoder();
        const dec = new TextDecoder();
        let buf = "";
        const stream = upstream.body.pipeThrough(
          new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, ctrl) {
              buf += dec.decode(chunk, { stream: true });
              let i: number;
              while ((i = buf.indexOf("\n\n")) >= 0) {
                const frame = buf.slice(0, i);
                buf = buf.slice(i + 2);
                for (const line of frame.split("\n")) {
                  if (!line.startsWith("data:")) continue;
                  try {
                    const ev = JSON.parse(line.slice(5).trim());
                    if (ev.type === "response.output_text.delta" && ev.delta) ctrl.enqueue(enc.encode(ev.delta));
                    if (ev.type === "response.failed" || ev.type === "error")
                      ctrl.enqueue(enc.encode("\n\n(Sorry, I couldn't finish that answer.)"));
                  } catch {
                    /* ignore non-JSON */
                  }
                }
              }
            },
          }),
        );
        const headers = new Headers({ "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform" });
        upstream.headers.forEach((v, k) => {
          if (k.toLowerCase().startsWith("x-lovable-aig-")) headers.set(k, v);
        });
        return new Response(stream, { headers });
      },
    },
  },
});
