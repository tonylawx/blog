import type {ReactNode} from 'react';
import OriginalRoot from '@theme-original/Root';
import {Analytics} from '@vercel/analytics/react';

// Wraps the core `Root` to mount Vercel Web Analytics on every page. The site
// had no analytics before this; on deploy Vercel auto-enables Web Analytics
// and per-path PV/UV show up in the dashboard.
export default function Root({children}: {children?: ReactNode}): ReactNode {
  return (
    <OriginalRoot>
      {children}
      <Analytics />
    </OriginalRoot>
  );
}
