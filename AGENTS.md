<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Sports Connect UI is the original vanilla-JS app in public/sc/ (app.js, loc.js, real.js) mounted by src/routes/index.tsx; why: preserves the user's existing design exactly. real.js owns all user/chat/presence logic against Lovable Cloud; never add hardcoded users.
- Player coordinates live only in user_locations (owner-only); other users get distance via the list_players() function; why: never expose lat/lng.
- Matches, participants and waitlists live in matches/match_participants/match_waitlist; public/sc/matches.js overrides app.js match functions; joins go through join_match/leave_match RPCs; why: shared across users with capacity checks.
