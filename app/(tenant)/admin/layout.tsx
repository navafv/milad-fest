export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // A festival admin app has no business following OS light/dark toggling —
  // every admin page (Events, Students, Results, Settings, Exports, Login)
  // is designed against the dark glass system in globals.css, so force it
  // here rather than relying on each page to opt in individually.
  return <div className="dark min-h-screen bg-background">{children}</div>;
}