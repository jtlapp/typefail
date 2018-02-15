
// Invalid directive semantics, though properly parsing.

import { DirectiveError } from '../lib/DirectiveError';

export const errors: DirectiveError[] = [];

/* typetest:xyz */
errors.push({ excerpt: "directive name" });
// typetest:xyz
errors.push({ excerpt: "directive name" });
/* typetest:xyz "abc" */
errors.push({ excerpt: "directive name" });
// typetest:xyz "abc"
errors.push({ excerpt: "directive name" });
/* typetest:group 123 */
errors.push({ excerpt: "group name", charNum: 19 });
// typetest:group 123
errors.push({ excerpt: "group name", charNum: 19 });
/* typetest:group /abc/ */
errors.push({ excerpt: "group name", charNum: 19 });
// typetest:group /abc/
errors.push({ excerpt: "group name", charNum: 19 });
/* typetest:group "abc", "def" */
errors.push({ excerpt: "one parameter", charNum: 26 });
// typetest:group "abc", "def"
errors.push({ excerpt: "one parameter", charNum: 26 });
/* typetest:group "abc", 123 */
errors.push({ excerpt: "one parameter", charNum: 26 });
// typetest:group "abc", 123
errors.push({ excerpt: "one parameter", charNum: 26 });
/* typetest:group 123, "abc" */
errors.push({ excerpt: "one parameter", charNum: 24 });
// typetest:group 123, "abc"
errors.push({ excerpt: "one parameter", charNum: 24 });
/* typetest:expect-error "abc", "def" */
errors.push({ excerpt: "invalid parameter", charNum: 33 });
// typetest:expect-error "abc", "def"
errors.push({ excerpt: "invalid parameter", charNum: 33 });
/* typetest:expect-error /abc/, /def/ */
errors.push({ excerpt: "invalid parameter", charNum: 33 });
// typetest:expect-error /abc/, /def/
errors.push({ excerpt: "invalid parameter", charNum: 33 });
/* typetest:expect-error 123, "def" */
errors.push({ excerpt: "invalid parameter", charNum: 31 });
// typetest:expect-error 123, "def"
errors.push({ excerpt: "invalid parameter", charNum: 31 });
/* typetest:expect-error 123, /def/ */
errors.push({ excerpt: "invalid parameter", charNum: 31 });
// typetest:expect-error 123, /def/
errors.push({ excerpt: "invalid parameter", charNum: 31 });
/* typetest:expect-error "abc", 123 */
errors.push({ excerpt: "invalid parameter", charNum: 33 });
// typetest:expect-error "abc", 123
errors.push({ excerpt: "invalid parameter", charNum: 33 });
