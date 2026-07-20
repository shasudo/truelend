if (
  process.env.GITHUB_ACTIONS !== "true" ||
  process.env.CI !== "true" ||
  process.env.GITHUB_REF !== "refs/heads/main" ||
  process.env.TRUELEND_PRODUCTION_DEPLOY_APPROVED !== "true"
) {
  throw new Error(
    "Production Worker deploys require explicit main-branch release intent. Open a pull request and use the protected release workflow.",
  );
}
