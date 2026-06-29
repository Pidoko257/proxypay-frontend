import React, { useEffect, useState } from 'react';

export interface NavSection {
  id: string;
  label: string;
}

interface Props {
  sections: NavSection[];
}

export default function StickyNav({ sections }: Props): React.JSX.Element {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav className="pp-sticky-nav" aria-label="Page sections">
      {sections.map(({ id, label }) => (
        <a
          key={id}
          href={`#${id}`}
          className={`pp-sticky-nav__link${activeId === id ? ' pp-sticky-nav__link--active' : ''}`}
          aria-current={activeId === id ? 'location' : undefined}
          onClick={(e) => {
            e.preventDefault();
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
