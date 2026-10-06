"use client";

import { useState, type FormEvent } from "react";
import { Mail, Send, Sparkles } from "lucide-react";

export default function NewsletterSection({ section }: { section: any }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const messageId = `wahaj-newsletter-message-${section.id || "homepage"}`;

  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "homepage" }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "تعذّر إتمام الاشتراك الآن.");

      setStatus("success");
      setMessage("تم تسجيل بريدك الإلكتروني في قائمة وَهَج.");
      setEmail("");
    } catch (error: any) {
      setStatus("error");
      setMessage(error?.message || "حدث خطأ أثناء الاشتراك. حاولي مرة أخرى.");
    }
  }

  const configuredSubtitle = String(section.subtitle || "").trim();
  const subtitle = /آخر العروض والمجموعات الجديدة/.test(configuredSubtitle)
    ? "سجّلي بريدك الإلكتروني للانضمام إلى قائمة وَهَج."
    : configuredSubtitle || "انضمي إلى قائمة وَهَج البريدية وسجّلي بريدك لمتابعة جديد المتجر.";

  return (
    <section className="wahaj-newsletter" aria-labelledby={`wahaj-newsletter-title-${section.id || "homepage"}`}>
      <div className="container">
        <div className="wahaj-newsletter__card">
          <div className="wahaj-newsletter__intro">
            <div className="wahaj-newsletter__copy">
              <span className="wahaj-newsletter__eyebrow"><Sparkles size={13} /> وَهَج · القائمة البريدية</span>
              <h2 id={`wahaj-newsletter-title-${section.id || "homepage"}`}>{section.title || "انضمي إلى عالم وَهَج"}</h2>
              <p>{subtitle}</p>
            </div>
            <span className="wahaj-newsletter__icon" aria-hidden="true"><Mail size={39} strokeWidth={1.25} /></span>
          </div>
          <div className="wahaj-newsletter__subscribe">
            <form className="wahaj-newsletter__form" onSubmit={subscribe}>
              <label className="wahaj-newsletter__email">
                <Mail size={17} aria-hidden="true" />
                <span className="sr-only">البريد الإلكتروني</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="بريدك الإلكتروني"
                  aria-describedby={messageId}
                  disabled={status === "loading"}
                />
              </label>
              <button type="submit" disabled={status === "loading"}>
                {status === "loading" ? "جارٍ التسجيل…" : section.ctaText || "انضمي إلينا"}
                {status === "loading" ? <span className="wahaj-newsletter__spinner" aria-hidden="true" /> : <Send size={15} />}
              </button>
            </form>
            <p id={messageId} className={`wahaj-newsletter__message is-${status}`} role={status === "error" ? "alert" : "status"} aria-live="polite">
              {message || "عند الاشتراك، يُسجّل بريدك ضمن قائمة وَهَج في قاعدة بيانات المتجر."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
