export function isVercelDeployment() {
  return process.env.VERCEL === "1" || process.env.VERCEL_ENV === "production";
}

export function getDeploymentMode() {
  return isVercelDeployment() ? "vercel-dashboard-only" : "self-hosted-bot";
}