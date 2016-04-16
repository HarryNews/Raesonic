var Relation = {};

// Create a relation between two tracks
Relation.create = function(trackId, linkedId)
{
	$.ajax
	({
		url: "/relations/",
		type: "POST",
		data: { trackId: trackId, linkedId: linkedId },
		success: function(response)
		{
			if(response.error)
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
			if(response.error)
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
		url: "/tracks/" + trackId + "/relations/" + linkedId,
		type: "PUT",
		data: { trackId: trackId, linkedId: linkedId, vote: vote },
		success: function(response)
		{
			if(response.error)
				return;

			var trust = response;
			
			// todo: update relation's trust display
		}
	});
}

module.exports = Relation;
