import React, {useEffect} from 'react';

interface AdSenseProps {
  /** Ad unit slot ID created in Google AdSense console */
  slot: string;
  format?: 'auto' | 'fluid' | 'rectangle';
  responsive?: 'true' | 'false';
  style?: React.CSSProperties;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

export default function AdSense({
  slot,
  format = 'auto',
  responsive = 'true',
  style = {display: 'block'},
  className,
}: AdSenseProps): React.JSX.Element {
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (err) {
      // Ignore adsbygoogle push error if already initialized or blocked
      console.warn('AdSense push error:', err);
    }
  }, [slot]);

  return (
    <div
      className={className}
      style={{margin: '32px 0', textAlign: 'center', minHeight: 90}}>
      <ins
        className="adsbygoogle"
        style={style}
        data-ad-client="ca-pub-9680017244944889"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive}
      />
    </div>
  );
}
