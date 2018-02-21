
// Bad directive syntax.

import { DirectiveError } from '../lib/testlib';

export const errors: DirectiveError[] = [];
let line = 7;

/* typefail: */
errors.push({ excerpt: "directive name", lineNum: (line += 2), charNum: 13 });
// typefail:
errors.push({ excerpt: "directive name", lineNum: (line += 2), charNum: 13 });
/* typefail:group Bad Syntax */
errors.push({ excerpt: "directive parameter", lineNum: (line += 2), charNum: 19 });
// typefail:group Bad Syntax
errors.push({ excerpt: "directive parameter", lineNum: (line += 2), charNum: 19 });
/* typefail:error Bad Syntax */
errors.push({ excerpt: "directive parameter", lineNum: (line += 2), charNum: 19 });
// typefail:error Bad Syntax
errors.push({ excerpt: "directive parameter", lineNum: (line += 2), charNum: 19 });
/* typefail:group &*!@#$ */
errors.push({ excerpt: "directive parameter", lineNum: (line += 2), charNum: 19 });
// typefail:group &*!@#$
errors.push({ excerpt: "directive parameter", lineNum: (line += 2), charNum: 19 });
/* typefail:error &*!@#$ */
errors.push({ excerpt: "directive parameter", lineNum: (line += 2), charNum: 19 });
// typefail:error &*!@#$
errors.push({ excerpt: "directive parameter", lineNum: (line += 2), charNum: 19 });
/* typefail:group "bad' */
errors.push({ excerpt: "string parameter", lineNum: (line += 2), charNum: 19 });
// typefail:group "bad'
errors.push({ excerpt: "string parameter", lineNum: (line += 2), charNum: 19 });
/* typefail:error "bad' */
errors.push({ excerpt: "string parameter", lineNum: (line += 2), charNum: 19 });
// typefail:error "bad'
errors.push({ excerpt: "string parameter", lineNum: (line += 2), charNum: 19 });
/* typefail:group 'bad" */
errors.push({ excerpt: "string parameter", lineNum: (line += 2), charNum: 19 });
// typefail:group 'bad"
errors.push({ excerpt: "string parameter", lineNum: (line += 2), charNum: 19 });
/* typefail:error 'bad" */
errors.push({ excerpt: "string parameter", lineNum: (line += 2), charNum: 19 });
// typefail:error 'bad"
errors.push({ excerpt: "string parameter", lineNum: (line += 2), charNum: 19 });
/* typefail:group "good"bad */
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 25 });
// typefail:group "good"bad
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 25 });
/* typefail:error "good"bad */
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 25 });
// typefail:error "good"bad
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 25 });
/* typefail:group "good"bad" */
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 25 });
// typefail:group "good"bad"
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 25 });
/* typefail:error "good"bad" */
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 25 });
// typefail:error "good"bad"
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 25 });
/* typefail:group 'good'bad */
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 25 });
// typefail:group 'good'bad
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 25 });
/* typefail:error 'good'bad */
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 25 });
// typefail:error 'good'bad
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 25 });
/* typefail:group 'good'bad' */
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 25 });
// typefail:group 'good'bad'
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 25 });
/* typefail:error 'good'bad' */
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 25 });
// typefail:error 'good'bad'
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 25 });
/* typefail:group 'good', */
errors.push({ excerpt: "directive parameter", lineNum: (line += 2), charNum: 26 });
// typefail:group 'good',
errors.push({ excerpt: "directive parameter", lineNum: (line += 2), charNum: 26 });
/* typefail:error 123, */
errors.push({ excerpt: "directive parameter", lineNum: (line += 2), charNum: 23 });
// typefail:error 123,
errors.push({ excerpt: "directive parameter", lineNum: (line += 2), charNum: 23 });
/* typefail:group 'good' "bad" */
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 26 });
// typefail:group 'good' "bad"
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 26 });
/* typefail:group: */
errors.push({ excerpt: "Invalid directive", lineNum: (line += 2) });
// typefail:group:
errors.push({ excerpt: "Invalid directive", lineNum: (line += 2) });
/* typefail:error: */
errors.push({ excerpt: "Invalid directive", lineNum: (line += 2) });
// typefail:error:
errors.push({ excerpt: "Invalid directive", lineNum: (line += 2) });
/* typefail:error -1 */
errors.push({ excerpt: "directive parameter", lineNum: (line += 2), charNum: 19 });
// typefail:error -1
errors.push({ excerpt: "directive parameter", lineNum: (line += 2), charNum: 19 });
/* typefail:error 123 321 */
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 23 });
// typefail:error 123 321
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 23 });
/* typefail:error 123a */
errors.push({ excerpt: "integer parameter", lineNum: (line += 2), charNum: 19 });
// typefail:error 123a
errors.push({ excerpt: "integer parameter", lineNum: (line += 2), charNum: 19 });
/* typefail:error / */
errors.push({ excerpt: "regex parameter", lineNum: (line += 2), charNum: 19 });
// typefail:error /
errors.push({ excerpt: "regex parameter", lineNum: (line += 2), charNum: 19 });
/* typefail:error /bad */
errors.push({ excerpt: "regex parameter", lineNum: (line += 2), charNum: 19 });
// typefail:error /bad
errors.push({ excerpt: "regex parameter", lineNum: (line += 2), charNum: 19 });
/* typefail:error /// */
errors.push({ excerpt: "regex parameter", lineNum: (line += 2), charNum: 19 });
// typefail:error ///
errors.push({ excerpt: "regex parameter", lineNum: (line += 2), charNum: 19 });
/* typefail:error /[/ */
errors.push({ excerpt: "regex parameter", lineNum: (line += 2), charNum: 19 });
// typefail:error /[/
errors.push({ excerpt: "regex parameter", lineNum: (line += 2), charNum: 19 });
/* typefail:error /[^/ */
errors.push({ excerpt: "regex parameter", lineNum: (line += 2), charNum: 19 });
// typefail:error /[^/
errors.push({ excerpt: "regex parameter", lineNum: (line += 2), charNum: 19 });
/* typefail:error /[abc\]/ */
errors.push({ excerpt: "regex parameter", lineNum: (line += 2), charNum: 19 });
// typefail:error /[abc\]/
errors.push({ excerpt: "regex parameter", lineNum: (line += 2), charNum: 19 });
/* typefail:error /[^abc\]/ */
errors.push({ excerpt: "regex parameter", lineNum: (line += 2), charNum: 19 });
// typefail:error /[^abc\]/
errors.push({ excerpt: "regex parameter", lineNum: (line += 2), charNum: 19 });
/* typefail:error /bad/$ */
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 24 });
// typefail:error /bad/$
errors.push({ excerpt: "directive syntax", lineNum: (line += 2), charNum: 24 });
/* typefail:error /bad/Z */
errors.push({ excerpt: "regex flags", lineNum: (line += 2), charNum: 19 });
// typefail:error /bad/Z
errors.push({ excerpt: "regex flags", lineNum: (line += 2), charNum: 19 });
/* typefail:error /abc/iz */
errors.push({ excerpt: "regex flags", lineNum: (line += 2), charNum: 19 });
// typefail:error /abc/iz
errors.push({ excerpt: "regex flags", lineNum: (line += 2), charNum: 19 });
/* typefail:group "Group Name" */ //foo
errors.push({ excerpt: "Code cannot follow", lineNum: (line += 2) });
/* typefail:error "abc" */ //foo
errors.push({ excerpt: "Code cannot follow", lineNum: (line += 2) });
/* typefail:group "Group Name"
*/
errors.push({ excerpt: "must be single line", lineNum: (line += 2) });
/* typefail:error "abc"
*/
errors.push({ excerpt: "must be single line", lineNum: (line += 3) });
