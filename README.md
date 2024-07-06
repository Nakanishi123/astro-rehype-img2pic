# astro-rehype-img2pic

## Installation

```bash
npx astro add astro-rehype-img2pic
```

If you want to install it manually, please refer to the [official documentation.](https://docs.astro.build/en/guides/integrations-guide/#manual-installation)

## Custom Options example

If you want, you can customize the options as follows.

```ts
// astro.config.mjs
export default {
  // ...
  integrations: [
    rehypeImg2pic(
      folderName: "img2pic",
      formats: ["avif", "webp"],
      qualities: [60, 80],
      sizes: ["(max-width: 768px) 100vw, 320px","(max-width: 768px) 100vw, 320px"],
      widths: [720, 1920],
      includeOriginalImage: false,
      defaultImage: {
        format: "jpeg",
        quality: 50,
        width: 360,
      },
    )
  ]
  // ...
}
```

then, the following html will be generated.

```html
<picture>
    <source srcset="/img2pic/some.png.d5nRF3H6s_.720.60.avif 720w, /img2pic/some.png.d5nRF3H6s_.1920.60.avif 1920w" type="image/avif" sizes="(max-width: 768px) 100vw, 320px">
    <source srcset="/img2pic/some.png.d5nRF3H6s_.720.80.webp 720w, /img2pic/some.png.d5nRF3H6s_.1920.80.webp 1920w" type="image/webp" sizes="(max-width: 768px) 100vw, 320px">
    <img src="/img2pic/some.png.d5nRF3H6s_.360.50.jpeg" alt="something" width="1920" height="1080" loading="lazy" decoding="async">
</picture>
```
