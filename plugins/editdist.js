function EditDistPlugin(bot) {
	var self = this;
	self.name = "editdist";
	self.help = "String edit distance plugin";
	self.depend = ["cmd"];

	// https://en.wikipedia.org/wiki/Damerau–Levenshtein_distance#Optimal_string_alignment_distance
	self.OSA = function(a, b) {
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
				var cost = +(a[j - 1] != b[i - 1]);

				T[i][j] = Math.min(T[i - 1][j - 1] + cost, T[i][j - 1] + 1, T[i - 1][j] + 1);

				if (i > 1 && j > 1 && a[j - 1] == b[i - 2] && a[j - 2] == b[i - 1])
					T[i][j] = Math.min(T[i][j], T[i - 2][j - 2] + cost);
			}
		}

		return T[b.length][a.length];
	};

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

	};
}

module.exports = EditDistPlugin;
