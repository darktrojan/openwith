module.exports = {
	"root": true,

	"env": {
		"browser": true,
		"es6": true
	},

	// We would like the same base rules as provided by
	// mozilla/tools/lint/eslint/eslint-plugin-mozilla/lib/configs/recommended.js
	"extends": [
	  "eslint:recommended",
	],

	// When adding items to this file please check for effects on sub-directories.
	"plugins": [
	  "mozilla",
	],

	"rules": {
		"indent": ["warn", "tab", { "SwitchCase": 0 }]
	},

	"globals": {
		"Cc": true,
		"ChromeUtils": true,
		"Ci": true,
		"Components": true,
		"Cu": true,
		"dump": true
	}
};
