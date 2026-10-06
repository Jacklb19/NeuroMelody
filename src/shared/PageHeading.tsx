interface PageHeadingProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly children?: React.ReactNode;
}

/** Consistent route heading with a quiet context label and optional introduction. */
export function PageHeading({ eyebrow, title, children }: PageHeadingProps): React.JSX.Element {
  return <header className="page-heading">
    <p className="eyebrow">{eyebrow}</p>
    <h1>{title}</h1>
    {children !== undefined && <div className="page-introduction">{children}</div>}
  </header>;
}
