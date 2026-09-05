// Measures the project rules and prints one line per check. Run it with
// "npm run check", or "npm run check -- --quick" to skip lint, tests and build.

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const MAX_FUNCTION = 14;
const MAX_FILE = 400;

/** Where the design tokens live; hex values are allowed only in there. */
const TOKEN_FILES = ['_tokens.scss', 'styles.scss'];

const failures = [];

/** Every file under a directory that carries one of the given extensions. */
function filesIn(dir, exts) {
  const out = [];
  const visit = (d) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) visit(full);
      else if (exts.includes(extname(full))) out.push(full);
    }
  };
  if (existsSync(dir)) visit(dir);
  return out;
}

/** The lines of one file. */
function lines(file) {
  return readFileSync(file, 'utf8').split('\n');
}

/** Every place a pattern matches, as file and line number. */
function hits(files, pattern) {
  const found = [];
  for (const file of files) {
    lines(file).forEach((line, i) => {
      if (pattern.test(line)) found.push(`${file}:${i + 1}`);
    });
  }
  return found;
}

/** Files that run longer than the limit. */
function longFiles(files) {
  return files
    .filter((file) => lines(file).length > MAX_FILE)
    .map((file) => `${file} (${lines(file).length})`);
}

/** The line where the block opened at the given line closes again. */
function blockEnd(rows, start) {
  let depth = 0;
  for (let i = start; i < rows.length; i++) {
    depth += (rows[i].match(/{/g) ?? []).length;
    depth -= (rows[i].match(/}/g) ?? []).length;
    if (depth === 0 && i > start) return i;
  }
  return rows.length;
}

/** PHP functions whose body runs longer than the limit. */
function longPhpFunctions(files) {
  const found = [];
  for (const file of files) {
    const rows = lines(file);
    rows.forEach((row, i) => {
      if (!row.startsWith('function ')) return;
      const length = blockEnd(rows, i) - i - 1;
      if (length > MAX_FUNCTION) found.push(`${file}:${i + 1} (${length})`);
    });
  }
  return found;
}

/**
 * Whether a doc comment stands above a line. Decorators and a sibling
 * declaration sharing one comment are stepped over, so a doc block covering
 * two lines does not read as a gap.
 */
function documented(rows, index) {
  let i = index - 1;
  for (let hop = 0; hop < 3 && i >= 0; hop++) {
    while (i >= 0 && (rows[i].trim() === '' || rows[i].trim().startsWith('@'))) i--;
    if (i < 0) return false;
    if (rows[i].trim().endsWith('*/')) return true;
    i--;
  }
  return false;
}

/** Declarations the given test calls public and that carry no doc comment. */
function docGaps(files, isPublic) {
  const found = [];
  for (const file of files) {
    const rows = lines(file);
    rows.forEach((row, i) => {
      if (isPublic(row) && !documented(rows, i)) found.push(`${file}:${i + 1}`);
    });
  }
  return found;
}

/** Whether a TypeScript line declares something the outside world can see. */
function isPublicTs(row) {
  if (/^export (type |)\{.*\} from /.test(row)) return false;
  if (/^ {2}(constructor|ngOnInit|ngOnDestroy)/.test(row)) return false;
  return (
    /^export (interface|function|type) /.test(row) ||
    /^ {2}(protected )?readonly /.test(row) ||
    /^ {2}(protected )?[a-zA-Z]\w*\(.*\).*\{/.test(row)
  );
}

/** Prints one row and remembers what went wrong. */
function report(label, found) {
  const dots = '.'.repeat(Math.max(2, 36 - label.length));
  console.log(`${label} ${dots} ${found.length === 0 ? 'ok' : `${found.length} !`}`);
  if (found.length > 0) failures.push([label, found]);
}

/** Runs one command and reports whether it came back clean. */
function runStep(label, command) {
  try {
    execSync(command, { stdio: 'pipe' });
    report(label, []);
  } catch {
    report(label, [`fehlgeschlagen, einzeln laufen lassen: ${command}`]);
  }
}

/** Length rules for functions and files. */
function checkSizes(ts, html, scss, php) {
  if (php.length > 0) report('PHP-Funktionen ueber 14 Zeilen', longPhpFunctions(php));
  report('Dateien ueber 400 Zeilen', longFiles([...ts, ...html, ...scss, ...php]));
}

/** Documentation on everything the outside world can see. */
function checkDocs(ts, php) {
  report('TSDoc-Luecken', docGaps(ts, isPublicTs));
  if (php.length > 0) report('PHP-Docblock-Luecken', docGaps(php, (r) => /^function /.test(r)));
}

/** The patterns the project has decided against. */
function checkPatterns(ts, html, scss) {
  report('any', hits(ts, /:\s*any\b|<any>|as any/));
  report('console ausserhalb Bootstrap', hits(ts.filter((f) => !f.endsWith('main.ts')), /console\./));
  report('*ngIf, NgModule, ngModel', hits([...ts, ...html], /\*ngIf|\*ngFor|NgModule|ngModel/));
  report('Constructor-DI', hits(ts, /constructor\([^)]*(private|public|protected) /));
  report('Inline-Templates', hits(ts, /template:\s*`/));
  report('@for ohne track', hits(html, /@for(?!.*track)/));
  report('Hex ausserhalb der Tokens', hits(scss, /#[0-9a-fA-F]{3,8}\b/));
}

/** Traces that must never end up in the repository. */
function checkTraces(all) {
  report('Em-Dashes', hits(all, /—/));
  report('KI- und Akademie-Spuren', hits(all, /claude|copilot|generated by|co-authored|akademie/i));
  report('TODO und FIXME', hits(all, /TODO|FIXME/));
}

/** Lint, tests and build, unless they were skipped. */
function checkTooling() {
  runStep('Lint', 'npx ng lint');
  runStep('Tests', 'npx ng test --watch=false');
  runStep('Build', 'npx ng build');
}

/** Prints what failed and picks the exit code. */
function finish() {
  if (failures.length === 0) {
    console.log('\nAlles sauber.');
    return;
  }
  console.log('');
  for (const [label, found] of failures) {
    console.log(`${label}:`);
    for (const entry of found.slice(0, 10)) console.log(`  ${entry}`);
    if (found.length > 10) console.log(`  und ${found.length - 10} weitere`);
  }
  process.exitCode = 1;
}

const ts = filesIn('src', ['.ts']).filter((f) => !f.endsWith('.spec.ts'));
const html = filesIn('src', ['.html']);
const scss = filesIn('src', ['.scss']).filter((f) => !TOKEN_FILES.some((n) => f.endsWith(n)));
const php = filesIn('api', ['.php']);

checkSizes(ts, html, scss, php);
checkDocs(ts, php);
checkPatterns(ts, html, scss);
checkTraces([...ts, ...html, ...scss, ...php]);
if (!process.argv.includes('--quick')) checkTooling();
finish();
