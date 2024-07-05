import sharp from "sharp";

export interface mdImageConfig {
  folderName: string;
  formats: (keyof sharp.FormatEnum)[];
  qualities: number[];
  widths: number[];
  sizes?: string[];
  includeOriginalImage: boolean;
  defaultImage: {
    format: keyof sharp.FormatEnum;
    quality: number;
    width: number;
  };
}
