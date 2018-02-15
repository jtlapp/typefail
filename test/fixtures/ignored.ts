
// Not recognized as directives; ignored.

/* typetest */
// typetest
/** typetest:group "'Ignored" */
/// typetest:group "'Ignored"
/* -typetest:group "'Ignored" */
// -typetest:group "'Ignored"
/** typetest:expect-error "'Ignored" */
/// typetest:expect-error "'Ignored"
/* -typetest:expect-error "'Ignored" */
// -typetest:expect-error "'Ignored"
// /* typetest:expect-error "Error" */
/* // typetest:expect-error "Error" */
/* /* typetest:expect-error "Error" */
/*
typetest:expect-error "Error" */
/*
typetest:expect-error "Error"
*/
/*
// typetest:expect-error "Error"
*/
/*
/* typetest:expect-error "Error" */
/**
 * typetest:expect-error "Error"
 * */