var Content = {};

// Add specified content to current playlist
// If the content does not exist, it will be created
Content.create = function(sourceId, externalId)
{
	var Playlists = require("./Playlists.js");

	$.ajax
	({
		url: "/playlists/" + Playlists.activeId + "/",
		type: "POST",
		data: { sourceId: sourceId, externalId: externalId },
		success: function(response)
		{
			if(response.error)
				return;

			var trackId = response[0];
			var artist = response[1];
			var title = response[2];
			var itemId = response[3];

			var ItemList = require("./ItemList.js");
			ItemList.clearFilter();

			ItemList.addItem
			(
				[
					trackId,
					artist,
					title,
					itemId,
					sourceId,
					externalId
				],
				ItemList.Prepend
			);

			$("#items").scrollTop(0);
			Playlists.setTrackCounter($(".item").length);

			var Search = require("./Search.js");
			Search.clear();
		}
	});
}

// Request content of the specified track
// If the assignToItem boolean is true, the content data is saved in the item list
// If the skipTrack boolean is true, the track is skipped when there's no other content
Content.request = function(trackId, assignToItem, switchDirection, skipTrack)
{
	$.ajax
	({
		url: "/tracks/" + trackId + "/content/",
		type: "GET",
		success: function(response)
		{
			var $item = $(".item.active");

			if(!$item.length)
				return;

			if(response.error)
				return $("#tab-content").data( "content", [] );

			$("#tab-content").data("content", response);
			var Tabs = require("./Tabs.js");
			Tabs.setActive("content");

			if(!assignToItem)
			{
				var ContentTab = require("../tabs/ContentTab.js");
				return ContentTab.switchContent(switchDirection, skipTrack);
			}

			var nearest = response[0];

			if(!nearest)
				return;

			$item
				.data
				({
					"sourceId": nearest[0],
					"externalId": nearest[1]
				})
				.removeClass("active");

			$(":first-child", $item).click();
		}
	});
}

module.exports = Content;
