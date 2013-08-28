var fs = require("fs");

function plugins() {
	
}

require.uncached = function(name) {
	delete require.cache[require.resolve(name)];
	return require(name);
};

plugins._load = function(p) {
	if (p.depend) {
		for (var i = 0; i < p.depend.length; i++)
			this.load(p.depend[i]);
	}
	this[p.name] = p;
	var self = this;
	fs.readFile("./data/" + p.name + ".json", function(err, data) {
		(p.load || function(){})(data ? JSON.parse(data) : undefined);
		self._enable(p);
	});
};

plugins.load = function(name) {
	if (!(name in this)) {
		var r = require.uncached("./plugins/" + name);
		var p = new r(bot);
		this._load(p);
	}
};

plugins._enable = function(p) {
	for (var cmd in p.events) {
		//console.log("Adding " + cmd);
		bot.addListener(cmd, p.events[cmd]);
	}
	(p.enable || function(){})();
};

plugins.enable = function(name) {
	this._enable(this[name]);
};

plugins._unload = function(p) {
	this._disable(p);
	var data = (p.unload || function(){})();
	if (data) {
		console.log(data);
		fs.writeFileSync("./data/" + p.name + ".json", JSON.stringify(data, null, 4));
	}
	delete this[p.name];
};

plugins.unload = function(name) {
	this._unload(this[name]);
};

plugins._disable = function(p) {
	(p.disable || function(){})();
	for (var cmd in p.events) {
		//console.log("Removing " + cmd);
		bot.removeListener(cmd, p.events[cmd]);
	}
};

plugins.disable = function(name) {
	this._disable(this[name]);
};

plugins.reload = function(name) {
	this.unload(name);
	this.load(name);
};

module.exports = plugins;
