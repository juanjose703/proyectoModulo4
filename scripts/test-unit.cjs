const path = require('node:path');
const fs = require('node:fs');
const { buildSync } = require('esbuild');
const { Server, config } = require('karma');
const root = path.resolve(__dirname, '..');
process.chdir(root);

// Chrome/Chromium/Edge: se respeta CHROME_BIN; si no existe, se prueban las rutas habituales.
if (!process.env.CHROME_BIN) {
  const candidatos = {
    win32: [
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    ],
    darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
    linux: ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
  }[process.platform] || [];
  const navegador = candidatos.find(archivo => fs.existsSync(archivo));
  if (navegador) process.env.CHROME_BIN = navegador;
}

// Se borra el reporte anterior: si aparece uno nuevo, lo generó ESTA ejecución.
const reporte = path.join(root, 'reports', 'junit', 'unit-tests.xml');
fs.rmSync(reporte, { force: true });

buildSync({
  entryPoints: ['tests/unit.spec.ts'],
  bundle: true,
  platform: 'browser',
  sourcemap: 'inline',
  outfile: 'tmp/tests/unit.spec.js',
});

function verificarReporte() {
  if (!fs.existsSync(reporte)) {
    console.error('\nERROR: no se generó el reporte JUnit en ' + path.relative(root, reporte));
    process.exitCode = 1;
    return;
  }
  const xml = fs.readFileSync(reporte, 'utf8');
  const total = /<testsuite\b[^>]*\btests="(\d+)"/.exec(xml);
  const fallos = /<testsuite\b[^>]*\bfailures="(\d+)"/.exec(xml);
  console.log('\nReporte JUnit generado: ' + path.relative(root, reporte) +
    ' (' + (total ? total[1] : '?') + ' pruebas, ' + (fallos ? fallos[1] : '?') + ' fallos)');
}

config.parseConfig(path.join(root, 'karma.conf.cjs'), {}, { promiseConfig: true, throwErrors: true })
  .then(configuration => new Server(configuration, code => {
    process.exitCode = code;
    verificarReporte();
  }).start())
  .catch(error => { console.error(error); process.exitCode = 1; });
