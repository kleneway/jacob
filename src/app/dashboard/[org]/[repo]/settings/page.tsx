import { getServerAuthSession } from "~/server/auth";
import { Button } from "~/components/ui/button";

export default async function SettingsPage() {
  const session = await getServerAuthSession();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Repository Settings</h1>

      <div className="bg-card rounded-lg border p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Integrations</h2>

        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-lg font-medium">Jira Integration</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              Connect your Jira account to automatically create todos from Jira
              issues.
            </p>
            {session?.user?.jiraToken ? (
              <p className="text-sm text-green-600">✓ Connected to Jira</p>
            ) : (
              <Button
                onClick={() => {
                  window.location.href = "/api/auth/jira/authorize";
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Log in with Jira
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
