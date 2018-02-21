
// typetest:error
const a: number = 'xyz';

// typetest:error 2322
const b: number = 'xyz';

// typetest:error 2322, 2451
const b: number = 'xyz';

// typetest:error "Type '\"xyz\"' is not assignable to type 'number'."
const c: number = 'xyz';

// typetest:error /not assignable/
const d: number = 'xyz';

