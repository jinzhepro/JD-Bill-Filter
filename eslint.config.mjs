import reactPlugin from "eslint-plugin-react";
import hooksPlugin from "eslint-plugin-react-hooks";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "node_modules/**",
      "functions/**",
      "migrations/**",
      ".wrangler/**",
      ".vercel/**",
    ],
  },
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": hooksPlugin,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // Cloudflare Edge Runtime (nodejs_compat)
        process: "readonly",
        // Web API / Service Worker globals
        Response: "readonly",
        Request: "readonly",
        fetch: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        // Browser globals (used by client components)
        document: "readonly",
        navigator: "readonly",
        window: "readonly",
        location: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        Blob: "readonly",
        FileReader: "readonly",
        DOMParser: "readonly",
        confirm: "readonly",
        alert: "readonly",
        FormData: "readonly",
        Headers: "readonly",
        AbortController: "readonly",
        IntersectionObserver: "readonly",
        ResizeObserver: "readonly",
        TextDecoder: "readonly",
        TextEncoder: "readonly",
        // CommonJS (postcss.config.js)
        module: "readonly",
        exports: "readonly",
        require: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...hooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/no-unknown-property": ["error", { ignore: ["webkitdirectory"] }],
      "no-unused-vars": "warn",
      "no-undef": "warn",
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
