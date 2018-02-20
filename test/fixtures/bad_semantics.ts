
// Invalid directive semantics, though properly parsing.

import { DirectiveError } from '../lib/testlib';

export const errors: DirectiveError[] = [];
let line = 7;

/* typetest:xyz */
errors.push({ excerpt: "directive name", lineNum: (line += 2) });
// typetest:xyz
errors.push({ excerpt: "directive name", lineNum: (line += 2) });
/* typetest:xyz "abc" */
errors.push({ excerpt: "directive name", lineNum: (line += 2) });
// typetest:xyz "abc"
errors.push({ excerpt: "directive name", lineNum: (line += 2) });
/* typetest:group 123 */
errors.push({ excerpt: "group name", lineNum: (line += 2), charNum: 19 });
// typetest:group 123
errors.push({ excerpt: "group name", lineNum: (line += 2), charNum: 19 });
/* typetest:group /abc/ */
errors.push({ excerpt: "group name", lineNum: (line += 2), charNum: 19 });
// typetest:group /abc/
errors.push({ excerpt: "group name", lineNum: (line += 2), charNum: 19 });
/* typetest:group "abc", "def" */
errors.push({ excerpt: "one parameter", lineNum: (line += 2), charNum: 26 });
// typetest:group "abc", "def"
errors.push({ excerpt: "one parameter", lineNum: (line += 2), charNum: 26 });
/* typetest:group "abc", 123 */
errors.push({ excerpt: "one parameter", lineNum: (line += 2), charNum: 26 });
// typetest:group "abc", 123
errors.push({ excerpt: "one parameter", lineNum: (line += 2), charNum: 26 });
/* typetest:group 123, "abc" */
errors.push({ excerpt: "one parameter", lineNum: (line += 2), charNum: 24 });
// typetest:group 123, "abc"
errors.push({ excerpt: "one parameter", lineNum: (line += 2), charNum: 24 });
/* typetest:expect-error "abc", "def" */
errors.push({ excerpt: "invalid parameter", lineNum: (line += 2), charNum: 33 });
// typetest:expect-error "abc", "def"
errors.push({ excerpt: "invalid parameter", lineNum: (line += 2), charNum: 33 });
/* typetest:expect-error /abc/, /def/ */
errors.push({ excerpt: "invalid parameter", lineNum: (line += 2), charNum: 33 });
// typetest:expect-error /abc/, /def/
errors.push({ excerpt: "invalid parameter", lineNum: (line += 2), charNum: 33 });
/* typetest:expect-error 123, "def" */
errors.push({ excerpt: "invalid parameter", lineNum: (line += 2), charNum: 31 });
// typetest:expect-error 123, "def"
errors.push({ excerpt: "invalid parameter", lineNum: (line += 2), charNum: 31 });
/* typetest:expect-error 123, /def/ */
errors.push({ excerpt: "invalid parameter", lineNum: (line += 2), charNum: 31 });
// typetest:expect-error 123, /def/
errors.push({ excerpt: "invalid parameter", lineNum: (line += 2), charNum: 31 });
/* typetest:expect-error "abc", 123 */
errors.push({ excerpt: "invalid parameter", lineNum: (line += 2), charNum: 33 });
// typetest:expect-error "abc", 123
errors.push({ excerpt: "invalid parameter", lineNum: (line += 2), charNum: 33 });
