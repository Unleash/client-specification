'use strict';

const murmurHash3 = require('murmurhash3js');

function getTarget (name, id, total) {
    return (murmurHash3.x86.hash32(`${name}:${id}`) % total) + 1;
}


function findTarget (name, total, wantedTarget) {
    let found = false;
    let iterations = 0;
    while(!found) {
        iterations++;
        const id = Math.round(Math.random() * Math.random() * 1000);
        const target = getTarget(name, id, total);
        if (target === wantedTarget) {
            console.log(`If you give userId "${id}" with toggleName "${name}" it will give you allocation "${target}"`);
            found = true;
        }
        if (iterations == 100000) {
            throw new Error('1000 tries is enough');
        }
        
    }
}

/*const toggleName = 'name';
findTarget(toggleName, 100, 25);
findTarget(toggleName, 100, 50);
findTarget(toggleName, 100, 30);
findTarget(toggleName, 100, 80);
findTarget(toggleName, 100, 100);
*/

const [bin, file, name, total, wanted] = process.argv;
if (!name || !total || !wanted) {
    console.error(`Usage:
    $ node scripts/generate-wanted-hash.js toggleName 100 25

    100 = total number
    25 = wanted allocation
    
    `);
    return;
}


findTarget(String(name), Number(total), Number(wanted));

