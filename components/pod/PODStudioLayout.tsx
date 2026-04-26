import React from 'react';
import { NavLink } from 'react-router-dom';

type PodStudioLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  stats?: Array<{ label: string; value: string; detail?: string }>;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

const studioLinks = [
  { to: '/profile/pod-studio', label: 'Dashboard', end: true },
  { to: '/profile/pod-studio/catalog', label: 'Catalog' },
  { to: '/profile/pod-studio/designs', label: 'Designs' },
  { to: '/profile/pod-studio/products', label: 'Products' },
  { to: '/profile/pod-studio/orders', label: 'Orders' },
  { to: '/profile/pod-studio/new', label: 'New Product' }
];

const PODStudioLayout: React.FC<PodStudioLayoutProps> = ({
  eyebrow,
  title,
  description,
  stats = [],
  actions,
  children
}) => {
  return (
    <div className="pod-shell">
      <section className="pod-hero">
        <div className="pod-hero-copy">
          <p className="pod-eyebrow">{eyebrow}</p>
          <h1 className="pod-title">{title}</h1>
          <p className="pod-description">{description}</p>
        </div>
        {actions ? <div className="pod-hero-actions">{actions}</div> : null}
      </section>

      {stats.length ? (
        <section className="pod-stats-grid">
          {stats.map((stat) => (
            <div key={`${stat.label}-${stat.value}`} className="pod-stat-card">
              <p className="pod-stat-label">{stat.label}</p>
              <p className="pod-stat-value">{stat.value}</p>
              {stat.detail ? <p className="pod-stat-detail">{stat.detail}</p> : null}
            </div>
          ))}
        </section>
      ) : null}

      <nav className="pod-tabs">
        {studioLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `pod-tab-link ${isActive ? 'is-active' : ''}`}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="pod-page-grid">{children}</div>
    </div>
  );
};

export default PODStudioLayout;
