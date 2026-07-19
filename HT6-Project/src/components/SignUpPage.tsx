import { useAuth0 } from '@auth0/auth0-react';
import { AuthPage } from './AuthPage';

export function SignUpPage() {
  const { loginWithRedirect } = useAuth0();

  return (
    <AuthPage
      title="Quest Study"
      primaryActionLabel="Sign Up"
      primaryAction={() => loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } })}
      alternateTo="/login"
      alternateActionLabel="Log In"
    />
  );
}