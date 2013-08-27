function plugins() {
	
}

require.uncached = function(name) {
	delete require.cache[require.resolve(name)];
	return require(name);
};

plugins.loadPlugin = function(p) {
	this[p.name] = p;
	(p.load || function(){})();
	this.enablePlugin(p);
};

plugins.load = function(name) {
	var r = require.uncached('./plugins/' + name);
	var p = new r(bot);
	this.loadPlugin(p);
};

plugins.enablePlugin = function(p) {
	for (var cmd in p.events) {
		console.log("Adding " + cmd);
		bot.addListener(cmd, p.events[cmd]);
	}
	(p.enable || function(){})();
};

plugins.enable = function(name) {
	this.enablePlugin(this[name]);
};

plugins.unloadPlugin = function(p) {
	this.disablePlugin(p);
	(p.unload || function(){})();
	delete this[p.name];
};

plugins.unload = function(name) {
	this.unloadPlugin(this[name]);
};

plugins.disablePlugin = function(p) {
	(p.disable || function(){})();
	for (var cmd in p.events) {
		console.log("Removing " + cmd);
		bot.removeListener(cmd, p.events[cmd]);
	}
};

plugins.disable = function(name) {
	this.disablePlugin(this[name]);
};

plugins.reload = function(name) {
	this.unload(name);
	this.load(name);
};

module.exports = plugins;
