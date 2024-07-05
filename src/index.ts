import { AstroIntegration } from "astro";
import { fileURLToPath } from "node:url";
import { configureMdImgToPicPlugin } from "./mdImgToPic.js";
import { mdImageConfig } from "./types.js";

export default function mdImgToPic(options: Partial<mdImageConfig> = {}): AstroIntegration {
  return {
    name: "astro-rehype-img2pic",

    hooks: {
      "astro:config:setup": async ({ command, config, updateConfig, logger }) => {
        if (command == "build") {
          // Setup Default Plugin Settings
          const defaults: mdImageConfig & { outDir: string; cacheDir: string; baseURL: string } = {
            outDir: fileURLToPath(config.outDir),
            cacheDir: fileURLToPath(config.cacheDir),
            baseURL: config.base,

            folderName: "astro-rehype-img2pic",
            formats: ["avif", "webp"],
            qualities: [60, 80],
            sizes: undefined,
            widths: [640, 1280, 1920],
            includeOriginalImage: false,
            defaultImage: {
              format: "jpeg",
              quality: 50,
              width: 360,
            },
          };

          const pluginConfig = Object.assign({}, defaults, options);

          if (pluginConfig.formats.length !== pluginConfig.qualities.length) {
            logger.warn("The length of formats and qualities should be the same😓");
          }

          if (pluginConfig.sizes && pluginConfig.sizes.length !== pluginConfig.formats.length) {
            logger.warn("The length of sizes and formats should be the same😓");
          }

          const rehypePlugin = configureMdImgToPicPlugin(pluginConfig);

          updateConfig({
            markdown: {
              rehypePlugins: [rehypePlugin],
            },
          });
        }
      },
    },
  };
}
