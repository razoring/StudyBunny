import { useAuth0 } from '@auth0/auth0-react';
import { AuthPage } from './AuthPage';
import questStudyLogo from '../assets/quest_study_logo.png';

export function LoginPage() {
  const { loginWithRedirect } = useAuth0();

  return (
    <AuthPage
      title="Quest Study"
      logoSrc={questStudyLogo}
      primaryActionLabel="Log In"
      primaryAction={() => loginWithRedirect()}
      alternateTo="/signup"
      alternateActionLabel="Sign Up"
    />
  );
}