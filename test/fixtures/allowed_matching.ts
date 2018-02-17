
// typetest:expect-error
const a: number = 'xyz';

// typetest:expect-error 2322
const b: number = 'xyz';

// typetest:expect-error 2322, 2451
const b: number = 'xyz';

// typetest:expect-error "Type '\"xyz\"' is not assignable to type 'number'."
const c: number = 'xyz';

// typetest:expect-error /not assignable/
const d: number = 'xyz';

