// Type declarations for CSS modules that are dynamically imported
declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}