
// Good directive syntax.

/*typetest:group "Group 1"*/  
let g = 0; // initial code must come after first group directive for this test
++g;
//typetest:group "Group 2"  
++g;
/* typetest:group "Group 3" */  
++g;
// typetest:group "Group 4"  
++g;
/*  typetest:group  "Group 5"  */
++g;
//  typetest:group  "Group 6"
++g;
/* typetest:group "Group '7'" */
++g;
// typetest:group "Group '8'"
++g;
/* typetest:group "Group \"9\"" */
++g;
// typetest:group "Group \"10\""
++g;
/* typetest:group 'Group 11' */
++g;
// typetest:group 'Group 12'
++g;
/* typetest:group 'Group "13"' */
++g;
// typetest:group 'Group "14"'
++g;
/* typetest:group 'Group \'15\'' */
++g;
// typetest:group 'Group \'16\''
++g;
/* typetest:group "Group 17" ********/
++g;

/*typetest:expect-error*/
let f = 0;
++f;
//typetest:expect-error
++f;
/* typetest:expect-error */
++f;
// typetest:expect-error
++f;
/*   typetest:expect-error   */  
++f;
//   typetest:expect-error  
++f;
/* typetest:expect-error "Something isn't \"working\"" */
++f;
// typetest:expect-error "Something isn't \"working\""
++f;
/* typetest:expect-error 'Something isn\'t "working"' */
++f;
// typetest:expect-error 'Something isn\'t "working"'
++f;
/* typetest:expect-error /this should work/ */
++f;
// typetest:expect-error /this should work/
++f;
/* typetest:expect-error /good/imu */
++f;
// typetest:expect-error /good/imu
++f;
/* typetest:expect-error /\[also\/good/ */
++f;
// typetest:expect-error /\[also\/good/
++f;
/* typetest:expect-error /[abc\]def]xyz/ */
++f;
// typetest:expect-error /[abc\]def]xyz/
++f;
/* typetest:expect-error /abc[^def]/ */
++f;
// typetest:expect-error /abc[^def]/
++f;
/* typetest:expect-error 123 */
++f;
// typetest:expect-error 123
++f;
/* typetest:expect-error 123, 456, 789 */
f += 3;
// typetest:expect-error 123, 456, 789
f += 3;
/* typetest:expect-error 123 ,456  ,  789 */
f += 3;
// typetest:expect-error 123 ,456  ,  789
f += 3;
/* typetest:expect-error "Error description" ************/
++f;

export const counts = {
    groups: g,
    failures: f
};
