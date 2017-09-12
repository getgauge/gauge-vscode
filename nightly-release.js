var fs = require('fs')
var packageJsonFile = 'package.json';

fs.readFile(packageJsonFile, (err, content) => {
	if (err)
		throw err;
	var parsedContent = JSON.parse(content);
	parsedContent.name = 'gauge-nightly';
	parsedContent.displayName = 'Gauge Nightly';
	var today = new Date();
	var nightlyVersion = 'nightly-' + today.getFullYear() + '-' + today.getMonth() + '-' + today.getDate();
	parsedContent.version = parsedContent.version + '-' + nightlyVersion;
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