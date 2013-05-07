var CP = require('child_process');
var Path = require('path');

var Tail = module.exports = function(path, prefix) {
	var self = this;
	path = Path.normalize(path);

	this.prefix = prefix || path;
	this.counters = {
		all : 0
	};
	this.filters = {};

	var buffer = "";
	var tail = CP.spawn('tail', [ '-n 0', '-F', path ]);
	tail.stdout.on('data', function(data) {
		if (data instanceof Buffer)
			data = data.toString('utf8');

		// Split lines and buffer trailing fragment
		var lines = (buffer + data).split(/\r?\n/g);
		buffer = lines.pop();

		// Increment default counter
		self.counters.all += lines.length;

		// Run each filter against lines and increment respective counters
		Object.keys(self.filters).forEach(function(key) {
			self.counters[key] += lines.filter(function(l) {
				return self.filters[key].test(l);
			}).length;
		});
	});

	this.child = tail;
};

Tail.prototype.addFilter = function(name, match) {
	if (name == "all")
		return;

	if (match instanceof RegExp) {
		this.filters[name] = match;
		this.counters[name] = 0;
	}
};

Tail.prototype.removeFilter = function(name) {
	if (name == "all")
		return;

	delete this.filters[name];
	delete this.counters[name];
};

Tail.prototype.run = function(callback) {
	var self = this;

	// Prepend metric prefix to counters
	var metrics = {};
	Object.keys(this.counters).forEach(function(key) {
		var name = key;
		if (self.prefix)
			name = self.prefix + '.' + name;

		metrics[name] = self.counters[key];
	});

	callback(null, metrics);

	// Reset counters
	Object.keys(this.counters).forEach(function(key) {
		self.counters[key] = 0;
	});
};

Tail.prototype.cleanup = function() {
	this.child.disconnect();
	this.child.kill();
};
