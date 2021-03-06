var CP = require('child_process');
var Path = require('path');

var Tail = module.exports = function(options) {
	var self = this;

	var path = options.path || options;
	path = Path.normalize(path);

	this.root = options.root;
	this.prefix = options.prefix;
	this.counters = {
		all : 0
	};
	this.filters = {
		all : /./
	};

	var command = "tail";
	var params = [ '-n0', '-F', path ];

	// SSH Tunnel
	if (options.host) {
		command = "ssh";
		params.unshift(options.host, 'tail');

		// SSH Key
		if (options.key)
			params.unshift("-i", options.key);
	}

	// Line Reader
	var buffer = "";
	var tail = CP.spawn(command, params);

	if (options.debug) {
		tail.stderr.setEncoding('utf8');
		tail.stderr.on('data', function(data) {
			console.log("ERROR: " + data);
		});
	}

	tail.stdout.on('data', function(data) {
		if (data instanceof Buffer)
			data = data.toString('utf8');

		console.log(data);

		// Split lines and buffer trailing fragment
		var lines = (buffer + data).split(/\r?\n/g);
		buffer = lines.pop();

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
	if (match instanceof RegExp) {
		this.filters[name] = match;
		this.counters[name] = 0;
	}
};

Tail.prototype.removeFilter = function(name) {
	delete this.filters[name];
	delete this.counters[name];
};

Tail.prototype.run = function(callback) {
	var self = this;

	// Prepend metric name to counters
	var metrics = {};
	Object.keys(this.counters).forEach(function(key) {
		var name = key;
		if (self.prefix)
			name = self.prefix + '.' + name;

		metrics[name] = {
			value : self.counters[key]
		}
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
