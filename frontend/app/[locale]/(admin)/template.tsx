// Re-mounted on every navigation inside this area (a Next.js template, unlike the layout):
// the page content fades in while the header and its tabs stay put, so moving between
// sections reads as one place changing, not a new page loading. Opacity only, 200 ms.
export default function AreaTemplate({ children }: { children: React.ReactNode }) {
  return <div className="flex animate-fade-in flex-col gap-[inherit]">{children}</div>;
}
