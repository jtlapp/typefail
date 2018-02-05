
import * as minimatch from 'minimatch';

function makeFilter(filePath: string) {
    return minimatch.filter(filePath, { matchBase: true });
}

let a = ['/hello.ts', '/dir/hello', '/dir1/dir2/dir3/hello', '/dir/hello2'];

a.filter(makeFilter('/*/hello')).forEach(file => {

    console.log(file);
});
