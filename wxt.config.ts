import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Etsy Edge — Tags, Optimization & Smart Audit",
    description:
      "See any Etsy listing's optimization score and related searches. One-click Smart Audit: rewritten title, 13 tags, and diagnosis.",
    version: "0.1.1",
    permissions: ["storage", "activeTab", "sidePanel"],
    host_permissions: ["https://*.etsy.com/*"],
    icons: {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png",
    },
    // Override action to remove default_popup — we use side panel on icon click instead
    action: {},
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
