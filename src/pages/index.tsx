import React from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Hero from '../components/Hero';
import FeaturedPosts from '../components/FeaturedPosts';
import ProjectCard from '../components/ProjectCard';
import {projects} from '../data/projects';
import Translate from '@docusaurus/Translate';
import Link from '@docusaurus/Link';

export default function Home(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  const featuredProjects = projects.filter((p) => p.featured);
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <main>
        <Hero />
        <FeaturedPosts />
        <section className="container margin-vert--xl">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem'}}>
            <h2 style={{marginBottom: 0}}>
              <Translate>Projects</Translate>
            </h2>
            <Link to="/projects">
              <Translate>View all →</Translate>
            </Link>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {featuredProjects.map((project) => (
              <ProjectCard key={project.name} project={project} />
            ))}
          </div>
        </section>
      </main>
    </Layout>
  );
}
