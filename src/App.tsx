import React, { useMemo, useRef, useState, useEffect } from "react";
import QRCode from "qrcode";

/**
 * LoopCard — single-file, local-first React app
 * -------------------------------------------------
 * Features
 * - Setup Wizard → Dashboard → Public Card → Settings
 * - Required fields validation (no skipping)
 * - Circular avatar (shows once, only on Public Card)
 * - Scannable QR (local URL) + one-click PNG download
 * - LocalStorage persistence (works fully offline)
 * - Optional Supabase sync hooks (paste your keys below)
 *
 * How to wire Supabase (optional):
 * 1) npm i @supabase/supabase-js
 * 2) Put your URL/Anon key below
 * 3) Toggle enableSupabase to true in settings UI
 */

// ⬇️ Insert your Supabase credentials here if you want cloud sync
const SUPABASE_URL = ""; // e.g. https://xxxxxxxxxxxx.supabase.co
const SUPABASE_ANON_KEY = ""; // e.g. eyJhbGciOi...

// ---- Light-weight store using localStorage --------------------------------
const defaultState = {
  businessName: "",
  fullName: "",
  phone: "",
  whatsapp: "",
  email: "",
  website: "",
  bio: "",
  address: "",
  avatarDataUrl: "",
  slug: "",
  colorHex: "#232a3b",
  enableSupabase: false,
};

const loadState = () => {
  try {
    const raw = localStorage.getItem("loopcard_state_v1");
    return raw ? { ...defaultState, ...JSON.parse(raw) } : defaultState;
  } catch {
    return defaultState;
  }
};

const saveState = (s) => localStorage.setItem("loopcard_state_v1", JSON.stringify(s));

// ---- Helpers ----------------------------------------------------------------
const required = [
  "businessName",
  "fullName",
  "phone",
  "whatsapp",
  "email",
  "bio",
  "slug",
];

const isEmail = (v) => /.+@.+\..+/.test(v);
const isPhone = (v) => /\d{5,}/.test(v);

function useFormState() {
  const [state, setState] = useState(loadState());
  useEffect(() => saveState(state), [state]);
  return [state, setState];
}

function label(cls, children) {
  return <label className={"text-sm font-medium text-slate-700 " + (cls || "")}>{children}</label>;
}

function Input({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
  );
}

function Button({ children, onClick, variant = "primary", disabled }) {
  const base = "px-4 py-2 rounded-2xl text-sm font-semibold transition shadow-sm ";
  const styles =
    variant === "primary"
      ? "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
      : variant === "ghost"
      ? "bg-transparent text-slate-700 hover:bg-slate-100"
      : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50";
  return (
    <button onClick={onClick} disabled={disabled} className={base + styles}>
      {children}
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

// ---- Main App ---------------------------------------------------------------
export default function App() {
  const [route, setRoute] = useState("wizard"); // wizard | dashboard | public | settings
  const [s, setS] = useFormState();

  useEffect(() => {
    // start at dashboard if already filled
    const allOk = required.every((k) => !!s[k]);
    if (allOk && route === "wizard") setRoute("dashboard");
  }, []); // mount only

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header onNav={setRoute} route={route} colorHex={s.colorHex} />
      <main className="mx-auto max-w-4xl p-4 sm:p-6">
        {route === "wizard" && <Wizard s={s} setS={setS} onDone={() => setRoute("dashboard")} />}
        {route === "dashboard" && <Dashboard s={s} onPreview={() => setRoute("public")} onSettings={() => setRoute("settings")} />}
        {route === "public" && <PublicCard s={s} onBack={() => setRoute("dashboard")} />}
        {route === "settings" && <Settings s={s} setS={setS} onBack={() => setRoute("dashboard")} />}
      </main>
      <Footer />
    </div>
  );
}

function Header({ onNav, route, colorHex }) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl" style={{ background: colorHex }} />
          <span className="text-base font-bold">LoopCard</span>
        </div>
        <nav className="flex items-center gap-2">
          <Button variant={route === "dashboard" ? "primary" : "outline"} onClick={() => onNav("dashboard")}>Dashboard</Button>
          <Button variant={route === "public" ? "primary" : "outline"} onClick={() => onNav("public")}>Public Card</Button>
          <Button variant={route === "settings" ? "primary" : "outline"} onClick={() => onNav("settings")}>Settings</Button>
        </nav>
      </div>
    </header>
  );
}

function Wizard({ s, setS, onDone }) {
  const [step, setStep] = useState(1);

  const next = () => setStep((x) => x + 1);
  const back = () => setStep((x) => x - 1);

  const canContinue = useMemo(() => {
    if (step === 1) return s.businessName && s.fullName && s.slug;
    if (step === 2) return isPhone(s.phone) && isPhone(s.whatsapp) && isEmail(s.email);
    if (step === 3) return !!s.bio;
    if (step === 4) return true; // avatar optional
    return false;
  }, [step, s]);

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-4 text-2xl font-bold">Setup Wizard</h2>

      {step === 1 && (
        <div className="rounded-2xl bg-white p-4 shadow">
          <Section title="Identity">
            <div>
              {label("", "Business Name *")}
              <Input value={s.businessName} onChange={(v) => setS((p) => ({ ...p, businessName: v }))} placeholder="e.g. MVR Farms / Enzura" />
            </div>
            <div>
              {label("", "Your Name *")}
              <Input value={s.fullName} onChange={(v) => setS((p) => ({ ...p, fullName: v }))} placeholder="e.g. Vishnu Vardhan" />
            </div>
            <div>
              {label("", "Card Handle (slug) *")}
              <Input value={s.slug} onChange={(v) => setS((p) => ({ ...p, slug: v.replace(/[^a-z0-9-]/gi, "").toLowerCase() }))} placeholder="e.g. vishnu-vardhan" />
              <p className="mt-1 text-xs text-slate-500">Your public URL will be <code>http://localhost:5173/u/{s.slug || "your-handle"}</code></p>
            </div>
          </Section>
        </div>
      )}

      {step === 2 && (
        <div className="rounded-2xl bg-white p-4 shadow">
          <Section title="Contacts">
            <div>
              {label("", "Phone *")}
              <Input value={s.phone} onChange={(v) => setS((p) => ({ ...p, phone: v }))} placeholder="e.g. +91 90000 00000" />
            </div>
            <div>
              {label("", "WhatsApp *")}
              <Input value={s.whatsapp} onChange={(v) => setS((p) => ({ ...p, whatsapp: v }))} placeholder="e.g. +91 90000 00000" />
            </div>
            <div>
              {label("", "Email *")}
              <Input type="email" value={s.email} onChange={(v) => setS((p) => ({ ...p, email: v }))} placeholder="e.g. you@example.com" />
            </div>
            <div>
              {label("", "Website")}
              <Input value={s.website} onChange={(v) => setS((p) => ({ ...p, website: v }))} placeholder="Optional" />
            </div>
          </Section>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-2xl bg-white p-4 shadow">
          <Section title="About">
            <div className="sm:col-span-2">
              {label("", "Short Bio (what you offer) *")}
              <Textarea value={s.bio} onChange={(v) => setS((p) => ({ ...p, bio: v }))} placeholder="1–2 lines about your business" rows={4} />
            </div>
            <div className="sm:col-span-2">
              {label("", "Address")}
              <Textarea value={s.address} onChange={(v) => setS((p) => ({ ...p, address: v }))} placeholder="Optional" rows={2} />
            </div>
          </Section>
        </div>
      )}

      {step === 4 && (
        <div className="rounded-2xl bg-white p-4 shadow">
          <Section title="Avatar (optional)">
            <div className="sm:col-span-2">
              {label("", "Upload Profile Photo (PNG/JPG)")}
              <AvatarPicker s={s} setS={setS} />
            </div>
          </Section>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <Button variant="ghost" onClick={back} disabled={step === 1}>Back</Button>
        {step < 4 ? (
          <Button onClick={next} disabled={!canContinue}>Continue</Button>
        ) : (
          <Button onClick={onDone} disabled={!required.every((k) => !!s[k]) || !isPhone(s.phone) || !isPhone(s.whatsapp) || !isEmail(s.email)}>Finish</Button>
        )}
      </div>
    </div>
  );
}

function AvatarPicker({ s, setS }) {
  const onPick = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setS((p) => ({ ...p, avatarDataUrl: e.target?.result || "" }));
    reader.readAsDataURL(file);
  };
  return (
    <div className="flex items-center gap-3">
      <div className="h-20 w-20 overflow-hidden rounded-full bg-slate-200">
        {s.avatarDataUrl ? (
          <img src={s.avatarDataUrl} alt="avatar" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">No image</div>
        )}
      </div>
      <input type="file" accept="image/*" onChange={(e) => onPick(e.target.files?.[0])} />
      {s.avatarDataUrl && (
        <Button variant="outline" onClick={() => setS((p) => ({ ...p, avatarDataUrl: "" }))}>Remove</Button>
      )}
    </div>
  );
}

function Dashboard({ s, onPreview, onSettings }) {
  const url = `http://localhost:5173/u/${s.slug || "your-handle"}`;
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const make = async () => {
      try {
        setBusy(true);
        const dataUrl = await QRCode.toDataURL(url, { width: 512, margin: 2 });
        setQrDataUrl(dataUrl);
      } finally {
        setBusy(false);
      }
    };
    make();
  }, [url]);

  const download = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `loopcard_${s.slug || "card"}.png`;
    a.click();
  };

  const allOk = required.every((k) => !!s[k]) && isPhone(s.phone) && isPhone(s.whatsapp) && isEmail(s.email);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="rounded-2xl bg-white p-4 shadow">
        <h2 className="mb-2 text-xl font-bold">Your Card Summary</h2>
        <ul className="space-y-1 text-sm text-slate-700">
          <li><b>Business:</b> {s.businessName || "–"}</li>
          <li><b>Name:</b> {s.fullName || "–"}</li>
          <li><b>Phone:</b> {s.phone || "–"}</li>
          <li><b>WhatsApp:</b> {s.whatsapp || "–"}</li>
          <li><b>Email:</b> {s.email || "–"}</li>
          {s.website && <li><b>Website:</b> {s.website}</li>}
          <li><b>Handle:</b> {s.slug || "–"}</li>
        </ul>
        <div className="mt-4 flex gap-2">
          <Button onClick={onPreview} disabled={!allOk}>Open Public Card</Button>
          <Button variant="outline" onClick={onSettings}>Edit Settings</Button>
        </div>
        {!allOk && <p className="mt-2 text-xs text-rose-600">Complete all required fields in Wizard/Settings to enable Public Card.</p>}
      </div>

      <div className="rounded-2xl bg-white p-4 shadow">
        <h2 className="mb-2 text-xl font-bold">QR Code</h2>
        <p className="mb-2 text-sm text-slate-600">Scan to open: <code>{url}</code></p>
        <div className="flex items-center justify-center">
          <div className="aspect-square w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2">
            {busy ? (
              <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">Generating…</div>
            ) : qrDataUrl ? (
              <img src={qrDataUrl} alt="QR" className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">No QR</div>
            )}
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={download} disabled={!qrDataUrl}>Download PNG</Button>
          <Button variant="outline" onClick={() => navigator.clipboard.writeText(url)}>Copy URL</Button>
        </div>
      </div>
    </div>
  );
}

function PublicCard({ s, onBack }) {
  const url = `http://localhost:5173/u/${s.slug}`;
  const canShow = required.every((k) => !!s[k]) && isPhone(s.phone) && isPhone(s.whatsapp) && isEmail(s.email);

  if (!canShow) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow">
        <p className="text-sm text-rose-600">Complete all required fields to view the public card.</p>
        <div className="mt-2"><Button variant="outline" onClick={onBack}>Back</Button></div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow">
      <div className="relative h-28 w-full" style={{ background: s.colorHex }} />
      <div className="-mt-10 flex items-end gap-3 px-4">
        {s.avatarDataUrl && (
          <img src={s.avatarDataUrl} alt="avatar" className="h-20 w-20 rounded-full border-4 border-white object-cover shadow" />
        )}
        <div className="pb-2">
          <h1 className="text-xl font-bold">{s.businessName}</h1>
          <p className="-mt-0.5 text-sm text-slate-600">{s.fullName}</p>
        </div>
      </div>

      <div className="grid gap-3 p-4">
        <p className="text-sm leading-6 text-slate-800">{s.bio}</p>
        {s.address && <p className="text-xs text-slate-500">📍 {s.address}</p>}

        <div className="grid grid-cols-2 gap-2">
          <a className="rounded-2xl border border-slate-200 p-3 text-center text-sm font-semibold hover:bg-slate-50" href={`tel:${s.phone}`}>Call</a>
          <a className="rounded-2xl border border-slate-200 p-3 text-center text-sm font-semibold hover:bg-slate-50" href={`https://wa.me/${s.whatsapp.replace(/\D/g, "")}`} target="_blank">WhatsApp</a>
          <a className="rounded-2xl border border-slate-200 p-3 text-center text-sm font-semibold hover:bg-slate-50" href={`mailto:${s.email}`}>Email</a>
          {s.website && <a className="rounded-2xl border border-slate-200 p-3 text-center text-sm font-semibold hover:bg-slate-50" href={s.website} target="_blank">Website</a>}
        </div>

        <div className="mt-2 rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
          Public URL: <code>{url}</code>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-slate-50 p-3 text-center text-xs text-slate-500">LoopCard · Local Preview</div>

      <div className="p-4">
        <Button variant="outline" onClick={onBack}>Back to Dashboard</Button>
      </div>
    </div>
  );
}

function Settings({ s, setS, onBack }) {
  const [tmp, setTmp] = useState(s);
  const save = () => setS(tmp);

  const allOk = required.every((k) => !!tmp[k]) && isPhone(tmp.phone) && isPhone(tmp.whatsapp) && isEmail(tmp.email);

  return (
    <div className="rounded-2xl bg-white p-4 shadow">
      <h2 className="mb-3 text-xl font-bold">Settings</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          {label("", "Theme Color")}
          <input type="color" value={tmp.colorHex} onChange={(e) => setTmp((p) => ({ ...p, colorHex: e.target.value }))} className="h-10 w-full cursor-pointer rounded-xl border border-slate-300" />
        </div>
        <div>
          {label("", "Enable Supabase Sync (optional)")}
          <select className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={tmp.enableSupabase ? "yes" : "no"} onChange={(e) => setTmp((p) => ({ ...p, enableSupabase: e.target.value === "yes" }))}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
          {!SUPABASE_URL && tmp.enableSupabase && (
            <p className="mt-1 text-xs text-rose-600">Add SUPABASE_URL and SUPABASE_ANON_KEY in code to use sync.</p>
          )}
        </div>
      </div>

      <Section title="Edit Details">
        <div>
          {label("", "Business Name *")}
          <Input value={tmp.businessName} onChange={(v) => setTmp((p) => ({ ...p, businessName: v }))} placeholder="Business" />
        </div>
        <div>
          {label("", "Full Name *")}
          <Input value={tmp.fullName} onChange={(v) => setTmp((p) => ({ ...p, fullName: v }))} placeholder="Your full name" />
        </div>
        <div>
          {label("", "Phone *")}
          <Input value={tmp.phone} onChange={(v) => setTmp((p) => ({ ...p, phone: v }))} placeholder="Phone" />
        </div>
        <div>
          {label("", "WhatsApp *")}
          <Input value={tmp.whatsapp} onChange={(v) => setTmp((p) => ({ ...p, whatsapp: v }))} placeholder="WhatsApp" />
        </div>
        <div>
          {label("", "Email *")}
          <Input type="email" value={tmp.email} onChange={(v) => setTmp((p) => ({ ...p, email: v }))} placeholder="Email" />
        </div>
        <div>
          {label("", "Website")}
          <Input value={tmp.website} onChange={(v) => setTmp((p) => ({ ...p, website: v }))} placeholder="Website (optional)" />
        </div>
        <div className="sm:col-span-2">
          {label("", "Bio *")}
          <Textarea value={tmp.bio} onChange={(v) => setTmp((p) => ({ ...p, bio: v }))} placeholder="1–2 lines" rows={3} />
        </div>
        <div className="sm:col-span-2">
          {label("", "Address")}
          <Textarea value={tmp.address} onChange={(v) => setTmp((p) => ({ ...p, address: v }))} placeholder="Optional" rows={2} />
        </div>
        <div className="sm:col-span-2">
          {label("", "Handle (slug) *")}
          <Input value={tmp.slug} onChange={(v) => setTmp((p) => ({ ...p, slug: v.replace(/[^a-z0-9-]/gi, "").toLowerCase() }))} placeholder="your-handle" />
        </div>
        <div className="sm:col-span-2">
          {label("", "Avatar")}
          <AvatarPicker s={tmp} setS={setTmp} />
        </div>
      </Section>

      <div className="mt-2 flex gap-2">
        <Button variant="outline" onClick={onBack}>Cancel</Button>
        <Button onClick={save} disabled={!allOk}>Save Changes</Button>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-10 border-t border-slate-200 p-6 text-center text-xs text-slate-500">
      Built with ❤️ — Local-first. No server required.
    </footer>
  );
}
