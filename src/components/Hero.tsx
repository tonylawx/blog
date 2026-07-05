import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Translate from '@docusaurus/Translate';

export default function Hero(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header
      className="hero"
      style={{
        background: 'var(--home-hero-bg)',
        padding: '4rem 1rem',
        textAlign: 'center',
      }}
    >
      <div className="container">
        <h1 className="hero__title" style={{fontSize: 'clamp(2rem, 5vw, 3.25rem)'}}>
          Hi, I'm Tony Law 👋
        </h1>
        <p className="hero__subtitle" style={{fontSize: '1.25rem', opacity: 0.85}}>
          {siteConfig.tagline}
        </p>
        <div style={{display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem'}}>
          <Link className="button button--primary button--lg" to="/blog">
            <Translate>Read the blog</Translate>
          </Link>
          <Link className="button button--secondary button--lg" to="/about">
            <Translate>Contact</Translate>
          </Link>
        </div>
      </div>
    </header>
  );
}
