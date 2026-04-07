/// <reference types="vite/client" />

declare module "*.png";
declare module "*.svg";
declare module "*.lottie";

declare module "*.svg?react" {
  import { FC, SVGProps } from "react";
  const ReactComponent: FC<SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}
