
/* typetest:group "Uniquely errors missing-TS2451" */

// typetest:error 2451
const z = 'xyz';
z; // used

/* typetest:group "Uniquely errors missing-TS2322" */

// typetest:error 2322
let q: string = 'xyz';
q; //used
