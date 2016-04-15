module.exports = function(app, sequelize)
{
	var RelationController = {};

	var Track = sequelize.models.Track;
	var Relation = sequelize.models.Relation;
	var RelationVote = sequelize.models.RelationVote;

	// Create a relation between two tracks
	RelationController.createRelation = function(req, res)
	{
		if(!req.body || !req.body.trackId || !req.body.linkedId ||
			req.body.trackId == req.body.linkedId ||
			req.body.trackId < 1 || req.body.linkedId < 1)
			return res.status(500).json({ error: true });

		// todo: return error if not logged in

		Track.count
		({
			where:
			{
				$or:
				[
					{ trackId: req.body.trackId },
					{ trackId: req.body.linkedId }
				]
			}
		})
		.then(function(amount)
		{
			// At least one of the tracks is missing to create a relation
			if(amount != 2)
				return res.status(500).json({ error: true });
		});

		Relation.findOrCreate
		({
			where:
			{
				trackId: req.body.trackId,
				linkedId: req.body.linkedId
			}
		})
		.spread(function(relation, created)
		{
			res.json(relation.relationId);

			// Add no vote records if no relation was created
			if(!created)
				return;

			// todo: use actual user id
			RelationVote.create
			({
				relationId: relation.relationId,
				userId: 1,
				value: 1
			});
		});
	}

	// Retrieve track relations
	RelationController.getTrackRelations = function(req, res)
	{
		var trackId = req.params.trackId;

		Relation.all
		({
			where:
			{
				$or:
				[
					{ trackId: trackId },
					{ linkedId: trackId }
				]
			},
			limit: 100,
			include:
			[
				{
					model: Track,
					as: "Track"
				},
				{
					model: Track,
					as: "Linked"
				}
			]
		})
		.then(function(relations)
		{
			// No results, return an empty array
			if(!relations)
				return res.json( [] );

			var response = [];

			for(var index in relations)
			{
				if(relations[index].Track.trackId == trackId)
				{
					// Looking for track relations, push linked data
					response.push
					([
						relations[index].Linked.trackId,
						relations[index].Linked.artist,
						relations[index].Linked.title
					]);

					continue;
				}

				// Looking for linked relations, push track data
				response.push
				([
					relations[index].Track.trackId,
					relations[index].Track.artist,
					relations[index].Track.title
				]);
			}
			
			res.json(response);
		});
	}

	app
		.route("/relations")
			.post(RelationController.createRelation);

	app
		.route("/tracks/:trackId(\\d+)/relations")
			.get(RelationController.getTrackRelations);

	return RelationController;
}
