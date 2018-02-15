
// Bad directive syntax.

import { DirectiveError } from '../lib/DirectiveError';

export const errors: DirectiveError[] = [];

/* typetest: */
errors.push({ excerpt: "directive name", charNum: 13 });
// typetest:
errors.push({ excerpt: "directive name", charNum: 13 });
/* typetest:group Bad Syntax */
errors.push({ excerpt: "directive parameter", charNum: 19 });
// typetest:group Bad Syntax
errors.push({ excerpt: "directive parameter", charNum: 19 });
/* typetest:expect-error Bad Syntax */
errors.push({ excerpt: "directive parameter", charNum: 26 });
// typetest:expect-error Bad Syntax
errors.push({ excerpt: "directive parameter", charNum: 26 });
/* typetest:group &*!@#$ */
errors.push({ excerpt: "directive parameter", charNum: 19 });
// typetest:group &*!@#$
errors.push({ excerpt: "directive parameter", charNum: 19 });
/* typetest:expect-error &*!@#$ */
errors.push({ excerpt: "directive parameter", charNum: 26 });
// typetest:expect-error &*!@#$
errors.push({ excerpt: "directive parameter", charNum: 26 });
/* typetest:group "bad' */
errors.push({ excerpt: "string parameter", charNum: 19 });
// typetest:group "bad'
errors.push({ excerpt: "string parameter", charNum: 19 });
/* typetest:expect-error "bad' */
errors.push({ excerpt: "string parameter", charNum: 26 });
// typetest:expect-error "bad'
errors.push({ excerpt: "string parameter", charNum: 26 });
/* typetest:group 'bad" */
errors.push({ excerpt: "string parameter", charNum: 19 });
// typetest:group 'bad"
errors.push({ excerpt: "string parameter", charNum: 19 });
/* typetest:expect-error 'bad" */
errors.push({ excerpt: "string parameter", charNum: 26 });
// typetest:expect-error 'bad"
errors.push({ excerpt: "string parameter", charNum: 26 });
/* typetest:group "good"bad */
errors.push({ excerpt: "directive syntax", charNum: 25 });
// typetest:group "good"bad
errors.push({ excerpt: "directive syntax", charNum: 25 });
/* typetest:expect-error "good"bad */
errors.push({ excerpt: "directive syntax", charNum: 32 });
// typetest:expect-error "good"bad
errors.push({ excerpt: "directive syntax", charNum: 32 });
/* typetest:group "good"bad" */
errors.push({ excerpt: "directive syntax", charNum: 25 });
// typetest:group "good"bad"
errors.push({ excerpt: "directive syntax", charNum: 25 });
/* typetest:expect-error "good"bad" */
errors.push({ excerpt: "directive syntax", charNum: 32 });
// typetest:expect-error "good"bad"
errors.push({ excerpt: "directive syntax", charNum: 32 });
/* typetest:group 'good'bad */
errors.push({ excerpt: "directive syntax", charNum: 25 });
// typetest:group 'good'bad
errors.push({ excerpt: "directive syntax", charNum: 25 });
/* typetest:expect-error 'good'bad */
errors.push({ excerpt: "directive syntax", charNum: 32 });
// typetest:expect-error 'good'bad
errors.push({ excerpt: "directive syntax", charNum: 32 });
/* typetest:group 'good'bad' */
errors.push({ excerpt: "directive syntax", charNum: 25 });
// typetest:group 'good'bad'
errors.push({ excerpt: "directive syntax", charNum: 25 });
/* typetest:expect-error 'good'bad' */
errors.push({ excerpt: "directive syntax", charNum: 32 });
// typetest:expect-error 'good'bad'
errors.push({ excerpt: "directive syntax", charNum: 32 });
/* typetest:group 'good', */
errors.push({ excerpt: "directive parameter", charNum: 26 });
// typetest:group 'good',
errors.push({ excerpt: "directive parameter", charNum: 26 });
/* typetest:expect-error 123, */
errors.push({ excerpt: "directive parameter", charNum: 30 });
// typetest:expect-error 123,
errors.push({ excerpt: "directive parameter", charNum: 30 });
/* typetest:group 'good' "bad" */
errors.push({ excerpt: "directive syntax", charNum: 26 });
// typetest:group 'good' "bad"
errors.push({ excerpt: "directive syntax", charNum: 26 });
/* typetest:group: */
errors.push({ excerpt: "Invalid directive" });
// typetest:group:
errors.push({ excerpt: "Invalid directive" });
/* typetest:expect-error: */
errors.push({ excerpt: "Invalid directive" });
// typetest:expect-error:
errors.push({ excerpt: "Invalid directive" });
/* typetest:expect-error -1 */
errors.push({ excerpt: "directive parameter", charNum: 26 });
// typetest:expect-error -1
errors.push({ excerpt: "directive parameter", charNum: 26 });
/* typetest:expect-error 123 321 */
errors.push({ excerpt: "directive syntax", charNum: 30 });
// typetest:expect-error 123 321
errors.push({ excerpt: "directive syntax", charNum: 30 });
/* typetest:expect-error 123a */
errors.push({ excerpt: "integer parameter", charNum: 26 });
// typetest:expect-error 123a
errors.push({ excerpt: "integer parameter", charNum: 26 });
/* typetest:expect-error / */
errors.push({ excerpt: "regex parameter", charNum: 26 });
// typetest:expect-error /
errors.push({ excerpt: "regex parameter", charNum: 26 });
/* typetest:expect-error /bad */
errors.push({ excerpt: "regex parameter", charNum: 26 });
// typetest:expect-error /bad
errors.push({ excerpt: "regex parameter", charNum: 26 });
/* typetest:expect-error /// */
errors.push({ excerpt: "regex parameter", charNum: 26 });
// typetest:expect-error ///
errors.push({ excerpt: "regex parameter", charNum: 26 });
/* typetest:expect-error /[/ */
errors.push({ excerpt: "regex parameter", charNum: 26 });
// typetest:expect-error /[/
errors.push({ excerpt: "regex parameter", charNum: 26 });
/* typetest:expect-error /[^/ */
errors.push({ excerpt: "regex parameter", charNum: 26 });
// typetest:expect-error /[^/
errors.push({ excerpt: "regex parameter", charNum: 26 });
/* typetest:expect-error /[abc\]/ */
errors.push({ excerpt: "regex parameter", charNum: 26 });
// typetest:expect-error /[abc\]/
errors.push({ excerpt: "regex parameter", charNum: 26 });
/* typetest:expect-error /[^abc\]/ */
errors.push({ excerpt: "regex parameter", charNum: 26 });
// typetest:expect-error /[^abc\]/
errors.push({ excerpt: "regex parameter", charNum: 26 });
/* typetest:expect-error /bad/$ */
errors.push({ excerpt: "directive syntax", charNum: 31 });
// typetest:expect-error /bad/$
errors.push({ excerpt: "directive syntax", charNum: 31 });
/* typetest:expect-error /bad/Z */
errors.push({ excerpt: "regex flags", charNum: 26 });
// typetest:expect-error /bad/Z
errors.push({ excerpt: "regex flags", charNum: 26 });
/* typetest:expect-error /abc/iz */
errors.push({ excerpt: "regex flags", charNum: 26 });
// typetest:expect-error /abc/iz
errors.push({ excerpt: "regex flags", charNum: 26 });
/* typetest:group "Group Name" */ //foo
errors.push({ excerpt: "Code cannot follow" });
/* typetest:expect-error "abc" */ //foo
errors.push({ excerpt: "Code cannot follow" });
/* typetest:group "Group Name"
*/
errors.push({ excerpt: "must be single line" });
/* typetest:expect-error "abc"
*/
errors.push({ excerpt: "must be single line" });
