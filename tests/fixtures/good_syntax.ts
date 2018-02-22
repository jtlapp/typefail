
// Good directive syntax.

/*typefail:group "Group 1"*/  
let g = 0; // initial code must come after first group directive for this test
++g;
//typefail:group "Group 2"  
++g;
/* typefail:group "Group 3" */  
++g;
// typefail:group "Group 4"  
++g;
/*  typefail:group  "Group 5"  */
++g;
//  typefail:group  "Group 6"
++g;
/* typefail:group "Group '7'" */
++g;
// typefail:group "Group '8'"
++g;
/* typefail:group "Group \"9\"" */
++g;
// typefail:group "Group \"10\""
++g;
/* typefail:group 'Group 11' */
++g;
// typefail:group 'Group 12'
++g;
/* typefail:group 'Group "13"' */
++g;
// typefail:group 'Group "14"'
++g;
/* typefail:group 'Group \'15\'' */
++g;
// typefail:group 'Group \'16\''
++g;
/* typefail:group "Group 17" ********/
++g;

/*typefail:error*/
let f = 0;
++f;
//typefail:error
++f;
/* typefail:error */
++f;
// typefail:error
++f;
/*   typefail:error   */  
++f;
//   typefail:error  
++f;
/* typefail:error "Something isn't \"working\"" */
++f;
// typefail:error "Something isn't \"working\""
++f;
/* typefail:error 'Something isn\'t "working"' */
++f;
// typefail:error 'Something isn\'t "working"'
++f;
/* typefail:error /this should work/ */
++f;
// typefail:error /this should work/
++f;
/* typefail:error /good/imu */
++f;
// typefail:error /good/imu
++f;
/* typefail:error /\[also\/good/ */
++f;
// typefail:error /\[also\/good/
++f;
/* typefail:error /[abc\]def]xyz/ */
++f;
// typefail:error /[abc\]def]xyz/
++f;
/* typefail:error /abc[^def]/ */
++f;
// typefail:error /abc[^def]/
++f;
/* typefail:error 123 */
++f;
// typefail:error 123
++f;
/* typefail:error 123, 456, 789 */
f += 3;
// typefail:error 123, 456, 789
f += 3;
/* typefail:error 123 ,456  ,  789 */
f += 3;
// typefail:error 123 ,456  ,  789
f += 3;
/* typefail:error "Error description" ************/
++f;

export const counts = {
    groups: g,
    failures: f
};
