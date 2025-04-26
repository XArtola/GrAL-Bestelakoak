import React from 'react';

interface SiteProps {
  site: {
    name: string;
    description: string;
  };
}

function SiteCard({site}: SiteProps) {
  return (
    <div>
        <h1>{site.name}</h1>
        <p>{site.description}</p>
    </div>
  );
}

export default SiteCard;