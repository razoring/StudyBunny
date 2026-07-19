import { useAuth0 } from '@auth0/auth0-react';
import { AuthPage } from './AuthPage';

export function LoginPage() {
  const { loginWithRedirect } = useAuth0();

  return (
    <AuthPage
      title="Quest Study"
      primaryActionLabel="Log In"
      primaryAction={() => loginWithRedirect()}
      alternateTo="/signup"
      alternateActionLabel="Sign Up"
    />
  );
}