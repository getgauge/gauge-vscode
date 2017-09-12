var fs = require('fs')
var packageJsonFile = 'package.json';

fs.readFile(packageJsonFile, (err, content) => {
	if (err)
		throw err;
	var parsedContent = JSON.parse(content);
	parsedContent.name = 'gauge-nightly';
	parsedContent.displayName = 'Gauge Nightly';
	parsedContent.version = updateVersion(parsedContent.version);
	var today = new Date();
	parsedContent.description = parsedContent.description + " Nightly version for date :  " + today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate();
	fs.truncate(packageJsonFile, 0, (err) => {
		if (err) {
			throw err;
		}
		fs.writeFile(packageJsonFile, JSON.stringify(parsedContent), (err) => {
			if (err) {
				throw err;
			}
		});
	});
});

var updateVersion = function (version) {
	var v = version.split(".");
	v[2] = parseInt(v[2]) + 1;
	return v.join(".");
}