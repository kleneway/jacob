import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const githubOAuthURL = `https://github.com/login/oauth/authorize?client_id=${
  import.meta.env.VITE_GITHUB_CLIENT_ID
}&scope=user`;

type AuthJSONResponse = {
  data?: { token: string };
  errors?: Array<{ message: string }>;
};

type CreateAccessTokenResponse = {
  data?: { readKey: string; writeKey: string };
  errors?: Array<{ message: string }>;
};

type ReadAccessTokenResponse = {
  data?: { accessToken: string };
  errors?: Array<{ message: string }>;
};

const READ_KEY_POLLING_INTERVAL_MS = 5000;

export function GitHubOAuth() {
  const [error, setError] = useState<Error | undefined>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [attemptedLogin, setAttemptedLogin] = useState(false);
  const [accessToken, setAccessToken] = useState<string | undefined>();
  const [readKey, setReadKey] = useState<string | undefined>();

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const figma = searchParams.get("figma");
  const writeKey = searchParams.get("writeKey");

  useEffect(() => {
    if (!readKey) return;

    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`/api/auth/accessToken/${readKey}`, {
          headers: { "Content-Type": "application/json" },
        });
        if (response.ok) {
          const { data, errors }: ReadAccessTokenResponse =
            await response.json();
          if (data) {
            const { accessToken } = data;
            setAccessToken(accessToken);
            parent.postMessage(
              {
                pluginMessage: { message: "SAVE_ACCESS_TOKEN", accessToken },
                pluginId: import.meta.env.VITE_FIGMA_PLUGIN_ID,
              },
              "https://www.figma.com",
            );
            console.log(
              "access token found, posted message to parent, stopping polling loop",
            );
            clearInterval(intervalId);
            setReadKey(undefined);
          } else {
            console.error(
              `read key found, but no access token: ${errors
                ?.map((e) => e.message)
                .join(",")}`,
            );
          }
        } else {
          console.log(
            `read key not found ${response.status} ${response.statusText}, will try again`,
          );
        }
      } catch (error) {
        console.error(error);
        setError(error as Error);
      }
    }, READ_KEY_POLLING_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [readKey]);

  useEffect(() => {
    const abortController = new AbortController();

    const handleLogin = async (code: string) => {
      try {
        // Exchange the code for an access token
        const accessTokenResponse = await fetch(
          `/api/auth/github/callback?code=${code}`,
          {
            signal: abortController.signal,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (accessTokenResponse.ok) {
          const { data }: AuthJSONResponse = await accessTokenResponse.json();
          const accessToken = data?.token;
          setAccessToken(accessToken);

          setError(undefined);
          searchParams.delete("code");
          setSearchParams(searchParams);

          // TODO - verify that the state matches the writeKey stored in a cookie
          const postAccessTokenResponse = await fetch(
            `/api/auth/accessToken/${state}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ accessToken }),
            },
          );

          if (
            postAccessTokenResponse.ok &&
            postAccessTokenResponse.status === 200
          ) {
            console.log("successfully posted access token to server");
          } else {
            setError(
              new Error(
                `Failed to post access token: ${postAccessTokenResponse.status} ${postAccessTokenResponse.statusText}`,
              ),
            );
          }
        } else {
          setError(
            new Error(
              `Failed to fetch access token: ${accessTokenResponse.status} ${accessTokenResponse.statusText}`,
            ),
          );
        }
      } catch (error) {
        console.error(error);
        setError(error as Error);
      }
    };

    if (code && !attemptedLogin) {
      setAttemptedLogin(true);
      handleLogin(code);
    }

    return () => {
      abortController.abort();
    };
  }, []);

  const handleFigmaSignin = async () => {
    let response: Response;
    try {
      response = await fetch("/api/auth/accessToken/", {
        method: "POST",
      });
    } catch (error) {
      console.error(error);
      setError(error as Error);
      return;
    }

    if (response.ok) {
      const { data, errors }: CreateAccessTokenResponse = await response.json();
      if (data) {
        const { readKey, writeKey } = data;
        // Store read key, which will start a polling loop waiting for the access token:
        setReadKey(readKey);

        // Open popup with write key:
        window.open(
          `${location.origin}${location.pathname}?writeKey=${writeKey}`,
          "_blank",
          "popup",
        );
      } else {
        setError(
          new Error(
            `Error creating access token keys: ${(errors ?? [])
              .map(({ message }) => message)
              .join(",")}`,
          ),
        );
      }
    } else {
      setError(
        new Error(
          `Error creating access token keys: ${response.status} ${response.statusText}`,
        ),
      );
    }
  };

  return (
    <div>
      {!accessToken && !figma && (
        <a href={`${githubOAuthURL}&state=${writeKey}`}>Sign in with GitHub</a>
      )}
      {!accessToken && figma && (
        <a onClick={handleFigmaSignin}>Sign in with GitHub</a>
      )}
      {accessToken && (
        <>
          <p>Signed in successfully</p>
          <p>You can now close this browser window.</p>
        </>
      )}
      {error && <p>{error.message}</p>}
    </div>
  );
}