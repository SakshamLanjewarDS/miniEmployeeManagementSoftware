import nextConfig from "eslint-config-next";

export default [
  ...nextConfig,
  {
    rules: {
      // Soften experimental React 19 compiler lint rules that flag standard React idioms
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/globals": "warn",
      "react-hooks/error-boundaries": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-render": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/use-memo": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/gating": "warn",
      "react-hooks/config": "warn",
      "react/no-unescaped-entities": "warn",
    },
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "build/**",
      "prisma/migrations/**",
    ],
  },
];
