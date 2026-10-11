// The shared <Button> (frontend/components/Button.tsx), unchanged, with two dashboard defaults:
//
//   1. A focus-visible ring in the primary token. The shared Button defines hover states but no
//      keyboard-focus style, and it is a shared file this module may not edit without asking.
//   2. type="button". A native <button> defaults to "submit", so an action button placed
//      inside a <form> would submit it by accident.
//
// Every dashboard action goes through this, so it is still always the shared Button that
// renders. Once Button.tsx itself has a focus-visible ring, delete this file and import the
// shared one directly.
import type { ComponentProps } from 'react';
import SharedButton from '@/components/Button';
import { FOCUS_RING } from './focus';

type Props = ComponentProps<typeof SharedButton>;

export default function Button({ className = '', type = 'button', ...props }: Props) {
  return <SharedButton type={type} className={`${FOCUS_RING} ${className}`} {...props} />;
}
