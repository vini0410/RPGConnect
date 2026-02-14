import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger, defineConfig } from "vite"; // Import defineConfig
import { type Server } from "http";
import viteConfig from "../vite.config"; // This imports the vitest-configured viteConfig
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  // Extract only the Vite-compatible parts from the shared config
  // and use defineConfig from vite to ensure correct type inference
  const serverViteConfig = defineConfig({
    plugins: viteConfig.plugins, // Re-use the plugins array from the shared config
    resolve: viteConfig.resolve,
    build: {
      outDir: viteConfig.build?.outDir,
      emptyOutDir: viteConfig.build?.emptyOutDir,
    },
    server: serverOptions,
    appType: "custom",
    // Ensure that any Vitest-specific properties are explicitly omitted or transformed
    // before passing to createViteServer.
    // For example, if viteConfig contained an incompatible 'test' property,
    // we would explicitly exclude it here, but we already handled it by destructuring.
    // However, if there are other Vitest-specific properties in the root, they should be excluded.
    // For now, assume viteConfig.plugins, resolve, build are compatible parts.
  });

  const vite = await createViteServer({
    ...serverViteConfig, // Use the explicitly defined serverViteConfig
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
