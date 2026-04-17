// Type declarations for CSS modules that are dynamically imported
declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}

// React-pdf CSS imports
declare module "react-pdf/dist/Page/AnnotationLayer.css";
declare module "react-pdf/dist/Page/TextLayer.css";