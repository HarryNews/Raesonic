module.exports = function(core)
{
	var FlagController = {};

	var app = core.app;
	var sequelize = core.sequelize;
	var paperwork = core.paperwork;

	var User = sequelize.models.User;
	var Content = sequelize.models.Content;
	var Relation = sequelize.models.Relation;
	var TrackEdit = sequelize.models.TrackEdit;
	var ContentLink = sequelize.models.ContentLink;
	var RelationFlag = sequelize.models.RelationFlag;
	var TrackEditFlag = sequelize.models.TrackEditFlag;
	var ContentLinkFlag = sequelize.models.ContentLinkFlag;

	// Create a flag marking relation as inappropriate
	FlagController.createRelationFlag = function(req, res)
	{
		if(!req.user)
			return res.status(401).json({ errors: ["not authenticated"] });

		var UserController = core.controllers.User;

		if( !UserController.isVerifiedUser(req.user) )
			return res.status(401).json({ errors: ["email not verified"] });

		var ReputationController = core.controllers.Reputation;

		if( !ReputationController.hasPermission(req.user,
			ReputationController.PERMISSION.SUBMIT_FLAGS) )
				return res.status(403).json
					({ errors: ["not enough reputation"] });

		if( !ReputationController.canPerformActivity(req.user,
			ReputationController.ACTIVITY.SUBMIT_FLAGS) )
				return res.status(403).json
					({ errors: ["exceeded daily activity limit"] });

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
				return res.status(404).json({ errors: ["relation not found"] });

			FlagController.setFlag
			(
				RelationFlag,
				"relationId", relation.relationId,
				req, res
			);
		});
	}

	// Create a flag marking track edit as inappropriate
	FlagController.createTrackEditFlag = function(req, res)
	{
		if(!req.user)
			return res.status(401).json({ errors: ["not authenticated"] });

		var UserController = core.controllers.User;

		if( !UserController.isVerifiedUser(req.user) )
			return res.status(401).json({ errors: ["email not verified"] });

		var ReputationController = core.controllers.Reputation;

		if( !ReputationController.hasPermission(req.user,
			ReputationController.PERMISSION.SUBMIT_FLAGS) )
				return res.status(403).json
					({ errors: ["not enough reputation"] });

		if( !ReputationController.canPerformActivity(req.user,
			ReputationController.ACTIVITY.SUBMIT_FLAGS) )
				return res.status(403).json
					({ errors: ["exceeded daily activity limit"] });

		TrackEdit.findOne
		({
			attributes: ["editId"],
			where:
			{
				editId: req.params.editId,
				trackId: req.params.trackId,
			},
		})
		.then(function(trackEdit)
		{
			// Track edit not found, nothing to flag
			if(!trackEdit)
				return res.status(404).json({ errors: ["track edit not found"] });

			FlagController.setFlag
			(
				TrackEditFlag,
				"editId", trackEdit.editId,
				req, res
			);
		});
	}

	// Create a flag marking content link as inappropriate
	FlagController.createContentLinkFlag = function(req, res)
	{
		if(!req.user)
			return res.status(401).json({ errors: ["not authenticated"] });

		var UserController = core.controllers.User;

		if( !UserController.isVerifiedUser(req.user) )
			return res.status(401).json({ errors: ["email not verified"] });

		var ReputationController = core.controllers.Reputation;

		if( !ReputationController.hasPermission(req.user,
			ReputationController.PERMISSION.SUBMIT_FLAGS) )
				return res.status(403).json
					({ errors: ["not enough reputation"] });

		if( !ReputationController.canPerformActivity(req.user,
			ReputationController.ACTIVITY.SUBMIT_FLAGS) )
				return res.status(403).json
					({ errors: ["exceeded daily activity limit"] });

		ContentLink.findOne
		({
			attributes: ["linkId"],
			where: { linkId: req.params.linkId },
			include:
			[{
				model: Content,
				attributes: ["contentId"],
				where:
				{
					sourceId: req.params.sourceId,
					externalId: req.params.externalId,
				},
			}],
		})
		.then(function(contentLink)
		{
			// Content link not found, nothing to flag
			if(!contentLink)
				return res.status(404).json({ errors: ["content link not found"] });

			FlagController.setFlag
			(
				ContentLinkFlag,
				"linkId", contentLink.linkId,
				req, res
			);
		});
	}

	// Update or create a flag for the specified entity
	FlagController.setFlag = function(model, entityField, entityId, req, res)
	{
		var params =
		{
			userId: req.user.userId,
			resolved: 0,
		};

		params[entityField] = entityId;

		sequelize.transaction(function(tr)
		{
			return model.findOrCreate
			({
				defaults: { reasonId: req.body.reasonId },
				where: params,
				transaction: tr,
			})
			.spread(function(flag, created)
			{
				var ReputationController = core.controllers.Reputation;

				// No changes required, bail out
				if(created || flag.reasonId == req.body.reasonId)
				{
					return ReputationController.addActivity(req.user,
						ReputationController.ACTIVITY.SUBMIT_FLAGS,
						tr,
					function onDone()
					{
						return;
					});
				}

				return flag.update
				({
					reasonId: req.body.reasonId,
				},
				{ transaction: tr })
				.then(function()
				{
					return ReputationController.addActivity(req.user,
						ReputationController.ACTIVITY.SUBMIT_FLAGS,
						tr,
					function onDone()
					{
						return;
					});
				});
			});
		})
		.then(function()
		{
			res.json( [] );
		})
		.catch(function(err)
		{
			return res.status(500).json({ errors: ["internal error"] });
		});
	};

	// Returns true if the relation flag reason id is valid
	FlagController.validateRelationReasonId = function(reasonId)
	{
		return (reasonId == 1 || reasonId == 2);
	}

	// Returns true if the track edit flag reason id is valid
	FlagController.validateTrackEditReasonId = function(reasonId)
	{
		return (reasonId == 1 || reasonId == 2);
	}

	// Returns true if the content link flag reason id is valid
	FlagController.validateContentLinkReasonId = function(reasonId)
	{
		return (reasonId == 1 || reasonId == 2 || reasonId == 3);
	}

	FlagController.init = function()
	{
		app.post("/tracks/:trackId(\\d+)/relations/:linkedId(\\d+)/flags",
			paperwork.accept
			({
				reasonId: paperwork.all(Number, FlagController.validateRelationReasonId),
			}),
			FlagController.createRelationFlag);

		app.post("/tracks/:trackId(\\d+)/edits/:editId(\\d+)/flags",
			paperwork.accept
			({
				reasonId: paperwork.all(Number, FlagController.validateTrackEditReasonId),
			}),
			FlagController.createTrackEditFlag);

		app.post("/content/:sourceId(\\d+)/:externalId/links/:linkId(\\d+)/flags",
			paperwork.accept
			({
				reasonId: paperwork.all(Number, FlagController.validateContentLinkReasonId),
			}),
			FlagController.createContentLinkFlag);
	}

	return FlagController;
}
