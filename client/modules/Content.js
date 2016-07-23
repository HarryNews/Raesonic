var Throttle = require("throttle-debounce/throttle");

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
	// Content switch mode
	AUTO_SWITCH: false,
	MANUAL_SWITCH: true,
	// Action on content lookup
	ASSIGN_TO_ITEM: true,
};

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
			Content.switchContent(Content.AUTO_SWITCH,
				switchDirection, skipTrack);

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
					Content.switchContent(Content.AUTO_SWITCH,
						switchDirection, skipTrack);

				return;
			}

			var content = response;

			$("#tab-content").data("content", content);

			var $nav = $("#content-nav");
			$nav.empty();

			content.forEach(
			function()
			{
				$nav
					.append(
						$("<div>")
							.addClass("circle")
							.click(Content.onCircleClick)
					);
			});

			Content.highlightActiveCircle(0);
			
			// Switch tab to content tab unless viewing recommendations
			if($item.data("rating") == null)
			{
				var Tab = require("./Tab.js");
				Tab.setActive(Tab.Content);
			}

			var nearest = content[0];

			// Not being assigned to item, means it's an automatic switch
			if(!assignToItem)
			{
				var missingContent = (nearest == null);

				Content.switchContent(Content.AUTO_SWITCH,
					switchDirection, skipTrack, missingContent);

				return;
			}

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
				.removeClass("active")
				.find(".add.icon")
					.removeClass("hidden");

			var Item = require("./Item.js");
			Item.play($item, Item.active.isManualSwitch);
		}
	});
}

// Select next or previous content
// If the skipTrack is true, track will be skipped if there's no alternative content
Content.switchContent = function(isManualSwitch, forward, skipTrack, missingContent)
{
	// If a playback error occurs after a manual switch, the content
	// will not be skipped to allow issue reporting
	Content.preventSwitch = isManualSwitch;

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
		Content.request($item.data("trackId"), Content.AUTO_SWITCH,
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

	var contentIndex;

	// Look for content before/after the active one
	for(var index = 0; index < content.length; index++)
	{
		if( $item.data("sourceId") == content[index][0] &&
			$item.data("externalId") == content[index][1] )
		{
			contentIndex = forward
				? index + 1
				: index - 1;

			break;
		}
	}

	// Cycle to the first/last content
	if( content[contentIndex] == null )
		contentIndex = forward
			? 0
			: content.length - 1;

	var newContent = content[contentIndex];
	Content.highlightActiveCircle(contentIndex);

	var isInitialContent =
		Content.updateReplaceIconState($item, newContent);

	$item
		.data
		({
			sourceId: newContent[0],
			externalId: newContent[1],
			unsaved: !isInitialContent,
		})
		.removeClass("active");

	var Item = require("./Item.js");
	Item.play($item, Item.active.isManualSwitch);

	Content.setSwitchEnabled(true);
}

// Switch to the content with specified index
Content.setContent = function(contentIndex, $circle)
{
	var $item = $(".item.active");

	// No active item, disable content switch
	if(!$item.length)
		return Content.setSwitchEnabled(false);

	var content = $("#tab-content").data("content");

	// No content data, request and retry
	if(!content || !content.length)
		return;

	var newContent = content[contentIndex];

	Content.highlightActiveCircle(contentIndex);

	var isInitialContent =
		Content.updateReplaceIconState($item, newContent);

	$item
		.data
		({
			sourceId: newContent[0],
			externalId: newContent[1],
			unsaved: !isInitialContent,
		})
		.removeClass("active");

	var Item = require("./Item.js");
	Item.play($item, Item.active.isManualSwitch);
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

			var Toast = require("./Toast.js");
			Toast.show("Selected content has been set as default",
				Toast.INFO);
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
	if( initialContent == null || !$item.data("itemId") )
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

// Set active class on the active content circle
Content.highlightActiveCircle = function(contentIndex)
{
	$("#content-nav div").removeClass("active");

	var $circle = $("#content-nav div").eq(contentIndex);

	if(!$circle.length)
		return;

	$circle.addClass("active");
}

// Called when an item is selected (once)
Content.onItemChange = function($item)
{
	$("#content-image").empty();

	// Keep content data if the itemId is the same
	if( $item.data("itemId") == $("#tab-content").data("itemId") )
		return;

	$("#tab-content").data
	({
		"itemId": $item.data("itemId"),
		"content": [],
	});

	$("#content-nav")
		.empty()
		.append(
			$("<div>")
				.addClass("circle adjacent"),
			$("<div>")
				.addClass("circle active")
				.click(Content.onCircleClick),
			$("<div>")
				.addClass("circle adjacent")
		);

	Content.setSwitchEnabled(true);
	Content.updateReplaceIconState($item);
}

// Called upon clicking the previous content icon
Content.onPreviousIconClick = function()
{
	var ItemList = require("./ItemList.js");

	Content.switchContent(Content.MANUAL_SWITCH,
		ItemList.PREVIOUS_ITEM);
}

// Called upon clicking the next content icon
Content.onNextIconClick = function()
{
	var ItemList = require("./ItemList.js");

	Content.switchContent(Content.MANUAL_SWITCH,
		ItemList.NEXT_ITEM);
}

// Called upon clicking the replace content icon
Content.onReplaceIconClick = function()
{
	var $icon = $("#content-replace");

	// Inactive icon, bail out
	if( !$icon.is(".active") )
		return;

	var $item = $(".item.active");

	// No active item, remove active class and bail out
	if(!$item.length)
		return $icon.removeClass("active");

	Content.saveItemContent($item);
}

// Called upon clicking the content circle
Content.onCircleClick = function()
{
	var $circle = $(this);

	if( $circle.is(".active") )
		return;

	Content.setContent( $circle.index(), $circle );
}

Content.init = function()
{
	$("#content-previous").click(Content.onPreviousIconClick);
	$("#content-next").click(Content.onNextIconClick);

	$("#content-replace").click(
		Throttle(2000, function()
		{
			Content.onReplaceIconClick();
		})
	);
}

module.exports = Content;
