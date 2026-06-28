import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Serwist-generated service worker bundle.
    "public/sw.js",
    "public/sw.js.map",
  ]),
  {
    rules: {
      // The "mounted" hydration guard and SWR-data->state syncing are
      // intentional and correct; keep them as warnings, not errors.
      "react-hooks/set-state-in-effect": "warn",
      // Base UI (shadcn base-nova) menu items fire onClick, NOT onSelect.
      // onSelect is a text-selection event and silently won't fire on tap.
      "no-restricted-syntax": [
        "warn",
        {
          selector: "JSXAttribute[name.name='onSelect']",
          message:
            "Base UI menu items use onClick, not onSelect — onSelect is a text-selection event and won't fire on click.",
        },
      ],
    },
  },
]);

export default eslintConfig;
