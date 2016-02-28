var YouTube = require("./api/YouTube.js");
var SoundCloud = require("./api/SoundCloud.js");

$(document).ready(function()
{
	var Player = require("./modules/Player.js");
	var Playlists = require("./modules/Playlists.js");
	var Search = require("./modules/Search.js");
	var Tabs = require("./modules/Tabs.js");
	var Loading = require("./modules/Loading.js");

	Player.init();

	YouTube.init();
	SoundCloud.init();

	Search.init();
	Tabs.init();

	Player.updateVolume();
	Playlists.load(Playlists.activeId);

	setTimeout(Loading.complete, 2000);
});
