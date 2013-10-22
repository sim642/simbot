if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str){
    return this.slice(0, str.length) == str;
  };
}

function LevenPlugin(bot) {
	var self = this;
	self.name = "leven";
	self.help = "Levenshtein distance plugin";
	self.depend = ["cmd"];

	self.levenshtein = function(a, b) {
		if (a.length == 0)
			return b.length;
		if (b.length == 0)
			return a.length;

		var T = [];
		for (var i = 0; i <= b.length; i++)
			T[i] = [i];
		for (var j = 0; j <= a.length; j++)
			T[0][j] = j;

		for (var i = 1; i <= b.length; i++) {
			for (var j = 1; j <= a.length; j++) {
				if (a[j - 1] == b[i - 1])
					T[i][j] = T[i - 1][j - 1] + 0;
				else
					T[i][j] = Math.min(T[i - 1][j - 1] + 1, Math.min(T[i][j - 1] + 1, T[i - 1][j] + 1));
			}
		}

		return T[b.length][a.length];
	};

	self.LCS = function(a, b) {
		if (a.length == 0)
			return b.length;
		if (b.length == 0)
			return a.length;

		var T = [];
		for (var i = 0; i <= b.length; i++)
			T[i] = [0];
		for (var j = 0; j <= a.length; j++)
			T[0][j] = 0;

		var max = 0;
		for (var i = 1; i <= b.length; i++) {
			for (var j = 1; j <= a.length; j++) {
				if (a[j - 1] == b[i - 1]) {
					T[i][j] = T[i - 1][j - 1] + 1;
				}
				else
					T[i][j] = 0;
				
				max = Math.max(max, T[i][j]);
			}
		}

		return max;
	};

	self.events = {
		"cmd#leven" : function(nick, to, args, message) {
			bot.say(to, self.levenshtein(args[1], args[2]));
		},

		"cmd#lcs" : function(nick, to, args, message) {
			bot.say(to, self.LCS(args[1], args[2]));
		},

		"cmd#nickp" : function(nick, to, args, message) {
			var a = args[1], b = args[2];
			var lev = 1 - self.levenshtein(a, b) / Math.max(a.length, b.length);
			var lcs = self.LCS(a, b) / Math.min(a.length, b.length) * 0.8 + 0.1 * (a.startsWith(b) + b.startsWith(a));
			bot.say(to, (lev + lcs) / 2);
			//bot.say(to, Math.pow(1 - self.levenshtein(a, b) / Math.max(a.length, b.length), Math.sqrt(Math.max(a.length, b.length))));
		}
	};
}

module.exports = LevenPlugin;
