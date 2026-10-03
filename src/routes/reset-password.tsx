import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "Reset password | Sports Connect" }, { name: "robots", content: "noindex" }],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;800&family=DM+Sans:wght@400;600;700&display=swap",
      },
      { rel: "stylesheet", href: "/sc/style.css" },
    ],
  }),
  component: ResetPassword,
});

type Phase = "checking" | "ready" | "invalid" | "done";

/** Same rules shown to the user: 8+ characters with at least one letter and one number. */
function validatePassword(pw: string, confirm: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw))
    return "Password needs at least one letter and one number";
  if (pw !== confirm) return "Passwords do not match";
  return null;
}

function friendlyAuthError(message: string): string {
  if (/different from the old/i.test(message))
    return "Your new password must be different from your old one.";
  if (/weak|pwned|easy to guess|compromised/i.test(message))
    return "That password is too easy to guess. Please choose a stronger one.";
  if (/session|jwt|expired|not authenticated|missing/i.test(message))
    return "Your reset link has expired. Please request a new one.";
  return "Could not update your password. Please try again.";
}

function ResetPassword() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [reason, setReason] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // A broken/expired link comes back from the auth server as ?error=... or #error=...
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const linkError =
      hash.get("error_description") ||
      query.get("error_description") ||
      hash.get("error") ||
      query.get("error");
    if (linkError) {
      setReason(
        /expired/i.test(linkError) || hash.get("error_code") === "otp_expired"
          ? "This reset link has expired."
          : "This reset link is not valid.",
      );
      setPhase("invalid");
      return;
    }

    let done = false;
    const markReady = () => {
      if (!done) {
        done = true;
        setPhase("ready");
      }
    };

    // The client library turns the link's token into a recovery session and fires PASSWORD_RECOVERY.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") markReady();
    });
    // Or the home page already handled the link and forwarded us here.
    let forwarded = false;
    try {
      forwarded = sessionStorage.getItem("sc_recovery") === "1";
    } catch {
      /* ignore */
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && (forwarded || hash.get("type") === "recovery")) markReady();
    });

    const t = window.setTimeout(() => {
      if (!done) {
        setReason("This reset link is invalid or has expired.");
        setPhase("invalid");
      }
    }, 5000);
    return () => {
      sub.subscription.unsubscribe();
      window.clearTimeout(t);
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const v = validatePassword(pw, pw2);
    if (v) {
      setErr(v);
      return;
    }
    setErr(null);
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) {
      setBusy(false);
      const expired = /session|jwt|expired|not authenticated|missing/i.test(error.message);
      if (expired) {
        setReason("Your reset link has expired.");
        setPhase("invalid");
        return;
      }
      setErr(friendlyAuthError(error.message));
      return;
    }
    try {
      sessionStorage.removeItem("sc_recovery");
    } catch {
      /* ignore */
    }
    await supabase.auth.signOut({ scope: "global" }); // end every session so the new password is used everywhere
    setBusy(false);
    setPhase("done");
  }

  return (
    <>
      <nav className="top">
        <div className="wrap bar">
          <a href="/" className="logo brand" style={{ textDecoration: "none", color: "inherit" }}>
            <i>⚽</i>
            <span>
              SPORTS<b>CONNECT</b>
            </span>
          </a>
        </div>
      </nav>
      <main className="wrap">
        <div className="pg" style={{ maxWidth: 460, margin: "auto" }}>
          {phase === "checking" && (
            <div className="card pad" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40 }}>🔐</div>
              <h2 className="brand">Checking your link…</h2>
              <p className="mut">One moment.</p>
            </div>
          )}

          {phase === "invalid" && (
            <div className="card pad" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 54 }}>⏰</div>
              <h2 className="brand">Link problem</h2>
              <p className="mut" style={{ margin: "8px 0 16px" }}>
                {reason} Reset links work once and expire quickly. Request a new one from the login
                page.
              </p>
              <a
                className="btn full"
                href="/#auth"
                style={{
                  display: "block",
                  textDecoration: "none",
                  textAlign: "center",
                  lineHeight: "22px",
                }}
              >
                Back to Log in
              </a>
            </div>
          )}

          {phase === "ready" && (
            <form className="card pad" onSubmit={onSubmit} noValidate>
              <h2 className="brand">Set a new password</h2>
              <p className="mut">Choose a password you haven't used before.</p>
              <label htmlFor="np1">New password</label>
              <input
                id="np1"
                type="password"
                autoComplete="new-password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                required
              />
              <label htmlFor="np2">Confirm new password</label>
              <input
                id="np2"
                type="password"
                autoComplete="new-password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                required
              />
              <p className="mut" style={{ marginTop: 8, fontSize: 13 }}>
                At least 8 characters, with a letter and a number.
              </p>
              {err && (
                <div className="err" role="alert">
                  • {err}
                </div>
              )}
              <button className="btn full" style={{ marginTop: 16 }} disabled={busy}>
                {busy ? "Saving…" : "Update password"}
              </button>
            </form>
          )}

          {phase === "done" && (
            <div className="card pad" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 54 }}>✅</div>
              <h2 className="brand">Password updated</h2>
              <p className="mut" style={{ margin: "8px 0 16px" }}>
                You can now log in with your new password.
              </p>
              <a
                className="btn full"
                href="/#auth"
                style={{
                  display: "block",
                  textDecoration: "none",
                  textAlign: "center",
                  lineHeight: "22px",
                }}
              >
                Go to Log in
              </a>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
