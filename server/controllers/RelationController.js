module.exports = function(app, sequelize)
{
	var RelationController = {};

	var Track = sequelize.models.Track;
	var Relation = sequelize.models.Relation;
	var RelationVote = sequelize.models.RelationVote;
	var RelationFlag = sequelize.models.RelationFlag;

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

		// todo: obtain from user's trust
		var voteValue = 1;

		Relation.findOrCreate
		({
			where:
			{
				trackId: req.body.trackId,
				linkedId: req.body.linkedId
			},
			defaults: { trust: voteValue }
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
				value: voteValue
			});
		});
	}

	// Retrieve track relations
	RelationController.getTrackRelations = function(req, res)
	{
		var trackId = req.params.trackId;

		Relation.all
		({
			attributes: ["trust", "doubt"],
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
						relations[index].Linked.title,
						(relations[index].trust - relations[index].doubt)
					]);

					continue;
				}

				// Looking for linked relations, push track data
				response.push
				([
					relations[index].Track.trackId,
					relations[index].Track.artist,
					relations[index].Track.title,
					(relations[index].trust - relations[index].doubt)
				]);
			}
			
			res.json(response);
		});
	}

	// Update user's vote on a relation
	RelationController.updateRelationVote = function(req, res)
	{
		if(!req.body || !req.body.vote ||
			req.params.trackId == req.params.linkedId ||
			req.params.trackId < 1 || req.params.linkedId < 1 ||
			(req.body.vote != -1 && req.body.vote != 1))
			return res.status(500).json({ error: true });

		// todo: return error if not logged in

		Relation.findOne
		({
			attributes: ["relationId", "trust", "doubt"],
			where:
			{
				$or:
				[
					{
						trackId: req.params.trackId,
						linkedId: req.params.linkedId
					},
					{
						trackId: req.params.linkedId,
						linkedId: req.params.trackId
					}
				]
			}
		})
		.then(function(relation)
		{
			// Relation doesn't exist, nothing to vote on
			if(!relation)
				return res.status(500).json({ error: true });

			// todo: obtain multiplier from user's trust
			var voteValue = 1 * req.body.vote;

			// todo: use actual user id
			RelationVote.findOrCreate
			({
				attributes: ["value"],
				where:
				{
					relationId: relation.relationId,
					userId: 1
				},
				defaults: { value: voteValue }
			})
			.spread(function(vote, created)
			{
				// New vote created, update relation and bail out
				if(created)
					return RelationController.updateRelationTrust(relation, voteValue, res);

				// Revert trust changes from the previous vote
				(vote.value > 0)
					? relation.trust = relation.trust - vote.value
					: relation.doubt = relation.doubt + vote.value;

				// Add current vote and apply trust changes
				RelationController.updateRelationTrust(relation, voteValue, res);

				// todo: use actual user id
				RelationVote.update
				({
					value: voteValue
				},
				{
					where:
					{
						relationId: relation.relationId,
						userId: 1
					}
				});
			});
		});
	}

	// Create a flag marking relation as inappropriate
	RelationController.createRelationFlag = function(req, res)
	{
		// todo: return error if not logged in

		Relation.findOne
		({
			attributes: ["relationId"],
			where:
			{
				$or:
				[
					{
						trackId: req.params.trackId,
						linkedId: req.params.linkedId
					},
					{
						trackId: req.params.linkedId,
						linkedId: req.params.trackId
					}
				]
			}
		})
		.then(function(relation)
		{
			// Relation doesn't exist, nothing to flag
			if(!relation)
				return res.status(500).json({ error: true });

			// todo: use actual user id
			RelationFlag.findOrCreate
			({
				where:
				{
					relationId: relation.relationId,
					userId: 1
				}
			});
			
			res.json( [] );
		});
	}

	// Apply vote changes to a relation
	RelationController.updateRelationTrust = function(relation, voteValue, res)
	{
		(voteValue > 0)
			? relation.trust = relation.trust + voteValue
			: relation.doubt = relation.doubt - voteValue;

		Relation.update
		({
			trust: relation.trust,
			doubt: relation.doubt
		},
		{
			where: { relationId: relation.relationId }
		});

		res.json(relation.trust - relation.doubt);
	}

	app
		.route("/relations")
			.post(RelationController.createRelation);

	app
		.route("/tracks/:trackId(\\d+)/relations")
			.get(RelationController.getTrackRelations);

	app
		.route("/tracks/:trackId(\\d+)/relations/:linkedId(\\d+)/votes")
			.put(RelationController.updateRelationVote);

	app
		.route("/tracks/:trackId(\\d+)/relations/:linkedId(\\d+)/flags")
			.post(RelationController.createRelationFlag);

	return RelationController;
}
