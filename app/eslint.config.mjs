import globals from "globals";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  pluginReact.configs.flat.recommended,
  {
    rules: {
      // Modern JSX transform (React 17+/Vite) auto-imports React — this rule is obsolete
      "react/react-in-jsx-scope": "off",
      // Not using PropTypes for validation in this project
      "react/prop-types": "off",
    },
  },
]);
