/* ============================================================
   Portfolio interactions
   ============================================================ */
(function () {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.body.classList.add("js-anim");

  /* ---------- Lenis smooth scroll ---------- */
  let lenis = null;
  if (window.Lenis && !prefersReduced) {
    lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  /* ---------- Anchor scrolling ---------- */
  document.querySelectorAll("[data-scroll]").forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href");
      if (!id || !id.startsWith("#")) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { duration: 1.2 });
      else target.scrollIntoView({ behavior: "smooth" });
    });
  });

  /* ---------- GSAP + ScrollTrigger ---------- */
  if (window.gsap) {
    if (window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      if (lenis) lenis.on("scroll", ScrollTrigger.update);
    }

    if (prefersReduced) {
      gsap.set(".reveal", { opacity: 1, clearProps: "all" });
    } else {
      // Hero wordmark lines
      gsap.set(".reveal-line > span", { yPercent: 115 });
      gsap.set(".reveal-pop", { scale: 0.8, opacity: 0 });
      const heroIn = gsap.timeline({ delay: 0.2 });
      heroIn
        .to(".reveal-line > span", { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.12 })
        .to(".reveal-pop", { scale: 1, opacity: 1, duration: 1, ease: "expo.out" }, "-=0.8");

      // Generic scroll reveals
      gsap.utils.toArray(".reveal").forEach((el) => {
        gsap.fromTo(el, { opacity: 0, y: 28 }, {
          opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });

      // Scroll-driven morph: the hero portrait card travels toward the services slot
      // while flipping on its Y axis -- the portrait is the front face, the dark
      // "business card" is the back face, so scrolling spins one into the other.
      const morph = document.getElementById("morph");
      const heroFig = document.querySelector(".hero__portrait");
      const bizSlot = document.querySelector(".services__sticky");
      const card = bizSlot && bizSlot.querySelector(".biz-card");
      const morphInner = morph && morph.querySelector(".morph__inner");
      if (morph && morphInner && heroFig && card && window.ScrollTrigger) {
        const lerp = (a, b, t) => a + (b - a) * t;
        const morphUpdate = (p) => {
          // Disabled where the sticky card is hidden (mobile/tablet)
          if (getComputedStyle(bizSlot).display === "none") {
            morph.classList.remove("is-active");
            heroFig.style.opacity = "";
            card.style.opacity = "";
            return;
          }
          const active = p > 0.0005 && p < 0.9995;
          morph.classList.toggle("is-active", active);
          heroFig.style.opacity = p > 0.0005 ? "0" : "";   // hide hero portrait once morphing
          card.style.opacity = p >= 0.9995 ? "" : "0";       // reveal real card only at the end
          if (!active) return;
          const s = heroFig.getBoundingClientRect();
          const e = card.getBoundingClientRect();
          morph.style.left = lerp(s.left, e.left, p) + "px";
          morph.style.top = lerp(s.top, e.top, p) + "px";
          morph.style.width = lerp(s.width, e.width, p) + "px";
          morph.style.height = lerp(s.height, e.height, p) + "px";
          morphInner.style.transform = "rotateY(" + (p * 180) + "deg)"; // flip front -> back
        };
        ScrollTrigger.create({
          trigger: ".hero",
          start: "top top",
          endTrigger: ".services__layout",
          end: "top 12%",
          scrub: true,
          onUpdate: (self) => morphUpdate(self.progress),
          onRefresh: (self) => morphUpdate(self.progress),
        });
        morphUpdate(0);
      }
    }
  }

  /* ---------- Floating pill nav entrance ---------- */
  const pill = document.getElementById("pill");
  if (pill) {
    requestAnimationFrame(() => {
      setTimeout(() => pill.classList.add("is-in"), prefersReduced ? 0 : 900);
    });
  }

  /* ---------- Continuous marquee (footer) ---------- */
  const footerTrack = document.getElementById("footerTrack");
  if (footerTrack && window.gsap && !prefersReduced) {
    let x = 0;
    gsap.ticker.add(() => {
      x -= 0.7;
      const half = footerTrack.scrollWidth / 2;
      if (-x >= half) x += half;
      footerTrack.style.transform = `translateX(${x}px)`;
    });
  }

  /* ---------- Live clock ---------- */
  const clock = document.getElementById("clock");
  if (clock) {
    const tz = "Europe/Prague";
    const tick = () => {
      try {
        clock.textContent = new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: tz,
        }).format(new Date());
      } catch { clock.textContent = new Date().toLocaleTimeString(); }
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- Year ---------- */
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll(".faq__q").forEach((q) => {
    const panel = q.nextElementSibling;
    q.addEventListener("click", () => {
      const open = q.getAttribute("aria-expanded") === "true";
      q.setAttribute("aria-expanded", String(!open));
      if (window.gsap && !prefersReduced) {
        gsap.to(panel, { height: open ? 0 : "auto", duration: 0.5, ease: "power2.inOut" });
      } else {
        panel.style.height = open ? "0px" : "auto";
      }
    });
  });

  /* ---------- Testimonials slider (buttons + drag) ---------- */
  const viewport = document.getElementById("testiViewport");
  const trackEl = document.getElementById("testiTrack");
  const prev = document.getElementById("testiPrev");
  const next = document.getElementById("testiNext");
  if (viewport && trackEl) {
    let index = 0;
    const slides = trackEl.children;
    const maxIndex = () => slides.length - 1;
    const slideX = () => {
      const gap = parseFloat(getComputedStyle(trackEl).gap) || 0;
      return slides[0].getBoundingClientRect().width + gap;
    };
    const clampScroll = (x) => {
      const max = trackEl.scrollWidth - viewport.clientWidth;
      return Math.max(0, Math.min(x, max));
    };
    const goTo = (i) => {
      index = Math.max(0, Math.min(i, maxIndex()));
      const x = clampScroll(index * slideX());
      if (window.gsap) gsap.to(trackEl, { x: -x, duration: 0.8, ease: "expo.out" });
      else trackEl.style.transform = `translateX(${-x}px)`;
    };
    if (prev) prev.addEventListener("click", () => goTo(index - 1));
    if (next) next.addEventListener("click", () => goTo(index + 1));

    let dragging = false, startX = 0, baseX = 0, curX = 0;
    const getX = () => parseFloat((window.gsap && gsap.getProperty(trackEl, "x")) || 0) || 0;
    viewport.addEventListener("pointerdown", (e) => {
      dragging = true; startX = e.clientX; baseX = getX();
      viewport.setPointerCapture?.(e.pointerId);
    });
    window.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      curX = baseX + (e.clientX - startX);
      const min = -(trackEl.scrollWidth - viewport.clientWidth);
      curX = Math.max(min, Math.min(0, curX));
      if (window.gsap) gsap.set(trackEl, { x: curX }); else trackEl.style.transform = `translateX(${curX}px)`;
    });
    window.addEventListener("pointerup", () => {
      if (!dragging) return;
      dragging = false;
      goTo(Math.round(-curX / slideX()));
    });
    window.addEventListener("resize", () => goTo(index));
  }

  /* ---------- Contact form (Web3Forms, delivers straight to inbox) ----------
     SETUP: get a free access key at https://web3forms.com (enter your e-mail,
     no account needed) and paste it below. Until then, the form falls back to
     opening the visitor's e-mail app so no message is ever lost.            */
  const WEB3FORMS_ACCESS_KEY = "ad89fbc4-8e1b-412e-9297-17f159533602";
  const CONTACT_EMAIL = "patrik.prochazka.ez@gmail.com";

  const contactForm = document.getElementById("contactForm");
  const contactStatus = document.getElementById("contactStatus");
  if (contactForm) {
    const submitBtn = contactForm.querySelector(".contact__submit");
    const setStatus = (msg, kind) => {
      if (!contactStatus) return;
      contactStatus.textContent = msg;
      contactStatus.classList.remove("is-ok", "is-err");
      if (kind) contactStatus.classList.add(kind);
    };
    const fieldsOf = (data) => ({
      name: (data.get("name") || "").toString().trim(),
      role: (data.get("role") || "").toString().trim(),
      email: (data.get("email") || "").toString().trim(),
      status: (data.get("status") || "").toString().trim(),
      message: (data.get("message") || "").toString().trim(),
    });
    const mailtoFallback = (data) => {
      const f = fieldsOf(data);
      const body =
        `Name: ${f.name}\nRole: ${f.role}\nE-mail: ${f.email}\nStatus: ${f.status}\n\n${f.message}\n`;
      window.location.href =
        `mailto:${CONTACT_EMAIL}` +
        `?subject=${encodeURIComponent("Portfolio enquiry from " + f.name)}` +
        `&body=${encodeURIComponent(body)}`;
    };

    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!contactForm.reportValidity()) {
        setStatus("Please fill in the required fields.", "is-err");
        return;
      }
      const data = new FormData(contactForm);
      const f = fieldsOf(data);
      // Web3Forms metadata
      data.append("access_key", WEB3FORMS_ACCESS_KEY);
      data.set("subject", `Portfolio enquiry from ${f.name}`);
      data.set("from_name", "Portfolio contact form");
      data.set("replyto", f.email);

      const configured = WEB3FORMS_ACCESS_KEY && !WEB3FORMS_ACCESS_KEY.startsWith("YOUR_");
      if (!configured) {
        // Key not set yet — keep the form usable via the visitor's mail app.
        mailtoFallback(data);
        setStatus("Opening your e-mail app… (live delivery not configured yet)", "is-ok");
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      setStatus("Sending…");
      try {
        const res = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { Accept: "application/json" },
          body: data,
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.success) {
          setStatus("Thanks! Your message has been sent — I'll be in touch soon.", "is-ok");
          contactForm.reset();
        } else {
          throw new Error(json.message || "Request failed");
        }
      } catch (err) {
        // Network/service error — don't lose the message, open the mail app.
        mailtoFallback(data);
        setStatus("Couldn't reach the server — opening your e-mail app instead.", "is-err");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
})();
