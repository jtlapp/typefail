
/* typefail:group "Uniquely errors missing-TS2451" */

// typefail:error 2451
const z = 'xyz';
z; // used

/* typefail:group "Uniquely errors missing-TS2322" */

// typefail:error 2322
let q: string = 'xyz';
q; //used
