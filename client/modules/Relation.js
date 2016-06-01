 var Relation =
 {
 	// Response status codes
	STATUS_CREATED: 1,
	STATUS_UPVOTED: 2,
	// User vote types
	VOTE_POSITIVE: 1,
	VOTE_CLEAR: 0,
	VOTE_NEGATIVE: -1,
 };

// Create a relation between two tracks
Relation.create = function(trackId, linkedId)
{
	$.ajax
	({
		url: "/relations/",
		type: "POST",
		data: JSON.stringify({ trackId: trackId, linkedId: linkedId }),
		contentType: "application/json",
		success: function(response)
		{
			if(response.errors)
				return;

			var relationId = response[0];
			var status = response[1];

			var Overlay = require("./Overlay.js");
			Overlay.destroy();
			
			// todo: show message according to status
		}
	});
}

// Request relations of the specified track and switch to the list view
Relation.request = function(trackId)
{
	$.ajax
	({
		url: "/tracks/" + trackId + "/relations/",
		type: "GET",
		success: function(response)
		{
			if(response.errors)
				return;

			var relations = response;

			// todo: show toast, that no recommendations were found
			if(!relations.length)
				return;

			var items = [];

			relations.forEach(function(relation)
			{
				items.push
				([
					relation[0], // trackId
					relation[1], // artist
					relation[2], // title
					null, // no itemId
					null, // no sourceId
					null, // no externalId
					relation[3], // rating
					relation[4], // vote
					relation[5], // flagged
				]);
			});

			items.sort(function(a, b)
			{
				// Sort by rating, desc
				return b[6] - a[6];
			});

			var Item = require("./Item.js");
			$("#related-second-image").html( $("#content-image").html() );
			$("#related-second-title").html(Item.active.title);
			$("#related-second-artist").html(Item.active.artist);

			Relation.active =
			{
				trackId: Item.active.trackId,
				artist: Item.active.artist,
				title: Item.active.title,
				name: Item.restoreArtist(Item.active.artist, true) + " – " + 
					Item.restoreTitle(Item.active.title)
			};

			var Search = require("./Search.js");
			Search.clear();

			var ItemList = require("./ItemList.js");
			ItemList.setItems(items, ItemList.USE_STORAGE);
			Item.play( $(".item:first") );

			Search.updatePlaceholder();

			$("#related-overlay").fadeOut(200);
		}
	});
}

// Update vote on a relation between two tracks
Relation.vote = function(trackId, linkedId, vote)
{
	$.ajax
	({
		url: "/tracks/" + trackId + "/relations/" + linkedId + "/votes/",
		type: "PUT",
		data: JSON.stringify({ vote: vote }),
		contentType: "application/json",
		success: function(response)
		{
			if(response.errors)
				return;

			var $item = $(".item").filterByData("trackId", trackId);

			// Couldn't find the item, bail out
			if(!$item.length)
				return;

			// Item is no longer active, bail out
			if(!$item.is(".active"))
				return;

			var rating = response[0];
			var voteValue = response[1];

			$item.data("vote", voteValue);
			Relation.updateActiveRating(rating, vote);
		}
	});
}

// Sets vote on the active relation
Relation.setActiveVote = function(vote, $icon)
{
	var Item = require("./Item.js");

	if(!Item.active)
		return;

	if($icon.is(".active"))
		vote = Relation.VOTE_CLEAR;

	Relation.vote(Item.active.trackId, Relation.active.trackId, vote);
}

// Updates rating and rating elements state on related tab
Relation.updateActiveRating = function(rating, vote)
{
	$("#related-rating").text(rating);

	$("#related-upvote")
		.attr( "title", "These tracks are similar" +
			( (vote > 0) ? " (click to undo)" : "" ) )
		.toggleClass( "active", (vote > 0) );

	$("#related-downvote")
		.attr( "title", "These tracks are different" +
			( (vote < 0) ? " (click to undo)" : "") )
		.toggleClass( "active", (vote < 0) );
}

// Called when a relation item is selected, and when it is made active
Relation.onRelationItemChange = function($item, artist, title)
{
	$("#related-first-title").html(title);
	$("#related-first-artist").html(artist);

	Relation.updateActiveRating( $item.data("rating"), $item.data("vote") );

	var Flag = require("./Flag.js");
	$("#related-flag")
		.data
		({
			entityType: Flag.ENTITY.RELATION,
			entityId: $item.data("trackId"),
			secondId: Relation.active.trackId,
			artist: artist,
			title: title,
			secondArtist: Relation.active.artist,
			secondTitle: Relation.active.title,
		})
		.toggleClass( "active", $item.data("flagged") );
}

// Called upon pressing the view relations button
Relation.onViewRelationsClick = function()
{
	var Item = require("./Item.js");

	if(!Item.active)
		return;

	Relation.request(Item.active.trackId);
}

// Called upon pressing the plus icon on the related tab
Relation.onAddIconClick = function()
{
	var $item = $(".item.active");

	if(!$item.length)
		return;

	var isHiding = ($item.find("#add-list").length);

	$item.find(".add.icon").click();

	if(isHiding)
		return;

	// Line up the dropdown with the related tab
	$("#add-list").css("top", $("#items").scrollTop() +
		$("#tab-related").offset().top - $("#items").offset().top);
}

// Called upon pressing the upvote icon on the related tab
Relation.onUpvoteIconClick = function()
{
	Relation.setActiveVote( Relation.VOTE_POSITIVE, $(this) );
}

// Called upon pressing the downvote icon on the related tab
Relation.onDownvoteIconClick = function()
{
	Relation.setActiveVote( Relation.VOTE_NEGATIVE, $(this) );
}

Relation.init = function()
{
	$("#related-overlay").click(Relation.onViewRelationsClick);
	$("#related-add").click(Relation.onAddIconClick);
	$("#related-upvote").click(Relation.onUpvoteIconClick);
	$("#related-downvote").click(Relation.onDownvoteIconClick);

	var Flag = require("./Flag.js");
	$("#related-flag").click(Flag.onIconClick);
}

module.exports = Relation;
