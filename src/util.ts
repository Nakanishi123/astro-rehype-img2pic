/**
 * 拾ってきたURLを結合する関数
 * @param args URLとして結合する文字列
 * @returns 結合されたURL
 */
export function URLJoin(...args: string[]) {
  return args
    .join("/")
    .replace(/[\/]+/g, "/")
    .replace(/^(.+):\//, "$1://")
    .replace(/^file:/, "file:/")
    .replace(/\/(\?|&|#[^!])/g, "$1")
    .replace(/\?/g, "&")
    .replace("&", "?");
}
