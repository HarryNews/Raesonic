var ItemList = require("./ItemList.js");

var Search =
{
	REGEX:
	{
		YOUTUBE: /(youtu.be\/|youtube.com\/(watch\?(.*&)?v=|(embed|v)\/))([^\?&\"\'>]+)/,
		SOUNDCLOUD: /^https?:\/\/(soundcloud.com|snd.sc)\/(.*)$/,
	},
	restricted: false,
}

// Clear search input
Search.clear = function()
{
	$("#search").val("");
	$("#search-clear").hide();
}

// Update search placeholder
Search.updatePlaceholder = function()
{
	var placeholder = "Enter a search query or content URL";

	var Relation = require("./Relation.js");

	if(Relation.active)
	{
		placeholder = "Viewing recommendations for " +
			Relation.active.name;
		Search.restricted = true;
	}
	else
	{
		Search.restricted = false;
	}

	$("#search").attr("placeholder", placeholder);
	$("#search-clear").toggleClass("visible", Search.restricted);
}

// Search item list for the query
Search.locally = function(query)
{
	if(Search.restricted)
	{
		ItemList.setFilter(query);
		return;
	}

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
			ItemList.setItems(items, ItemList.USE_STORAGE);
		}
	});
}

// Create content if the query is a content URL
// Returns true if the query looks like a content URL
Search.createContent = function(query)
{
	var Content = require("./Content.js");

	// Find and create YouTube content
	var match = Search.REGEX.YOUTUBE.exec(query);
	if(match && match[5])
	{
		var externalId = match[5];
		Content.create(Content.SOURCE.YOUTUBE, externalId);
		return true;
	}

	// Find and create SoundCloud content
	match = Search.REGEX.SOUNDCLOUD.exec(query);
	if(match && match[2])
	{
		if(typeof SC == "undefined")
			return true;

		SC
		.resolve(query)
		.then(function onSoundCloudResolve(response)
		{
			var externalId = response.id.toString();

			Content
				.create(Content.SOURCE.SOUNDCLOUD, externalId);
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

	// Content creation and global search are restricted, bail out
	if(Search.restricted)
		return;

	var isContentUrl = Search.createContent(query);

	if(isContentUrl)
		return;

	Search.globally(query);
}

// Called upon clicking the search clear button
Search.onClearClick = function()
{
	// With input in place, first click doesn't restore the storage
	if(Search.restricted && $("#search").val().length)
	{
		Search.clear();
		ItemList.clearFilter(ItemList.IGNORE_STORAGE);
		return;
	}

	var Relation = require("./Relation.js");

	if(Relation.active)
	{
		Relation.active = false;
		$("#related-overlay").fadeIn(200);
	}

	Search.clear();
	ItemList.clearFilter();

	Search.updatePlaceholder();
}

Search.init = function()
{
	$("#search").keyup(Search.onKeyUp);
	$("#search-clear").click(Search.onClearClick);

	Search.updatePlaceholder();
}

module.exports = Search;
