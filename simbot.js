var irc = require("irc");
var repl = require("repl");
var fs = require("fs");

var config = JSON.parse(fs.readFileSync("config.json"));
var defcfg = {
	autoRejoin: false,
	channels: [],
	messageSplit: 300,
};
config.__proto__ = defcfg;

var bot = new irc.Client(config.server, config.nick, config);

bot.conn.setTimeout(180 * 1000);
bot.conn.on("timeout", function() {
	bot.conn.destroy();
	//bot.connect();
});

bot.on("error", function(message) {
	console.log(message);
});

bot.on("registered", function(message) {
	bot.send("UMODE2", "+B");
});

bot.plugins = require("./plugins");

fs.readFile("autoload.json", function(err, data) {
	var autoload = JSON.parse(data).autoload;
	for (var i = 0; i < autoload.length; i++) {
		console.log(autoload[i]);
		bot.plugins.load(autoload[i]);
	}
});

bot.saver = setInterval(function() {
	for (var name in bot.plugins) {
		if (bot.plugins[name].name) {
			bot.plugins.save(name);
		}
	}
}, 10 * 60 * 1000);

process.on("SIGINT", function() {
	for (var name in bot.plugins) {
		if (bot.plugins[name].name) {
			bot.plugins.unload(name);
		}
	}
	process.exit(0);
});

process.on("uncaughtException", function(e) {
	console.trace("ERROR process uncaught: " + e);
});

repl.start({
	useGlobal: true
}).context.bot = bot;

