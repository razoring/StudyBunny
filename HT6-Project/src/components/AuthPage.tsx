import { Link } from 'react-router-dom';

type AuthPageProps = {
  title: string;
  primaryActionLabel: string;
  primaryAction: () => void;
  alternateTo: string;
  alternateActionLabel: string;
};

export function AuthPage({
  title,
  primaryActionLabel,
  primaryAction,
  alternateTo,
  alternateActionLabel,
}: AuthPageProps) {
  return (
    <div className="auth-scene">
      <div className="auth-clouds" aria-hidden="true" />
      <div className="auth-grass auth-grass-top" aria-hidden="true" />

      <main className="auth-card" aria-label={title}>
        <h1 className="auth-title">{title}</h1>

        <button className="auth-button" onClick={primaryAction} type="button">
          {primaryActionLabel}
        </button>

        <Link className="auth-link" to={alternateTo}>
          {alternateActionLabel}
        </Link>
      </main>

      <div className="auth-grass auth-grass-bottom" aria-hidden="true" />
      <div className="auth-border auth-border-top" aria-hidden="true" />
      <div className="auth-border auth-border-bottom" aria-hidden="true" />
      </div>
  );
}