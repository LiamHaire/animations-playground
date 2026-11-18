import { useEffect, useRef } from "react";
import type { ClipProps } from "../../play";
import "./hero-intro.css";

// The intro from the portfolio (~/portfolio/public/intro/hero-animation.html, played full screen by intro-gate.tsx): "Hello"
// typed with a caret that drops into a pink full stop, "I'm Liam Haire", the subtitle, four rolling phrase slides, then
// "and this is my portfolio" with a glitch on "portfolio", fading onto the page. Ported as-is; only the wiring changed: the
// script runs off the playground's runKey, speed and reduced props instead of its own Replay button and
// prefers-reduced-motion, it's scoped to this component instead of the page (.hero-intro stands in for <html>), and it no
// longer posts intro:complete to the page. It always plays dark, as the intro gate does.

/* ---- Content ---- */
const HELLO = "Hello";
const NAME = "Liam Haire";

/* ---- Timing (milliseconds): tweak these to taste ---- */
const BLINK = 320; // caret on for 320ms, off for 320ms (quicker than the 530ms Windows default, to keep the opening short)
const PACE = 0.42; // typing speed multiplier: 1 = confident typist, ~1.4 = average, below 1 = faster (0.42 = very fast typist)
const NAME_PACE = 0.35; // same idea, for the name only (lower = quicker)

const T = {
  /* Part 1: Hello. */
  startDelay: 100, // blank hold before anything happens
  lead: 100, // pause after the caret reappears, before the first key
  //          H  e    l    l    o
  helloKeys: [0, 150, 150, 210, 170],
  morphDelay: 200, // caret holds solid after the "o" before it morphs
  morphMs: 680, // the caret stretches, drops into the pink full stop, bounces up and settles
  tail: 160, // "Hello." holds this long once the full stop has settled
  helloHold: 0, // plus this beat before "Hello." swipes away

  /* Part 2: I’m + name */
  helloOutMs: 160, // "Hello." swipes up and out through its mask
  imInDelay: 40, // "I’m" starts rising this long after "Hello." starts to leave
  revealMs: 340, // "I’m" swipes up into view (expo-out: mostly there in ~250ms)
  imHold: 0, // beat on "I’m" once the reveal has finished
  liftMs: 400, // quick glide up to its final position
  liftScaleMs: 340, // shrink finishes slightly before the move
  caretAfterLift: 40, // caret appears this long after "I’m" starts to lift
  nameLead: 80, // caret solid before the first letter of the name (overlaps the glide)
  // L  i    a    m    space  H    a    i    r    e
  nameKeys: [0, 150, 140, 150, 170, 210, 140, 140, 150, 140],
  nameTail: 150, // caret stays solid after the name, then fades out

  /* Part 3: subtitle */
  subDelay: 40, // beat after the caret starts fading, before the subtitle rises
  subStagger: 35, // word-by-word stagger as the first line rises in
  subRevealMs: 420,
  subHold: 500, // time to read "a multi-discipline digital designer…"
  dotMs: 320, // each of the three dots rises in over this long
  dotStagger: 60, // gap between the three dots (a typed-ellipsis rhythm)
  // transition to the second line
  outStagger: 20, // line one's words, then its dots, swipe up and out one after another
  outMs: 280,
  inDelay: 120, // line two's dots start rising this long after the transition begins
  dotsToWords: 40, // line two's words follow once its dots have landed
  inStagger: 30,
  inMs: 400,
};

/* ---- Phrase slides ----
   Colours are art-directed as a pulse: grounded dark, a hot pink peak, a calm light breath,
   then a confident dark finish with the pink carried into the type.
   WCAG contrast (text / index number):  01 4.9 / 7.8   02 5.9 / 5.5   03 15.9 / 9.3   04 5.9 / 7.8 */
const SLIDES = [
  { no: "01", text: "design systems", bg: "var(--bg)", fg: "var(--accent-purple)", label: "var(--muted)" },
  { no: "02", text: "AI-driven design", bg: "var(--accent)", fg: "var(--bg)", label: "var(--color-ink-900)" },
  { no: "03", text: "creative direction", bg: "var(--accent-purple-secondary)", fg: "var(--bg)", label: "var(--color-ink-700)" },
  { no: "04", text: "UX architecture", bg: "var(--bg)", fg: "var(--accent)", label: "var(--muted)" },
];
const S = {
  introHold: 800, // time to read "…specialising in UX / UI design" before the intro fades out
  introFadeMs: 140, // the intro block fades out quickly, fully gone before the first slide has rolled in
  rollMs: 340, // one roll: old face rolls up and away, new face rolls up into place
  labelDelay: 40, // the index number follows the phrase by this much
  bgMs: 320, // background colour change during each roll
  holdBase: 240, // time on screen = holdBase + holdPerWord x words ("just long enough to read")
  holdPerWord: 90,
};

/* ---- Easing ---- */
const EASE = {
  reveal: "cubic-bezier(.16, 1, .3, 1)", // expo-out: fast start, long soft landing
  exit: "cubic-bezier(.55, 0, .35, 1)", // smooth in-out for the outgoing line
  glide: "cubic-bezier(.16, 1, .3, 1)",
  fade: "cubic-bezier(.3, 0, .6, 1)",
  morph: "cubic-bezier(.55, 0, .25, 1.25)", // quick drop with a touch of squash as the dot lands
  roll: "cubic-bezier(.76, 0, .24, 1)", // decisive in-out for the drum: quick through the middle, firm stop
};

/* ---- Closing: "and this is my portfolio" ----
   Slide 04 rolls away to the light stage, "and this" swipes up, the background drops to the page background
   as "is my portfolio" bounces in letter by letter, a pink full stop drops in after it (as it did
   after "Hello"), then everything fades out onto a blank page-coloured screen. */
const C = {
  lastHold: 320, // time on "04 UX architecture" before the closing begins
  andDelay: 180, // "and this" starts rising this long after slide 04 starts to roll away
  andMs: 400,
  andHold: 200, // beat on the light screen before the background drops
  charDelay: 60, // after the background starts to change, before the first letter
  charStagger: 30, // letter-by-letter rhythm
  charMs: 340,
  folioHold: 50, // "is my portfolio" on screen before the full stop lands
  readHold: 800, // hold on the finished line, full stop landed, before the glitch
  glitchWait: 460, // lets the burst play out (glitchStart + glitchMin + glitchSpread, plus a little)
  postGlitchHold: 220, // short beat on the restored line before the fade
  glitchCount: 4, // letters of "portfolio" that scramble
  glitchStart: 120, // spread of start times
  glitchMin: 160,
  glitchSpread: 140,
  glitchTick: 55,
  stopMs: 460, // the full stop drops onto the baseline, squashes and bounces once
  endHold: 360, // hold on the finished line
  fadeMs: 320, // closing content fades onto the page-coloured background
};
const BOUNCE: Keyframe[] = [
  { translate: "0 0.55em", opacity: 0, offset: 0 },
  { translate: "0 -0.09em", opacity: 1, offset: 0.6 },
  { translate: "0 0.025em", opacity: 1, offset: 0.82 },
  { translate: "0 0", opacity: 1, offset: 1 },
];

// Same symbol scramble as the "Featured work" title on the page, played as one short burst on "portfolio"
const GLITCH_SYMBOLS = "#$%&*+=<>/\\|?!~^@";
const PAGE_LIGHT = { bg: "var(--paper)", fg: "var(--color-ink-900)" };
const PAGE_DARK = { bg: "var(--bg)", fg: "var(--text)" }; // matches the landing page background

const jitter = (ms: number, pace = PACE) => ms * pace * (0.92 + Math.random() * 0.16); // +/-8% so it never feels mechanical
const CANCELLED = Symbol("cancelled");

export function HeroIntro({ runKey, speed, reduced }: ClipProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    /* ---- Elements ---- */
    const root = ref.current!;
    const $ = <E extends Element = HTMLElement>(s: string) => root.querySelector<E>(s)!;
    const $$ = <E extends Element = HTMLElement>(s: string) => [...root.querySelectorAll<E>(s)];
    const imEl = $(".im");
    const imText = $(".im-text");
    const hello = { line: $(".hello"), word: $(".hello .word"), probe: $(".hello .probe"), cursor: $(".hello .cursor") };
    const name = { line: $(".name"), word: $(".name .word"), cursor: $(".name .cursor") };
    const sub = {
      a: $(".sub-a"),
      b: $(".sub-b"),
      aWords: $$(".sub-a .w:not(.d)"),
      aDots: $$(".sub-a .d"),
      bWords: $$(".sub-b .w:not(.d)"),
      bDots: $$(".sub-b .d"),
    };
    const allSubWords = $$(".sub .w");

    // Every timer and animation runs at the playground's speed.
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms / speed));
    const animate = (el: Element, kf: Keyframe[], opts: KeyframeAnimationOptions = {}) => {
      const a = el.animate(kf, opts);
      a.playbackRate = speed;
      return a;
    };
    let runId = 0;

    function setWord(t: { line: HTMLElement; word: HTMLElement }, str: string) {
      t.word.textContent = str;
      t.line.classList.toggle("has-text", str.length > 0);
    }

    /* The caret stretches thin and tall as it drops, squashes into the pink full stop on the baseline,
       bounces up and settles. Every frame keeps margin-left + width + margin-right equal to the caret's
       footprint (growth is split either side), so "Hello" never shifts. */
    function morphCursorToDot() {
      const c = hello.cursor;
      const cs = getComputedStyle(c);

      const m = document.createElement("i"); // temporary element to read the dot size and colour
      m.style.cssText = "position:absolute;visibility:hidden;width:var(--dot-hello-size);background:var(--accent)";
      $(".frame").append(m);
      const ms = getComputedStyle(m);
      const D = parseFloat(ms.width), colour = ms.backgroundColor;
      m.remove();

      const cw = parseFloat(cs.width), ch = parseFloat(cs.height), g = parseFloat(cs.marginLeft);
      const r = c.getBoundingClientRect();
      const baseline = hello.probe.getBoundingClientRect().top;
      const dy = (baseline - D / 2) - (r.top + r.height / 2); // resting centre: dot sits on the baseline
      const grounded = (h: number) => dy + (D - h) / 2; // keeps the bottom edge on the baseline

      const f = (offset: number, w: number, h: number, y: number, easing: string, extra?: Keyframe): Keyframe => ({
        offset, easing,
        width: `${w}px`, height: `${h}px`,
        marginLeft: `${g - (w - cw) / 2}px`, marginRight: `${-(w - cw) / 2}px`,
        translate: `0 ${y}px`, ...extra,
      });

      return animate(c, [
        f(0, cw, ch, 0, "cubic-bezier(.3,0,.7,1)", { backgroundColor: cs.backgroundColor }),
        f(0.28, cw * 0.7, ch * 1.18, dy * 0.3, "cubic-bezier(.5,0,.9,.6)"), // stretches as it lets go
        f(0.50, D * 1.5, D * 0.62, grounded(D * 0.62), "cubic-bezier(.2,.7,.4,1)", { backgroundColor: colour }), // impact squash
        f(0.72, D * 0.88, D * 1.15, dy - D * 3.2, "cubic-bezier(.6,0,.9,.5)", { backgroundColor: colour }), // bounce apex, stretched
        f(0.88, D * 1.18, D * 0.82, grounded(D * 0.82), "cubic-bezier(.2,.7,.4,1)", { backgroundColor: colour }), // small landing squash
        f(1, D, D, dy, "linear", { backgroundColor: colour }), // settled
      ], { duration: T.morphMs, fill: "forwards" });
    }

    /* ---- Slide faces ---- */
    const introEl = $(".stack");
    const phraseWrap = $(".phrase-wrap");
    const labelWrap = $(".label-wrap");
    $("#hero-intro-sr").textContent = SLIDES.map((sl) => sl.text).join(", ") + ", and this is my portfolio";

    // Built fresh on every run (the effect reruns on replay), so the faces never double up.
    phraseWrap.replaceChildren();
    labelWrap.replaceChildren();
    const faces = SLIDES.map((sl) => {
      const p = document.createElement("span"); p.className = "phrase"; p.textContent = sl.text; p.style.color = sl.fg;
      const n = document.createElement("span"); n.className = "no"; n.textContent = sl.no; n.style.color = sl.label;
      phraseWrap.append(p); labelWrap.append(n);
      return { p, n, sl };
    });

    function setSlideColours(sl: { bg: string }, instant: boolean) {
      root.style.setProperty("--invert-ms", instant ? "0ms" : `${S.bgMs}ms`);
      root.style.setProperty("--stage-bg", sl.bg);
    }

    /* Roll the drum forward one face. For the first slide the intro block simply fades out as the slide rolls in. */
    function rollTo(i: number, instant: boolean) {
      const next = faces[i];
      const outs = i > 0 ? [{ el: faces[i - 1].p, d: 0 }, { el: faces[i - 1].n, d: S.labelDelay }] : [{ el: introEl, d: 0 }];

      setSlideColours(next.sl, instant);
      next.p.style.visibility = next.n.style.visibility = "visible";

      if (instant) { outs.forEach(({ el }) => hideFace(el)); return; }

      const opts = (delay: number): KeyframeAnimationOptions => ({ duration: S.rollMs, delay, easing: EASE.roll, fill: "both" });
      const into = [{ transform: "rotateX(-90deg)" }, { transform: "rotateX(0deg)" }];
      const away = [{ transform: "rotateX(0deg)" }, { transform: "rotateX(90deg)" }];
      animate(next.p, into, opts(0));
      animate(next.n, into, opts(S.labelDelay));
      if (i > 0) outs.forEach(({ el, d }) => animate(el, away, opts(d)));
      else animate(introEl, [{ opacity: 1 }, { opacity: 0 }], { duration: S.introFadeMs, easing: EASE.fade, fill: "forwards" });
    }

    // The intro block is removed from the page entirely once it has rolled away, so nothing in it
    // (including the specialising line) can show through behind the slides
    function hideFace(el: HTMLElement) {
      if (el === introEl) el.style.display = "none";
      else el.style.visibility = "hidden";
    }

    function finishRoll(i: number) {
      const outs = i > 0 ? [faces[i - 1].p, faces[i - 1].n] : [introEl];
      outs.forEach((el) => { hideFace(el); el.getAnimations().forEach((a) => a.cancel()); });
    }

    async function runSlides(wait: (ms: number) => Promise<void>, instant: boolean) {
      for (let i = 0; i < faces.length; i++) {
        rollTo(i, instant);
        await wait(instant ? 0 : S.rollMs + S.labelDelay);
        finishRoll(i);
        if (i < faces.length - 1) {
          const words = SLIDES[i].text.split(/\s+/).length;
          await wait(S.holdBase + S.holdPerWord * words);
        }
      }
    }

    const closing = $(".closing");
    const andText = $(".and-text");
    const stop = $(".stop");
    const isWords = $(".is-words");
    isWords.replaceChildren();
    const closingChars = [..."is my portfolio"].map((c) => {
      const s = document.createElement("span"); s.className = "ch"; s.textContent = c; isWords.append(s); return s;
    });

    const glitchPick = () => GLITCH_SYMBOLS[Math.floor(Math.random() * GLITCH_SYMBOLS.length)];
    const glitchTimers: ReturnType<typeof setTimeout>[] = [];
    function glitchBurst() {
      const letters = closingChars.slice(-"portfolio".length);
      [...letters].sort(() => Math.random() - 0.5).slice(0, C.glitchCount).forEach((el) => {
        const original = el.textContent;
        el.style.width = `${el.getBoundingClientRect().width}px`;
        glitchTimers.push(setTimeout(() => {
          const tick = setInterval(() => { el.textContent = glitchPick(); }, C.glitchTick / speed);
          el.textContent = glitchPick();
          glitchTimers.push(setTimeout(() => { clearInterval(tick); el.textContent = original; }, (C.glitchMin + Math.random() * C.glitchSpread) / speed));
          glitchTimers.push(tick);
        }, (Math.random() * C.glitchStart) / speed));
      });
    }
    function glitchReset() {
      glitchTimers.forEach((t) => { clearTimeout(t); clearInterval(t); });
      glitchTimers.length = 0;
      closingChars.forEach((el, i) => { el.textContent = "is my portfolio"[i]; el.style.width = ""; });
    }

    async function runClosing(wait: (ms: number) => Promise<void>) {
      const last = faces[faces.length - 1];

      // Slide 04 rolls away to the light stage; "and this" swipes up through its mask
      setSlideColours(PAGE_LIGHT, false);
      const away = [{ transform: "rotateX(0deg)" }, { transform: "rotateX(90deg)" }];
      animate(last.p, away, { duration: S.rollMs, easing: EASE.roll, fill: "both" });
      animate(last.n, away, { duration: S.rollMs, delay: S.labelDelay, easing: EASE.roll, fill: "both" });
      await wait(C.andDelay);

      closing.style.visibility = "visible";
      animate(andText, [{ translate: "0 110%" }, { translate: "0 0" }], { duration: C.andMs, easing: EASE.reveal, fill: "both" });
      const rollLeft = Math.max(0, S.rollMs + S.labelDelay - C.andDelay);
      await wait(rollLeft);
      [last.p, last.n].forEach((el) => { hideFace(el); el.getAnimations().forEach((a) => a.cancel()); });
      await wait(Math.max(0, C.andMs - rollLeft) + C.andHold);

      // Background drops to the page colour; "is my portfolio" bounces in letter by letter
      setSlideColours(PAGE_DARK, false);
      closing.classList.add("dark");
      await wait(C.charDelay);
      closingChars.forEach((el, i) => animate(el, BOUNCE, {
        duration: C.charMs, delay: i * jitter(C.charStagger, 1), easing: "ease-out", fill: "both" }));
      await wait(closingChars.length * C.charStagger + C.charMs + C.folioHold);

      // The pink full stop drops onto the baseline, with the same slight overshoot as after "Hello"
      animate(stop, [
        { translate: "0 -0.9em", scale: "0.7 1.35", opacity: 0, offset: 0, easing: "cubic-bezier(.5,0,.9,.6)" },
        { translate: "0 -0.45em", scale: "0.8 1.25", opacity: 1, offset: 0.2, easing: "cubic-bezier(.5,0,.9,.6)" },
        { translate: "0 0", scale: "1.5 0.6", opacity: 1, offset: 0.5, easing: "cubic-bezier(.2,.7,.4,1)" },
        { translate: "0 -0.2em", scale: "0.9 1.12", opacity: 1, offset: 0.72, easing: "cubic-bezier(.6,0,.9,.5)" },
        { translate: "0 0", scale: "1.15 0.85", opacity: 1, offset: 0.88, easing: "linear" },
        { translate: "0 0", scale: "1 1", opacity: 1, offset: 1 },
      ], { duration: C.stopMs, fill: "forwards" });
      await wait(C.stopMs + C.readHold);

      // One short glitch burst on "portfolio", then a beat on the restored line
      glitchBurst();
      await wait(C.glitchWait + C.postGlitchHold);

      // Fade the content out onto the page-coloured background
      animate(closing, [{ opacity: 1 }, { opacity: 0 }], { duration: C.fadeMs, easing: EASE.fade, fill: "forwards" });
    }

    async function showClosingFinal(wait: (ms: number) => Promise<void>) { // reduced motion: the same beats as cuts
      const last = faces[faces.length - 1];
      hideFace(last.p); hideFace(last.n);
      setSlideColours(PAGE_DARK, true);
      closing.style.visibility = "visible";
      closing.classList.add("dark");
      closingChars.forEach((el) => { el.style.opacity = "1"; });
      stop.style.opacity = "1";
      await wait(50 + C.endHold);
      closing.style.visibility = "hidden";
    }

    function reset() {
      root.classList.add("snap"); // snap everything back, no transitions
      root.classList.remove("inverted");

      imEl.getAnimations().forEach((a) => a.cancel());
      imText.getAnimations().forEach((a) => a.cancel());
      hello.line.getAnimations().forEach((a) => a.cancel());

      setWord(hello, "");
      hello.cursor.getAnimations().forEach((a) => a.cancel());
      hello.cursor.className = "cursor";
      hello.line.classList.remove("gone");

      imEl.className = "im";
      setWord(name, "");
      name.cursor.className = "cursor";

      allSubWords.forEach((el) => { el.getAnimations().forEach((a) => a.cancel()); el.style.translate = ""; el.style.visibility = ""; });
      sub.a.style.display = "";
      sub.b.classList.remove("live");

      introEl.getAnimations().forEach((a) => a.cancel());
      introEl.style.visibility = "";
      introEl.style.display = "";
      faces.forEach(({ p, n }) => [p, n].forEach((el) => { el.getAnimations().forEach((a) => a.cancel()); el.style.visibility = "hidden"; }));
      ["--stage-bg", "--invert-ms"].forEach((v) => root.style.removeProperty(v));

      closing.getAnimations({ subtree: true }).forEach((a) => a.cancel());
      glitchReset();
      closing.style.visibility = "";
      closing.classList.remove("dark");
      closingChars.forEach((el) => { el.style.opacity = ""; });
      stop.style.opacity = "";

      void root.offsetWidth; // flush styles
      root.classList.remove("snap");
    }

    function showFinal() {
      reset();
      hello.line.classList.add("gone");
      imEl.className = "im show lift";
      setWord(name, NAME);
      sub.a.style.display = "none"; // final state: the second line
      sub.b.classList.add("live");
      [...sub.bWords, ...sub.bDots].forEach((el) => { el.style.translate = "0 0"; el.style.visibility = "visible"; });
      root.classList.add("snap");
      root.classList.add("inverted");
      void root.offsetWidth;
      root.classList.remove("snap");
    }

    async function play() {
      const id = ++runId;
      const wait = async (ms: number) => { await sleep(ms); if (id !== runId) throw CANCELLED; };

      reset();
      if (reduced) { // no motion: same beats, as simple cuts
        showFinal();
        try { await wait(S.introHold + 400); await runSlides(wait, true); await wait(C.lastHold); await showClosingFinal(wait); }
        catch (e) { if (e !== CANCELLED) throw e; }
        return;
      }

      try {
        // Wait for Satoshi so nothing flashes in a fallback face
        try {
          await Promise.race([
            Promise.all([...["300", "500", "700"].map((w) => document.fonts.load(`${w} 136px Satoshi`)),
              document.fonts.load("400 67px \"Roboto Mono\"")]),
            new Promise((r) => setTimeout(r, 1500)),
          ]);
        } catch { /* fall back silently */ }
        if (id !== runId) return;

        /* ================= Part 1: Hello. ================= */
        await wait(T.startDelay);

        hello.cursor.classList.add("on"); // caret appears and blinks at the system rate
        await wait(BLINK);
        hello.cursor.classList.remove("on");
        await wait(BLINK);
        hello.cursor.classList.add("on");
        await wait(T.lead);

        for (let i = 0; i < HELLO.length; i++) {
          await wait(jitter(T.helloKeys[i]));
          setWord(hello, HELLO.slice(0, i + 1));
        }

        await wait(T.morphDelay);
        morphCursorToDot(); // the caret drops and becomes the pink full stop
        await wait(T.morphMs + T.tail + T.helloHold);

        /* ================= Part 2: I’m ================= */
        // "Hello." swipes up and out while the colours wash across; "I’m" swipes up into view behind it
        const out = animate(hello.line, [{ translate: "0 0" }, { translate: "0 -110%" }],
          { duration: T.helloOutMs, easing: EASE.exit, fill: "forwards" });
        root.classList.add("inverted");
        await wait(T.imInDelay);

        imEl.classList.add("show");
        animate(imText, [{ translate: "0 110%" }, { translate: "0 0" }], { duration: T.revealMs, easing: EASE.reveal });

        await wait(T.helloOutMs - T.imInDelay);
        hello.line.classList.add("gone");
        out.cancel();
        await wait(T.revealMs - (T.helloOutMs - T.imInDelay) + T.imHold);

        // Lift: the class sets the final state, the animations carry it there
        imEl.classList.add("lift");
        const cs = getComputedStyle(imEl);
        const toT = cs.translate, toS = cs.scale;
        animate(imEl, [{ translate: "0px 0px" }, { translate: toT }], { duration: T.liftMs, easing: EASE.glide });
        animate(imEl, [{ scale: 1 }, { scale: toS }], { duration: T.liftScaleMs, easing: EASE.glide });

        await wait(T.caretAfterLift);

        name.cursor.classList.add("on"); // caret appears where the name will start
        await wait(T.nameLead);

        for (let i = 0; i < NAME.length; i++) {
          await wait(jitter(T.nameKeys[i], NAME_PACE));
          setWord(name, NAME.slice(0, i + 1));
        }

        await wait(T.nameTail);
        name.cursor.classList.add("fade"); // caret fades; name stays where it landed
        name.cursor.classList.remove("on");
        await wait(T.subDelay);

        /* ================= Part 3: subtitle ================= */
        const rise = (el: Element, delay: number, dur: number) => animate(el,
          [{ translate: "0 150%" }, { translate: "0 0" }], { duration: dur, delay, easing: EASE.reveal, fill: "both" });

        // Line one: the words rise in first, then the three dots arrive last, one by one
        sub.aWords.forEach((el, i) => rise(el, i * T.subStagger, T.subRevealMs));
        const aDotsStart = sub.aWords.length * T.subStagger;
        sub.aDots.forEach((el, k) => rise(el, aDotsStart + k * T.dotStagger, T.dotMs));
        await wait(aDotsStart + (sub.aDots.length - 1) * T.dotStagger + T.dotMs + T.subHold);

        // Transition: line one's words, then its dots, swipe up and out...
        [...sub.aWords, ...sub.aDots].forEach((el, i) => animate(el,
          [{ translate: "0 0" }, { translate: "0 -125%" }],
          { duration: T.outMs, delay: i * T.outStagger, easing: EASE.exit, fill: "forwards" }));

        // ...and line two arrives with its three dots first, one by one, then its words
        sub.b.classList.add("live");
        sub.bDots.forEach((el, k) => rise(el, T.inDelay + k * T.dotStagger, T.dotMs));
        const bWordsStart = T.inDelay + (sub.bDots.length - 1) * T.dotStagger + T.dotsToWords;
        sub.bWords.forEach((el, i) => rise(el, bWordsStart + i * T.inStagger, T.inMs));
        const subEnd = bWordsStart + (sub.bWords.length - 1) * T.inStagger + T.inMs;
        await wait(subEnd + S.introHold);

        /* ================= Part 4: the four phrase slides ================= */
        await runSlides(wait, false);

        /* ================= Part 5: closing ================= */
        await wait(C.lastHold);
        await runClosing(wait);
      } catch (e) {
        if (e !== CANCELLED) throw e;
      }
    }

    play();
    return () => {
      runId++; // stops the running sequence at its next wait
      glitchReset();
      root.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    };
  }, [runKey, speed, reduced]);

  return (
    <div ref={ref} className="hero-intro absolute inset-0" style={{ "--speed": speed } as React.CSSProperties}>
      <main className="stage">
        <div className="frame">
          <h1 className="stack" aria-label="Hello. I’m Liam Haire, a multi-discipline digital designer specialising in UX / UI design">
            <span className="mask">
              <span className="line hello" aria-hidden="true">
                <span className="text"><span className="word"></span><span className="probe"></span></span><span className="cursor"></span>
              </span>
            </span>
            <span className="im" aria-hidden="true"><span className="mask"><span className="im-text">I’m</span></span></span>
            <span className="line name" aria-hidden="true">
              <span className="text"><span className="word"></span></span><span className="cursor"></span>
            </span>
            <span className="sub" aria-hidden="true">
              <span className="mask sub-a">
                <span className="sub-line">
                  <span className="w">a</span> <span className="w">multi-discipline</span> <span className="w">digital</span>{" "}
                  <span className="w">designer</span>
                  <span className="dots"><span className="w d">.</span><span className="w d">.</span><span className="w d">.</span></span>
                </span>
              </span>
              <span className="mask sub-b">
                <span className="sub-line">
                  <span className="dots"><span className="w d">.</span><span className="w d">.</span><span className="w d">.</span></span>
                  <span className="w">specialising</span> <span className="w">in</span> <span className="w">UX</span>{" "}
                  <span className="w">/</span> <span className="w">UI</span> <span className="w">design</span>
                </span>
              </span>
            </span>
          </h1>
          <p className="sr-only" id="hero-intro-sr"></p>
          <div className="phrase-wrap" aria-hidden="true"></div>
          <div className="label-wrap" aria-hidden="true"></div>
          <div className="closing" aria-hidden="true">
            <span className="and"><span className="mask"><span className="and-text">and this</span></span></span>
            <span className="is-line"><span className="is-words"></span><span className="stop"></span></span>
          </div>
        </div>
      </main>
    </div>
  );
}
