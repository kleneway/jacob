"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface SettingsPageProps {
  params: {
    org: string;
    repo: string;
  };
}

export default function SettingsPage({ params }: SettingsPageProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const handleLoginWithJira = () => {
    router.push("/api/auth/jira/authorize");
  };

  return (
    <div>
      <h1>
        Settings for {params.org}/{params.repo}
      </h1>
      {!session?.user?.jiraToken ? (
        <button onClick={handleLoginWithJira}>Log in with Jira</button>
      ) : (
        <p>Connected to Jira</p>
      )}
    </div>
  );
}
