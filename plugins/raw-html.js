// Allow `import x from './file.html?raw'` (returns file contents as a string),
// so blog posts can keep their rendered HTML as a real .html file and let a thin
// .mdx wrapper inject it via dangerouslySetInnerHTML.
module.exports = function rawHtml() {
  return {
    name: 'raw-html',
    configureWebpack() {
      return {
        module: {
          rules: [
            {test: /\.(html|svg)$/, resourceQuery: /raw/, type: 'asset/source'},
          ],
        },
      };
    },
  };
};
