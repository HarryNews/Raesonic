module.exports = function(app, sequelize)
{
	var SearchController = {};

	var Track = sequelize.models.Track;

	// Search for tracks matching the query
	SearchController.getResults = function(req, res)
	{
		if(req.params.query.length > 150)
			return res.status(500).json({ error: true });

		var query = "%" + decodeURIComponent( req.params.query.replace(/\+/g, "%20") ) + "%";

		Track.all
		({
			attributes: ["trackId", "artist", "title"],
			limit: 100,
			where:
			{
				trackId: { $gt: 0 },
				$or:
				[
					// todo: add combined search
					{ artist: { $like: query } },
					{ title: { $like: query } }
				]
			}
		})
		.then(function(tracks)
		{
			// No results, return an empty array
			if(!tracks)
				return res.json( [] );

			var response = [];

			for(var index in tracks)
			{
				response.push
				([
					tracks[index].trackId,
					tracks[index].artist,
					tracks[index].title
				]);
			}
			
			res.json(response);
		});
	}

	app
		.route("/search/:query")
			.get(SearchController.getResults);

	return SearchController;
}
