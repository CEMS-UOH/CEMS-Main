// Any address under a language that no page matches (e.g. /ar/whatever) lands here, which
// hands over to not-found.tsx - so the "page not found" screen is translated and styled like
// the rest of the app instead of being the framework's bare default.
import { notFound } from 'next/navigation';

export default function CatchAllPage() {
  notFound();
}
