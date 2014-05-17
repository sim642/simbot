var irc = require("irc");
var repl = require("repl");
var fs = require("fs");
var clc = require("cli-color");
var util = require("util");

var config = JSON.parse(fs.readFileSync("config.json"));
var defcfg = {
	autoRejoin: false,
	channels: [],
	messageSplit: 300,
};
config.__proto__ = defcfg;

var bot = new irc.Client(config.server, config.nick, config);
bot.out = {};
bot.out.file = fs.createWriteStream("./data/simbot.log", {flags: 'a'});

bot.conn.setTimeout(180 * 1000);
bot.out.time = function() {
	return new Date().toISOString();
};

bot.out.wrapper = function(type, color, module, message) {
	if (!(typeof(message) === "string" || message instanceof String))
		message = util.inspect(message, {colors: true});
	console.log(clc.blackBright(bot.out.time()) + " " + color("[" + type + ":") + color.bold(module) + color("] ") + message);
	bot.out.file.write(bot.out.time() + " [" + type + ":" + module + "] " + message + "\n", 'utf8');
};

bot.out.log = function(module, message) {
	bot.out.wrapper("LOG", clc.cyan, module, message);
};

bot.out.doing = function(module, message) {
	bot.out.wrapper("DOING", clc.cyanBright, module, message);
};

bot.out.ok = function(module, message) {
	bot.out.wrapper("OK", clc.greenBright, module, message);
};

bot.out.debug = function(module, message) {
	bot.out.wrapper("DEBUG", clc.magentaBright, module, message);
};

bot.out.warn = function(module, message) {
	bot.out.wrapper("WARN", clc.yellowBright, module, message);
};

bot.out.error = function(module, message) {
	bot.out.wrapper("ERROR", clc.redBright, module, message);
};

bot.out.ok("bot", "bot started");

bot.conn.on("timeout", function() {
	bot.conn.destroy();
	//bot.connect();
});

bot.on("error", function(message) {
	bot.out.error("irc", util.inspect(message, {colors: true}));
});

bot.on("registered", function(message) {
	bot.send("UMODE2", "+B");
	bot.out.ok("irc", "registered on server");
});

bot.plugins = require("./plugins");

fs.readFile("autoload.json", function(err, data) {
	bot.out.doing("bot", "autoloading plugins...");
	var autoload = JSON.parse(data).autoload;
	for (var i = 0; i < autoload.length; i++) {
		bot.plugins.load(autoload[i]);
	}
});

if (config.saveinterval) {
	bot.saver = setInterval(function() {
		//bot.out.doing("bot", "autosaving plugins...");
		for (var name in bot.plugins) {
			if (bot.plugins[name].name) {
				bot.plugins.save(name);
			}
		}
	}, config.saveinterval * 60 * 1000);
}

process.on("SIGINT", function() {
	bot.out.doing("bot", "unloading plugins...");
	for (var name in bot.plugins) {
		if (bot.plugins[name].name) {
			bot.plugins.unload(name);
		}
	}
	bot.out.ok("bot", "bot stopped");
	process.exit(0);
});

process.on("uncaughtException", function(e) {
	bot.out.error("bot", "uncaught exception: " + e.stack);
});

repl.start({
	useGlobal: true,
	ignoreUndefined: true
}).context.bot = bot;

