import config from "@truelend/eslint-config/next";
import testGuardrails from "@truelend/eslint-config/test-guardrails";

const eslintConfig = [...config, ...testGuardrails];

export default eslintConfig;
