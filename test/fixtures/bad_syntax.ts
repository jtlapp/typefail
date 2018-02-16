
// Bad directive syntax.

import { DirectiveError } from '../lib/DirectiveError';

export const errors: DirectiveError[] = [];
let line = 7;

/* typetest: */
errors.push({ excerpt: "directive name", lineNum: (line += 2), charNum: 13 });
// typetest:
errors.push({ excerpt: "directive name", lineNum: (line += 2), charNum: 13 });
/* typetest:group Bad Syntax */
errors.push({ excerpt: "directive parameter", lineNum: (line += 2), charNum: 19 });
// typetest:group Bad Syntax
errors.push({ excerpt: "directive parameter", lineNum: (line += 2), charNum: 19 });
/* typetest:expect-error Bad Syntax */
errors.push({ excerpt: "directive parameter", lineNum: (line += 2), charNum: 26 });
// typetest:expect-error Bad Syntax
errors.push({ excerpt: "directive parameter", lineNum: (line += 2), charNum: 26 });
/* typetest:group &*!@#$ */
errors.push({ excerpt: "directive parameter", lineNum: (line += 2), charNum: 19 });
// typetest:group &*!@#$
errors.push({ excerpt: "directive parameter", lineNum: (line += 2), charNum: 19 });
/* typetest:expect-error &*!@#$ */
errors.push({ excerpt: "directive parameter", lineNum: (line += 2), charNum: 26 });
// typetest:expect-error &*!@#$
errors.push({ excerpt: "directive parameter", lineNum: (line += 2), charNum: 26 });
/* typetest:group "bad' */
errors.push({ excerpt: "string parameter", lineNum: (line += 2), charNum: 19 });
// typetest:group "bad'
errors.push({ excerpt: "string parameter", lineNum: (line += 2), charNum: 19 });
/* typetest:expect-error "bad' */
errors.push({ excerpt: "string parameter", lineNum: (line += 2), charNum: 26 });
// typetest:expect-error "bad'
errors.push({ excerpt: "string parameter", lineNum: (line += 2), charNum: 26 });
/* typetest:group 'bad" */
errors.push({ excerpt: "string parameter", lineNum: (line += 2), charNum: 19 });
// typetest:group 'bad"
errors.push({ excerpt: "string parameter", lineNum: (line += 2), charNum: 19 });
/* typetest:expect-error 'bad" */
errors.push({ excerpt: "string parameter", lineNum: (line += 2), charNum: 26 });
// typetest:expect-error 'bad"
errors.push({ excerpt: "string parameter", lineNum: (line += 2), charNum: 26 });
/* typetest:group "good"bad */
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 25 });
// typetest:group "good"bad
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 25 });
/* typetest:expect-error "good"bad */
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 32 });
// typetest:expect-error "good"bad
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 32 });
/* typetest:group "good"bad" */
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 25 });
// typetest:group "good"bad"
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 25 });
/* typetest:expect-error "good"bad" */
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 32 });
// typetest:expect-error "good"bad"
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 32 });
/* typetest:group 'good'bad */
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 25 });
// typetest:group 'good'bad
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 25 });
/* typetest:expect-error 'good'bad */
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 32 });
// typetest:expect-error 'good'bad
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 32 });
/* typetest:group 'good'bad' */
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 25 });
// typetest:group 'good'bad'
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 25 });
/* typetest:expect-error 'good'bad' */
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 32 });
// typetest:expect-error 'good'bad'
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 32 });
/* typetest:group 'good', */
errors.push({ excerpt: "directive parameter", lineNum: (line += 2), charNum: 26 });
// typetest:group 'good',
errors.push({ excerpt: "directive parameter", lineNum: (line += 2), charNum: 26 });
/* typetest:expect-error 123, */
errors.push({ excerpt: "directive parameter", lineNum: (line += 2), charNum: 30 });
// typetest:expect-error 123,
errors.push({ excerpt: "directive parameter", lineNum: (line += 2), charNum: 30 });
/* typetest:group 'good' "bad" */
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 26 });
// typetest:group 'good' "bad"
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 26 });
/* typetest:group: */
errors.push({ excerpt: "Invalid directive", lineNum: (line += 2) });
// typetest:group:
errors.push({ excerpt: "Invalid directive", lineNum: (line += 2) });
/* typetest:expect-error: */
errors.push({ excerpt: "Invalid directive", lineNum: (line += 2) });
// typetest:expect-error:
errors.push({ excerpt: "Invalid directive", lineNum: (line += 2) });
/* typetest:expect-error -1 */
errors.push({ excerpt: "directive parameter", lineNum: (line += 2), charNum: 26 });
// typetest:expect-error -1
errors.push({ excerpt: "directive parameter", lineNum: (line += 2), charNum: 26 });
/* typetest:expect-error 123 321 */
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 30 });
// typetest:expect-error 123 321
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 30 });
/* typetest:expect-error 123a */
errors.push({ excerpt: "integer parameter", lineNum: (line += 2), charNum: 26 });
// typetest:expect-error 123a
errors.push({ excerpt: "integer parameter", lineNum: (line += 2), charNum: 26 });
/* typetest:expect-error / */
errors.push({ excerpt: "regex parameter", lineNum: (line += 2), charNum: 26 });
// typetest:expect-error /
errors.push({ excerpt: "regex parameter", lineNum: (line += 2), charNum: 26 });
/* typetest:expect-error /bad */
errors.push({ excerpt: "regex parameter", lineNum: (line += 2), charNum: 26 });
// typetest:expect-error /bad
errors.push({ excerpt: "regex parameter", lineNum: (line += 2), charNum: 26 });
/* typetest:expect-error /// */
errors.push({ excerpt: "regex parameter", lineNum: (line += 2), charNum: 26 });
// typetest:expect-error ///
errors.push({ excerpt: "regex parameter", lineNum: (line += 2), charNum: 26 });
/* typetest:expect-error /[/ */
errors.push({ excerpt: "regex parameter", lineNum: (line += 2), charNum: 26 });
// typetest:expect-error /[/
errors.push({ excerpt: "regex parameter", lineNum: (line += 2), charNum: 26 });
/* typetest:expect-error /[^/ */
errors.push({ excerpt: "regex parameter", lineNum: (line += 2), charNum: 26 });
// typetest:expect-error /[^/
errors.push({ excerpt: "regex parameter", lineNum: (line += 2), charNum: 26 });
/* typetest:expect-error /[abc\]/ */
errors.push({ excerpt: "regex parameter", lineNum: (line += 2), charNum: 26 });
// typetest:expect-error /[abc\]/
errors.push({ excerpt: "regex parameter", lineNum: (line += 2), charNum: 26 });
/* typetest:expect-error /[^abc\]/ */
errors.push({ excerpt: "regex parameter", lineNum: (line += 2), charNum: 26 });
// typetest:expect-error /[^abc\]/
errors.push({ excerpt: "regex parameter", lineNum: (line += 2), charNum: 26 });
/* typetest:expect-error /bad/$ */
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 31 });
// typetest:expect-error /bad/$
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 31 });
/* typetest:expect-error /bad/Z */
errors.push({ excerpt: "regex flags", lineNum: (line += 2), charNum: 26 });
// typetest:expect-error /bad/Z
errors.push({ excerpt: "regex flags", lineNum: (line += 2), charNum: 26 });
/* typetest:expect-error /abc/iz */
errors.push({ excerpt: "regex flags", lineNum: (line += 2), charNum: 26 });
// typetest:expect-error /abc/iz
errors.push({ excerpt: "regex flags", lineNum: (line += 2), charNum: 26 });
/* typetest:group "Group Name" */ //foo
errors.push({ excerpt: "Code cannot follow", lineNum: (line += 2) });
/* typetest:expect-error "abc" */ //foo
errors.push({ excerpt: "Code cannot follow", lineNum: (line += 2) });
/* typetest:group "Group Name"
*/
errors.push({ excerpt: "must be single line", lineNum: (line += 2) });
/* typetest:expect-error "abc"
*/
errors.push({ excerpt: "must be single line", lineNum: (line += 3) });
