import type { RehypePlugin } from "@astrojs/markdown-remark";
import { createHash } from "crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { visit } from "unist-util-visit";
import { mdImageConfig } from "./types.js";
import { URLJoin } from "./util.js";

const defaultAlt = "This is da image!";

export const configureMdImgToPicPlugin = (
  config: mdImageConfig & { outDir: string; cacheDir: string; baseURL: string }
): RehypePlugin => {
  return function mdImgToPicPlugin() {
    const cacheDir = path.join(config.cacheDir, config.folderName);
    const outDir = path.join(config.outDir, config.folderName);

    return async (tree, file) =>
      new Promise<void>(async (resolve) => {
        // キャッシュディレクトリの作成
        try {
          await fs.promises.mkdir(cacheDir);
        } catch (e) {}

        // 出力ディレクトリの作成
        try {
          await fs.promises.mkdir(outDir);
        } catch (e) {}

        // 処理するノードを取得
        const nodeToParse: { node: any; index: number; parent: any }[] = [];
        visit(tree, (node: any, index, parent: any) => {
          if (node.type != "element") return;
          if (node.tagName !== "img") return;
          if (index === undefined) return;

          // svgはスキップ
          if (node.properties.src.endsWith(".svg")) return;

          // パブリックフォルダの画像はスキップ
          if (node.properties.src[0] === "/") return;

          nodeToParse.push({ node, index, parent });
        });

        for (const { node, index, parent } of nodeToParse) {
          try {
            // ファイルパスの取得.node.properties.srcはエンコードされているのでデコードする
            const imagePath = path.resolve(file.dirname as string, decodeURI(node.properties.src));

            const dom = await genNode(
              config,
              imagePath,
              outDir,
              cacheDir,
              config.baseURL,
              config.folderName,
              node.properties.alt
            );
            parent.children[index] = dom;

            // astroで画像を処理しないようにする
            (file.data.imagePaths as any).delete(node.properties.src);
          } catch (e) {
            console.error(e);
          }
        }
        resolve();
        return;
      });
  };
};

/**
 * Calculates the widths of the images to be generated based on the provided configuration and image metadata.
 *
 * @param config - The configuration object containing the desired widths.
 * @param metadata - The metadata of the original image.
 * @param format - The desired format of the generated images.
 * @returns An array of widths to be used for generating the images.
 */
function getWidths(config: mdImageConfig, metadata: sharp.Metadata, format: string) {
  if (!metadata.width) throw new Error("Failed to get image metadata width");
  if (!metadata.format) throw new Error("Failed to get image metadata format");
  const originalWidth = metadata.width;

  // Skip if the width of the original image is larger
  const widthsDup = config.widths.map((width) => Math.min(width, originalWidth));
  const widths = [...new Set(widthsDup)].sort((a, b) => a - b);

  // If the original image is to be included, do not generate an image with the same format and the same size.
  if (config.includeOriginalImage && metadata.format === format && widths.at(-1) === originalWidth) {
    widths.splice(-1);
  }
  return widths;
}

/**
 * Generates an image with the specified parameters.
 *
 * @param image - The input image to be processed.
 * @param fileName - The name of the output file.
 * @param cacheDir - The directory where the cached image will be stored.
 * @param outDir - The directory where the generated image will be stored.
 * @param width -  width of the image.
 * @param format -  format of the image.
 * @param quality -  quality of the image.
 */
async function genImage(
  image: sharp.Sharp,
  fileName: string,
  cacheDir: string,
  outDir: string,
  width: number,
  format: keyof sharp.FormatEnum,
  quality: number
) {
  const cachePath = path.join(cacheDir, fileName);
  const outPath = path.join(outDir, fileName);
  try {
    // キャッシュがあればコピー
    fs.copyFileSync(cachePath, outPath);
    console.log(`${fileName} cached!`);
  } catch (e) {
    // キャッシュがなければ生成
    await image.resize(width).toFormat(format, { quality }).toFile(outPath);
    await fs.promises.copyFile(outPath, cachePath);
    console.log(`${fileName} generated!`);
  }
}

async function genNode(
  config: mdImageConfig,
  imagePath: string,
  outDir: string,
  cacheDir: string,
  baseURL: string,
  folderName: string,
  alt?: string
) {
  try {
    const imageRaw = await fs.promises.readFile(imagePath);
    const image = sharp(imageRaw);

    const hash = createHash("sha256").update(imageRaw).digest("base64url").slice(0, 10);
    const baseName = path.basename(imagePath);
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) throw new Error("Failed to get image metadata");
    const [originWidth, originHeight] = [metadata.width, metadata.height];

    const picture = {
      type: "element",
      tagName: "picture",
      properties: {},
      children: [] as any[],
    };

    for (let index = 0; index < config.formats.length; index++) {
      const [format, quality] = [config.formats[index], config.qualities[index]];
      const widths = getWidths(config, metadata, format);
      const srcset = await Promise.all(
        widths.map(async (width) => {
          const fileName = `${baseName}.${hash}.${width}.${quality}.${format}`;
          const srcUrl = URLJoin(baseURL, folderName, fileName);
          await genImage(image, fileName, cacheDir, outDir, width, format, quality);
          return `${srcUrl} ${width}w`;
        })
      );

      // オリジナル画像を含める場合
      if (config.includeOriginalImage && metadata.format === format) {
        fs.copyFileSync(imagePath, path.join(outDir, baseName));
        srcset.push(`${URLJoin(baseURL, folderName, baseName)} ${originWidth}w`);
      }

      // picture要素の子要素にsourceとして追加
      const source = {
        type: "element",
        tagName: "source",
        properties: {
          srcset: srcset.join(", "),
          type: `image/${format}`,
          sizes: config.sizes ? config.sizes[index] : undefined,
        },
      };
      picture.children.push(source);
    }

    // default画像の生成
    const width = Math.min(config.defaultImage.width, originWidth);
    const [format, quality] = [config.defaultImage.format, config.defaultImage.quality];

    const fileName = `${baseName}.${hash}.${width}.${quality}.${format}`;
    const srcUrl = URLJoin(baseURL, folderName, fileName);
    await genImage(image, fileName, cacheDir, outDir, width, format, quality);

    // picture要素の子要素の最後にdefault画像をimgとして追加
    const defaultImage = {
      type: "element",
      tagName: "img",
      properties: {
        src: srcUrl,
        alt: alt || defaultAlt,
        width: originWidth,
        height: originHeight,
        loading: "lazy",
        decoding: "async",
      },
    };
    picture.children.push(defaultImage);

    return picture;
  } catch (e) {
    throw e;
  }
}
