import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

export function GoogleSignInButton({ onSuccess, onError }: { onSuccess: (credential: string) => void, onError: () => void }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!clientId) {
    return <div className="text-sm text-rose-500">Missing Google Client ID</div>;
  }

  return (
    <GoogleOAuthProvider clientId={clientId} locale="en">
      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={(credentialResponse) => {
            if (credentialResponse.credential) {
              onSuccess(credentialResponse.credential);
            } else {
              onError();
            }
          }}
          onError={() => {
            onError();
          }}
          theme="outline"
          size="large"
          text="signin_with"
          width="100%"
        />
      </div>
    </GoogleOAuthProvider>
  );
}