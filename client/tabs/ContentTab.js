var Content = require("../modules/Content.js");
var Enum = require("../modules/Enum.js");

var ContentTab = {};

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
		return Content.request($item.data("trackId"), false, forward, skipTrack);

	// No alternative content has been found
	if(content.length < 2)
	{
		if(skipTrack)
		{
			var Player = require("../modules/Player.js");
			Player.switchItem(Enum.Direction.Next);
		}

		return ContentTab.setSwitchEnabled(false);
	}

	ContentTab.setSwitchEnabled(true);
	var newContent;

	// Look for content before/after the active one
	for(var index = 0; index < content.length; index++)
	{
		if($item.data("sourceId") == content[index][0] && $item.data("externalId") == content[index][1])
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

	$item
		.data
		({
			sourceId: newContent[0],
			externalId: newContent[1],
			unsaved: true
		})
		.removeClass("active");

	var Item = require("../modules/Item.js");
	Item.play($item);
}

// Called upon clicking the previous content button
ContentTab.onPreviousClick = function()
{
	ContentTab.switchContent(Enum.Direction.Previous);
}

// Called upon clicking the next content button
ContentTab.onNextClick = function()
{
	ContentTab.switchContent(Enum.Direction.Next);
}

ContentTab.init = function()
{
	$("#content-previous").click(ContentTab.onPreviousClick);
	$("#content-next").click(ContentTab.onNextClick);
}

module.exports = ContentTab;
