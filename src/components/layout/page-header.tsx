'use client';

import React from 'react';

type PageHeaderProps = {
  category?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function PageHeader({ category, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 md:gap-4">
      <div className="space-y-0.5 md:space-y-1 min-w-0">
        {category && (
          <p className="text-[11px] md:text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {category}
          </p>
        )}
        <h1 className="text-xl md:text-3xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-xs md:text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-auto sm:pt-0.5">
          {actions}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
