// Karma + Jasmine con reporte JUnit (karma-junit-reporter).
// Tras cada ejecución se genera reports/junit/unit-tests.xml
module.exports = config => config.set({
  frameworks: ['jasmine'],
  files: ['tmp/tests/unit.spec.js'],
  reporters: ['progress', 'junit'],
  junitReporter: {
    outputDir: 'reports/junit',
    outputFile: 'unit-tests.xml',
    useBrowserName: false,
    suite: 'Aula Movil',
  },
  // En CI (variable CI=true) Chrome necesita --no-sandbox; en tu PC se usa ChromeHeadless normal.
  customLaunchers: { ChromeHeadlessSinSandbox: { base: 'ChromeHeadless', flags: ['--no-sandbox'] } },
  browsers: [process.env.KARMA_BROWSER || (process.env.CI ? 'ChromeHeadlessSinSandbox' : 'ChromeHeadless')],
  singleRun: true,
  autoWatch: false,
  client: { jasmine: { random: true } },
});
