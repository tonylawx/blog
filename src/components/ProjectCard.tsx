import React from 'react';
import type {Project} from '../data/projects';

export default function ProjectCard({project}: {project: Project}): JSX.Element {
  return (
    <a
      className="card-interactive card padding--lg"
      href={project.url ?? project.repo}
      target="_blank"
      rel="noreferrer noopener"
      style={{textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: '0.5rem'}}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
        {project.icon && (
          <img src={project.icon} alt={project.name} style={{width: 40, height: 40, borderRadius: 8, objectFit: 'cover'}} />
        )}
        <h3 style={{marginBottom: 0}}>{project.name}</h3>
      </div>
      <p style={{flexGrow: 1, marginBottom: '0.5rem'}}>{project.description}</p>
      <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.4rem'}}>
        {project.tags.map((tag) => (
          <span key={tag} className="badge badge--secondary">
            {tag}
          </span>
        ))}
      </div>
    </a>
  );
}
