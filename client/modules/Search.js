var Throttle = require("throttle-debounce/throttle");
var ItemList = require("./ItemList.js");

var Search =
{
	restricted: false,
}

// Clear search input
Search.clear = function()
{
	Search.active = null;

	$("#search").val("");
	$("#search-clear").removeClass("visible");
}

// Update search placeholder
Search.updatePlaceholder = function()
{
	var placeholder = "Enter a search query or content URL";

	var Relation = require("./Relation.js");

	if(Relation.active)
	{
		placeholder = "Viewing recommendations for \"" +
			Relation.active.name + "\"";

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
		if( $("#search-clear").is(":visible") )
		{
			ItemList.clearFilter();
			ItemList.restoreStorage();
			return;
		}

		$("#search-clear").addClass("visible");
		return;
	}

	// The query is empty, restore view and bail
	if(!query.length)
	{
		Search.clear();
		ItemList.clearFilter();
		ItemList.restoreStorage();

		return;
	}

	$("#search-clear").addClass("visible");

	var storage = $("#items").data("storage");

	// Searching entire database, bail out
	if(storage && storage.length)
		return;

	ItemList.setFilter(query);
}

// Search database for the query
Search.globally = function(query)
{
	var Relation = require("./Relation.js");

	if(Relation.active)
		Relation.clearView();

	$("#search").val(query);
	$("#search-clear").addClass("visible");

	if(Search.active != null &&
		Search.active.query == query)
			return;

	Search.active = { query: query };

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

			var items = [];
			response.forEach(function(response){
				items.push
				({
					trackId: response[0],
					artist: response[1],
					title: response[2],
				});
			});
			ItemList.setItems(items, ItemList.USE_STORAGE);
		}
	});
}
Search.globallyThrottled = Throttle(2000,
function(query)
{
	Search.globally(query);
});

// Create content if the query is a content URL
// Returns true if the query looks like a content URL
Search.createContent = function(query)
{
	var Relation = require("./Relation.js");

	if(Relation.active)
		Relation.clearView();

	var Item = require("./Item.js");
	var Content = require("./Content.js");

	// Find and create YouTube content
	var match = Content.REGEX.YOUTUBE.exec(query);
	if( match && match[5] )
	{
		var externalId = match[5];
		Item.createThrottled(Content.SOURCE.YOUTUBE, externalId);
		return true;
	}

	// Find and create SoundCloud content
	match = Content.REGEX.SOUNDCLOUD.exec(query);
	if( match && match[2] )
	{
		if(typeof SC == "undefined")
			return true;

		SC
		.resolve(query)
		.then(function onSoundCloudResolve(response)
		{
			var externalId = response.id.toString();
			Item.createThrottled(Content.SOURCE.SOUNDCLOUD, externalId);
		})
		.catch(function(error)
		{
			var Toast = require("./Toast.js");

			if(error.status == 404)
			{
				Toast.show("The content does not exist, check the URL",
					Toast.ERROR);

				return;
			}

			if(error.status == 403)
			{
				Toast.show("The content is restricted and cannot be added",
					Toast.ERROR);

				return;
			}

			Toast.show("Failed to retrieve the content", Toast.ERROR);
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

	Search.globallyThrottled(query);
}

// Called upon clicking the search clear button
Search.onClearClick = function()
{
	// With input in place, first click doesn't restore the storage
	if( Search.restricted && $("#search").val().length )
	{
		Search.clear();
		ItemList.clearFilter();
		return;
	}

	var Relation = require("./Relation.js");

	if(Relation.active)
		return Relation.clearView();

	Search.clear();
	ItemList.clearFilter();
	ItemList.restoreStorage();

	Search.updatePlaceholder();
}

Search.init = function()
{
	$("#search").keyup(Search.onKeyUp);
	$("#search-clear").click(Search.onClearClick);

	Search.updatePlaceholder();
}

module.exports = Search;
