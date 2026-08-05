import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Translate from '@docusaurus/Translate';

export default function Hero(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className="home-hero hero">
      <div className="container">
        <h1 className="hero__title home-hero__title">
          Hi, I'm Tony Law 👋
        </h1>
        <p className="hero__subtitle home-hero__subtitle">
          {siteConfig.tagline}
        </p>
        <div className="home-hero__actions">
          <Link
            className="button button--primary button--lg home-hero__btn"
            to="/blog"
          >
            <Translate>Read the blog</Translate>
          </Link>
          <Link
            className="button button--secondary button--lg home-hero__btn"
            to="/about"
          >
            <Translate>Contact</Translate>
          </Link>
        </div>
      </div>
    </header>
  );
}
