import { useEffect, useState } from "react";
import { Playground } from "./Playground";
import { ANIMATIONS } from "./animations";
import { type Settings, Stage, Toolbar } from "./stage";

const useHash = () => {
  const [hash, setHash] = useState(() => window.location.hash.replace(/^#/, "") || "/");
  useEffect(() => {
    const on = () => setHash(window.location.hash.replace(/^#/, "") || "/");
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash;
};

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <a
      href={`#${href}`}
      aria-current={active ? "page" : undefined}
      className={`block rounded-md px-3 py-1.5 text-sm transition-colors duration-150 ${active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`}
    >
      {children}
    </a>
  );
}

// Chrome-free 1920x1080 stage used by scripts/render.mjs. The animation mounts only when the script calls window.__go(),
// so the script controls when time zero is.
function RenderView({ id, light }: { id: string; light: boolean }) {
  const [go, setGo] = useState(false);
  useEffect(() => {
    (window as unknown as { __go: () => void }).__go = () => setGo(true);
  }, []);
  const anim = ANIMATIONS.find((a) => a.id === id);
  if (!anim) return null;
  const { Comp } = anim;
  return (
    <div
      data-stage
      className={`${light ? "stage-light" : ""} flex items-center justify-center overflow-hidden`}
      style={{ position: "fixed", inset: 0, width: 1920, height: 1080, background: "var(--stage-bg)", containerType: "inline-size" }}
    >
      {go && <Comp runKey={0} speed={1} reduced={false} />}
    </div>
  );
}

export function App() {
  const route = useHash();
  const [s, setS] = useState<Settings>({ light: false, aspect: "16:9", speed: 1, reduced: false, sound: false });
  const set = (p: Partial<Settings>) => setS((prev) => ({ ...prev, ...p }));

  const [path, query = ""] = route.split("?");
  if (path.startsWith("/render/")) {
    return <RenderView id={path.slice("/render/".length)} light={new URLSearchParams(query).get("theme") === "light"} />;
  }

  const anim = route.startsWith("/animations/") ? ANIMATIONS.find((a) => a.id === route.slice("/animations/".length)) : undefined;

  return (
    <div className="flex min-h-screen">
      <nav className="sticky top-0 flex h-screen w-60 shrink-0 flex-col gap-6 border-r border-white/10 p-4">
        <div className="px-3 text-sm font-medium">Animations</div>
        <NavLink href="/" active={route === "/"}>Playground</NavLink>
        <div>
          <div className="mb-1 px-3 text-[11px] tracking-wide text-white/40 uppercase">Animations</div>
          <div className="flex flex-col gap-0.5">
            {ANIMATIONS.map((a) => (
              <NavLink key={a.id} href={`/animations/${a.id}`} active={anim?.id === a.id}>{a.name}</NavLink>
            ))}
            {ANIMATIONS.length === 0 && <p className="px-3 text-xs text-white/40">None yet</p>}
          </div>
        </div>
      </nav>
      <main className="min-w-0 flex-1 p-8">
        <div className="mx-auto max-w-5xl">
          {anim ? (
            <>
              <Toolbar title={anim.name} s={s} set={set} />
              <Stage key={anim.id} name={anim.name} note={anim.description} Comp={anim.Comp} s={s} large />
            </>
          ) : (
            <Playground s={s} set={set} />
          )}
        </div>
      </main>
    </div>
  );
}
