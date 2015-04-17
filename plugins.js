var fs = require("fs");

function plugins() {
	
}

require.uncached = function(name) {
	delete require.cache[require.resolve(name)];
	return require(name);
};

plugins._load = function(p, enable) {
	if (p.depend) {
		for (var i = 0; i < p.depend.length; i++)
			this.load(p.depend[i]);
	}
	this[p.name] = p;
	var self = this;
	fs.readFile("./data/" + p.name + ".json", function(err, data) {
		(p.load || function(){})(data ? JSON.parse(data) : undefined);

		if (enable !== false) { // usual || doesn't work for true value
			bot.out.ok("plugins", "loaded " + p.name);
			self._enable(p);
		}
		else
			bot.out.warn("plugins", "loaded " + p.name);
	});
};

plugins.load = function(name) {
	var enable = true;
	if (name[0] === "*") {
		enable = false;
		name = name.substr(1);
	}

	if (!(name in this)) {
		try {
			var r = require.uncached("./plugins/" + name);
			var p = new r(bot);
			p.enabled = false;
			this._load(p, enable);
		}
		catch (e) {
			bot.out.error("plugins", "couldn't load " + name + ": " + e.stack);
		}
	}
};

plugins.loadEvents = function(events) {
	for (var cmd in events) {
		//console.log("Adding " + cmd);
		bot.addListener(cmd, events[cmd]);
	}
};

plugins._enable = function(p) {
	this.loadEvents(p.events);
	(p.enable || function(){})();
	p.enabled = true;
};

plugins.enable = function(name) {
	this._enable(this[name]);
};

plugins._save = function(p) {
	var data = (p.save || function(){})();
	if (data) {
		fs.writeFileSync("./data/" + p.name + ".json", JSON.stringify(data, null, 4));
	}
};

plugins.save = function(name) {
	this._save(this[name]);
};

plugins._unload = function(p) {
	this._disable(p);
	this._save(p);
	delete this[p.name];
	bot.out.ok("plugins", "unloaded " + p.name);
};

plugins.unload = function(name) {
	this._unload(this[name]);
};

plugins.unloadEvents = function(events) {
	for (var cmd in events) {
		//console.log("Removing " + cmd);
		bot.removeListener(cmd, events[cmd]);
	}
};

plugins._disable = function(p) {
	(p.disable || function(){})();
	this.unloadEvents(p.events);
	p.enabled = false;
};

plugins.disable = function(name) {
	this._disable(this[name]);
};

plugins.reload = function(name) {
	this.unload(name);
	this.load(name);
};

module.exports = plugins;
