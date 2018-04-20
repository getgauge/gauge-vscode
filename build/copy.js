var fs = require('fs-extra');

var args = process.argv.slice(2);
fs.copySync(args[0], args[1]);