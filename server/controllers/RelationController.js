module.exports = function(core)
{
	var RelationController =
	{
		STATUS_CREATED: 1,
		STATUS_UPVOTED: 2,
	};

	var app = core.app;
	var sequelize = core.sequelize;
	var paperwork = core.paperwork;
	var passport = core.passport;

	var Track = sequelize.models.Track;
	var Relation = sequelize.models.Relation;
	var RelationVote = sequelize.models.RelationVote;
	var RelationFlag = sequelize.models.RelationFlag;

	// Create a relation between two tracks
	RelationController.createRelation = function(req, res)
	{
		if(!req.user)
			return res.status(401).json({ errors: ["not authenticated"] });

		if(req.body.trackId == req.body.linkedId)
			return res.status(400).json({ errors: ["self-link not allowed"] });

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
				return res.status(404).json({ errors: ["track not found"] });
		});

		// todo: use ReputationController.getVoteValue(req.user)
		var voteValue = 1;

		Relation.findOrCreate
		({
			where:
			{
				$or:
				[
					{
						trackId: req.body.trackId,
						linkedId: req.body.linkedId,
					},
					{
						trackId: req.body.linkedId,
						linkedId: req.body.trackId,
					}
				]
			},
			defaults:
			{
				trackId: req.body.trackId,
				linkedId: req.body.linkedId,
				trust: voteValue,
			},
		})
		.spread(function(relation, created)
		{
			// If the relation already exists, upvote it and bail out
			if(!created)
			{
				res.json( [relation.relationId, RelationController.STATUS_UPVOTED] );
				RelationController.setRelationVote(relation, 1, req);

				return;
			}

			res.json( [relation.relationId, RelationController.STATUS_CREATED] );

			RelationVote.create
			({
				relationId: relation.relationId,
				userId: req.user.userId,
				value: voteValue
			});
		});
	}

	// Retrieve track relations
	RelationController.getTrackRelations = function(req, res)
	{
		var trackId = req.params.trackId;

		var include =
		[{
			model: Track,
			as: "Track"
		},
		{
			model: Track,
			as: "Linked"
		}];

		if(req.user)
		{
			include.push
			({
				model: RelationVote,
				attributes: ["voteId", "value", "userId"],
				where:
				{
					userId: req.user.userId,
				},
				required: false,
			});

			include.push
			({
				model: RelationFlag,
				attributes: ["flagId", "resolved", "userId"],
				where:
				{
					userId: req.user.userId,
					resolved: 0,
				},
				required: false,
			});
		}

		Relation.all
		({
			attributes: ["relationId", "trackId", "linkedId", "trust", "doubt"],
			where:
			{
				$or:
				[
					{ trackId: trackId },
					{ linkedId: trackId }
				]
			},
			limit: 100,
			include: include,
		})
		.then(function(relations)
		{
			// No results, return an empty array
			if(!relations)
				return res.json( [] );

			var response = [];

			for(var index in relations)
			{
				// Retrieve data of tracks opposite to the request origin
				var track = (relations[index].Track.trackId == trackId)
					? relations[index].Linked
					: relations[index].Track;

				response.push
				([
					track.trackId,
					track.artist,
					track.title,
					(relations[index].trust - relations[index].doubt),
					relations[index].RelationVotes[0]
						? relations[index].RelationVotes[0].value
						: 0,
					(relations[index].RelationFlags != null),
				]);
			}

			res.json(response);
		});
	}

	// Update user's vote on a relation
	RelationController.updateRelationVote = function(req, res)
	{
		if(!req.user)
			return res.status(401).json({ errors: ["not authenticated"] });

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
				return res.status(404).json({ errors: ["relation not found"] });

			RelationController.setRelationVote(relation, req.body.vote, req, res);
		});
	}

	// Find or create a relation vote
	RelationController.setRelationVote = function(relation, vote, req, res)
	{
		// todo: use ReputationController.getVoteValue(req.user) * vote;
		var voteValue = 1 * vote;

		RelationVote.findOrCreate
		({
			attributes: ["value"],
			where:
			{
				relationId: relation.relationId,
				userId: req.user.userId,
			},
			defaults: { value: voteValue }
		})
		.spread(function(vote, created)
		{
			// New vote created, update relation and bail out
			if(created)
				return RelationController.updateRelationTrust(relation, voteValue, res);

			// Revert trust changes from the previous user's vote
			(vote.value > 0)
				? relation.trust = relation.trust - vote.value
				: relation.doubt = relation.doubt + vote.value;

			// Add current vote and apply trust changes
			RelationController.updateRelationTrust(relation, voteValue, res);

			RelationVote.update
			({
				value: voteValue
			},
			{
				where:
				{
					relationId: relation.relationId,
					userId: req.user.userId,
				}
			});
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

		if(!res)
			return;

		res.json
		([
			(relation.trust - relation.doubt),
			voteValue,
		]);
	}

	// Returns true if an id is in valid range
	RelationController.validateId = function(id)
	{
		return (id > 0);
	}

	// Returns true if the vote is valid
	RelationController.validateVote = function(vote)
	{
		return (vote == -1 || vote == 1);
	}

	RelationController.init = function()
	{
		app.post("/relations",
			paperwork.accept
			({
				trackId: paperwork.all(Number, RelationController.validateId),
				linkedId: paperwork.all(Number, RelationController.validateId),
			}),
			RelationController.createRelation);

		app.get("/tracks/:trackId(\\d+)/relations",
			RelationController.getTrackRelations);

		app.put("/tracks/:trackId(\\d+)/relations/:linkedId(\\d+)/votes",
			paperwork.accept
			({
				vote: paperwork.all(Number, RelationController.validateVote),
			}),
			RelationController.updateRelationVote);
	}

	return RelationController;
}
