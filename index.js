var CP = require('child_process');
var Path = require('path');

var Tail = module.exports = function(path) {
	var self = this;
	path = Path.normalize(path);

	this.count = 0;
	this.filter = [];

	var buffer = "";
	var tail = CP.spawn('tail', [ '-n 0', '-F', path ]);
	tail.stdout.on('data', function(data) {
		if (data instanceof Buffer)
			data = data.toString('utf8');

		// Split lines and buffer trailing fragment
		var lines = (buffer + data).split(/\r?\n/g);
		buffer = lines.pop();

		// Remove lines that match a filter
		lines = lines.filter(function(line) {
			for ( var f = 0; f < self.filter.length; f++) {
				if (self.filter[f].test(line))
					return false;
			}
			return true;
		});

		this.count += lines.length;
	});

	this.child = tail;
};

Tail.prototype.addFilter = function(match) {
	if (match instanceof RegExp)
		this.filter.push(match);
};

Tail.prototype.run = function(callback) {
	callback(null, {
		'syslog.messages' : this.count
	});
	this.count = 0;
};
