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
		data: JSON.stringify({ sourceId: sourceId, externalId: externalId }),
		contentType: "application/json",
		success: function(response)
		{
			if(response.errors)
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
// If no content is available, current content will be placed as the only array element
Content.request = function(trackId, assignToItem, switchDirection, skipTrack, current)
{
	// Unknown track, skip item, clear storage and bail out
	if(trackId == -1)
	{
		$("#tab-content").data( "content", [current] );

		// Skip track if automatic content switch failed
		if(!assignToItem && skipTrack)
		{
			var ContentTab = require("../tabs/ContentTab.js");
			ContentTab.switchContent(switchDirection, skipTrack);
		}

		return;
	}

	$.ajax
	({
		url: "/tracks/" + trackId + "/content/",
		type: "GET",
		success: function(response)
		{
			var $item = $(".item").filterByData("trackId", trackId);

			// Couldn't find the item, bail out
			if(!$item.length)
				return;

			// Item is no longer active, bail out
			if(!$item.is(".active"))
				return;

			// Upon error skip item, clear storage and bail out
			if(response.errors)
			{
				$("#tab-content").data( "content", [current] );

				// Skip track if automatic content switch failed
				if(!assignToItem && skipTrack)
				{
					var ContentTab = require("../tabs/ContentTab.js");
					ContentTab.switchContent(switchDirection, skipTrack);
				}

				return;
			}

			$("#tab-content").data("content", response);
			
			var Tabs = require("./Tabs.js");
			Tabs.setActive("content");

			// Not being assigned to item, means it's an automatic switch
			if(!assignToItem)
			{
				var ContentTab = require("../tabs/ContentTab.js");
				return ContentTab.switchContent(switchDirection, skipTrack);
			}

			var nearest = response[0];

			// No content available for this item, bail out
			if(!nearest)
				return;

			$item
				.data
				({
					"sourceId": nearest[0],
					"externalId": nearest[1]
				})
				.removeClass("active");

			var Item = require("./Item.js");
			Item.play($item);
		}
	});
}

module.exports = Content;
