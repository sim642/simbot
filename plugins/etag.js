function ETagPlugin(bot) {
	var self = this;
	self.name = "etag";
	self.help = "ETag management wrapper plugin";
	self.depend = [];

	self.ETagWrapper = function() {
		var self = this;

		self.datas = {};

		self.wrap = function(params) {
			if (typeof params === 'string' || params instanceof String)
				params = {url: params};
			params.headers = (params.url in self.datas ? {"If-None-Match": self.datas[params.url].etag} : {});
			return params;
		};

		self.parse = function(callback) {
			return function ETagParser(err, res, body) {
				if (!err) {
					var url = res.request.uri.href;
					if (res.statusCode == 200) {
						//bot.out.debug("etag", "200: " + url);
						self.datas[url] = {etag: res.headers["etag"], body: body};
					}
					else if (res.statusCode == 304) {
						//bot.out.debug("etag", "304: " + url);
						body = self.datas[url].body;
					}
				}

				(callback || function(){})(err, res, body);
			};
		};
	};

	self.events = {

	};
}

module.exports = ETagPlugin;
