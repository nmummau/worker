import { GraphileConfig } from "graphile-config";

import { FileDetails, isValidTask } from "../index.js";
import { version } from "../version.js";

const DEFAULT_EXTENSIONS = [".js", ".mjs", ".cjs"];

export const LoadTaskFromJsPlugin: GraphileConfig.Plugin = {
  name: "LoadTaskFromJsPlugin",
  version,

  worker: {
    hooks: {
      async loadTaskFromFiles(ctx, details) {
        // Check it hasn't already been handled
        if (details.handler) {
          return;
        }

        const { resolvedPreset } = ctx;
        const { fileDetailsList } = details;

        let jsFile: FileDetails | undefined = undefined;
        const extensions =
          resolvedPreset?.worker?.fileExtensions ?? DEFAULT_EXTENSIONS;

        // Find a matching file in extension priority order
        outerloop: for (const extension of extensions) {
          for (const fileDetails of fileDetailsList) {
            if (fileDetails.extension === extension) {
              jsFile = fileDetails;
              break outerloop;
            }
          }
        }

        if (!jsFile) {
          // Don't know how to handle; skip
          return;
        }

        try {
          const rawMod = await import(jsFile.fullPath);
          const mod =
            Object.keys(rawMod).length === 1 &&
            typeof rawMod.default === "object" &&
            rawMod.default !== null
              ? rawMod.default
              : rawMod;
          const task = mod.default || mod;
          if (isValidTask(task)) {
            details.handler = task;
          } else {
            throw new Error(
              `Invalid task '${name}' - expected function, received ${
                task ? typeof task : String(task)
              }.`,
            );
          }
        } catch (error) {
          const message = `Error processing '${jsFile.fullPath}': ${error.message}`;
          throw new Error(message);
        }
      },
    },
  },
};
