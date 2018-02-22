
// Invalid directive semantics, though properly parsing.

import { DirectiveError } from '../lib/testlib';

export const errors: DirectiveError[] = [];
let line = 7;

/* typefail:xyz */
errors.push({ excerpt: "directive name", lineNum: (line += 2) });
// typefail:xyz
errors.push({ excerpt: "directive name", lineNum: (line += 2) });
/* typefail:xyz "abc" */
errors.push({ excerpt: "directive name", lineNum: (line += 2) });
// typefail:xyz "abc"
errors.push({ excerpt: "directive name", lineNum: (line += 2) });
/* typefail:group 123 */
errors.push({ excerpt: "group name", lineNum: (line += 2), charNum: 19 });
// typefail:group 123
errors.push({ excerpt: "group name", lineNum: (line += 2), charNum: 19 });
/* typefail:group /abc/ */
errors.push({ excerpt: "group name", lineNum: (line += 2), charNum: 19 });
// typefail:group /abc/
errors.push({ excerpt: "group name", lineNum: (line += 2), charNum: 19 });
/* typefail:group "abc", "def" */
errors.push({ excerpt: "one parameter", lineNum: (line += 2), charNum: 26 });
// typefail:group "abc", "def"
errors.push({ excerpt: "one parameter", lineNum: (line += 2), charNum: 26 });
/* typefail:group "abc", 123 */
errors.push({ excerpt: "one parameter", lineNum: (line += 2), charNum: 26 });
// typefail:group "abc", 123
errors.push({ excerpt: "one parameter", lineNum: (line += 2), charNum: 26 });
/* typefail:group 123, "abc" */
errors.push({ excerpt: "one parameter", lineNum: (line += 2), charNum: 24 });
// typefail:group 123, "abc"
errors.push({ excerpt: "one parameter", lineNum: (line += 2), charNum: 24 });
/* typefail:error "abc", "def" */
errors.push({ excerpt: "invalid parameter", lineNum: (line += 2), charNum: 26 });
// typefail:error "abc", "def"
errors.push({ excerpt: "invalid parameter", lineNum: (line += 2), charNum: 26 });
/* typefail:error /abc/, /def/ */
errors.push({ excerpt: "invalid parameter", lineNum: (line += 2), charNum: 26 });
// typefail:error /abc/, /def/
errors.push({ excerpt: "invalid parameter", lineNum: (line += 2), charNum: 26 });
/* typefail:error 123, "def" */
errors.push({ excerpt: "invalid parameter", lineNum: (line += 2), charNum: 24 });
// typefail:error 123, "def"
errors.push({ excerpt: "invalid parameter", lineNum: (line += 2), charNum: 24 });
/* typefail:error 123, /def/ */
errors.push({ excerpt: "invalid parameter", lineNum: (line += 2), charNum: 24 });
// typefail:error 123, /def/
errors.push({ excerpt: "invalid parameter", lineNum: (line += 2), charNum: 24 });
/* typefail:error "abc", 123 */
errors.push({ excerpt: "invalid parameter", lineNum: (line += 2), charNum: 26 });
// typefail:error "abc", 123
errors.push({ excerpt: "invalid parameter", lineNum: (line += 2), charNum: 26 });
