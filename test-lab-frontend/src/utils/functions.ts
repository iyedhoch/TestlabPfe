export function hexToRgba(hex: string, opacity: number) {
  hex = hex?.replace(/^#/, "");

  if (hex?.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }

  const red = parseInt(hex.substring(0, 2), 16);
  const green = parseInt(hex.substring(2, 4), 16);
  const blue = parseInt(hex.substring(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}
