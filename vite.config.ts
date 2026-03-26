import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      name: "CarmentisJsonRpc",
      fileName: "index",
      formats: ["cjs", "es"],
    },
    rollupOptions: {
      external: ["valibot"],
    },
  },
  plugins: [
    dts({ include: ["src"], exclude: ["src/__tests__"] }),
  ],
});
