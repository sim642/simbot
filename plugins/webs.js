var fs = require("fs");
var https = require("https");
var url = require("url");

function WebsPlugin(bot) {
	var self = this;
	self.name = "webs";
	self.help = "HTTPS endpoint plugin";
	self.depend = [];

	self.port = 8081;
	self.key = null;
	self.cert = null;
	self.ca = null;
	self.server = null;

	self.reqListener = function(req, res) {
		var u = url.parse(req.url, true);

		var chunks = [];
		req.on('data', function(chunk) {
			chunks.push(chunk);
		});
		req.on('end', function() {
			var body = chunks.join("");

			bot.emit("webs", u.pathname, req, u.query, body, res);
		});
	};

	self.load = function(data) {
		if (data) {
			self.port = data.port || 8081;
			self.key = data.key;
			self.cert = data.cert;
			self.ca = data.ca;
		}
	};

	self.enable = function() {
		bot.out.doing("webs", "starting web server on port " + self.port);
		self.server = https.createServer({
			key: fs.readFileSync(self.key),
			cert: fs.readFileSync(self.cert),
			ca: fs.readFileSync(self.ca),
		}, self.reqListener);
		self.server.on('error', function(e) {
			bot.out.error("webs", "failed to start web server on port " + self.port);
			self.server = null;
		});
		self.server.listen(self.port, function() {
			bot.out.ok("webs", "web server started on port " + self.port);
		});
	};

	self.disable = function() {
		if (self.server) {
			self.server.close(function() {
				bot.out.ok("webs", "web server stopped");
			});
			self.server = null;
		}
	};

	self.save = function() {
		return {
			port: self.port,
			key: self.key,
			cert: self.cert,
			ca: self.ca
		};
	}

	self.events = {
		"webs": function(path, req, qs, body, res) {
			if (bot.listeners("webs#" + path)[0] !== undefined)
				bot.emit("webs#" + path, req, qs, body, res);
			else
				bot.emit("webs#", path, req, qs, body, res);
		},

		"webs#": function(path, req, qs, body, res) {
			res.end();

			bot.out.warn("webs", "unlistened request on " + path);
		},
	};
}

module.exports = WebsPlugin;
