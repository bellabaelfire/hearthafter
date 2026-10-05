import {createClient, type SanityClient} from "@sanity/client";
import {ENGINE_API_VERSION, validateDefinition} from "@sanity/workflow-engine";
import {createHearthWorkflowEngine, placementReadinessWorkflow} from "../src/lib/hearth/sanity/native-workflow";

async function deploymentClient(): Promise<SanityClient> {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim();
  const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_AUTH_TOKEN;
  if (token && projectId) {
    if (projectId === "unconfigured") throw new Error("Configure a Sanity project before deploying the workflow.");
    return createClient({projectId, dataset: dataset || "production", token, apiVersion: ENGINE_API_VERSION, useCdn: false});
  }

  // This path is reached only for an explicitly requested deployment.
  // sanity exec --with-user-token supplies the existing logged-in CLI session.
  const {getCliClient} = await import("sanity/cli");
  const cliClient = getCliClient({apiVersion: ENGINE_API_VERSION});
  const config = cliClient.config();
  if (!token && !config.token) {
    throw new Error("No authenticated CLI session was supplied. Run sanity exec scripts/deploy-workflow.ts --with-user-token -- --deploy.");
  }
  if ((!projectId && !config.projectId) || (projectId || config.projectId) === "unconfigured") throw new Error("Configure a Sanity project before deploying the workflow.");
  return cliClient.withConfig({
    projectId: projectId || config.projectId,
    token: token || config.token,
    dataset: dataset || config.dataset || "production",
    apiVersion: ENGINE_API_VERSION,
    useCdn: false,
  });
}

async function main() {
  validateDefinition(placementReadinessWorkflow);
  if (!process.argv.includes("--deploy")) {
    console.log("Placement-readiness definition loaded. No remote writes performed.");
    console.log("For an authorized deployment with an existing CLI session, run:");
    console.log("sanity exec scripts/deploy-workflow.ts --with-user-token -- --deploy");
    return;
  }

  const client = await deploymentClient();
  const {projectId, dataset} = client.config();
  if (!projectId || !dataset) throw new Error("The deployment client must specify its project and dataset.");
  const engine = createHearthWorkflowEngine(client, {projectId, dataset});
  await engine.deployDefinitions({expectedMinReaderModel: 10, definitions: [placementReadinessWorkflow]});
  console.log(`Deployed placement-readiness to ${projectId}.${dataset} (tag: production).`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Workflow validation or deployment failed.");
  process.exitCode = 1;
});
