/** Extract the filename from a path (handles both / and \ separators). */
export function getBasename(filePath: string): string {
  return filePath.split(/[\\/]/).pop() ?? filePath;
}
