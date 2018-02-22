
// typefail:error
const a: number = 'xyz';

// typefail:error 2322
const b: number = 'xyz';

// typefail:error 2322, 2451
const b: number = 'xyz';

// typefail:error "Type '\"xyz\"' is not assignable to type 'number'."
const c: number = 'xyz';

// typefail:error /not assignable/
const d: number = 'xyz';

