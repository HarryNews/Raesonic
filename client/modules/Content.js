var Content =
{
	SOURCE:
	{
		YOUTUBE: 1,
		SOUNDCLOUD: 2,
	},
	SOURCE_NAMES:
	[
		"None",
		"YouTube Video",
		"SoundCloud Track",
	],
	// Action on content lookup
	AUTOMATIC_SWITCH: false,
	ASSIGN_TO_ITEM: true,
};

// Add specified content to the active playlist
// If the content does not exist, it will be created
Content.create = function(sourceId, externalId)
{
	var Playlist = require("./Playlist.js");

	// No active playlist, bail out
	if(!Playlist.active)
		return;

	$.ajax
	({
		url: "/playlists/" + Playlist.active.playlistId + "/",
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

			var item =
			[
				trackId,
				artist,
				title,
				itemId,
				sourceId,
				externalId,
			];

			ItemList.addItem(item, ItemList.PREPEND);

			$("#items").scrollTop(0);
			Playlist.setTrackCounter($(".item").length);

			var Search = require("./Search.js");
			Search.clear();
		}
	});
}

// Add specified content to a playlist
Content.copy = function(playlistId, playlistName, sourceId, externalId)
{
	$.ajax
	({
		url: "/playlists/" + playlistId + "/",
		type: "POST",
		data: JSON.stringify({ sourceId: sourceId, externalId: externalId }),
		contentType: "application/json",
		success: function(response)
		{
			if(response.errors)
				return;

			var artist = response[1];
			var title = response[2];

			// todo: update track counter in the sidebar

			// todo: show a toast message:
			// artist – title has been added to playlistName
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

		// Skip track if the automatic content switch failed
		if(!assignToItem && skipTrack)
			Content.switchContent(switchDirection, skipTrack);

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

				// Skip track if the automatic content switch failed
				if(!assignToItem && skipTrack)
					Content.switchContent(switchDirection, skipTrack);

				return;
			}

			$("#tab-content").data("content", response);
			
			// Switch tab to content tab unless viewing recommendations
			if($item.data("rating") == null)
			{
				var Tab = require("./Tab.js");
				Tab.setActive(Tab.Content);
			}

			var nearest = response[0];

			// Not being assigned to item, means it's an automatic switch
			if(!assignToItem)
				return Content.switchContent(switchDirection, skipTrack, !nearest);

			// No content available, clear content and bail out
			if(!nearest)
			{
				var Player = require("./Player.js");
				Player.clearContent();
				return;
			}

			$item
				.data
				({
					"sourceId": nearest[0],
					"externalId": nearest[1],
					"initial":
					[
						nearest[0],
						nearest[1],
					],
				})
				.removeClass("active");

			var Item = require("./Item.js");
			Item.play($item);
		}
	});
}

// Select next or previous content
// If the skipTrack is true, track will be skipped if there's no alternative content
Content.switchContent = function(forward, skipTrack, missingContent)
{
	var $item = $(".item.active");

	// No active item, disable content switch
	if(!$item.length)
		return Content.setSwitchEnabled(false);

	var content = $("#tab-content").data("content");

	// No content data, request and retry
	if( (!content || !content.length) && !missingContent )
	{
		var current =
		[
			$item.data("sourceId"),
			$item.data("externalId"),
		];

		Content.setSwitchEnabled(false);
		Content.request($item.data("trackId"), Content.AUTOMATIC_SWITCH,
			forward, skipTrack, current);

		return;
	}

	// No alternative content, disable switching and bail out
	if(missingContent || content.length < 2)
	{
		if(skipTrack)
		{
			var Player = require("./Player.js");
			var ItemList = require("./ItemList.js");
			Player.switchItem(ItemList.NEXT_ITEM);
		}

		Content.setSwitchEnabled(false);
		return;
	}

	var newContent;

	// Look for content before/after the active one
	for(var index = 0; index < content.length; index++)
	{
		if($item.data("sourceId") == content[index][0] &&
			$item.data("externalId") == content[index][1])
		{
			newContent = forward
				? content[++index]
				: content[--index];

			break;
		}
	}

	// Cycle to the first/last content
	if(!newContent)
		newContent = forward
			? content[0]
			: content[content.length - 1];

	var isInitialContent = Content.updateReplaceIconState($item, newContent);

	$item
		.data
		({
			sourceId: newContent[0],
			externalId: newContent[1],
			unsaved: !isInitialContent,
		})
		.removeClass("active");

	var Item = require("./Item.js");
	Item.play($item);

	Content.setSwitchEnabled(true);
}

// Save active content selection as the item's content
Content.saveItemContent = function($item)
{
	$.ajax
	({
		url: "/items/" + $item.data("itemId") + "/content/",
		type: "PUT",
		data: JSON.stringify
		({
			sourceId: $item.data("sourceId"),
			externalId: $item.data("externalId"),
		}),
		contentType: "application/json",
		success: function(response)
		{
			if(response.errors)
				return;

			var content = $("#tab-content").data("content") || [];

			// Look for index of the newly selected content
			for(var index = 0; index < content.length; index++)
			{
				if( $item.data("sourceId") == content[index][0] &&
					$item.data("externalId") == content[index][1] )
				{
					// Look for index of the initial content
					var initialContent = $item.data("initial");
					for(var secondIndex = 0; secondIndex < content.length; secondIndex++)
					{
						if( initialContent[0] == content[secondIndex][0] &&
							initialContent[1] == content[secondIndex][1] )
						{
							// Update initial content values
							$item.data("initial", content[index]);

							// Swap the initial and the newly selected content
							content[secondIndex] = content[index];
							content[index] = initialContent;

							$("#tab-content").data("content", content);

							break;
						}
					}

					break;
				}
			}

			$("#content-replace").removeClass("active");
		}
	});
}

// Set ability to switch between content to the boolean value
Content.setSwitchEnabled = function(enabled)
{
	$("#content-previous, #content-next")
		.toggleClass("inactive", !enabled);
}

// Update state of the content replace icon for the item specified
Content.updateReplaceIconState = function($item, overrideContent)
{
	var initialContent = $item.data("initial");

	// No content or itemId, hide icon and return false
	if(initialContent == null || $item.data("itemId") == null)
	{
		$("#content-replace").addClass("hidden");
		return false;
	}

	$("#content-replace.hidden").removeClass("hidden");

	var sourceId = $item.data("sourceId");
	var externalId = $item.data("externalId");

	if(overrideContent)
	{
		sourceId = overrideContent[0];
		externalId = overrideContent[1];
	}

	var isInitialContent =
		( sourceId == initialContent[0] &&
			externalId == initialContent[1] );

	$("#content-replace").toggleClass("active", !isInitialContent);

	return isInitialContent;
}

// Called when an item is selected, and when it is made active
Content.onItemChange = function($item)
{
	// Keep content data if the itemId is the same
	if($item.data("itemId") == $("#tab-content").data("itemId"))
		return;

	$("#tab-content").data
	({
		"itemId": $item.data("itemId"),
		"content": [],
	});

	Content.setSwitchEnabled(true);
	Content.updateReplaceIconState($item);
}

// Called upon clicking the previous content icon
Content.onPreviousIconClick = function()
{
	var ItemList = require("./ItemList.js");
	Content.switchContent(ItemList.PREVIOUS_ITEM);
}

// Called upon clicking the next content icon
Content.onNextIconClick = function()
{
	var ItemList = require("./ItemList.js");
	Content.switchContent(ItemList.NEXT_ITEM);
}

// Called upon clicking the replace content icon
Content.onReplaceIconClick = function()
{
	var $icon = $(this);

	// Inactive icon, bail out
	if(!$icon.is(".active"))
		return;

	var $item = $(".item.active");

	// No active item, remove active class and bail out
	if(!$item.length)
		return $icon.removeClass("active");

	Content.saveItemContent($item);
}

Content.init = function()
{
	$("#content-previous").click(Content.onPreviousIconClick);
	$("#content-next").click(Content.onNextIconClick);
	$("#content-replace").click(Content.onReplaceIconClick);
}

module.exports = Content;
