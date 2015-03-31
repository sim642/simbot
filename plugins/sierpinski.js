function SierpinskiPlugin(bot) {
	var self = this;
	self.name = "sierpinski";
	self.help = "Sierpinski triangle outputter plugin";
	self.depend = ["cmd"];

	self.under = "\x1f";
	self.left = "╱";
	self.right = "╲";

	self.repeat = function(str, n) {
		return new Array(n + 1).join(str);
	};

	self.sierpinski = function(N, i) {
		if (N === 0)
			return self.under + self.left + self.right + self.under;
		else {
			var n = 1 << N;
			var part = self.sierpinski(N - 1, i % (n / 2));
			if (i < n / 2)
				return part;
			else
				return part + self.repeat("  ", n - i - 1) + part;
		}
	};

	self.events = {
		"cmd#sierpinski": function(nick, to, args) {
			var N = args[1];
			if (N === undefined || N < 0 || N > 3)
				return;

			var n = 1 << N;
			for (var i = 0; i < n; i++)
				bot.say(to, self.repeat(" ", n - i - 1) + self.sierpinski(N, i));
		}
	};
}

module.exports = SierpinskiPlugin;
