import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Etsy Edge — SEO Tags & AI Optimization",
    description:
      "See any Etsy listing's hidden tags. Optimize yours with AI-powered suggestions and competitor analysis.",
    version: "0.1.0",
    permissions: ["storage", "activeTab"],
    host_permissions: ["https://*.etsy.com/*"],
    icons: {
      "16": "icons/icon-16.svg",
      "32": "icons/icon-32.svg",
      "48": "icons/icon-48.svg",
      "128": "icons/icon-128.svg",
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
