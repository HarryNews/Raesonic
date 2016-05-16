var Content = require("../modules/Content.js");

var ContentTab =
{
	ALIAS: "content",
};

// Set ability to switch between content to the boolean value
ContentTab.setSwitchEnabled = function(enabled)
{
	var $buttons = $("#content-previous, #content-next");
	enabled ? $buttons.removeClass("inactive") : $buttons.addClass("inactive");
}

// Select next or previous content
// If the skipTrack boolean is true, track will be skipped if there's no content replacement
ContentTab.switchContent = function(forward, skipTrack)
{
	var $item = $(".item.active");

	// No active item, disable content switch
	if(!$item.length)
		return ContentTab.setSwitchEnabled(false);

	var content = $("#tab-content").data("content");

	// No content data, request and retry
	if(!content || !content.length)
	{
		var current =
		[
			$item.data("sourceId"),
			$item.data("externalId")
		];

		Content.request($item.data("trackId"), Content.AUTOMATIC_SWITCH, forward, skipTrack, current);
		return ContentTab.setSwitchEnabled(false);
	}

	// No alternative content has been found
	if(content.length < 2)
	{
		if(skipTrack)
		{
			var Player = require("../modules/Player.js");
			var ItemList = require("../modules/ItemList.js");
			Player.switchItem(ItemList.NEXT_ITEM);
		}

		return ContentTab.setSwitchEnabled(false);
	}

	ContentTab.setSwitchEnabled(true);
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

	var initialContent = $item.data("initial");
	var isInitialContent = (newContent[0] == initialContent[0] &&
		newContent[1] == initialContent[1]);

	$("#content-replace").toggleClass("active", !isInitialContent)

	$item
		.data
		({
			sourceId: newContent[0],
			externalId: newContent[1],
			unsaved: !isInitialContent
		})
		.removeClass("active");

	var Item = require("../modules/Item.js");
	Item.play($item);
}

// Called when the content tab becomes active
ContentTab.onSetActive = function()
{

}

// Called upon active item change
ContentTab.onItemChange = function($item)
{
	// Clear content data if a different item is being set
	if($item.data("itemId") != $("#tab-content").data("itemId"))
	{
		$("#tab-content").data
		({
			"itemId": $item.data("itemId"),
			"content": []
		});

		ContentTab.setSwitchEnabled(true);
	}
}

// Called upon clicking the previous content button
ContentTab.onPreviousClick = function()
{
	var ItemList = require("../modules/ItemList.js");
	ContentTab.switchContent(ItemList.PREVIOUS_ITEM);
}

// Called upon clicking the next content button
ContentTab.onNextClick = function()
{
	var ItemList = require("../modules/ItemList.js");
	ContentTab.switchContent(ItemList.NEXT_ITEM);
}

// Called upon clicking the replace content button
ContentTab.onReplaceClick = function()
{
	var $button = $(this);

	// Inactive button, bail out
	if(!$button.is(".active"))
		return;

	var $item = $(".item.active");

	// No active item, remove active class and bail out
	if(!$item.length)
		return $button.removeClass("active");

	$.ajax
	({
		url: "/items/" + $item.data("itemId") + "/content/",
		type: "PUT",
		data: JSON.stringify
		({
			sourceId: $item.data("sourceId"),
			externalId: $item.data("externalId")
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
				if($item.data("sourceId") == content[index][0] &&
					$item.data("externalId") == content[index][1])
				{
					// Look for index of the initial content
					var initialContent = $item.data("initial");
					for(var secondIndex = 0; secondIndex < content.length; secondIndex++)
					{
						if(initialContent[0] == content[secondIndex][0] &&
							initialContent[1] == content[secondIndex][1])
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

			$button.removeClass("active");
		}
	});
}

ContentTab.init = function()
{
	$("#content-previous").click(ContentTab.onPreviousClick);
	$("#content-next").click(ContentTab.onNextClick);
	$("#content-replace").click(ContentTab.onReplaceClick);
}

module.exports = ContentTab;
