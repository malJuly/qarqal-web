// Tabler icons are imported as raw SVG text (angular.json: loader ".svg": "text").
declare module '*.svg' {
  const content: string;
  export default content;
}
