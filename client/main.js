var YouTube = require("./api/YouTube.js");
var SoundCloud = require("./api/SoundCloud.js");

$(document).ready(function()
{
	var Account = require("./modules/Account.js");
	var Player = require("./modules/Player.js");
	var Content = require("./modules/Content.js");
	var Playlist = require("./modules/Playlist.js");
	var ItemList = require("./modules/ItemList.js");
	var Relation = require("./modules/Relation.js");
	var History = require("./modules/History.js");
	var Flag = require("./modules/Flag.js");
	var Search = require("./modules/Search.js");
	var Tab = require("./modules/Tab.js");
	var Overlay = require("./modules/Overlay.js");
	var Article = require("./modules/Article.js");
	var Preloader = require("./modules/Preloader.js");

	Account.init(onAccountSync);

	Player.init();
	
	YouTube.init();
	SoundCloud.init();

	Content.init();
	Playlist.init();
	Relation.init();
	History.init();
	Search.init();
	Overlay.init();
	Article.init();
	Tab.init();

	function onAccountSync()
	{
		Playlist.onAccountSync();
		ItemList.onAccountSync();
		Relation.onAccountSync();
		History.onAccountSync();
		Flag.onAccountSync();

		Overlay.destroy();

		if(!Preloader.visible)
			return;

		setTimeout(Preloader.onLoad, 2000);
	}
});

$.fn.filterByData = function(key, value)
{
	return $(this).filter(function()
	{
		return $(this).data(key) && $(this).data(key) == value;
	});
};
