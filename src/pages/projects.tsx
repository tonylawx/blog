import React from 'react';
import Layout from '@theme/Layout';
import Translate, {translate} from '@docusaurus/Translate';
import {projects} from '../data/projects';
import ProjectCard from '../components/ProjectCard';

export default function ProjectsPage(): JSX.Element {
  return (
    <Layout title={translate({message: 'Projects'})} description={translate({message: "Things I've built."})}>
      <main className="container margin-vert--xl">
        <h1><Translate>Projects</Translate></h1>
        <p><Translate>Things I've built — open-source tools, side projects, and experiments.</Translate></p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.25rem',
            marginTop: '1.5rem',
          }}
        >
          {projects.map((project) => (
            <ProjectCard key={project.name} project={project} />
          ))}
        </div>
      </main>
    </Layout>
  );
}
