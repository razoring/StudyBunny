import { Link } from 'react-router-dom';

type AuthPageProps = {
  title: string;
  logoSrc?: string;
  logoWidth?: number;
  primaryActionLabel: string;
  primaryAction: () => void;
  alternateTo: string;
  alternateActionLabel: string;
};

export function AuthPage({
  title,
  logoSrc,
  logoWidth = 640,
  primaryActionLabel,
  primaryAction,
  alternateTo,
  alternateActionLabel,
}: AuthPageProps) {
  return (
    <div className="auth-scene">
      <main className="pixel-panel auth-card" aria-label={title}>
        {logoSrc ? (
          <img
            src={logoSrc}
            alt={title}
            className="auth-logo"
            style={{ width: `${logoWidth}px` }}
          />
        ) : (
          <h1 className="pixel-title">{title}</h1>
        )}

        <button className="pixel-button auth-button" onClick={primaryAction} type="button">
          {primaryActionLabel}
        </button>

      </main>
    </div>
  );
}