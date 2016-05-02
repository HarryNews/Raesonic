var Relation = {};

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

			var relationId = response;

			// todo: save relationId in a storage
			// todo: show message about successful creation
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

			// todo: save relations in a storage
			// todo: switch to the list view of track relations
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

			var trust = response;
			
			// todo: update relation's trust display
		}
	});
}

// Flag a relation between two tracks as inappropriate
Relation.flag = function(trackId, linkedId)
{
	$.ajax
	({
		url: "/tracks/" + trackId + "/relations/" + linkedId + "/flags/",
		type: "POST",
		success: function(response)
		{
			if(response.errors)
				return;
			
			// todo: update flag icon state to active
		}
	});
}

module.exports = Relation;
