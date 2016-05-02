var Enum = require("./Enum.js");
var ItemList = require("./ItemList.js");

var Search =
{
	Regex:
	{
		YouTube: /(youtu.be\/|youtube.com\/(watch\?(.*&)?v=|(embed|v)\/))([^\?&\"\'>]+)/,
		SoundCloud: /^https?:\/\/(soundcloud.com|snd.sc)\/(.*)$/,
	},
}

// Clear search input
Search.clear = function()
{
	$("#search").val("");
	$("#search-clear").hide();
}

// Search item list for the query
Search.locally = function(query)
{
	// Adding a content by URL, update and bail
	if(query.indexOf("http") == 0)
	{
		$("#search-clear").is(":visible")
			? ItemList.clearFilter()
			: $("#search-clear").fadeIn(200);

		return;
	}

	// Empty query, clear filter and bail
	if(!query.length)
	{
		Search.clear();
		ItemList.clearFilter();

		return;
	}

	$("#search-clear").fadeIn(200);

	var storage = $("#items").data("storage");

	// Searching entire database, bail out
	if(storage && storage.length)
		return;

	ItemList.setFilter(query);
}

// Search database for the query
Search.globally = function(query)
{
	$.ajax
	({
		url: "/search/",
		type: "POST",
		data: JSON.stringify({ query: query }),
		contentType: "application/json",
		success: function(response)
		{
			if(response.errors)
				return;

			var items = response;
			ItemList.setItems(items, ItemList.UseStorage);
		}
	});
}

// Create content if the query is a content URL
// Returns true if the query looks like a content URL
Search.createContent = function(query)
{
	var Content = require("./Content.js");

	// Find and create YouTube content
	var match = Search.Regex.YouTube.exec(query);
	if(match && match[5])
	{
		var externalId = match[5];
		Content.create(Enum.Source.YouTube, externalId);
		return true;
	}

	// Find and create SoundCloud content
	match = Search.Regex.SoundCloud.exec(query);
	if(match && match[2])
	{
		SC
			.resolve(query)
			.then(function onSoundCloudResolve(response)
			{
				var externalId = response.id.toString();
				Content.create(Enum.Source.SoundCloud, externalId);
			});

		return true;
	}

	return false;
}

// Called upon releasing a key in the search field
Search.onKeyUp = function(event)
{
	var query = $(this).val();

	// Not an Enter key, or the query is below 3 symbols
	var isLocalSearch = ( event.keyCode != 13 || query.length < 3 );

	if(isLocalSearch)
	{
		Search.locally(query);
		return;
	}

	var isContentUrl = Search.createContent(query);

	if(isContentUrl)
		return;

	Search.globally(query);
}

// Called upon clicking the search clear button
Search.onClearClick = function()
{
	Search.clear();
	ItemList.clearFilter();
}

Search.init = function()
{
	$("#search").keyup(Search.onKeyUp);
	$("#search-clear").click(Search.onClearClick);
}

module.exports = Search;
